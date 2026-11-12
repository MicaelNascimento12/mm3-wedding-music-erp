from decimal import Decimal
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.models import (
    Musico,
    StatusConfirmacaoEscalaEnum,
    StatusMusicoEnum,
    StatusPagamentoEnum,
)
from app.repositories.musico_repository import MusicoRepository
from app.schemas.schemas import (
    HistoricoEscalaMusicoItem,
    HistoricoFinanceiroMusicoOut,
    MusicoCreate,
    MusicoOut,
    MusicoUpdate,
)


class MusicoService:
    @staticmethod
    def listar_musicos(
        db: Session,
        search: Optional[str] = None,
        instrumento: Optional[str] = None,
        status_filtro: Optional[StatusMusicoEnum] = None,
    ) -> List[Musico]:
        return MusicoRepository.list_musicos(
            db, search=search, instrumento=instrumento, status=status_filtro
        )

    @staticmethod
    def obter_musico(db: Session, musico_id: int) -> Musico:
        musico = MusicoRepository.get_by_id(db, musico_id)
        if not musico:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Músico com ID {musico_id} não encontrado.",
            )
        return musico

    @staticmethod
    def criar_musico(db: Session, data: MusicoCreate) -> Musico:
        if data.email:
            existente = MusicoRepository.get_by_email(db, str(data.email))
            if existente:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Já existe um músico cadastrado com este e-mail.",
                )
        return MusicoRepository.create(db, data)

    @staticmethod
    def atualizar_musico(
        db: Session, musico_id: int, data: MusicoUpdate
    ) -> Musico:
        musico = MusicoService.obter_musico(db, musico_id)
        if data.email and data.email != musico.email:
            existente = MusicoRepository.get_by_email(db, str(data.email))
            if existente and existente.id != musico_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Já existe outro músico cadastrado com este e-mail.",
                )
        return MusicoRepository.update(db, musico, data)

    @staticmethod
    def remover_musico(db: Session, musico_id: int) -> None:
        musico = MusicoService.obter_musico(db, musico_id)
        try:
            MusicoRepository.delete(db, musico)
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não é possível excluir um músico que já possui escalas vinculadas a casamentos. Altere o status para INATIVO.",
            )

    @staticmethod
    def obter_historico_financeiro(
        db: Session, musico_id: int
    ) -> HistoricoFinanceiroMusicoOut:
        musico = MusicoService.obter_musico(db, musico_id)
        escalas = MusicoRepository.get_escalas_com_evento(db, musico_id)

        # Ordenar por data do casamento decrescente
        escalas_ordenadas = sorted(
            escalas,
            key=lambda esc: esc.evento.data_casamento if esc.evento else None,
            reverse=True,
        )

        total_pagos = Decimal("0.00")
        saldo_pendente = Decimal("0.00")
        confirmados_count = 0
        itens: List[HistoricoEscalaMusicoItem] = []

        for esc in escalas_ordenadas:
            ev = esc.evento
            if not ev:
                continue

            valor_total = (esc.valor_cache_combinado or Decimal("0.00")) + (
                esc.taxa_deslocamento_combustivel or Decimal("0.00")
            )

            if esc.status_confirmacao == StatusConfirmacaoEscalaEnum.CONFIRMADO:
                confirmados_count += 1

            if esc.status_confirmacao != StatusConfirmacaoEscalaEnum.RECUSOU:
                if esc.status_pagamento == StatusPagamentoEnum.PAGO:
                    total_pagos += valor_total
                else:
                    saldo_pendente += valor_total

            itens.append(
                HistoricoEscalaMusicoItem(
                    escala_id=esc.id,
                    evento_id=ev.id,
                    codigo_contrato=ev.codigo_contrato,
                    nome_noivos=ev.nome_noivos,
                    data_casamento=ev.data_casamento,
                    local_cerimonia=ev.local_cerimonia,
                    cidade_cerimonia=ev.cidade_cerimonia,
                    instrumento_no_evento=esc.instrumento_no_evento,
                    valor_cache_combinado=esc.valor_cache_combinado,
                    taxa_deslocamento_combustivel=esc.taxa_deslocamento_combustivel,
                    valor_total_musico=valor_total,
                    status_confirmacao=esc.status_confirmacao,
                    status_pagamento=esc.status_pagamento,
                    data_pagamento=esc.data_pagamento,
                    observacoes_escala=esc.observacoes_escala,
                )
            )

        return HistoricoFinanceiroMusicoOut(
            musico=MusicoOut.model_validate(musico),
            total_casamentos_escalado=len(itens),
            total_casamentos_confirmados=confirmados_count,
            total_caches_pagos=total_pagos.quantize(Decimal("0.01")),
            saldo_pendente_a_receber=saldo_pendente.quantize(Decimal("0.01")),
            total_geral_acumulado=(total_pagos + saldo_pendente).quantize(Decimal("0.01")),
            historico_escalas=itens,
        )
