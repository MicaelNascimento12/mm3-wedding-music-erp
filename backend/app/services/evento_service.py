from datetime import date, datetime, time, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.models import (
    EscalaMusico,
    EventoCasamento,
    FormaPagamentoEnum,
    FormacaoMusicalEnum,
    ParcelaContrato,
    RepertorioCerimonia,
    SonorizacaoLogistica,
    StatusConfirmacaoEscalaEnum,
    StatusEventoEnum,
    StatusPagamentoEnum,
    StatusParcelaContratoEnum,
    TipoContratacaoEventoEnum,
    TipoParcelaEnum,
)
from app.repositories.evento_repository import EventoRepository
from app.repositories.musico_repository import MusicoRepository
from app.schemas.schemas import (
    AlertaFinanceiroItem,
    ConflitoAgendaItem,
    ConflitoMusicoEscalaAlerta,
    DashboardOverviewOut,
    EscalaMusicoBaixaPagamentoRequest,
    EscalaMusicoCreate,
    EscalaMusicoOut,
    EscalaMusicoUpdate,
    EventoCasamento360Out,
    EventoCasamentoCreate,
    EventoCasamentoListOut,
    EventoCasamentoUpdate,
    ParcelaContratoBaixaRequest,
    ParcelaContratoCreate,
    ParcelaContratoOut,
    ParcelaContratoUpdate,
    ReordenarRepertorioRequest,
    RepertorioItemCreate,
    RepertorioItemOut,
    RepertorioItemUpdate,
    ResumoFinanceiroDREOut,
    SonorizacaoCreateUpdate,
    SonorizacaoOut,
    VerificacaoConflitoOut,
)


def _time_to_minutes(t: time) -> int:
    return t.hour * 60 + t.minute


def _minutes_to_time(minutes: int) -> time:
    capped = max(0, min(minutes, 23 * 60 + 59))
    return time(capped // 60, capped % 60)


def _effective_end_time(inicio: time, termino: Optional[time]) -> time:
    """Se o horário de término previsto não for informado, considera horario_inicio_cerimonia + 2h."""
    if termino is not None:
        return termino
    return _minutes_to_time(_time_to_minutes(inicio) + 120)


class EventoService:
    # =========================================================================
    # REGRA CRÍTICA: DETECÇÃO DE CONFLITO DE AGENDA (SOBREPOSIÇÃO OU < 90 MIN)
    # =========================================================================
    @staticmethod
    def verificar_conflito_agenda(
        db: Session,
        data_casamento: date,
        horario_chegada_banda: time,
        horario_inicio_cerimonia: time,
        horario_termino_previsto: Optional[time] = None,
        exclude_evento_id: Optional[int] = None,
    ) -> VerificacaoConflitoOut:
        eventos_no_dia = EventoRepository.get_eventos_ativos_na_data(
            db, data_casamento, exclude_evento_id=exclude_evento_id
        )

        termino_novo = _effective_end_time(horario_inicio_cerimonia, horario_termino_previsto)
        start_a = _time_to_minutes(horario_chegada_banda)
        end_a = _time_to_minutes(termino_novo)
        if end_a < start_a:
            end_a = start_a + 120

        conflitos: List[ConflitoAgendaItem] = []

        for ev in eventos_no_dia:
            termino_ev = _effective_end_time(
                ev.horario_inicio_cerimonia, ev.horario_termino_previsto
            )
            start_b = _time_to_minutes(ev.horario_chegada_banda)
            end_b = _time_to_minutes(termino_ev)
            if end_b < start_b:
                end_b = start_b + 120

            # Verifica sobreposição direta
            if start_a < end_b and start_b < end_a:
                sobreposicao = min(end_a, end_b) - max(start_a, start_b)
                conflitos.append(
                    ConflitoAgendaItem(
                        evento_id=ev.id,
                        codigo_contrato=ev.codigo_contrato,
                        nome_noivos=ev.nome_noivos,
                        data_casamento=ev.data_casamento,
                        horario_chegada_banda=ev.horario_chegada_banda,
                        horario_inicio_cerimonia=ev.horario_inicio_cerimonia,
                        horario_termino_considerado=termino_ev,
                        local_cerimonia=ev.local_cerimonia,
                        cidade_cerimonia=ev.cidade_cerimonia,
                        status=ev.status,
                        tipo_conflito="SOBREPOSICAO_DIRETA",
                        diferenca_minutos=-sobreposicao,
                        mensagem_detalhada=(
                            f"Sobreposição direta de horário com o casamento de {ev.nome_noivos} "
                            f"(Chegada: {ev.horario_chegada_banda.strftime('%H:%M')} | Início: {ev.horario_inicio_cerimonia.strftime('%H:%M')} "
                            f"em {ev.local_cerimonia} - {ev.cidade_cerimonia})."
                        ),
                    )
                )
            else:
                # Distância entre os eventos
                gap = max(start_a - end_b, start_b - end_a)
                if 0 <= gap < 90:
                    conflitos.append(
                        ConflitoAgendaItem(
                            evento_id=ev.id,
                            codigo_contrato=ev.codigo_contrato,
                            nome_noivos=ev.nome_noivos,
                            data_casamento=ev.data_casamento,
                            horario_chegada_banda=ev.horario_chegada_banda,
                            horario_inicio_cerimonia=ev.horario_inicio_cerimonia,
                            horario_termino_considerado=termino_ev,
                            local_cerimonia=ev.local_cerimonia,
                            cidade_cerimonia=ev.cidade_cerimonia,
                            status=ev.status,
                            tipo_conflito="MARGEM_INFERIOR_90_MIN",
                            diferenca_minutos=gap,
                            mensagem_detalhada=(
                                f"Margem crítica de deslocamento ({gap} min, mínimo recomendado: 90 min) "
                                f"com o casamento de {ev.nome_noivos} (Chegada: {ev.horario_chegada_banda.strftime('%H:%M')} "
                                f"| Início: {ev.horario_inicio_cerimonia.strftime('%H:%M')} em {ev.local_cerimonia} - {ev.cidade_cerimonia})."
                            ),
                        )
                    )

        return VerificacaoConflitoOut(
            possui_conflito=len(conflitos) > 0,
            margem_minima_recomendada_minutos=90,
            total_conflitos=len(conflitos),
            conflitos=conflitos,
        )

    # =========================================================================
    # MÓDULO F: CÁLCULO AUTOMÁTICO DE DRE DO EVENTO
    # =========================================================================
    @staticmethod
    def calcular_dre_evento(evento: EventoCasamento) -> ResumoFinanceiroDREOut:
        receita_bruta = (evento.valor_total_bruto or Decimal("0.00")).quantize(Decimal("0.01"))

        receita_ja_recebida = sum(
            (p.valor_parcela or Decimal("0.00"))
            for p in (evento.parcelas or [])
            if p.status == StatusParcelaContratoEnum.PAGO
        )
        receita_ja_recebida = Decimal(receita_ja_recebida).quantize(Decimal("0.01"))
        saldo_a_receber_noivos = (receita_bruta - receita_ja_recebida).quantize(Decimal("0.01"))

        escalas_ativas = [
            e
            for e in (evento.escalas or [])
            if e.status_confirmacao != StatusConfirmacaoEscalaEnum.RECUSOU
        ]
        total_musicos_escalados = len(escalas_ativas)
        musicos_confirmados = sum(
            1
            for e in escalas_ativas
            if e.status_confirmacao == StatusConfirmacaoEscalaEnum.CONFIRMADO
        )

        custo_caches = Decimal(
            sum((e.valor_cache_combinado or Decimal("0.00")) for e in escalas_ativas)
        ).quantize(Decimal("0.01"))

        custo_deslocamento = Decimal(
            sum((e.taxa_deslocamento_combustivel or Decimal("0.00")) for e in escalas_ativas)
        ).quantize(Decimal("0.01"))

        custo_sonorizacao = (
            (evento.sonorizacao.custo_locacao_tecnico_som or Decimal("0.00")).quantize(
                Decimal("0.01")
            )
            if evento.sonorizacao
            else Decimal("0.00")
        )

        despesas_totais = (custo_caches + custo_deslocamento + custo_sonorizacao).quantize(
            Decimal("0.01")
        )

        total_pago_musicos = Decimal(
            sum(
                (e.valor_cache_combinado or Decimal("0.00"))
                + (e.taxa_deslocamento_combustivel or Decimal("0.00"))
                for e in escalas_ativas
                if e.status_pagamento == StatusPagamentoEnum.PAGO
            )
        ).quantize(Decimal("0.01"))

        total_pendente_musicos = Decimal(
            sum(
                (e.valor_cache_combinado or Decimal("0.00"))
                + (e.taxa_deslocamento_combustivel or Decimal("0.00"))
                for e in escalas_ativas
                if e.status_pagamento == StatusPagamentoEnum.PENDENTE
            )
        ).quantize(Decimal("0.01"))

        lucro_liquido_banda = (receita_bruta - despesas_totais).quantize(Decimal("0.01"))

        if receita_bruta > Decimal("0.00"):
            margem_lucro_percentual = (
                (lucro_liquido_banda / receita_bruta) * Decimal("100.00")
            ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        else:
            margem_lucro_percentual = Decimal("0.00")

        return ResumoFinanceiroDREOut(
            evento_id=evento.id,
            receita_bruta=receita_bruta,
            receita_ja_recebida=receita_ja_recebida,
            saldo_a_receber_noivos=saldo_a_receber_noivos,
            total_musicos_escalados=total_musicos_escalados,
            musicos_confirmados=musicos_confirmados,
            custo_caches=custo_caches,
            custo_deslocamento=custo_deslocamento,
            custo_sonorizacao=custo_sonorizacao,
            despesas_totais=despesas_totais,
            total_pago_musicos=total_pago_musicos,
            total_pendente_musicos=total_pendente_musicos,
            lucro_liquido_banda=lucro_liquido_banda,
            margem_lucro_percentual=margem_lucro_percentual,
        )

    # =========================================================================
    # CRUD DE EVENTOS E VISÃO 360º
    # =========================================================================
    @staticmethod
    def listar_eventos(
        db: Session,
        mes: Optional[int] = None,
        ano: Optional[int] = None,
        status_filtro: Optional[StatusEventoEnum] = None,
        tipo_formacao: Optional[FormacaoMusicalEnum] = None,
        tipo_contratacao: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[EventoCasamentoListOut]:
        eventos = EventoRepository.list_eventos(
            db,
            mes=mes,
            ano=ano,
            status=status_filtro,
            tipo_formacao=tipo_formacao,
            tipo_contratacao=tipo_contratacao,
            search=search,
        )
        resultado: List[EventoCasamentoListOut] = []
        for ev in eventos:
            item = EventoCasamentoListOut.model_validate(ev)
            item.resumo_financeiro = EventoService.calcular_dre_evento(ev)
            if ev.status != StatusEventoEnum.CANCELADO:
                item.alerta_conflito_agenda = EventoService.verificar_conflito_agenda(
                    db,
                    data_casamento=ev.data_casamento,
                    horario_chegada_banda=ev.horario_chegada_banda,
                    horario_inicio_cerimonia=ev.horario_inicio_cerimonia,
                    horario_termino_previsto=ev.horario_termino_previsto,
                    exclude_evento_id=ev.id,
                )
            resultado.append(item)
        return resultado

    @staticmethod
    def obter_evento_model(db: Session, evento_id: int) -> EventoCasamento:
        ev = EventoRepository.get_by_id_360(db, evento_id)
        if not ev:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Casamento com ID {evento_id} não encontrado.",
            )
        return ev

    @staticmethod
    def _verificar_conflito_escala_musico(
        db: Session, musico_id: int, evento: EventoCasamento
    ) -> ConflitoMusicoEscalaAlerta:
        outras_escalas = EventoRepository.get_escalas_musico_na_data(
            db,
            musico_id=musico_id,
            data_casamento=evento.data_casamento,
            exclude_evento_id=evento.id,
        )
        if not outras_escalas:
            return ConflitoMusicoEscalaAlerta(possui_conflito=False)

        start_a = _time_to_minutes(evento.horario_chegada_banda)
        end_a = _time_to_minutes(
            _effective_end_time(
                evento.horario_inicio_cerimonia, evento.horario_termino_previsto
            )
        )

        conflitantes: List[str] = []
        for outra in outras_escalas:
            if outra.status_confirmacao == StatusConfirmacaoEscalaEnum.RECUSOU:
                continue
            ev_outro = outra.evento
            if not ev_outro:
                continue
            termino_b = _effective_end_time(
                ev_outro.horario_inicio_cerimonia, ev_outro.horario_termino_previsto
            )
            start_b = _time_to_minutes(ev_outro.horario_chegada_banda)
            end_b = _time_to_minutes(termino_b)

            gap = max(start_a - end_b, start_b - end_a)
            if (start_a < end_b and start_b < end_a) or gap < 90:
                conflitantes.append(
                    f"{ev_outro.nome_noivos} (Chegada: {ev_outro.horario_chegada_banda.strftime('%H:%M')} | Início: {ev_outro.horario_inicio_cerimonia.strftime('%H:%M')})"
                )

        if conflitantes:
            return ConflitoMusicoEscalaAlerta(
                possui_conflito=True,
                mensagem="Músico escalado em outro casamento no mesmo dia/horário próximo: "
                + ", ".join(conflitantes),
                eventos_conflitantes=conflitantes,
            )
        return ConflitoMusicoEscalaAlerta(possui_conflito=False)

    @staticmethod
    def obter_evento_360(db: Session, evento_id: int) -> EventoCasamento360Out:
        ev = EventoService.obter_evento_model(db, evento_id)

        # Garante que todo casamento tenha seu registro 1:1 de sonorização inicializado
        if not ev.sonorizacao:
            son = SonorizacaoLogistica(
                evento_id=ev.id,
                necessita_som_proprio=True,
                lista_equipamentos=[],
                custo_locacao_tecnico_som=Decimal("0.00"),
                status_pagamento_som=StatusPagamentoEnum.PENDENTE,
            )
            db.add(son)
            db.commit()
            db.refresh(ev)

        dre = EventoService.calcular_dre_evento(ev)
        conflito_agenda = EventoService.verificar_conflito_agenda(
            db,
            data_casamento=ev.data_casamento,
            horario_chegada_banda=ev.horario_chegada_banda,
            horario_inicio_cerimonia=ev.horario_inicio_cerimonia,
            horario_termino_previsto=ev.horario_termino_previsto,
            exclude_evento_id=ev.id,
        )

        escalas_out: List[EscalaMusicoOut] = []
        for esc in ev.escalas:
            esc_schema = EscalaMusicoOut.model_validate(esc)
            esc_schema.alerta_conflito = EventoService._verificar_conflito_escala_musico(
                db, esc.musico_id, ev
            )
            escalas_out.append(esc_schema)

        return EventoCasamento360Out(
            id=ev.id,
            codigo_contrato=ev.codigo_contrato,
            tipo_contratacao=ev.tipo_contratacao or TipoContratacaoEventoEnum.CONTRATO_PROPRIO,
            nome_banda_contratante=ev.nome_banda_contratante,
            nome_noivos=ev.nome_noivos,
            cpf_cnpj_contratante=ev.cpf_cnpj_contratante,
            telefone_contato=ev.telefone_contato,
            email_contratante=ev.email_contratante,
            data_casamento=ev.data_casamento,
            horario_inicio_cerimonia=ev.horario_inicio_cerimonia,
            horario_termino_previsto=ev.horario_termino_previsto,
            horario_chegada_banda=ev.horario_chegada_banda,
            local_cerimonia=ev.local_cerimonia,
            endereco_completo=ev.endereco_completo,
            cidade_cerimonia=ev.cidade_cerimonia,
            estado_uf=ev.estado_uf,
            tipo_formacao=ev.tipo_formacao,
            descricao_formacao=ev.descricao_formacao,
            status=ev.status,
            link_arquivo_contrato_pdf=ev.link_arquivo_contrato_pdf,
            valor_total_bruto=ev.valor_total_bruto,
            observacoes_gerais=ev.observacoes_gerais,
            created_at=ev.created_at,
            updated_at=ev.updated_at,
            escalas=escalas_out,
            repertorio=[RepertorioItemOut.model_validate(r) for r in ev.repertorio],
            sonorizacao=SonorizacaoOut.model_validate(ev.sonorizacao)
            if ev.sonorizacao
            else None,
            parcelas=[ParcelaContratoOut.model_validate(p) for p in ev.parcelas],
            resumo_financeiro=dre,
            alerta_conflito_agenda=conflito_agenda,
        )

    @staticmethod
    def criar_evento(db: Session, data: EventoCasamentoCreate) -> EventoCasamento360Out:
        is_freelancer = data.tipo_contratacao == TipoContratacaoEventoEnum.FREELANCER_CACHE

        if data.codigo_contrato:
            existente = EventoRepository.get_by_codigo_contrato(db, data.codigo_contrato)
            if existente:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Já existe um contrato com o código '{data.codigo_contrato}'.",
                )
        else:
            # Gera código automático sequencial CT-YYYY-NNN (próprio) ou FL-YYYY-NNN (freelancer)
            prefixo = "FL" if is_freelancer else "CT"
            ano = data.data_casamento.year
            total = db.query(EventoCasamento).count() + 1
            codigo_gerado = f"{prefixo}-{ano}-{total:03d}"
            while EventoRepository.get_by_codigo_contrato(db, codigo_gerado):
                total += 1
                codigo_gerado = f"{prefixo}-{ano}-{total:03d}"
            data.codigo_contrato = codigo_gerado

        conflito = EventoService.verificar_conflito_agenda(
            db,
            data_casamento=data.data_casamento,
            horario_chegada_banda=data.horario_chegada_banda,
            horario_inicio_cerimonia=data.horario_inicio_cerimonia,
            horario_termino_previsto=data.horario_termino_previsto,
        )
        if conflito.possui_conflito and not data.forcar_criacao_com_conflito:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "mensagem": "Conflito de agenda detectado na mesma data.",
                    "verificacao_conflito": conflito.model_dump(mode="json"),
                },
            )

        status_cache_fl = (data.status_cache_freelancer or "ABERTO").upper()
        payload = data.model_dump(
            exclude={"forcar_criacao_com_conflito", "status_cache_freelancer"}
        )
        if isinstance(payload.get("tipo_contratacao"), TipoContratacaoEventoEnum):
            payload["tipo_contratacao"] = payload["tipo_contratacao"].value

        novo_evento = EventoCasamento(**payload)
        db.add(novo_evento)
        db.flush()

        # Inicializa registro 1:1 de Sonorização e Logística padrão
        if is_freelancer:
            necessita_som = False
            equipamentos_iniciais = [
                {"item": "Violino Principal + Arco Reserva + Breu + Espaleira", "quantidade": 1, "conferido": False},
                {"item": "Captador / Microfone de Violino + Cabo P10 / XLR Próprio", "quantidade": 1, "conferido": False},
                {"item": "Tablet / iPad Carregado + Partituras da Banda Contratante", "quantidade": 1, "conferido": False},
                {"item": "Fone In-Ear (caso a banda utilize VS/Click)", "quantidade": 1, "conferido": False},
                {"item": "Traje Social Completo (conforme dress code da banda)", "quantidade": 1, "conferido": False},
            ]
            obs_padrao = (
                f"Casamento como Músico Freelancer contratado por {data.nome_banda_contratante or 'outra banda'}. "
                "Som principal por conta da banda contratante."
            )
        elif data.tipo_formacao == FormacaoMusicalEnum.VIOLINO_SOLO:
            necessita_som = True
            equipamentos_iniciais = [
                {"item": "Violino Principal + Arco Reserva + Breu + Surdina", "quantidade": 1, "conferido": False},
                {"item": "Captação de Violino (Microfone DPA / Piezo + Transmissor Sem Fio UHF)", "quantidade": 1, "conferido": False},
                {"item": "Pedaleira / Pré-Amp / Reverb de Violino + Bateria 9V Reserva", "quantidade": 1, "conferido": False},
                {"item": "Caixa Ativa / Coluna PA Portátil + Pedestal", "quantidade": 1, "conferido": False},
                {"item": "Mesa de Som Compacta / Interface (Canal Violino + Canal Playback)", "quantidade": 1, "conferido": False},
                {"item": "Notebook / Tablet / Celular Dedicado para Playbacks (Modo Avião)", "quantidade": 1, "conferido": False},
                {"item": "Cabo P2-P10 Estéreo + Adaptador USB-C/Lightning Reserva (VS)", "quantidade": 2, "conferido": False},
                {"item": "Pedal Passador / Disparador Bluetooth de Playback", "quantidade": 1, "conferido": False},
                {"item": "Retorno In-Ear / Fone de Monitoração do Playback", "quantidade": 1, "conferido": False},
                {"item": "Estante de Partitura / Suporte de Tablet + Extensão Elétrica", "quantidade": 1, "conferido": False},
            ]
            obs_padrao = (
                "Cerimônia em formato Violino Solo + Playback (VS). "
                "Conferir volume do VS na passagem de som e manter dispositivo de reprodução em Modo Avião."
            )
        else:
            necessita_som = True
            equipamentos_iniciais = [
                {"item": "Caixas Ativas PA + Pedestais", "quantidade": 2, "conferido": False},
                {"item": "Mesa de Som Digital", "quantidade": 1, "conferido": False},
                {"item": "Microfones Instrumentos / Voz", "quantidade": 4, "conferido": False},
                {"item": "Estantes de Partitura Iluminadas", "quantidade": 4, "conferido": False},
            ]
            obs_padrao = None

        sonorizacao_padrao = SonorizacaoLogistica(
            evento_id=novo_evento.id,
            necessita_som_proprio=necessita_som,
            lista_equipamentos=equipamentos_iniciais,
            responsavel_tecnico_som=(
                f"Equipe de Som — {data.nome_banda_contratante}"
                if is_freelancer and data.nome_banda_contratante
                else None
            ),
            custo_locacao_tecnico_som=Decimal("0.00"),
            status_pagamento_som=StatusPagamentoEnum.PAGO if is_freelancer else StatusPagamentoEnum.PENDENTE,
            observacoes_logistica=obs_padrao,
        )
        db.add(sonorizacao_padrao)

        # Se for Freelancer, cria automaticamente a parcela de recebimento do cachê da outra banda
        if is_freelancer and (data.valor_total_bruto or Decimal("0.00")) > Decimal("0.00"):
            ja_pago = status_cache_fl == "PAGO"
            parcela_cache = ParcelaContrato(
                evento_id=novo_evento.id,
                numero_parcela=1,
                tipo_parcela=TipoParcelaEnum.QUITACAO_FINAL,
                descricao=f"Recebimento do Meu Cachê Freelancer — {data.nome_banda_contratante or 'Banda Contratante'}",
                valor_parcela=data.valor_total_bruto,
                data_vencimento=data.data_casamento,
                data_pagamento=date.today() if ja_pago else None,
                forma_pagamento=FormaPagamentoEnum.PIX,
                status=StatusParcelaContratoEnum.PAGO if ja_pago else StatusParcelaContratoEnum.ABERTO,
            )
            db.add(parcela_cache)

        db.commit()

        return EventoService.obter_evento_360(db, novo_evento.id)

    @staticmethod
    def confirmar_recebimento_cache_freelancer(
        db: Session, evento_id: int
    ) -> EventoCasamento360Out:
        ev = EventoService.obter_evento_model(db, evento_id)
        hoje = date.today()
        if ev.parcelas and len(ev.parcelas) > 0:
            for p in ev.parcelas:
                if p.status != StatusParcelaContratoEnum.PAGO:
                    p.status = StatusParcelaContratoEnum.PAGO
                    p.data_pagamento = hoje
        else:
            nova_parcela = ParcelaContrato(
                evento_id=ev.id,
                numero_parcela=1,
                tipo_parcela=TipoParcelaEnum.QUITACAO_FINAL,
                descricao=f"Recebimento do Meu Cachê Freelancer — {ev.nome_banda_contratante or 'Banda Contratante'}",
                valor_parcela=ev.valor_total_bruto or Decimal("0.00"),
                data_vencimento=ev.data_casamento,
                data_pagamento=hoje,
                forma_pagamento=FormaPagamentoEnum.PIX,
                status=StatusParcelaContratoEnum.PAGO,
            )
            db.add(nova_parcela)

        db.commit()
        return EventoService.obter_evento_360(db, evento_id)

    @staticmethod
    def atualizar_evento(
        db: Session, evento_id: int, data: EventoCasamentoUpdate
    ) -> EventoCasamento360Out:
        ev = EventoService.obter_evento_model(db, evento_id)
        update_dict = data.model_dump(exclude_unset=True)

        if "codigo_contrato" in update_dict and update_dict["codigo_contrato"]:
            if update_dict["codigo_contrato"] != ev.codigo_contrato:
                existente = EventoRepository.get_by_codigo_contrato(
                    db, update_dict["codigo_contrato"]
                )
                if existente and existente.id != evento_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Já existe outro contrato com o código '{update_dict['codigo_contrato']}'.",
                    )

        novo_chegada = update_dict.get("horario_chegada_banda", ev.horario_chegada_banda)
        novo_inicio = update_dict.get("horario_inicio_cerimonia", ev.horario_inicio_cerimonia)
        if novo_chegada > novo_inicio:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O horário de chegada da banda não pode ser posterior ao horário de início da cerimônia.",
            )

        for field, value in update_dict.items():
            if field == "tipo_contratacao" and isinstance(value, TipoContratacaoEventoEnum):
                value = value.value
            setattr(ev, field, value)

        # Se for casamento Freelancer com apenas 1 parcela de cachê, sincroniza o valor da parcela
        if (
            ev.tipo_contratacao == TipoContratacaoEventoEnum.FREELANCER_CACHE.value
            and "valor_total_bruto" in update_dict
            and ev.parcelas
            and len(ev.parcelas) == 1
        ):
            ev.parcelas[0].valor_parcela = ev.valor_total_bruto

        db.commit()
        return EventoService.obter_evento_360(db, evento_id)

    @staticmethod
    def remover_evento(db: Session, evento_id: int) -> None:
        ev = EventoService.obter_evento_model(db, evento_id)
        db.delete(ev)
        db.commit()

    # =========================================================================
    # MÓDULO C: ESCALA DE MÚSICOS DO CASAMENTO
    # =========================================================================
    @staticmethod
    def adicionar_musico_escala(
        db: Session, evento_id: int, data: EscalaMusicoCreate
    ) -> EscalaMusicoOut:
        ev = EventoService.obter_evento_model(db, evento_id)
        musico = MusicoRepository.get_by_id(db, data.musico_id)
        if not musico:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Músico selecionado não encontrado.",
            )

        for esc_existente in ev.escalas:
            if esc_existente.musico_id == data.musico_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"O músico {musico.nome_completo} já está escalado neste casamento.",
                )

        instrumento = (
            data.instrumento_no_evento.strip()
            if data.instrumento_no_evento and data.instrumento_no_evento.strip()
            else musico.instrumento_principal
        )
        valor_cache = (
            data.valor_cache_combinado
            if data.valor_cache_combinado is not None
            else musico.valor_cache_base
        )

        data_pagto = data.data_pagamento
        if data.status_pagamento == StatusPagamentoEnum.PAGO and not data_pagto:
            data_pagto = date.today()

        nova_escala = EscalaMusico(
            evento_id=evento_id,
            musico_id=musico.id,
            instrumento_no_evento=instrumento,
            valor_cache_combinado=valor_cache,
            taxa_deslocamento_combustivel=data.taxa_deslocamento_combustivel,
            status_confirmacao=data.status_confirmacao,
            status_pagamento=data.status_pagamento,
            data_pagamento=data_pagto,
            comprovante_pagamento_url=data.comprovante_pagamento_url,
            observacoes_escala=data.observacoes_escala,
        )
        db.add(nova_escala)
        db.commit()
        db.refresh(nova_escala)

        escala_completa = EventoRepository.get_escala_by_id(db, nova_escala.id)
        out = EscalaMusicoOut.model_validate(escala_completa)
        out.alerta_conflito = EventoService._verificar_conflito_escala_musico(
            db, musico.id, ev
        )
        return out

    @staticmethod
    def atualizar_escala_musico(
        db: Session, evento_id: int, escala_id: int, data: EscalaMusicoUpdate
    ) -> EscalaMusicoOut:
        escala = EventoRepository.get_escala_by_id(db, escala_id)
        if not escala or escala.evento_id != evento_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Registro de escala não encontrado para este casamento.",
            )

        update_dict = data.model_dump(exclude_unset=True)
        if update_dict.get("status_pagamento") == StatusPagamentoEnum.PAGO:
            if not update_dict.get("data_pagamento") and not escala.data_pagamento:
                update_dict["data_pagamento"] = date.today()
        elif update_dict.get("status_pagamento") == StatusPagamentoEnum.PENDENTE:
            update_dict["data_pagamento"] = None

        for field, value in update_dict.items():
            setattr(escala, field, value)

        db.commit()
        db.refresh(escala)

        out = EscalaMusicoOut.model_validate(escala)
        out.alerta_conflito = EventoService._verificar_conflito_escala_musico(
            db, escala.musico_id, escala.evento
        )
        return out

    @staticmethod
    def baixar_pagamento_escala(
        db: Session,
        evento_id: int,
        escala_id: int,
        payload: Optional[EscalaMusicoBaixaPagamentoRequest] = None,
    ) -> EscalaMusicoOut:
        escala = EventoRepository.get_escala_by_id(db, escala_id)
        if not escala or escala.evento_id != evento_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Registro de escala não encontrado para este casamento.",
            )

        escala.status_pagamento = StatusPagamentoEnum.PAGO
        escala.data_pagamento = (
            payload.data_pagamento
            if payload and payload.data_pagamento
            else date.today()
        )
        if payload and payload.comprovante_pagamento_url:
            escala.comprovante_pagamento_url = payload.comprovante_pagamento_url
        if payload and payload.observacoes_escala:
            escala.observacoes_escala = payload.observacoes_escala

        db.commit()
        db.refresh(escala)

        out = EscalaMusicoOut.model_validate(escala)
        out.alerta_conflito = EventoService._verificar_conflito_escala_musico(
            db, escala.musico_id, escala.evento
        )
        return out

    @staticmethod
    def remover_musico_escala(db: Session, evento_id: int, escala_id: int) -> None:
        escala = EventoRepository.get_escala_by_id(db, escala_id)
        if not escala or escala.evento_id != evento_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Registro de escala não encontrado para este casamento.",
            )
        db.delete(escala)
        db.commit()

    # =========================================================================
    # MÓDULO D: REPERTÓRIO DA CERIMÔNIA E REORDENAÇÃO
    # =========================================================================
    @staticmethod
    def adicionar_item_repertorio(
        db: Session, evento_id: int, data: RepertorioItemCreate
    ) -> RepertorioItemOut:
        ev = EventoService.obter_evento_model(db, evento_id)
        ordens_atuais = [r.ordem_execucao for r in ev.repertorio]
        proxima_ordem = max(ordens_atuais, default=0) + 1

        ordem = data.ordem_execucao if data.ordem_execucao else proxima_ordem
        if ordem in ordens_atuais:
            # Desloca itens seguintes para abrir espaço na ordem escolhida
            for r in sorted(ev.repertorio, key=lambda x: x.ordem_execucao, reverse=True):
                if r.ordem_execucao >= ordem:
                    r.ordem_execucao += 1
            db.flush()

        payload = data.model_dump()
        payload["ordem_execucao"] = ordem
        novo_item = RepertorioCerimonia(evento_id=evento_id, **payload)
        db.add(novo_item)
        db.commit()
        db.refresh(novo_item)
        return RepertorioItemOut.model_validate(novo_item)

    @staticmethod
    def atualizar_item_repertorio(
        db: Session, evento_id: int, item_id: int, data: RepertorioItemUpdate
    ) -> RepertorioItemOut:
        item = EventoRepository.get_repertorio_item_by_id(db, item_id)
        if not item or item.evento_id != evento_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Música não encontrada no repertório deste casamento.",
            )

        update_dict = data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(item, field, value)

        db.commit()
        db.refresh(item)
        return RepertorioItemOut.model_validate(item)

    @staticmethod
    def remover_item_repertorio(db: Session, evento_id: int, item_id: int) -> None:
        item = EventoRepository.get_repertorio_item_by_id(db, item_id)
        if not item or item.evento_id != evento_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Música não encontrada no repertório deste casamento.",
            )
        db.delete(item)
        db.flush()

        # Reindexa as ordens para manter sequência limpa (1..N)
        restantes = (
            db.query(RepertorioCerimonia)
            .filter(RepertorioCerimonia.evento_id == evento_id)
            .order_by(RepertorioCerimonia.ordem_execucao.asc())
            .all()
        )
        for idx, rep in enumerate(restantes, start=1):
            rep.ordem_execucao = idx + 1000
        db.flush()
        for idx, rep in enumerate(restantes, start=1):
            rep.ordem_execucao = idx
        db.commit()

    @staticmethod
    def reordenar_repertorio(
        db: Session, evento_id: int, request: ReordenarRepertorioRequest
    ) -> List[RepertorioItemOut]:
        ev = EventoService.obter_evento_model(db, evento_id)
        mapa_itens = {r.id: r for r in ev.repertorio}

        # Primeiro passo: atribui ordens temporárias altas para não violar UNIQUE (evento_id, ordem_execucao)
        for idx, item_req in enumerate(request.itens, start=1):
            if item_req.id not in mapa_itens:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Item de repertório ID {item_req.id} não pertence ao casamento {evento_id}.",
                )
            mapa_itens[item_req.id].ordem_execucao = 1000 + idx
        db.flush()

        # Segundo passo: atribui a ordem definitiva solicitada
        for item_req in request.itens:
            mapa_itens[item_req.id].ordem_execucao = item_req.ordem_execucao
        db.commit()

        atualizados = (
            db.query(RepertorioCerimonia)
            .filter(RepertorioCerimonia.evento_id == evento_id)
            .order_by(RepertorioCerimonia.ordem_execucao.asc())
            .all()
        )
        return [RepertorioItemOut.model_validate(r) for r in atualizados]

    # =========================================================================
    # MÓDULO E: SONORIZAÇÃO E LOGÍSTICA (1:1)
    # =========================================================================
    @staticmethod
    def atualizar_sonorizacao(
        db: Session, evento_id: int, data: SonorizacaoCreateUpdate
    ) -> SonorizacaoOut:
        EventoService.obter_evento_model(db, evento_id)
        son = EventoRepository.get_sonorizacao_by_evento(db, evento_id)

        equipamentos_json = [eq.model_dump() for eq in data.lista_equipamentos]
        data_pagto = data.data_pagamento_som
        if data.status_pagamento_som == StatusPagamentoEnum.PAGO and not data_pagto:
            data_pagto = date.today()
        elif data.status_pagamento_som == StatusPagamentoEnum.PENDENTE:
            data_pagto = None

        if not son:
            son = SonorizacaoLogistica(
                evento_id=evento_id,
                necessita_som_proprio=data.necessita_som_proprio,
                lista_equipamentos=equipamentos_json,
                descricao_equipamentos_texto=data.descricao_equipamentos_texto,
                responsavel_tecnico_som=data.responsavel_tecnico_som,
                telefone_responsavel_som=data.telefone_responsavel_som,
                custo_locacao_tecnico_som=data.custo_locacao_tecnico_som,
                status_pagamento_som=data.status_pagamento_som,
                data_pagamento_som=data_pagto,
                observacoes_logistica=data.observacoes_logistica,
            )
            db.add(son)
        else:
            son.necessita_som_proprio = data.necessita_som_proprio
            son.lista_equipamentos = equipamentos_json
            son.descricao_equipamentos_texto = data.descricao_equipamentos_texto
            son.responsavel_tecnico_som = data.responsavel_tecnico_som
            son.telefone_responsavel_som = data.telefone_responsavel_som
            son.custo_locacao_tecnico_som = data.custo_locacao_tecnico_som
            son.status_pagamento_som = data.status_pagamento_som
            son.data_pagamento_som = data_pagto
            son.observacoes_logistica = data.observacoes_logistica

        db.commit()
        db.refresh(son)
        return SonorizacaoOut.model_validate(son)

    # =========================================================================
    # MÓDULO F: PARCELAS DO CONTRATO (NOIVOS)
    # =========================================================================
    @staticmethod
    def adicionar_parcela(
        db: Session, evento_id: int, data: ParcelaContratoCreate
    ) -> ParcelaContratoOut:
        ev = EventoService.obter_evento_model(db, evento_id)
        numeros_atuais = [p.numero_parcela for p in ev.parcelas]
        proximo_numero = max(numeros_atuais, default=0) + 1
        numero = data.numero_parcela if data.numero_parcela else proximo_numero

        if numero in numeros_atuais:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A parcela nº {numero} já existe para este casamento.",
            )

        data_pagto = data.data_pagamento
        if data.status == StatusParcelaContratoEnum.PAGO and not data_pagto:
            data_pagto = date.today()

        payload = data.model_dump()
        payload["numero_parcela"] = numero
        payload["data_pagamento"] = data_pagto

        nova_parcela = ParcelaContrato(evento_id=evento_id, **payload)
        db.add(nova_parcela)
        db.commit()
        db.refresh(nova_parcela)
        return ParcelaContratoOut.model_validate(nova_parcela)

    @staticmethod
    def atualizar_parcela(
        db: Session, evento_id: int, parcela_id: int, data: ParcelaContratoUpdate
    ) -> ParcelaContratoOut:
        parcela = EventoRepository.get_parcela_by_id(db, parcela_id)
        if not parcela or parcela.evento_id != evento_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parcela não encontrada para este casamento.",
            )

        update_dict = data.model_dump(exclude_unset=True)
        if update_dict.get("status") == StatusParcelaContratoEnum.PAGO:
            if not update_dict.get("data_pagamento") and not parcela.data_pagamento:
                update_dict["data_pagamento"] = date.today()
        elif update_dict.get("status") in (
            StatusParcelaContratoEnum.ABERTO,
            StatusParcelaContratoEnum.ATRASADO,
        ):
            update_dict["data_pagamento"] = None

        for field, value in update_dict.items():
            setattr(parcela, field, value)

        db.commit()
        db.refresh(parcela)
        return ParcelaContratoOut.model_validate(parcela)

    @staticmethod
    def baixar_parcela(
        db: Session,
        evento_id: int,
        parcela_id: int,
        payload: Optional[ParcelaContratoBaixaRequest] = None,
    ) -> ParcelaContratoOut:
        parcela = EventoRepository.get_parcela_by_id(db, parcela_id)
        if not parcela or parcela.evento_id != evento_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parcela não encontrada para este casamento.",
            )

        parcela.status = StatusParcelaContratoEnum.PAGO
        parcela.data_pagamento = (
            payload.data_pagamento
            if payload and payload.data_pagamento
            else date.today()
        )
        if payload and payload.forma_pagamento:
            parcela.forma_pagamento = payload.forma_pagamento
        if payload and payload.comprovante_url:
            parcela.comprovante_url = payload.comprovante_url
        if payload and payload.observacoes:
            parcela.observacoes = payload.observacoes

        db.commit()
        db.refresh(parcela)
        return ParcelaContratoOut.model_validate(parcela)

    @staticmethod
    def remover_parcela(db: Session, evento_id: int, parcela_id: int) -> None:
        parcela = EventoRepository.get_parcela_by_id(db, parcela_id)
        if not parcela or parcela.evento_id != evento_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parcela não encontrada para este casamento.",
            )
        db.delete(parcela)
        db.flush()

        # Reindexa os números das parcelas para manter sequência limpa (1..N)
        restantes = (
            db.query(ParcelaContrato)
            .filter(ParcelaContrato.evento_id == evento_id)
            .order_by(ParcelaContrato.numero_parcela.asc())
            .all()
        )
        for idx, p in enumerate(restantes, start=1):
            p.numero_parcela = idx + 1000
        db.flush()
        for idx, p in enumerate(restantes, start=1):
            p.numero_parcela = idx
        db.commit()

    # =========================================================================
    # DASHBOARD EXECUTIVO (/api/v1/dashboard)
    # =========================================================================
    @staticmethod
    def obter_dashboard(
        db: Session,
        mes_ref: Optional[int] = None,
        ano_ref: Optional[int] = None,
    ) -> DashboardOverviewOut:
        hoje = date.today()
        mes = mes_ref or hoje.month
        ano = ano_ref or hoje.year

        todos_eventos = EventoRepository.list_eventos(db)
        eventos_ativos = [
            ev for ev in todos_eventos if ev.status != StatusEventoEnum.CANCELADO
        ]
        eventos_ano = [ev for ev in eventos_ativos if ev.data_casamento.year == ano]
        eventos_mes = [
            ev
            for ev in eventos_ano
            if ev.data_casamento.month == mes
        ]

        faturamento_mes = Decimal(
            sum((ev.valor_total_bruto or Decimal("0.00")) for ev in eventos_mes)
        ).quantize(Decimal("0.01"))

        receita_bruta_ano = Decimal("0.00")
        despesas_totais_ano = Decimal("0.00")
        lucro_liquido_previsto_ano = Decimal("0.00")
        saldo_a_receber_noivos_total = Decimal("0.00")
        caches_pendentes_pagamento = Decimal("0.00")
        quantidade_caches_pendentes = 0

        alertas: List[AlertaFinanceiroItem] = []

        for ev in eventos_ativos:
            dre = EventoService.calcular_dre_evento(ev)
            if ev.data_casamento.year == ano:
                receita_bruta_ano += dre.receita_bruta
                despesas_totais_ano += dre.despesas_totais
                lucro_liquido_previsto_ano += dre.lucro_liquido_banda

            saldo_a_receber_noivos_total += dre.saldo_a_receber_noivos
            caches_pendentes_pagamento += dre.total_pendente_musicos

            # Contabiliza cachês pendentes e gera alertas
            for esc in ev.escalas:
                if (
                    esc.status_confirmacao != StatusConfirmacaoEscalaEnum.RECUSOU
                    and esc.status_pagamento == StatusPagamentoEnum.PENDENTE
                ):
                    quantidade_caches_pendentes += 1
                    valor_musico = (esc.valor_cache_combinado or Decimal("0.00")) + (
                        esc.taxa_deslocamento_combustivel or Decimal("0.00")
                    )
                    nome_musico = esc.musico.nome_completo if esc.musico else f"Músico #{esc.musico_id}"
                    status_alerta = (
                        "ATRASADO"
                        if ev.data_casamento < hoje
                        else (
                            "VENCENDO_SEMANA"
                            if (ev.data_casamento - hoje).days <= 14
                            else "PENDENTE"
                        )
                    )
                    alertas.append(
                        AlertaFinanceiroItem(
                            tipo="CACHE_MUSICO",
                            evento_id=ev.id,
                            codigo_contrato=ev.codigo_contrato,
                            nome_noivos=ev.nome_noivos,
                            descricao=f"Cachê + Deslocamento ({esc.instrumento_no_evento})",
                            favorecido_ou_pagador=nome_musico,
                            valor=valor_musico.quantize(Decimal("0.01")),
                            data_referencia=ev.data_casamento,
                            status_alerta=status_alerta,
                        )
                    )

            # Alertas de parcelas dos noivos em aberto ou atrasadas
            for parc in ev.parcelas:
                if parc.status in (
                    StatusParcelaContratoEnum.ABERTO,
                    StatusParcelaContratoEnum.ATRASADO,
                ):
                    atrasada = (
                        parc.status == StatusParcelaContratoEnum.ATRASADO
                        or parc.data_vencimento < hoje
                    )
                    status_alerta = (
                        "ATRASADO"
                        if atrasada
                        else (
                            "VENCENDO_SEMANA"
                            if (parc.data_vencimento - hoje).days <= 14
                            else "PENDENTE"
                        )
                    )
                    pagador_label = (
                        f"{ev.nome_banda_contratante} (Cachê Freelancer)"
                        if ev.tipo_contratacao == TipoContratacaoEventoEnum.FREELANCER_CACHE.value
                        and ev.nome_banda_contratante
                        else ev.nome_noivos
                    )
                    alertas.append(
                        AlertaFinanceiroItem(
                            tipo="PARCELA_NOIVOS",
                            evento_id=ev.id,
                            codigo_contrato=ev.codigo_contrato,
                            nome_noivos=ev.nome_noivos,
                            descricao=f"Parcela #{parc.numero_parcela} - {parc.descricao}",
                            favorecido_ou_pagador=pagador_label,
                            valor=parc.valor_parcela.quantize(Decimal("0.01")),
                            data_referencia=parc.data_vencimento,
                            status_alerta=status_alerta,
                        )
                    )

        # Ordena alertas por criticidade (ATRASADO primeiro) e data_referencia
        prioridade = {"ATRASADO": 0, "VENCENDO_SEMANA": 1, "PENDENTE": 2}
        alertas.sort(key=lambda a: (prioridade.get(a.status_alerta, 3), a.data_referencia))

        # Próximos casamentos (a partir de hoje, ou os próximos agendados)
        proximos_models = [
            ev
            for ev in eventos_ativos
            if ev.data_casamento >= hoje - timedelta(days=2)
            and ev.status != StatusEventoEnum.REALIZADO
        ]
        if not proximos_models:
            proximos_models = eventos_ativos[:5]

        proximos_out: List[EventoCasamentoListOut] = []
        for ev in proximos_models[:6]:
            item = EventoCasamentoListOut.model_validate(ev)
            item.resumo_financeiro = EventoService.calcular_dre_evento(ev)
            item.alerta_conflito_agenda = EventoService.verificar_conflito_agenda(
                db,
                data_casamento=ev.data_casamento,
                horario_chegada_banda=ev.horario_chegada_banda,
                horario_inicio_cerimonia=ev.horario_inicio_cerimonia,
                horario_termino_previsto=ev.horario_termino_previsto,
                exclude_evento_id=ev.id,
            )
            proximos_out.append(item)

        confirmados_ano = sum(
            1
            for ev in eventos_ano
            if ev.status
            in (
                StatusEventoEnum.CONTRATO_ASSINADO,
                StatusEventoEnum.EM_PREPARACAO,
                StatusEventoEnum.REALIZADO,
            )
        )

        return DashboardOverviewOut(
            faturamento_mes=faturamento_mes,
            lucro_liquido_previsto_ano=lucro_liquido_previsto_ano.quantize(Decimal("0.01")),
            receita_bruta_ano=receita_bruta_ano.quantize(Decimal("0.01")),
            despesas_totais_ano=despesas_totais_ano.quantize(Decimal("0.01")),
            total_casamentos_ano=len(eventos_ano),
            total_casamentos_confirmados_ano=confirmados_ano,
            caches_pendentes_pagamento=caches_pendentes_pagamento.quantize(Decimal("0.01")),
            quantidade_caches_pendentes=quantidade_caches_pendentes,
            saldo_a_receber_noivos_total=saldo_a_receber_noivos_total.quantize(Decimal("0.01")),
            proximos_casamentos=proximos_out,
            alertas_vencimentos=alertas[:15],
        )
