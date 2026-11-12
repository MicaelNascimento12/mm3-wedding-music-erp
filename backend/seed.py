"""
Script de Seed e Inicialização do Banco de Dados (PostgreSQL 15+ ou SQLite Local).
Cria as tabelas, a view analítica vw_resumo_financeiro_eventos e popula os dados iniciais
realistas (usuários, 8 músicos e 3 casamentos completos com escalas, repertório, som e parcelas).
"""

from datetime import date, time
from decimal import Decimal
import math
from pathlib import Path
import struct
import wave
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import Base, SessionLocal, engine
from app.core.security import get_password_hash
from app.models.models import (
    EscalaMusico,
    EventoCasamento,
    FormaPagamentoEnum,
    FormacaoMusicalEnum,
    MomentoCerimoniaEnum,
    Musico,
    ParcelaContrato,
    PerfilUsuarioEnum,
    PlaybackBiblioteca,
    RepertorioCerimonia,
    SonorizacaoLogistica,
    StatusConfirmacaoEscalaEnum,
    StatusEventoEnum,
    StatusMusicoEnum,
    StatusPagamentoEnum,
    StatusParcelaContratoEnum,
    TipoParcelaEnum,
    Usuario,
)


VIEW_SQL = """
CREATE VIEW IF NOT EXISTS vw_resumo_financeiro_eventos AS
WITH custos_escala AS (
    SELECT
        evento_id,
        COUNT(id) AS total_musicos_escalados,
        COUNT(id) FILTER (WHERE status_confirmacao = 'CONFIRMADO') AS musicos_confirmados,
        COALESCE(SUM(valor_cache_combinado), 0.00) AS total_caches_musicos,
        COALESCE(SUM(taxa_deslocamento_combustivel), 0.00) AS total_deslocamento_musicos,
        COALESCE(SUM(valor_cache_combinado + taxa_deslocamento_combustivel) FILTER (WHERE status_pagamento = 'PAGO'), 0.00) AS total_pago_musicos,
        COALESCE(SUM(valor_cache_combinado + taxa_deslocamento_combustivel) FILTER (WHERE status_pagamento = 'PENDENTE'), 0.00) AS total_pendente_musicos
    FROM escalas_musicos
    WHERE status_confirmacao <> 'RECUSOU'
    GROUP BY evento_id
),
custos_som AS (
    SELECT
        evento_id,
        COALESCE(custo_locacao_tecnico_som, 0.00) AS custo_som
    FROM sonorizacao_logistica
),
recebimentos_noivos AS (
    SELECT
        evento_id,
        COALESCE(SUM(valor_parcela) FILTER (WHERE status = 'PAGO'), 0.00) AS valor_recebido_noivos,
        COALESCE(SUM(valor_parcela) FILTER (WHERE status IN ('ABERTO', 'ATRASADO')), 0.00) AS valor_a_receber_noivos
    FROM parcelas_contrato
    GROUP BY evento_id
)
SELECT
    e.id AS evento_id,
    e.codigo_contrato,
    e.nome_noivos,
    e.data_casamento,
    e.status AS status_evento,
    e.tipo_formacao,
    e.valor_total_bruto AS receita_bruta,
    COALESCE(r.valor_recebido_noivos, 0.00) AS receita_ja_recebida,
    (e.valor_total_bruto - COALESCE(r.valor_recebido_noivos, 0.00)) AS saldo_a_receber_noivos,
    COALESCE(ce.total_musicos_escalados, 0) AS total_musicos_escalados,
    COALESCE(ce.musicos_confirmados, 0) AS musicos_confirmados,
    COALESCE(ce.total_caches_musicos, 0.00) AS custo_caches,
    COALESCE(ce.total_deslocamento_musicos, 0.00) AS custo_deslocamento,
    COALESCE(cs.custo_som, 0.00) AS custo_sonorizacao,
    (COALESCE(ce.total_caches_musicos, 0.00) + COALESCE(ce.total_deslocamento_musicos, 0.00) + COALESCE(cs.custo_som, 0.00)) AS despesas_totais,
    COALESCE(ce.total_pago_musicos, 0.00) AS total_pago_musicos,
    COALESCE(ce.total_pendente_musicos, 0.00) AS total_pendente_musicos,
    (e.valor_total_bruto - (COALESCE(ce.total_caches_musicos, 0.00) + COALESCE(ce.total_deslocamento_musicos, 0.00) + COALESCE(cs.custo_som, 0.00))) AS lucro_liquido_banda,
    CASE
        WHEN e.valor_total_bruto > 0 THEN
            ROUND(
                ((e.valor_total_bruto - (COALESCE(ce.total_caches_musicos, 0.00) + COALESCE(ce.total_deslocamento_musicos, 0.00) + COALESCE(cs.custo_som, 0.00))) / e.valor_total_bruto) * 100,
                2
            )
        ELSE 0.00
    END AS margem_lucro_percentual
FROM eventos_casamento e
LEFT JOIN custos_escala ce ON ce.evento_id = e.id
LEFT JOIN custos_som cs ON cs.evento_id = e.id
LEFT JOIN recebimentos_noivos r ON r.evento_id = e.id;
"""


def _gerar_wav_playback_demo(filepath: Path, freqs: list[float], duration_sec: float = 6.0) -> None:
    """Gera um arquivo WAV suave de acordes para demonstrar o player de Playback (VS)."""
    if filepath.exists():
        return
    filepath.parent.mkdir(parents=True, exist_ok=True)
    sample_rate = 22050
    total_samples = int(sample_rate * duration_sec)
    chord_len = max(1, total_samples // len(freqs))

    with wave.open(str(filepath), "w") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)

        frames = bytearray()
        for i in range(total_samples):
            idx = min(len(freqs) - 1, i // chord_len)
            f = freqs[idx]
            t = i / sample_rate
            env = min(1.0, (i % chord_len) / 800.0) * max(0.15, 1.0 - ((i % chord_len) / chord_len) * 0.6)
            val = (
                0.45 * math.sin(2 * math.pi * f * t)
                + 0.25 * math.sin(2 * math.pi * (f * 1.25) * t)
                + 0.20 * math.sin(2 * math.pi * (f * 1.5) * t)
            ) * env
            sample = int(max(-32767, min(32767, val * 14000)))
            frames.extend(struct.pack("<h", sample))

        wav_file.writeframes(bytes(frames))


def _ensure_playback_schema_columns(db: Session) -> None:
    """Adiciona colunas de playback e tipo de contratação em bancos SQLite/Postgres existentes sem perda de dados."""
    alter_statements = [
        "ALTER TABLE repertorio_cerimonia ADD COLUMN usa_playback BOOLEAN NOT NULL DEFAULT 0",
        "ALTER TABLE repertorio_cerimonia ADD COLUMN link_playback_url VARCHAR(500)",
        "ALTER TABLE repertorio_cerimonia ADD COLUMN nome_arquivo_playback VARCHAR(255)",
        "ALTER TABLE repertorio_cerimonia ADD COLUMN duracao_playback VARCHAR(40)",
        "ALTER TABLE eventos_casamento ADD COLUMN tipo_contratacao VARCHAR(30) NOT NULL DEFAULT 'CONTRATO_PROPRIO'",
        "ALTER TABLE eventos_casamento ADD COLUMN nome_banda_contratante VARCHAR(200)",
    ]
    for stmt in alter_statements:
        try:
            db.execute(text(stmt))
            db.commit()
        except Exception:
            db.rollback()

    try:
        db.execute(
            text(
                "UPDATE eventos_casamento SET tipo_contratacao = 'CONTRATO_PROPRIO' WHERE tipo_contratacao IS NULL OR tipo_contratacao = ''"
            )
        )
        db.commit()
    except Exception:
        db.rollback()


def init_db_and_seed(db: Session) -> dict:
    """Inicializa o schema e popula dados realistas caso o banco esteja vazio."""
    Base.metadata.create_all(bind=engine)
    _ensure_playback_schema_columns(db)

    try:
        if engine.dialect.name == "postgresql":
            db.execute(text(VIEW_SQL.replace("CREATE VIEW IF NOT EXISTS", "CREATE OR REPLACE VIEW")))
        else:
            db.execute(text(VIEW_SQL))
        db.commit()
    except Exception:
        db.rollback()

    # 1. Seed de Usuários
    if db.query(Usuario).count() == 0:
        default_hash = get_password_hash("admin123")
        usuarios = [
            Usuario(
                nome_completo="Micael Maestro & Diretor Musical",
                email="admin@mm3musica.com.br",
                senha_hash=default_hash,
                perfil=PerfilUsuarioEnum.ADMIN_GESTOR,
                ativo=True,
            ),
            Usuario(
                nome_completo="Helena Prado - Cerimonial Musical",
                email="coord@mm3musica.com.br",
                senha_hash=default_hash,
                perfil=PerfilUsuarioEnum.COORDENADOR_CERIMONIA,
                ativo=True,
            ),
            Usuario(
                nome_completo="Roberto Campos - Gestão Financeira",
                email="financeiro@mm3musica.com.br",
                senha_hash=default_hash,
                perfil=PerfilUsuarioEnum.FINANCEIRO,
                ativo=True,
            ),
        ]
        db.add_all(usuarios)
        db.commit()

    # 2. Seed de Músicos
    if db.query(Musico).count() == 0:
        musicos_data = [
            Musico(
                nome_completo="Gabriel Santoro",
                instrumento_principal="Violino",
                instrumentos_secundarios="Viola de Arco",
                telefone_whatsapp="5511991234501",
                email="gabriel.violino@mm3musica.com.br",
                chave_pix="345.678.901-11",
                tipo_chave_pix="CPF",
                valor_cache_base=Decimal("450.00"),
                cidade="São Paulo",
                bairro="Pinheiros",
                status=StatusMusicoEnum.ATIVO,
                observacoes="Spalla principal da assessoria. Possui microfone DPA próprio para violino.",
            ),
            Musico(
                nome_completo="Clara Bittencourt",
                instrumento_principal="Teclado",
                instrumentos_secundarios="Piano Acústico, Órgão Litúrgico",
                telefone_whatsapp="5511991234502",
                email="clara.teclado@mm3musica.com.br",
                chave_pix="clara.teclado@mm3musica.com.br",
                tipo_chave_pix="EMAIL",
                valor_cache_base=Decimal("500.00"),
                cidade="São Paulo",
                bairro="Vila Mariana",
                status=StatusMusicoEnum.ATIVO,
                observacoes="Tecladista base e arranjadora. Leva Nord Stage 3 e pedal sustain.",
            ),
            Musico(
                nome_completo="Henrique Villa-Lobos Neto",
                instrumento_principal="Violoncelo",
                instrumentos_secundarios="Contrabaixo Acústico",
                telefone_whatsapp="5511991234503",
                email="henrique.cello@mm3musica.com.br",
                chave_pix="5511991234503",
                tipo_chave_pix="TELEFONE",
                valor_cache_base=Decimal("450.00"),
                cidade="São Paulo",
                bairro="Perdizes",
                status=StatusMusicoEnum.ATIVO,
                observacoes="Excelente leitura à primeira vista e repertório clássico/pop.",
            ),
            Musico(
                nome_completo="Lucas Almeida",
                instrumento_principal="Clarins",
                instrumentos_secundarios="Trompete, Flugelhorn",
                telefone_whatsapp="5511991234504",
                email="lucas.clarim@mm3musica.com.br",
                chave_pix="8f4e2a1b-9c3d-4e5f-a1b2-c3d4e5f60004",
                tipo_chave_pix="ALEATORIA",
                valor_cache_base=Decimal("380.00"),
                cidade="São Bernardo do Campo",
                bairro="Centro",
                status=StatusMusicoEnum.ATIVO,
                observacoes="Primeiro clarim triunfal. Possui clarim dourado heráldico para anúncio da noiva.",
            ),
            Musico(
                nome_completo="Marcos Vinícius",
                instrumento_principal="Clarins",
                instrumentos_secundarios="Trompete, Trombone",
                telefone_whatsapp="5511991234505",
                email="marcos.clarim@mm3musica.com.br",
                chave_pix="222.333.444-55",
                tipo_chave_pix="CPF",
                valor_cache_base=Decimal("380.00"),
                cidade="Santo André",
                bairro="Jardim",
                status=StatusMusicoEnum.ATIVO,
                observacoes="Segundo clarim para dobradinha em marchas nupciais.",
            ),
            Musico(
                nome_completo="Sofia Lorenzi",
                instrumento_principal="Voz",
                instrumentos_secundarios="Violão Acústico",
                telefone_whatsapp="5511991234506",
                email="sofia.voz@mm3musica.com.br",
                chave_pix="sofia.voz@mm3musica.com.br",
                tipo_chave_pix="EMAIL",
                valor_cache_base=Decimal("520.00"),
                cidade="São Paulo",
                bairro="Moema",
                status=StatusMusicoEnum.ATIVO,
                observacoes="Soprano lírico e pop internacional (Inglês, Italiano e Francês).",
            ),
            Musico(
                nome_completo="Daniel Ribeiro",
                instrumento_principal="Voz",
                instrumentos_secundarios="Violão, Guitarra Semi-acústica",
                telefone_whatsapp="5511991234507",
                email="daniel.tenor@mm3musica.com.br",
                chave_pix="5511991234507",
                tipo_chave_pix="TELEFONE",
                valor_cache_base=Decimal("480.00"),
                cidade="São Paulo",
                bairro="Tatuapé",
                status=StatusMusicoEnum.ATIVO,
                observacoes="Tenor / Voz masculina folk & pop. Faz duetos de Andrea Bocelli e Ed Sheeran.",
            ),
            Musico(
                nome_completo="Thiago Percussa",
                instrumento_principal="Percussão",
                instrumentos_secundarios="Bateria, Cajón, Carrilhão/Chimes, Tímpanos Digitais",
                telefone_whatsapp="5511991234508",
                email="thiago.percussao@mm3musica.com.br",
                chave_pix="444.555.666-77",
                tipo_chave_pix="CPF",
                valor_cache_base=Decimal("400.00"),
                cidade="Osasco",
                bairro="Bela Vista",
                status=StatusMusicoEnum.ATIVO,
                observacoes="Kit completo de efeito para cerimônia (prato suspenso, carrilhão, bumbo sinfônico).",
            ),
        ]
        db.add_all(musicos_data)
        db.commit()

    # 3. Seed de Casamentos Completos
    if db.query(EventoCasamento).count() == 0:
        musicos = {m.email: m for m in db.query(Musico).all()}
        m_violino = musicos["gabriel.violino@mm3musica.com.br"]
        m_teclado = musicos["clara.teclado@mm3musica.com.br"]
        m_cello = musicos["henrique.cello@mm3musica.com.br"]
        m_clarim1 = musicos["lucas.clarim@mm3musica.com.br"]
        m_clarim2 = musicos["marcos.clarim@mm3musica.com.br"]
        m_soprano = musicos["sofia.voz@mm3musica.com.br"]
        m_tenor = musicos["daniel.tenor@mm3musica.com.br"]
        m_percussao = musicos["thiago.percussao@mm3musica.com.br"]

        # --- CASAMENTO 1 ---
        ev1 = EventoCasamento(
            codigo_contrato="CT-2026-001",
            nome_noivos="Mariana Costa & Rafael Albuquerque",
            cpf_cnpj_contratante="398.412.768-40",
            telefone_contato="5511988776655",
            email_contratante="mariana.rafael2026@gmail.com",
            data_casamento=date(2026, 11, 7),
            horario_inicio_cerimonia=time(16, 30),
            horario_termino_previsto=time(18, 0),
            horario_chegada_banda=time(14, 30),
            local_cerimonia="Paróquia Nossa Senhora do Brasil",
            endereco_completo="Praça Nossa Sra. do Brasil, 01 - Jardim América",
            cidade_cerimonia="São Paulo",
            estado_uf="SP",
            tipo_formacao=FormacaoMusicalEnum.SEXTETO,
            descricao_formacao="Teclado, Violino, Violoncelo, 2 Clarins Triunfais e Voz Soprano",
            status=StatusEventoEnum.EM_PREPARACAO,
            link_arquivo_contrato_pdf="https://drive.google.com/file/d/ct-2026-001-contrato-mariana-rafael/view",
            valor_total_bruto=Decimal("8500.00"),
            observacoes_gerais="Cerimônia tradicional católica. Noiva faz questão de toque de clarins com portas fechadas antes da Marcha Nupcial de Mendelssohn.",
        )

        # --- CASAMENTO 2 ---
        ev2 = EventoCasamento(
            codigo_contrato="CT-2026-002",
            nome_noivos="Camila Menezes & Bruno Figueiredo",
            cpf_cnpj_contratante="412.889.301-12",
            telefone_contato="5511977665544",
            email_contratante="camila.bruno.wedding@outlook.com",
            data_casamento=date(2026, 11, 14),
            horario_inicio_cerimonia=time(17, 0),
            horario_termino_previsto=time(18, 45),
            horario_chegada_banda=time(15, 0),
            local_cerimonia="Fazenda Vila Rica",
            endereco_completo="Estrada Municipal dos Romeiros, Km 48 - Zona Rural",
            cidade_cerimonia="Itatiba",
            estado_uf="SP",
            tipo_formacao=FormacaoMusicalEnum.ORQUESTRA_CAMARA,
            descricao_formacao="Teclado, Violino, Violoncelo, 2 Clarins, Voz Soprano, Voz Tenor e Percussão Sinfônica",
            status=StatusEventoEnum.CONTRATO_ASSINADO,
            link_arquivo_contrato_pdf="https://drive.google.com/file/d/ct-2026-002-contrato-camila-bruno/view",
            valor_total_bruto=Decimal("14200.00"),
            observacoes_gerais="Cerimônia ao ar livre no gramado principal. Necessário tenda ou proteção solar para os instrumentos de cordas (Violino e Violoncelo).",
        )

        # --- CASAMENTO 3 ---
        ev3 = EventoCasamento(
            codigo_contrato="CT-2026-003",
            nome_noivos="Beatriz Vasconcelos & Lucas Monteiro",
            cpf_cnpj_contratante="287.654.109-88",
            telefone_contato="5511966554433",
            email_contratante="bia.lucas.casamento@gmail.com",
            data_casamento=date(2026, 10, 24),
            horario_inicio_cerimonia=time(19, 30),
            horario_termino_previsto=time(21, 0),
            horario_chegada_banda=time(17, 30),
            local_cerimonia="Espaço Casa Petra",
            endereco_completo="Av. Aratãs, 1010 - Moema",
            cidade_cerimonia="São Paulo",
            estado_uf="SP",
            tipo_formacao=FormacaoMusicalEnum.QUARTETO,
            descricao_formacao="Teclado, Violino, Violoncelo e Voz Soprano",
            status=StatusEventoEnum.REALIZADO,
            link_arquivo_contrato_pdf="https://drive.google.com/file/d/ct-2026-003-contrato-beatriz-lucas/view",
            valor_total_bruto=Decimal("5800.00"),
            observacoes_gerais="Evento realizado com sucesso absoluto. Noivos elogiaram muito o arranjo de Clair de Lune + La Vie En Rose.",
        )

        db.add_all([ev1, ev2, ev3])
        db.flush()

        # Escalas do Casamento 1
        db.add_all(
            [
                EscalaMusico(
                    evento_id=ev1.id,
                    musico_id=m_violino.id,
                    instrumento_no_evento="Violino",
                    valor_cache_combinado=Decimal("450.00"),
                    taxa_deslocamento_combustivel=Decimal("50.00"),
                    status_confirmacao=StatusConfirmacaoEscalaEnum.CONFIRMADO,
                    status_pagamento=StatusPagamentoEnum.PAGO,
                    data_pagamento=date(2026, 11, 1),
                    observacoes_escala="Adiantamento 100% quitado via PIX",
                ),
                EscalaMusico(
                    evento_id=ev1.id,
                    musico_id=m_teclado.id,
                    instrumento_no_evento="Teclado",
                    valor_cache_combinado=Decimal("500.00"),
                    taxa_deslocamento_combustivel=Decimal("60.00"),
                    status_confirmacao=StatusConfirmacaoEscalaEnum.CONFIRMADO,
                    status_pagamento=StatusPagamentoEnum.PAGO,
                    data_pagamento=date(2026, 11, 1),
                    observacoes_escala="Levará Nord Stage + suporte X duplo",
                ),
                EscalaMusico(
                    evento_id=ev1.id,
                    musico_id=m_cello.id,
                    instrumento_no_evento="Violoncelo",
                    valor_cache_combinado=Decimal("450.00"),
                    taxa_deslocamento_combustivel=Decimal("50.00"),
                    status_confirmacao=StatusConfirmacaoEscalaEnum.CONFIRMADO,
                    status_pagamento=StatusPagamentoEnum.PENDENTE,
                    observacoes_escala="Pagamento agendado para segunda-feira pós-evento",
                ),
                EscalaMusico(
                    evento_id=ev1.id,
                    musico_id=m_clarim1.id,
                    instrumento_no_evento="Clarins (1ª Voz)",
                    valor_cache_combinado=Decimal("380.00"),
                    taxa_deslocamento_combustivel=Decimal("40.00"),
                    status_confirmacao=StatusConfirmacaoEscalaEnum.CONFIRMADO,
                    status_pagamento=StatusPagamentoEnum.PENDENTE,
                    observacoes_escala="Traje fraque completo escuro",
                ),
                EscalaMusico(
                    evento_id=ev1.id,
                    musico_id=m_clarim2.id,
                    instrumento_no_evento="Clarins (2ª Voz)",
                    valor_cache_combinado=Decimal("380.00"),
                    taxa_deslocamento_combustivel=Decimal("40.00"),
                    status_confirmacao=StatusConfirmacaoEscalaEnum.PENDENTE,
                    status_pagamento=StatusPagamentoEnum.PENDENTE,
                    observacoes_escala="Aguardando confirmação final do horário de passagem",
                ),
                EscalaMusico(
                    evento_id=ev1.id,
                    musico_id=m_soprano.id,
                    instrumento_no_evento="Voz Soprano",
                    valor_cache_combinado=Decimal("520.00"),
                    taxa_deslocamento_combustivel=Decimal("50.00"),
                    status_confirmacao=StatusConfirmacaoEscalaEnum.CONFIRMADO,
                    status_pagamento=StatusPagamentoEnum.PENDENTE,
                    observacoes_escala="Solos em Ave Maria de Gounod e Schubert",
                ),
            ]
        )

        # Escalas do Casamento 2
        db.add_all(
            [
                EscalaMusico(
                    evento_id=ev2.id,
                    musico_id=m_violino.id,
                    instrumento_no_evento="Violino Spalla",
                    valor_cache_combinado=Decimal("500.00"),
                    taxa_deslocamento_combustivel=Decimal("120.00"),
                    status_confirmacao=StatusConfirmacaoEscalaEnum.CONFIRMADO,
                    status_pagamento=StatusPagamentoEnum.PENDENTE,
                    observacoes_escala="Deslocamento SP -> Itatiba (pedágio + combustível)",
                ),
                EscalaMusico(
                    evento_id=ev2.id,
                    musico_id=m_teclado.id,
                    instrumento_no_evento="Teclado / Piano",
                    valor_cache_combinado=Decimal("550.00"),
                    taxa_deslocamento_combustivel=Decimal("120.00"),
                    status_confirmacao=StatusConfirmacaoEscalaEnum.CONFIRMADO,
                    status_pagamento=StatusPagamentoEnum.PENDENTE,
                    observacoes_escala="Vai no carro da equipe técnica",
                ),
                EscalaMusico(
                    evento_id=ev2.id,
                    musico_id=m_cello.id,
                    instrumento_no_evento="Violoncelo",
                    valor_cache_combinado=Decimal("500.00"),
                    taxa_deslocamento_combustivel=Decimal("100.00"),
                    status_confirmacao=StatusConfirmacaoEscalaEnum.CONFIRMADO,
                    status_pagamento=StatusPagamentoEnum.PENDENTE,
                    observacoes_escala="Carona compartilhada com Gabriel",
                ),
                EscalaMusico(
                    evento_id=ev2.id,
                    musico_id=m_clarim1.id,
                    instrumento_no_evento="Clarins (1º)",
                    valor_cache_combinado=Decimal("400.00"),
                    taxa_deslocamento_combustivel=Decimal("90.00"),
                    status_confirmacao=StatusConfirmacaoEscalaEnum.CONFIRMADO,
                    status_pagamento=StatusPagamentoEnum.PENDENTE,
                    observacoes_escala="Posicionar no mezanino do jardim",
                ),
                EscalaMusico(
                    evento_id=ev2.id,
                    musico_id=m_clarim2.id,
                    instrumento_no_evento="Clarins (2º)",
                    valor_cache_combinado=Decimal("400.00"),
                    taxa_deslocamento_combustivel=Decimal("90.00"),
                    status_confirmacao=StatusConfirmacaoEscalaEnum.PENDENTE,
                    status_pagamento=StatusPagamentoEnum.PENDENTE,
                    observacoes_escala="Confirmar até sexta-feira",
                ),
                EscalaMusico(
                    evento_id=ev2.id,
                    musico_id=m_soprano.id,
                    instrumento_no_evento="Voz Soprano",
                    valor_cache_combinado=Decimal("550.00"),
                    taxa_deslocamento_combustivel=Decimal("100.00"),
                    status_confirmacao=StatusConfirmacaoEscalaEnum.CONFIRMADO,
                    status_pagamento=StatusPagamentoEnum.PENDENTE,
                    observacoes_escala="Duetos com Daniel Ribeiro",
                ),
                EscalaMusico(
                    evento_id=ev2.id,
                    musico_id=m_tenor.id,
                    instrumento_no_evento="Voz Tenor & Violão",
                    valor_cache_combinado=Decimal("500.00"),
                    taxa_deslocamento_combustivel=Decimal("100.00"),
                    status_confirmacao=StatusConfirmacaoEscalaEnum.CONFIRMADO,
                    status_pagamento=StatusPagamentoEnum.PENDENTE,
                    observacoes_escala="Levar violão Taylor para entrada do noivo",
                ),
                EscalaMusico(
                    evento_id=ev2.id,
                    musico_id=m_percussao.id,
                    instrumento_no_evento="Percussão Sinfônica",
                    valor_cache_combinado=Decimal("450.00"),
                    taxa_deslocamento_combustivel=Decimal("130.00"),
                    status_confirmacao=StatusConfirmacaoEscalaEnum.CONFIRMADO,
                    status_pagamento=StatusPagamentoEnum.PENDENTE,
                    observacoes_escala="Levar carrilhão, prato suspenso e surdo sinfônico",
                ),
            ]
        )

        # Escalas do Casamento 3
        db.add_all(
            [
                EscalaMusico(
                    evento_id=ev3.id,
                    musico_id=m_violino.id,
                    instrumento_no_evento="Violino",
                    valor_cache_combinado=Decimal("450.00"),
                    taxa_deslocamento_combustivel=Decimal("40.00"),
                    status_confirmacao=StatusConfirmacaoEscalaEnum.CONFIRMADO,
                    status_pagamento=StatusPagamentoEnum.PAGO,
                    data_pagamento=date(2026, 10, 26),
                    observacoes_escala="Pago via PIX",
                ),
                EscalaMusico(
                    evento_id=ev3.id,
                    musico_id=m_teclado.id,
                    instrumento_no_evento="Teclado",
                    valor_cache_combinado=Decimal("500.00"),
                    taxa_deslocamento_combustivel=Decimal("50.00"),
                    status_confirmacao=StatusConfirmacaoEscalaEnum.CONFIRMADO,
                    status_pagamento=StatusPagamentoEnum.PAGO,
                    data_pagamento=date(2026, 10, 26),
                    observacoes_escala="Pago via PIX",
                ),
                EscalaMusico(
                    evento_id=ev3.id,
                    musico_id=m_cello.id,
                    instrumento_no_evento="Violoncelo",
                    valor_cache_combinado=Decimal("450.00"),
                    taxa_deslocamento_combustivel=Decimal("40.00"),
                    status_confirmacao=StatusConfirmacaoEscalaEnum.CONFIRMADO,
                    status_pagamento=StatusPagamentoEnum.PAGO,
                    data_pagamento=date(2026, 10, 26),
                    observacoes_escala="Pago via PIX",
                ),
                EscalaMusico(
                    evento_id=ev3.id,
                    musico_id=m_soprano.id,
                    instrumento_no_evento="Voz Soprano",
                    valor_cache_combinado=Decimal("520.00"),
                    taxa_deslocamento_combustivel=Decimal("40.00"),
                    status_confirmacao=StatusConfirmacaoEscalaEnum.CONFIRMADO,
                    status_pagamento=StatusPagamentoEnum.PAGO,
                    data_pagamento=date(2026, 10, 26),
                    observacoes_escala="Pago via PIX",
                ),
            ]
        )

        # Repertório do Casamento 1
        db.add_all(
            [
                RepertorioCerimonia(
                    evento_id=ev1.id,
                    ordem_execucao=1,
                    momento_cerimonia=MomentoCerimoniaEnum.RECEPTIVO_CONVIDADOS,
                    nome_musica="Canon in D",
                    artista_versao_referencia="Johann Pachelbel (Brooklyn Duo)",
                    tom_musica="D Maior",
                    andamento_bpm=68,
                    link_referencia_midia="https://www.youtube.com/watch?v=Ptk_1Dc2iPY",
                    link_partitura_cifra_pdf="https://drive.google.com/file/d/partitura-canon-in-d/view",
                    observacoes_arranjo="Instrumental suave com Violino, Cello e Teclado.",
                ),
                RepertorioCerimonia(
                    evento_id=ev1.id,
                    ordem_execucao=2,
                    momento_cerimonia=MomentoCerimoniaEnum.ENTRADA_PADRINHOS,
                    nome_musica="Somewhere Over The Rainbow",
                    artista_versao_referencia="Israel Kamakawiwo'ole (Arranjo Cordas)",
                    tom_musica="C Maior",
                    andamento_bpm=82,
                    link_referencia_midia="https://www.youtube.com/watch?v=V1bFr2SWP1I",
                    link_partitura_cifra_pdf="https://drive.google.com/file/d/partitura-over-the-rainbow/view",
                    observacoes_arranjo="Entrada de 8 casais de padrinhos. Manter loop no refrão até o último casal.",
                ),
                RepertorioCerimonia(
                    evento_id=ev1.id,
                    ordem_execucao=3,
                    momento_cerimonia=MomentoCerimoniaEnum.ENTRADA_NOIVO,
                    nome_musica="Viva La Vida",
                    artista_versao_referencia="Coldplay (2Cellos & Strings Version)",
                    tom_musica="Ab Maior",
                    andamento_bpm=138,
                    link_referencia_midia="https://www.youtube.com/watch?v=dvgZkm1xWPE",
                    link_partitura_cifra_pdf="https://drive.google.com/file/d/partitura-viva-la-vida/view",
                    observacoes_arranjo="Entrada firme no ataque das cordas em staccato.",
                ),
                RepertorioCerimonia(
                    evento_id=ev1.id,
                    ordem_execucao=4,
                    momento_cerimonia=MomentoCerimoniaEnum.ENTRADA_PAJENS_DAMAS,
                    nome_musica="A Thousand Years",
                    artista_versao_referencia="Christina Perri (The Piano Guys)",
                    tom_musica="Bb Maior",
                    andamento_bpm=75,
                    link_referencia_midia="https://www.youtube.com/watch?v=QgaTQ5-XfMM",
                    link_partitura_cifra_pdf="https://drive.google.com/file/d/partitura-a-thousand-years/view",
                    observacoes_arranjo="Apenas instrumental doce; pajem leva placa lá vem a noiva.",
                ),
                RepertorioCerimonia(
                    evento_id=ev1.id,
                    ordem_execucao=5,
                    momento_cerimonia=MomentoCerimoniaEnum.ANUNCIO_CLARINS,
                    nome_musica="Clarins de Roma + Marcha Nupcial",
                    artista_versao_referencia="Felix Mendelssohn",
                    tom_musica="C Maior",
                    andamento_bpm=100,
                    link_referencia_midia="https://www.youtube.com/watch?v=l7_m1om8tnE",
                    link_partitura_cifra_pdf="https://drive.google.com/file/d/partitura-clarins-mendelssohn/view",
                    observacoes_arranjo="Clarins abrem com portas fechadas; abertura da porta no compasso 9.",
                ),
                RepertorioCerimonia(
                    evento_id=ev1.id,
                    ordem_execucao=6,
                    momento_cerimonia=MomentoCerimoniaEnum.ENTRADA_NOIVA,
                    nome_musica="Marcha Nupcial + Ave Maria (Medley)",
                    artista_versao_referencia="Mendelssohn / Charles Gounod",
                    tom_musica="F Maior",
                    andamento_bpm=72,
                    link_referencia_midia="https://www.youtube.com/watch?v=px0j1EPvK70",
                    link_partitura_cifra_pdf="https://drive.google.com/file/d/partitura-marcha-ave-maria/view",
                    observacoes_arranjo="Transição para Soprano solo quando a noiva chega na metade da nave.",
                ),
                RepertorioCerimonia(
                    evento_id=ev1.id,
                    ordem_execucao=7,
                    momento_cerimonia=MomentoCerimoniaEnum.BENCAO_ALIANCAS,
                    nome_musica="Ave Maria",
                    artista_versao_referencia="Franz Schubert (Voz Soprano & Cordas)",
                    tom_musica="Bb Maior",
                    andamento_bpm=64,
                    link_referencia_midia="https://www.youtube.com/watch?v=2bosouX_d8Y",
                    link_partitura_cifra_pdf="https://drive.google.com/file/d/partitura-schubert-ave-maria/view",
                    observacoes_arranjo="Cantar 1ª estrofe em Latim após o sacerdote abençoar as alianças.",
                ),
                RepertorioCerimonia(
                    evento_id=ev1.id,
                    ordem_execucao=8,
                    momento_cerimonia=MomentoCerimoniaEnum.SAIDA_NOIVOS,
                    nome_musica="Signed, Sealed, Delivered (I'm Yours)",
                    artista_versao_referencia="Stevie Wonder",
                    tom_musica="F Maior",
                    andamento_bpm=108,
                    link_referencia_midia="https://www.youtube.com/watch?v=6To0fvX_wFA",
                    link_partitura_cifra_pdf="https://drive.google.com/file/d/partitura-signed-sealed/view",
                    observacoes_arranjo="Ataque nos metais e voz logo após o beijo dos noivos!",
                ),
            ]
        )

        # Repertório do Casamento 2
        db.add_all(
            [
                RepertorioCerimonia(
                    evento_id=ev2.id,
                    ordem_execucao=1,
                    momento_cerimonia=MomentoCerimoniaEnum.RECEPTIVO_CONVIDADOS,
                    nome_musica="Clair de Lune & Bridgerton Theme Medley",
                    artista_versao_referencia="Claude Debussy / Kris Bowers",
                    tom_musica="Db Maior",
                    andamento_bpm=66,
                    link_referencia_midia="https://www.youtube.com/watch?v=CvFH_6DNRCY",
                    link_partitura_cifra_pdf="https://drive.google.com/file/d/partitura-clair-de-lune/view",
                    observacoes_arranjo="Setlist de 30 minutos de receptivo no jardim.",
                ),
                RepertorioCerimonia(
                    evento_id=ev2.id,
                    ordem_execucao=2,
                    momento_cerimonia=MomentoCerimoniaEnum.ENTRADA_NOIVO,
                    nome_musica="Con Te Partirò (Time To Say Goodbye)",
                    artista_versao_referencia="Andrea Bocelli (Tenor Solo)",
                    tom_musica="G Maior",
                    andamento_bpm=70,
                    link_referencia_midia="https://www.youtube.com/watch?v=4L_yCwFD6Jo",
                    link_partitura_cifra_pdf="https://drive.google.com/file/d/partitura-con-te-partiro/view",
                    observacoes_arranjo="Entrada emocionante do noivo com sua mãe.",
                ),
                RepertorioCerimonia(
                    evento_id=ev2.id,
                    ordem_execucao=3,
                    momento_cerimonia=MomentoCerimoniaEnum.ENTRADA_PADRINHOS,
                    nome_musica="Perfect Symphony",
                    artista_versao_referencia="Ed Sheeran & Andrea Bocelli",
                    tom_musica="Ab Maior",
                    andamento_bpm=95,
                    link_referencia_midia="https://www.youtube.com/watch?v=eiDiKwbGfIY",
                    link_partitura_cifra_pdf="https://drive.google.com/file/d/partitura-perfect-symphony/view",
                    observacoes_arranjo="Dueto Soprano e Tenor com percussão crescendo.",
                ),
                RepertorioCerimonia(
                    evento_id=ev2.id,
                    ordem_execucao=4,
                    momento_cerimonia=MomentoCerimoniaEnum.ANUNCIO_CLARINS,
                    nome_musica="Fanfarra Real da Rainha + Clarins Triunfais",
                    artista_versao_referencia="Arranjo MM3 Música",
                    tom_musica="D Maior",
                    andamento_bpm=98,
                    link_referencia_midia="https://www.youtube.com/watch?v=l7_m1om8tnE",
                    link_partitura_cifra_pdf="https://drive.google.com/file/d/partitura-fanfarra-real/view",
                    observacoes_arranjo="2 Clarins + Rulo de Tímpano/Prato suspenso.",
                ),
                RepertorioCerimonia(
                    evento_id=ev2.id,
                    ordem_execucao=5,
                    momento_cerimonia=MomentoCerimoniaEnum.ENTRADA_NOIVA,
                    nome_musica="La Vie En Rose (Intro) + Marcha Nupcial Sinfônica",
                    artista_versao_referencia="Édith Piaf / Mendelssohn",
                    tom_musica="C Maior",
                    andamento_bpm=80,
                    link_referencia_midia="https://www.youtube.com/watch?v=rzeLynj1GYM",
                    link_partitura_cifra_pdf="https://drive.google.com/file/d/partitura-la-vie-marcha/view",
                    observacoes_arranjo="Violino solo abre em rubato antes da entrada triunfal da orquestra.",
                ),
                RepertorioCerimonia(
                    evento_id=ev2.id,
                    ordem_execucao=6,
                    momento_cerimonia=MomentoCerimoniaEnum.BENCAO_ALIANCAS,
                    nome_musica="The Prayer",
                    artista_versao_referencia="Celine Dion & Andrea Bocelli",
                    tom_musica="F Maior",
                    andamento_bpm=68,
                    link_referencia_midia="https://www.youtube.com/watch?v=qt_OkgSOrkU",
                    link_partitura_cifra_pdf="https://drive.google.com/file/d/partitura-the-prayer/view",
                    observacoes_arranjo="Dueto principal da cerimônia.",
                ),
                RepertorioCerimonia(
                    evento_id=ev2.id,
                    ordem_execucao=7,
                    momento_cerimonia=MomentoCerimoniaEnum.SAIDA_NOIVOS,
                    nome_musica="This Will Be (An Everlasting Love)",
                    artista_versao_referencia="Natalie Cole",
                    tom_musica="Eb Maior",
                    andamento_bpm=124,
                    link_referencia_midia="https://www.youtube.com/watch?v=StandardLink",
                    link_partitura_cifra_pdf="https://drive.google.com/file/d/partitura-this-will-be/view",
                    observacoes_arranjo="Saída com chuva de pétalas e fogos indoor.",
                ),
            ]
        )

        # Repertório do Casamento 3
        db.add_all(
            [
                RepertorioCerimonia(
                    evento_id=ev3.id,
                    ordem_execucao=1,
                    momento_cerimonia=MomentoCerimoniaEnum.ENTRADA_PADRINHOS,
                    nome_musica="Yellow (Strings Version)",
                    artista_versao_referencia="Coldplay (Vitamin String Quartet)",
                    tom_musica="B Maior",
                    andamento_bpm=86,
                    link_referencia_midia="https://www.youtube.com/watch?v=yKNxeF4KMsY",
                    link_partitura_cifra_pdf="https://drive.google.com/file/d/partitura-yellow/view",
                    observacoes_arranjo="Quarteto instrumental.",
                ),
                RepertorioCerimonia(
                    evento_id=ev3.id,
                    ordem_execucao=2,
                    momento_cerimonia=MomentoCerimoniaEnum.ENTRADA_NOIVO,
                    nome_musica="Hallelujah",
                    artista_versao_referencia="Leonard Cohen",
                    tom_musica="C Maior",
                    andamento_bpm=60,
                    link_referencia_midia="https://www.youtube.com/watch?v=YrLk4vdY28Q",
                    link_partitura_cifra_pdf="https://drive.google.com/file/d/partitura-hallelujah/view",
                    observacoes_arranjo="Violoncelo inicia o tema grave.",
                ),
                RepertorioCerimonia(
                    evento_id=ev3.id,
                    ordem_execucao=3,
                    momento_cerimonia=MomentoCerimoniaEnum.ENTRADA_NOIVA,
                    nome_musica="Clair de Lune + La Vie En Rose",
                    artista_versao_referencia="Debussy / Piaf",
                    tom_musica="D Maior",
                    andamento_bpm=72,
                    link_referencia_midia="https://www.youtube.com/watch?v=CvFH_6DNRCY",
                    link_partitura_cifra_pdf="https://drive.google.com/file/d/partitura-clair-lavie/view",
                    observacoes_arranjo="Arranjo exclusivo sob encomenda.",
                ),
                RepertorioCerimonia(
                    evento_id=ev3.id,
                    ordem_execucao=4,
                    momento_cerimonia=MomentoCerimoniaEnum.SAIDA_NOIVOS,
                    nome_musica="Viva La Vida",
                    artista_versao_referencia="Coldplay",
                    tom_musica="Ab Maior",
                    andamento_bpm=138,
                    link_referencia_midia="https://www.youtube.com/watch?v=dvgZkm1xWPE",
                    link_partitura_cifra_pdf="https://drive.google.com/file/d/partitura-viva-la-vida/view",
                    observacoes_arranjo="Finalização vibrante.",
                ),
            ]
        )

        # Sonorização e Logística (1:1)
        db.add_all(
            [
                SonorizacaoLogistica(
                    evento_id=ev1.id,
                    necessita_som_proprio=True,
                    lista_equipamentos=[
                        {
                            "item": "Caixas Ativas QSC K12.2 + Pedestais",
                            "quantidade": 2,
                            "conferido": True,
                        },
                        {
                            "item": "Mesa Digital Behringer XR18 + iPad",
                            "quantidade": 1,
                            "conferido": True,
                        },
                        {
                            "item": "Microfone Sem Fio Shure SLXD (Voz + Celebrante)",
                            "quantidade": 2,
                            "conferido": True,
                        },
                        {
                            "item": "Microfone Clip DPA 4099 (Violino e Cello)",
                            "quantidade": 2,
                            "conferido": True,
                        },
                        {
                            "item": "Direct Box Passivo Stereo (Teclado Nord)",
                            "quantidade": 1,
                            "conferido": True,
                        },
                        {
                            "item": "Estantes de Partitura Pretas c/ Luz LED",
                            "quantidade": 6,
                            "conferido": False,
                        },
                    ],
                    descricao_equipamentos_texto="Sistema PA completo para igreja de médio porte + monitoração in-ear para soprano e teclado.",
                    responsavel_tecnico_som="Rodrigo Áudio Pro",
                    telefone_responsavel_som="5511988112233",
                    custo_locacao_tecnico_som=Decimal("650.00"),
                    status_pagamento_som=StatusPagamentoEnum.PENDENTE,
                    observacoes_logistica="Igreja exige passagem de cabos com fita gaffer preta fosca. Ponto de energia 220V próximo à sacristia.",
                ),
                SonorizacaoLogistica(
                    evento_id=ev2.id,
                    necessita_som_proprio=True,
                    lista_equipamentos=[
                        {
                            "item": "Sistema Coluna Bose L1 Pro16 (Cerimônia Campo)",
                            "quantidade": 2,
                            "conferido": True,
                        },
                        {
                            "item": "Mesa Digital Midas MR18",
                            "quantidade": 1,
                            "conferido": True,
                        },
                        {
                            "item": "Microfones Sem Fio Sennheiser EW-D",
                            "quantidade": 3,
                            "conferido": False,
                        },
                        {
                            "item": "Microfones Condensadores Over Percussão",
                            "quantidade": 2,
                            "conferido": False,
                        },
                        {
                            "item": "Gerador Estabilizado / Nobreak Senoidal 3kVA",
                            "quantidade": 1,
                            "conferido": True,
                        },
                        {
                            "item": "Tenda Branca 4x4m Proteção Solar Orquestra",
                            "quantidade": 1,
                            "conferido": False,
                        },
                    ],
                    descricao_equipamentos_texto="Sonorização reforçada para cerimônia ao ar livre para 280 convidados na Fazenda Vila Rica.",
                    responsavel_tecnico_som="Rodrigo Áudio Pro",
                    telefone_responsavel_som="5511988112233",
                    custo_locacao_tecnico_som=Decimal("1100.00"),
                    status_pagamento_som=StatusPagamentoEnum.PENDENTE,
                    observacoes_logistica="Confirmar liberação de acesso da van de equipamentos na portaria de serviço da fazenda às 14h00.",
                ),
                SonorizacaoLogistica(
                    evento_id=ev3.id,
                    necessita_som_proprio=False,
                    lista_equipamentos=[
                        {
                            "item": "Direct Box Próprio p/ Teclado",
                            "quantidade": 1,
                            "conferido": True,
                        },
                        {
                            "item": "Receptor In-Ear Pessoal Músicos",
                            "quantidade": 4,
                            "conferido": True,
                        },
                    ],
                    descricao_equipamentos_texto="Som da casa (Casa Petra) utilizado com técnico local. Levamos apenas Direct Box e In-Ears.",
                    responsavel_tecnico_som="Equipe Interna Casa Petra",
                    telefone_responsavel_som="5511955443322",
                    custo_locacao_tecnico_som=Decimal("250.00"),
                    status_pagamento_som=StatusPagamentoEnum.PAGO,
                    data_pagamento_som=date(2026, 10, 25),
                    observacoes_logistica="Alinhamento com o técnico da casa feito às 18h00 sem intercorrências.",
                ),
            ]
        )

        # Parcelas do Contrato (Financeiro Noivos)
        db.add_all(
            [
                # Casamento 1
                ParcelaContrato(
                    evento_id=ev1.id,
                    numero_parcela=1,
                    tipo_parcela=TipoParcelaEnum.SINAL_ENTRADA,
                    descricao="Sinal de Reserva de Data (30%)",
                    valor_parcela=Decimal("2550.00"),
                    data_vencimento=date(2026, 6, 10),
                    data_pagamento=date(2026, 6, 9),
                    forma_pagamento=FormaPagamentoEnum.PIX,
                    status=StatusParcelaContratoEnum.PAGO,
                    comprovante_url="https://drive.google.com/file/d/comp-c1-p1/view",
                    observacoes="Recebido na assinatura do contrato",
                ),
                ParcelaContrato(
                    evento_id=ev1.id,
                    numero_parcela=2,
                    tipo_parcela=TipoParcelaEnum.PARCELA_INTERMEDIARIA,
                    descricao="2ª Parcela Intermediária (30%)",
                    valor_parcela=Decimal("2550.00"),
                    data_vencimento=date(2026, 9, 10),
                    data_pagamento=date(2026, 9, 10),
                    forma_pagamento=FormaPagamentoEnum.PIX,
                    status=StatusParcelaContratoEnum.PAGO,
                    comprovante_url="https://drive.google.com/file/d/comp-c1-p2/view",
                    observacoes="Pago em dia",
                ),
                ParcelaContrato(
                    evento_id=ev1.id,
                    numero_parcela=3,
                    tipo_parcela=TipoParcelaEnum.QUITACAO_FINAL,
                    descricao="Quitação Final (40% - até 5 dias antes do evento)",
                    valor_parcela=Decimal("3400.00"),
                    data_vencimento=date(2026, 11, 5),
                    forma_pagamento=FormaPagamentoEnum.PIX,
                    status=StatusParcelaContratoEnum.ABERTO,
                    observacoes="Vencimento na semana do casamento",
                ),
                # Casamento 2
                ParcelaContrato(
                    evento_id=ev2.id,
                    numero_parcela=1,
                    tipo_parcela=TipoParcelaEnum.SINAL_ENTRADA,
                    descricao="Sinal de Assinatura do Contrato (30%)",
                    valor_parcela=Decimal("4260.00"),
                    data_vencimento=date(2026, 7, 15),
                    data_pagamento=date(2026, 7, 15),
                    forma_pagamento=FormaPagamentoEnum.TRANSFERENCIA_TED_DOC,
                    status=StatusParcelaContratoEnum.PAGO,
                    comprovante_url="https://drive.google.com/file/d/comp-c2-p1/view",
                    observacoes="TED confirmada no banco",
                ),
                ParcelaContrato(
                    evento_id=ev2.id,
                    numero_parcela=2,
                    tipo_parcela=TipoParcelaEnum.PARCELA_INTERMEDIARIA,
                    descricao="2ª Parcela Mensal",
                    valor_parcela=Decimal("3300.00"),
                    data_vencimento=date(2026, 9, 15),
                    data_pagamento=date(2026, 9, 14),
                    forma_pagamento=FormaPagamentoEnum.PIX,
                    status=StatusParcelaContratoEnum.PAGO,
                    comprovante_url="https://drive.google.com/file/d/comp-c2-p2/view",
                    observacoes="Pago via PIX CNPJ",
                ),
                ParcelaContrato(
                    evento_id=ev2.id,
                    numero_parcela=3,
                    tipo_parcela=TipoParcelaEnum.PARCELA_INTERMEDIARIA,
                    descricao="3ª Parcela Mensal",
                    valor_parcela=Decimal("3300.00"),
                    data_vencimento=date(2026, 10, 25),
                    forma_pagamento=FormaPagamentoEnum.BOLETO,
                    status=StatusParcelaContratoEnum.ATRASADO,
                    observacoes="Noivo solicitou reemissão por PIX para esta semana",
                ),
                ParcelaContrato(
                    evento_id=ev2.id,
                    numero_parcela=4,
                    tipo_parcela=TipoParcelaEnum.QUITACAO_FINAL,
                    descricao="Quitação Final Cerimônia (Saldo)",
                    valor_parcela=Decimal("3340.00"),
                    data_vencimento=date(2026, 11, 10),
                    forma_pagamento=FormaPagamentoEnum.PIX,
                    status=StatusParcelaContratoEnum.ABERTO,
                    observacoes="Quitação até 4 dias antes do casamento",
                ),
                # Casamento 3
                ParcelaContrato(
                    evento_id=ev3.id,
                    numero_parcela=1,
                    tipo_parcela=TipoParcelaEnum.SINAL_ENTRADA,
                    descricao="Sinal de Reserva (50%)",
                    valor_parcela=Decimal("2900.00"),
                    data_vencimento=date(2026, 8, 1),
                    data_pagamento=date(2026, 8, 1),
                    forma_pagamento=FormaPagamentoEnum.PIX,
                    status=StatusParcelaContratoEnum.PAGO,
                    comprovante_url="https://drive.google.com/file/d/comp-c3-p1/view",
                    observacoes="Quitado na assinatura",
                ),
                ParcelaContrato(
                    evento_id=ev3.id,
                    numero_parcela=2,
                    tipo_parcela=TipoParcelaEnum.QUITACAO_FINAL,
                    descricao="Quitação Final (50%)",
                    valor_parcela=Decimal("2900.00"),
                    data_vencimento=date(2026, 10, 15),
                    data_pagamento=date(2026, 10, 14),
                    forma_pagamento=FormaPagamentoEnum.PIX,
                    status=StatusParcelaContratoEnum.PAGO,
                    comprovante_url="https://drive.google.com/file/d/comp-c3-p2/view",
                    observacoes="Contrato 100% liquidado",
                ),
            ]
        )
        db.commit()

    # 4. Seed da Biblioteca de Playbacks (VS) para Violino Solo
    uploads_playbacks_dir = Path(__file__).resolve().parent / "uploads" / "playbacks"
    uploads_playbacks_dir.mkdir(parents=True, exist_ok=True)
    _gerar_wav_playback_demo(uploads_playbacks_dir / "vs_a_thousand_years_bb.wav", [233.08, 174.61, 196.00, 220.00])
    _gerar_wav_playback_demo(uploads_playbacks_dir / "vs_marcha_nupcial_c.wav", [261.63, 329.63, 392.00, 523.25])
    _gerar_wav_playback_demo(uploads_playbacks_dir / "vs_canon_in_d.wav", [293.66, 220.00, 246.94, 196.00])
    _gerar_wav_playback_demo(uploads_playbacks_dir / "vs_hallelujah_c.wav", [261.63, 220.00, 174.61, 196.00])
    _gerar_wav_playback_demo(uploads_playbacks_dir / "vs_perfect_ab.wav", [207.65, 174.61, 277.18, 233.08])
    _gerar_wav_playback_demo(uploads_playbacks_dir / "vs_viva_la_vida_f.wav", [174.61, 196.00, 261.63, 220.00])

    if db.query(PlaybackBiblioteca).count() == 0:
        playbacks_iniciais = [
            PlaybackBiblioteca(
                nome_musica="A Thousand Years",
                artista_versao="Christina Perri (VS Piano & Cordas Cinematográfico)",
                tom_violino="Bb Maior",
                andamento_bpm=75,
                duracao_formatada="04:15",
                momento_sugerido=MomentoCerimoniaEnum.ENTRADA_NOIVA,
                arquivo_playback_url="/uploads/playbacks/vs_a_thousand_years_bb.wav",
                nome_arquivo_original="vs_a_thousand_years_bb.wav",
                link_partitura_violino_pdf="https://drive.google.com/file/d/partitura-violino-thousand-years/view",
                observacoes_execucao="Intro de 4 compassos no piano do playback; entrar com violino solo expressivo no compasso 5 (vibrato largo).",
                favorito=True,
            ),
            PlaybackBiblioteca(
                nome_musica="Marcha Nupcial + Clarins (VS Orquestral)",
                artista_versao="Felix Mendelssohn (Base Orquestral Completa s/ Violino)",
                tom_violino="C Maior",
                andamento_bpm=108,
                duracao_formatada="03:20",
                momento_sugerido=MomentoCerimoniaEnum.ENTRADA_NOIVA,
                arquivo_playback_url="/uploads/playbacks/vs_marcha_nupcial_c.wav",
                nome_arquivo_original="vs_marcha_nupcial_c.wav",
                link_partitura_violino_pdf="https://drive.google.com/file/d/partitura-violino-mendelssohn/view",
                observacoes_execucao="O playback já inclui a fanfarra inicial de clarins; entrar no tema principal em oitavas após a abertura das portas.",
                favorito=True,
            ),
            PlaybackBiblioteca(
                nome_musica="Canon in D (Pachelbel)",
                artista_versao="Pachelbel (VS Harpa, Cravo & Violoncelo Base)",
                tom_violino="D Maior",
                andamento_bpm=68,
                duracao_formatada="04:30",
                momento_sugerido=MomentoCerimoniaEnum.ENTRADA_PADRINHOS,
                arquivo_playback_url="/uploads/playbacks/vs_canon_in_d.wav",
                nome_arquivo_original="vs_canon_in_d.wav",
                link_partitura_violino_pdf="https://drive.google.com/file/d/partitura-violino-canon-d/view",
                observacoes_execucao="2 compassos de baixo contínuo no VS antes do tema principal do violino. Ideal para cortejo de padrinhos.",
                favorito=True,
            ),
            PlaybackBiblioteca(
                nome_musica="Hallelujah",
                artista_versao="Leonard Cohen / Jeff Buckley (VS Piano & Pad Ambiental)",
                tom_violino="C Maior",
                andamento_bpm=62,
                duracao_formatada="03:50",
                momento_sugerido=MomentoCerimoniaEnum.BENCAO_ALIANCAS,
                arquivo_playback_url="/uploads/playbacks/vs_hallelujah_c.wav",
                nome_arquivo_original="vs_hallelujah_c.wav",
                link_partitura_violino_pdf="https://drive.google.com/file/d/partitura-violino-hallelujah/view",
                observacoes_execucao="Primeira estrofe na corda Sol/Ré suave; subir uma oitava no segundo refrão durante a bênção das alianças.",
                favorito=True,
            ),
            PlaybackBiblioteca(
                nome_musica="Perfect",
                artista_versao="Ed Sheeran (VS Violão Acústico & Strings)",
                tom_violino="Ab Maior (ou G c/ capotraste)",
                andamento_bpm=95,
                duracao_formatada="04:10",
                momento_sugerido=MomentoCerimoniaEnum.ENTRADA_NOIVO,
                arquivo_playback_url="/uploads/playbacks/vs_perfect_ab.wav",
                nome_arquivo_original="vs_perfect_ab.wav",
                link_partitura_violino_pdf="https://drive.google.com/file/d/partitura-violino-perfect/view",
                observacoes_execucao="Playback em 12/8 bem marcado. Ótimo para entrada do noivo ou assinatura dos termos.",
                favorito=False,
            ),
            PlaybackBiblioteca(
                nome_musica="Viva La Vida",
                artista_versao="Coldplay / David Garrett Style (VS Pop Orquestral)",
                tom_violino="F Maior",
                andamento_bpm=138,
                duracao_formatada="03:55",
                momento_sugerido=MomentoCerimoniaEnum.SAIDA_NOIVOS,
                arquivo_playback_url="/uploads/playbacks/vs_viva_la_vida_f.wav",
                nome_arquivo_original="vs_viva_la_vida_f.wav",
                link_partitura_violino_pdf="https://drive.google.com/file/d/partitura-violino-viva-la-vida/view",
                observacoes_execucao="Disparar playback no exato momento do beijo dos noivos. Energia alta para saída e chuva de pétalas.",
                favorito=True,
            ),
        ]
        db.add_all(playbacks_iniciais)
        db.commit()

    # 5. Garante também um casamento exemplo de Violino Solo + Playback (CT-2026-004)
    if not db.query(EventoCasamento).filter(EventoCasamento.codigo_contrato == "CT-2026-004").first():
        m_violino_solo = (
            db.query(Musico)
            .filter(Musico.email == "gabriel.violino@mm3musica.com.br")
            .first()
        )
        ev_solo = EventoCasamento(
            codigo_contrato="CT-2026-004",
            nome_noivos="Fernanda Oliveira & Thiago Martins",
            cpf_cnpj_contratante="319.845.220-15",
            telefone_contato="5511988112233",
            email_contratante="fernanda.thiago2026@gmail.com",
            data_casamento=date(2026, 11, 21),
            horario_inicio_cerimonia=time(17, 0),
            horario_termino_previsto=time(18, 30),
            horario_chegada_banda=time(15, 30),
            local_cerimonia="Capela São Pedro & Espaço Jardim",
            endereco_completo="Estrada da Serra, 420 - Mairiporã",
            cidade_cerimonia="Mairiporã",
            estado_uf="SP",
            tipo_formacao=FormacaoMusicalEnum.VIOLINO_SOLO,
            descricao_formacao="Violino Solo + Playback (VS Profissional) — Execução Individual",
            status=StatusEventoEnum.CONTRATO_ASSINADO,
            link_arquivo_contrato_pdf="https://drive.google.com/file/d/ct-2026-004-violino-solo-playback/view",
            valor_total_bruto=Decimal("2800.00"),
            observacoes_gerais="Cerimônia intimista realizada 100% pelo violinista principal com Playbacks (VS) de alta definição e sistema de som portátil próprio.",
        )
        db.add(ev_solo)
        db.flush()

        if m_violino_solo:
            db.add(
                EscalaMusico(
                    evento_id=ev_solo.id,
                    musico_id=m_violino_solo.id,
                    instrumento_no_evento="Violino Solo + Disparo de Playbacks (VS)",
                    valor_cache_combinado=Decimal("0.00"),
                    taxa_deslocamento_combustivel=Decimal("80.00"),
                    status_confirmacao=StatusConfirmacaoEscalaEnum.CONFIRMADO,
                    status_pagamento=StatusPagamentoEnum.PAGO,
                    data_pagamento=date(2026, 11, 1),
                    observacoes_escala="Execução própria (Violino + VS); custo operacional apenas de combustível.",
                )
            )

        db.add(
            SonorizacaoLogistica(
                evento_id=ev_solo.id,
                necessita_som_proprio=True,
                lista_equipamentos=[
                    {"item": "Violino Principal + Arco Reserva + Breu + Surdina", "quantidade": 1, "conferido": True},
                    {"item": "Captação de Violino (Microfone DPA / Piezo + Transmissor Sem Fio UHF)", "quantidade": 1, "conferido": True},
                    {"item": "Pedaleira / Pré-Amp / Reverb de Violino + Bateria 9V Reserva", "quantidade": 1, "conferido": True},
                    {"item": "Caixa Ativa / Coluna PA Portátil + Pedestal", "quantidade": 1, "conferido": True},
                    {"item": "Mesa de Som Compacta / Interface (Canal Violino + Canal Playback)", "quantidade": 1, "conferido": True},
                    {"item": "Notebook / Tablet / Celular Dedicado para Playbacks (Modo Avião)", "quantidade": 1, "conferido": True},
                    {"item": "Cabo P2-P10 Estéreo + Adaptador USB-C/Lightning Reserva (VS)", "quantidade": 2, "conferido": False},
                    {"item": "Pedal Passador / Disparador Bluetooth de Playback", "quantidade": 1, "conferido": False},
                    {"item": "Retorno In-Ear / Fone de Monitoração do Playback", "quantidade": 1, "conferido": False},
                    {"item": "Estante de Partitura / Suporte de Tablet + Extensão Elétrica", "quantidade": 1, "conferido": True},
                ],
                descricao_equipamentos_texto="Setup compacto de Violino Solo + Playback (VS): Coluna Bose/JBL + Pedaleira Violino + iPad/Notebook em Modo Avião.",
                responsavel_tecnico_som="Próprio Violinista (Auto-operado com Pedal/Tablet)",
                telefone_responsavel_som="5511991234501",
                custo_locacao_tecnico_som=Decimal("0.00"),
                status_pagamento_som=StatusPagamentoEnum.PAGO,
                data_pagamento_som=date(2026, 11, 1),
                observacoes_logistica="Lembrar de baixar todos os arquivos WAV/MP3 offline e colocar o iPad/Celular em Modo Avião antes do início do cortejo.",
            )
        )

        db.add_all(
            [
                RepertorioCerimonia(
                    evento_id=ev_solo.id,
                    ordem_execucao=1,
                    momento_cerimonia=MomentoCerimoniaEnum.ENTRADA_PADRINHOS,
                    nome_musica="Canon in D (Pachelbel)",
                    artista_versao_referencia="VS Harpa & Violoncelo Base",
                    tom_musica="D Maior",
                    andamento_bpm=68,
                    usa_playback=True,
                    link_playback_url="/uploads/playbacks/vs_canon_in_d.wav",
                    nome_arquivo_playback="vs_canon_in_d.wav",
                    duracao_playback="04:30",
                    link_partitura_cifra_pdf="https://drive.google.com/file/d/partitura-violino-canon-d/view",
                    observacoes_arranjo="Entrar após 2 compassos da base de violoncelo do playback.",
                ),
                RepertorioCerimonia(
                    evento_id=ev_solo.id,
                    ordem_execucao=2,
                    momento_cerimonia=MomentoCerimoniaEnum.ENTRADA_NOIVO,
                    nome_musica="Perfect",
                    artista_versao_referencia="Ed Sheeran (VS Violão & Strings)",
                    tom_musica="Ab Maior",
                    andamento_bpm=95,
                    usa_playback=True,
                    link_playback_url="/uploads/playbacks/vs_perfect_ab.wav",
                    nome_arquivo_playback="vs_perfect_ab.wav",
                    duracao_playback="04:10",
                    link_partitura_cifra_pdf="https://drive.google.com/file/d/partitura-violino-perfect/view",
                    observacoes_arranjo="Fade out suave quando o noivo cumprimentar os pais no altar.",
                ),
                RepertorioCerimonia(
                    evento_id=ev_solo.id,
                    ordem_execucao=3,
                    momento_cerimonia=MomentoCerimoniaEnum.ENTRADA_NOIVA,
                    nome_musica="A Thousand Years",
                    artista_versao_referencia="Christina Perri (VS Piano & Cordas)",
                    tom_musica="Bb Maior",
                    andamento_bpm=75,
                    usa_playback=True,
                    link_playback_url="/uploads/playbacks/vs_a_thousand_years_bb.wav",
                    nome_arquivo_playback="vs_a_thousand_years_bb.wav",
                    duracao_playback="04:15",
                    link_partitura_cifra_pdf="https://drive.google.com/file/d/partitura-violino-thousand-years/view",
                    observacoes_arranjo="Disparar playback com portas fechadas; abrir portas na entrada do violino no compasso 5.",
                ),
                RepertorioCerimonia(
                    evento_id=ev_solo.id,
                    ordem_execucao=4,
                    momento_cerimonia=MomentoCerimoniaEnum.BENCAO_ALIANCAS,
                    nome_musica="Hallelujah",
                    artista_versao_referencia="Leonard Cohen (VS Piano & Pad)",
                    tom_musica="C Maior",
                    andamento_bpm=62,
                    usa_playback=True,
                    link_playback_url="/uploads/playbacks/vs_hallelujah_c.wav",
                    nome_arquivo_playback="vs_hallelujah_c.wav",
                    duracao_playback="03:50",
                    link_partitura_cifra_pdf="https://drive.google.com/file/d/partitura-violino-hallelujah/view",
                    observacoes_arranjo="Primeira oitava grave; subir para agudo no segundo refrão.",
                ),
                RepertorioCerimonia(
                    evento_id=ev_solo.id,
                    ordem_execucao=5,
                    momento_cerimonia=MomentoCerimoniaEnum.SAIDA_NOIVOS,
                    nome_musica="Viva La Vida",
                    artista_versao_referencia="Coldplay / David Garrett Style (VS Pop Orquestral)",
                    tom_musica="F Maior",
                    andamento_bpm=138,
                    usa_playback=True,
                    link_playback_url="/uploads/playbacks/vs_viva_la_vida_f.wav",
                    nome_arquivo_playback="vs_viva_la_vida_f.wav",
                    duracao_playback="03:55",
                    link_partitura_cifra_pdf="https://drive.google.com/file/d/partitura-violino-viva-la-vida/view",
                    observacoes_arranjo="Soltar VS no beijo dos noivos com volume cheio.",
                ),
            ]
        )

        db.add_all(
            [
                ParcelaContrato(
                    evento_id=ev_solo.id,
                    numero_parcela=1,
                    tipo_parcela=TipoParcelaEnum.SINAL_ENTRADA,
                    descricao="Sinal Reserva de Data (50%)",
                    valor_parcela=Decimal("1400.00"),
                    data_vencimento=date(2026, 9, 20),
                    data_pagamento=date(2026, 9, 20),
                    forma_pagamento=FormaPagamentoEnum.PIX,
                    status=StatusParcelaContratoEnum.PAGO,
                    observacoes="Recebido via PIX",
                ),
                ParcelaContrato(
                    evento_id=ev_solo.id,
                    numero_parcela=2,
                    tipo_parcela=TipoParcelaEnum.QUITACAO_FINAL,
                    descricao="Quitação Final (50% - Semana do Casamento)",
                    valor_parcela=Decimal("1400.00"),
                    data_vencimento=date(2026, 11, 18),
                    forma_pagamento=FormaPagamentoEnum.PIX,
                    status=StatusParcelaContratoEnum.ABERTO,
                    observacoes="Quitação antes do evento",
                ),
            ]
        )
        db.commit()

    # 6. Garante casamentos exemplos como Músico Freelancer (contratado por outra banda por cachê)
    if not db.query(EventoCasamento).filter(EventoCasamento.codigo_contrato == "FL-2026-001").first():
        ev_fl1 = EventoCasamento(
            codigo_contrato="FL-2026-001",
            tipo_contratacao="FREELANCER_CACHE",
            nome_banda_contratante="Orquestra & Coral Del Chiaro (Maestro Renato)",
            nome_noivos="Casamento Gabriela & Leonardo (Freela Violino)",
            cpf_cnpj_contratante="ISENTO-FREELANCER",
            telefone_contato="5511977001122",
            email_contratante="escalas@delchiaro.com.br",
            data_casamento=date(2026, 11, 28),
            horario_inicio_cerimonia=time(19, 30),
            horario_termino_previsto=time(21, 0),
            horario_chegada_banda=time(18, 0),
            local_cerimonia="Paróquia Nossa Senhora do Brasil",
            endereco_completo="Praça Nossa Senhora do Brasil, s/n - Jardim América",
            cidade_cerimonia="São Paulo",
            estado_uf="SP",
            tipo_formacao=FormacaoMusicalEnum.ORQUESTRA_CAMARA,
            descricao_formacao="Contratado como 1º Violino (Spalla Freelancer) pela Orquestra Del Chiaro",
            status=StatusEventoEnum.CONTRATO_ASSINADO,
            valor_total_bruto=Decimal("750.00"),
            observacoes_gerais="Traje: Costume preto completo, camisa preta e gravata preta. Partituras enviadas no grupo da banda contratante.",
        )
        db.add(ev_fl1)
        db.flush()

        db.add(
            SonorizacaoLogistica(
                evento_id=ev_fl1.id,
                necessita_som_proprio=False,
                lista_equipamentos=[
                    {"item": "Violino Principal + Arco Reserva + Breu + Espaleira", "quantidade": 1, "conferido": True},
                    {"item": "Captador DPA / Piezo de Violino + Cabo P10", "quantidade": 1, "conferido": True},
                    {"item": "Tablet / iPad Carregado com PDF das Partituras da Banda", "quantidade": 1, "conferido": True},
                    {"item": "Traje Social Completo exigido pela Banda Contratante", "quantidade": 1, "conferido": True},
                ],
                responsavel_tecnico_som="Equipe de Som da Orquestra Del Chiaro",
                telefone_responsavel_som="5511977001122",
                custo_locacao_tecnico_som=Decimal("0.00"),
                status_pagamento_som=StatusPagamentoEnum.PAGO,
                observacoes_logistica="Som por conta da banda que me contratou. Levar apenas meu violino, captador e iPad.",
            )
        )

        db.add(
            ParcelaContrato(
                evento_id=ev_fl1.id,
                numero_parcela=1,
                tipo_parcela=TipoParcelaEnum.QUITACAO_FINAL,
                descricao="Recebimento do Meu Cachê Freelancer — Orquestra Del Chiaro",
                valor_parcela=Decimal("750.00"),
                data_vencimento=date(2026, 11, 28),
                forma_pagamento=FormaPagamentoEnum.PIX,
                status=StatusParcelaContratoEnum.ABERTO,
                observacoes="A receber via PIX logo após a cerimônia",
            )
        )
        db.commit()

    if not db.query(EventoCasamento).filter(EventoCasamento.codigo_contrato == "FL-2026-002").first():
        ev_fl2 = EventoCasamento(
            codigo_contrato="FL-2026-002",
            tipo_contratacao="FREELANCER_CACHE",
            nome_banda_contratante="Banda Sinfonia Vip & Produções (Produtor Carlos)",
            nome_noivos="Casamento Amanda & Felipe (Freela Violino Receptivo + Cerimônia)",
            cpf_cnpj_contratante="ISENTO-FREELANCER",
            telefone_contato="5511966554433",
            email_contratante="contato@sinfoniavip.com.br",
            data_casamento=date(2026, 10, 24),
            horario_inicio_cerimonia=time(16, 30),
            horario_termino_previsto=time(18, 30),
            horario_chegada_banda=time(15, 0),
            local_cerimonia="Espaço Villa Bisutti Berrini",
            endereco_completo="Rua Casa do Ator, 675 - Vila Olímpia",
            cidade_cerimonia="São Paulo",
            estado_uf="SP",
            tipo_formacao=FormacaoMusicalEnum.SEXTETO,
            descricao_formacao="Violino Freelancer (Cerimônia + 45min Receptivo com Sax e DJ)",
            status=StatusEventoEnum.REALIZADO,
            valor_total_bruto=Decimal("850.00"),
            observacoes_gerais="Cachê de R$ 850,00 já pago via PIX pela Banda Sinfonia Vip.",
        )
        db.add(ev_fl2)
        db.flush()

        db.add(
            SonorizacaoLogistica(
                evento_id=ev_fl2.id,
                necessita_som_proprio=False,
                lista_equipamentos=[
                    {"item": "Violino Principal + Transmissor Sem Fio UHF", "quantidade": 1, "conferido": True},
                    {"item": "Fone In-Ear para Click da Banda", "quantidade": 1, "conferido": True},
                ],
                responsavel_tecnico_som="Equipe Banda Sinfonia Vip",
                telefone_responsavel_som="5511966554433",
                custo_locacao_tecnico_som=Decimal("0.00"),
                status_pagamento_som=StatusPagamentoEnum.PAGO,
                observacoes_logistica="Som completo fornecido pela banda contratante.",
            )
        )

        db.add(
            ParcelaContrato(
                evento_id=ev_fl2.id,
                numero_parcela=1,
                tipo_parcela=TipoParcelaEnum.QUITACAO_FINAL,
                descricao="Recebimento do Meu Cachê Freelancer — Banda Sinfonia Vip",
                valor_parcela=Decimal("850.00"),
                data_vencimento=date(2026, 10, 24),
                data_pagamento=date(2026, 10, 25),
                forma_pagamento=FormaPagamentoEnum.PIX,
                status=StatusParcelaContratoEnum.PAGO,
                observacoes="Cachê recebido via PIX no dia seguinte ao evento",
            )
        )
        db.commit()

    return {
        "usuarios": db.query(Usuario).count(),
        "musicos": db.query(Musico).count(),
        "casamentos": db.query(EventoCasamento).count(),
        "escalas": db.query(EscalaMusico).count(),
        "repertorio": db.query(RepertorioCerimonia).count(),
        "sonorizacao": db.query(SonorizacaoLogistica).count(),
        "parcelas": db.query(ParcelaContrato).count(),
        "playbacks": db.query(PlaybackBiblioteca).count(),
    }


if __name__ == "__main__":
    with SessionLocal() as session:
        stats = init_db_and_seed(session)
        print("Seed concluído com sucesso! Estatísticas do banco:", stats)
