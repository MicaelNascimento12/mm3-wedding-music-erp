import enum
from datetime import date, datetime, time, timezone
from decimal import Decimal
from typing import Any, List, Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Index,
    Integer,
    JSON,
    Numeric,
    SmallInteger,
    String,
    Text,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

# Tipo compatível com BIGSERIAL no PostgreSQL e INTEGER AUTOINCREMENT no SQLite
PKBigInt = BigInteger().with_variant(Integer, "sqlite")
JSONBType = JSON().with_variant(JSONB(), "postgresql")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


# =============================================================================
# 1. TIPOS ENUMERADOS (DOMÍNIOS DO SISTEMA)
# =============================================================================


class StatusMusicoEnum(str, enum.Enum):
    ATIVO = "ATIVO"
    INATIVO = "INATIVO"


class FormacaoMusicalEnum(str, enum.Enum):
    VIOLINO_SOLO = "VIOLINO_SOLO"
    DUO = "DUO"
    TRIO = "TRIO"
    QUARTETO = "QUARTETO"
    QUINTETO = "QUINTETO"
    SEXTETO = "SEXTETO"
    ORQUESTRA_CAMARA = "ORQUESTRA_CAMARA"
    BANDA_COMPLETA = "BANDA_COMPLETA"
    PERSONALIZADA = "PERSONALIZADA"


class StatusEventoEnum(str, enum.Enum):
    ORCAMENTO = "ORCAMENTO"
    CONTRATO_ASSINADO = "CONTRATO_ASSINADO"
    EM_PREPARACAO = "EM_PREPARACAO"
    REALIZADO = "REALIZADO"
    CANCELADO = "CANCELADO"


class TipoContratacaoEventoEnum(str, enum.Enum):
    CONTRATO_PROPRIO = "CONTRATO_PROPRIO"
    FREELANCER_CACHE = "FREELANCER_CACHE"


class StatusConfirmacaoEscalaEnum(str, enum.Enum):
    PENDENTE = "PENDENTE"
    CONFIRMADO = "CONFIRMADO"
    RECUSOU = "RECUSOU"


class StatusPagamentoEnum(str, enum.Enum):
    PENDENTE = "PENDENTE"
    PAGO = "PAGO"


class StatusParcelaContratoEnum(str, enum.Enum):
    ABERTO = "ABERTO"
    PAGO = "PAGO"
    ATRASADO = "ATRASADO"
    CANCELADO = "CANCELADO"


class TipoParcelaEnum(str, enum.Enum):
    SINAL_ENTRADA = "SINAL_ENTRADA"
    PARCELA_INTERMEDIARIA = "PARCELA_INTERMEDIARIA"
    QUITACAO_FINAL = "QUITACAO_FINAL"
    ADITIVO_EXTRA = "ADITIVO_EXTRA"


class FormaPagamentoEnum(str, enum.Enum):
    PIX = "PIX"
    TRANSFERENCIA_TED_DOC = "TRANSFERENCIA_TED_DOC"
    CARTAO_CREDITO = "CARTAO_CREDITO"
    CARTAO_DEBITO = "CARTAO_DEBITO"
    BOLETO = "BOLETO"
    DINHEIRO = "DINHEIRO"


class MomentoCerimoniaEnum(str, enum.Enum):
    RECEPTIVO_CONVIDADOS = "RECEPTIVO_CONVIDADOS"
    ENTRADA_PADRINHOS = "ENTRADA_PADRINHOS"
    ENTRADA_NOIVO = "ENTRADA_NOIVO"
    ENTRADA_PAJENS_DAMAS = "ENTRADA_PAJENS_DAMAS"
    ANUNCIO_CLARINS = "ANUNCIO_CLARINS"
    ENTRADA_NOIVA = "ENTRADA_NOIVA"
    BENCAO_ALIANCAS = "BENCAO_ALIANCAS"
    COMUNHAO_HOMENAGENS = "COMUNHAO_HOMENAGENS"
    ASSINATURA_TERMOS = "ASSINATURA_TERMOS"
    CUMPRIMENTOS = "CUMPRIMENTOS"
    SAIDA_NOIVOS = "SAIDA_NOIVOS"
    POSLUDIO_SAIDA_CONVIDADOS = "POSLUDIO_SAIDA_CONVIDADOS"
    OUTRO = "OUTRO"


class PerfilUsuarioEnum(str, enum.Enum):
    ADMIN_GESTOR = "ADMIN_GESTOR"
    COORDENADOR_CERIMONIA = "COORDENADOR_CERIMONIA"
    FINANCEIRO = "FINANCEIRO"
    MUSICO_LEITURA = "MUSICO_LEITURA"


# =============================================================================
# 2. TABELA DE USUÁRIOS (AUTENTICAÇÃO JWT / ACESSO AO SISTEMA)
# =============================================================================


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(PKBigInt, primary_key=True, autoincrement=True)
    nome_completo: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(180), unique=True, nullable=False, index=True)
    senha_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    perfil: Mapped[PerfilUsuarioEnum] = mapped_column(
        SAEnum(PerfilUsuarioEnum, name="perfil_usuario_enum"),
        nullable=False,
        default=PerfilUsuarioEnum.ADMIN_GESTOR,
    )
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    ultimo_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
        server_default=func.now(),
    )


# =============================================================================
# 3. MÓDULO A: TABELA DE MÚSICOS (FIXOS E FREELANCERS)
# =============================================================================


class Musico(Base):
    __tablename__ = "musicos"
    __table_args__ = (
        CheckConstraint("valor_cache_base >= 0", name="chk_musicos_cache_base_positivo"),
        Index("idx_musicos_instrumento_principal", "instrumento_principal"),
        Index("idx_musicos_status", "status"),
        Index("idx_musicos_nome_trgm", "nome_completo"),
        Index("idx_musicos_cidade", "cidade"),
    )

    id: Mapped[int] = mapped_column(PKBigInt, primary_key=True, autoincrement=True)
    nome_completo: Mapped[str] = mapped_column(String(150), nullable=False)
    instrumento_principal: Mapped[str] = mapped_column(String(80), nullable=False)
    instrumentos_secundarios: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    telefone_whatsapp: Mapped[str] = mapped_column(String(25), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(180), unique=True, nullable=True)
    chave_pix: Mapped[str] = mapped_column(String(180), nullable=False)
    tipo_chave_pix: Mapped[Optional[str]] = mapped_column(
        String(30), default="CPF/CNPJ/EMAIL/TELEFONE/ALEATORIA", nullable=True
    )
    valor_cache_base: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00")
    )
    cidade: Mapped[str] = mapped_column(String(100), nullable=False)
    bairro: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[StatusMusicoEnum] = mapped_column(
        SAEnum(StatusMusicoEnum, name="status_musico_enum"),
        nullable=False,
        default=StatusMusicoEnum.ATIVO,
    )
    observacoes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
        server_default=func.now(),
    )

    # Relacionamentos
    escalas: Mapped[List["EscalaMusico"]] = relationship(
        "EscalaMusico", back_populates="musico", cascade="all, delete-orphan"
    )


# =============================================================================
# 4. MÓDULO B: TABELA DE CASAMENTOS / EVENTOS (DATAS E CONTRATOS)
# =============================================================================


class EventoCasamento(Base):
    __tablename__ = "eventos_casamento"
    __table_args__ = (
        CheckConstraint("valor_total_bruto >= 0", name="chk_eventos_valor_bruto_positivo"),
        CheckConstraint(
            "horario_chegada_banda <= horario_inicio_cerimonia",
            name="chk_horarios_validos",
        ),
        Index("idx_eventos_data_casamento", "data_casamento"),
        Index("idx_eventos_status", "status"),
        Index("idx_eventos_tipo_formacao", "tipo_formacao"),
        Index("idx_eventos_nome_noivos", "nome_noivos"),
    )

    id: Mapped[int] = mapped_column(PKBigInt, primary_key=True, autoincrement=True)
    codigo_contrato: Mapped[Optional[str]] = mapped_column(String(30), unique=True, nullable=True)
    tipo_contratacao: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default=TipoContratacaoEventoEnum.CONTRATO_PROPRIO.value,
        server_default="CONTRATO_PROPRIO",
    )
    nome_banda_contratante: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    nome_noivos: Mapped[str] = mapped_column(String(200), nullable=False)
    cpf_cnpj_contratante: Mapped[str] = mapped_column(String(20), nullable=False)
    telefone_contato: Mapped[str] = mapped_column(String(25), nullable=False)
    email_contratante: Mapped[Optional[str]] = mapped_column(String(180), nullable=True)
    data_casamento: Mapped[date] = mapped_column(Date, nullable=False)
    horario_inicio_cerimonia: Mapped[time] = mapped_column(Time, nullable=False)
    horario_termino_previsto: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    horario_chegada_banda: Mapped[time] = mapped_column(Time, nullable=False)
    local_cerimonia: Mapped[str] = mapped_column(String(200), nullable=False)
    endereco_completo: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    cidade_cerimonia: Mapped[str] = mapped_column(String(100), nullable=False)
    estado_uf: Mapped[str] = mapped_column(String(2), nullable=False, default="SP")
    tipo_formacao: Mapped[FormacaoMusicalEnum] = mapped_column(
        SAEnum(FormacaoMusicalEnum, name="formacao_musical_enum"), nullable=False
    )
    descricao_formacao: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[StatusEventoEnum] = mapped_column(
        SAEnum(StatusEventoEnum, name="status_evento_enum"),
        nullable=False,
        default=StatusEventoEnum.ORCAMENTO,
    )
    link_arquivo_contrato_pdf: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    valor_total_bruto: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )
    observacoes_gerais: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
        server_default=func.now(),
    )

    # Relacionamentos
    escalas: Mapped[List["EscalaMusico"]] = relationship(
        "EscalaMusico",
        back_populates="evento",
        cascade="all, delete-orphan",
        order_by="EscalaMusico.id",
    )
    repertorio: Mapped[List["RepertorioCerimonia"]] = relationship(
        "RepertorioCerimonia",
        back_populates="evento",
        cascade="all, delete-orphan",
        order_by="RepertorioCerimonia.ordem_execucao",
    )
    sonorizacao: Mapped[Optional["SonorizacaoLogistica"]] = relationship(
        "SonorizacaoLogistica",
        back_populates="evento",
        uselist=False,
        cascade="all, delete-orphan",
    )
    parcelas: Mapped[List["ParcelaContrato"]] = relationship(
        "ParcelaContrato",
        back_populates="evento",
        cascade="all, delete-orphan",
        order_by="ParcelaContrato.numero_parcela",
    )


# =============================================================================
# 5. MÓDULO C: ESCALA DE MÚSICOS POR CASAMENTO (RELACIONAMENTO N:N)
# =============================================================================


class EscalaMusico(Base):
    __tablename__ = "escalas_musicos"
    __table_args__ = (
        UniqueConstraint("evento_id", "musico_id", name="uq_evento_musico"),
        CheckConstraint("valor_cache_combinado >= 0", name="chk_escala_cache_positivo"),
        CheckConstraint(
            "taxa_deslocamento_combustivel >= 0", name="chk_escala_deslocamento_positivo"
        ),
        Index("idx_escalas_evento_id", "evento_id"),
        Index("idx_escalas_musico_id", "musico_id"),
        Index("idx_escalas_status_pagamento", "status_pagamento"),
        Index("idx_escalas_status_confirmacao", "status_confirmacao"),
    )

    id: Mapped[int] = mapped_column(PKBigInt, primary_key=True, autoincrement=True)
    evento_id: Mapped[int] = mapped_column(
        PKBigInt,
        ForeignKey("eventos_casamento.id", ondelete="CASCADE"),
        nullable=False,
    )
    musico_id: Mapped[int] = mapped_column(
        PKBigInt,
        ForeignKey("musicos.id", ondelete="CASCADE"),
        nullable=False,
    )
    instrumento_no_evento: Mapped[str] = mapped_column(String(80), nullable=False)
    valor_cache_combinado: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00")
    )
    taxa_deslocamento_combustivel: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00")
    )
    status_confirmacao: Mapped[StatusConfirmacaoEscalaEnum] = mapped_column(
        SAEnum(StatusConfirmacaoEscalaEnum, name="status_confirmacao_escala_enum"),
        nullable=False,
        default=StatusConfirmacaoEscalaEnum.PENDENTE,
    )
    status_pagamento: Mapped[StatusPagamentoEnum] = mapped_column(
        SAEnum(StatusPagamentoEnum, name="status_pagamento_enum"),
        nullable=False,
        default=StatusPagamentoEnum.PENDENTE,
    )
    data_pagamento: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    comprovante_pagamento_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    observacoes_escala: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
        server_default=func.now(),
    )

    # Relacionamentos
    evento: Mapped["EventoCasamento"] = relationship("EventoCasamento", back_populates="escalas")
    musico: Mapped["Musico"] = relationship("Musico", back_populates="escalas")


# =============================================================================
# 6. MÓDULO D: REPERTÓRIO / MOMENTOS DA CERIMÔNIA (SETLIST)
# =============================================================================


class RepertorioCerimonia(Base):
    __tablename__ = "repertorio_cerimonia"
    __table_args__ = (
        UniqueConstraint("evento_id", "ordem_execucao", name="uq_evento_ordem_execucao"),
        CheckConstraint("ordem_execucao > 0", name="chk_repertorio_ordem_positiva"),
        Index("idx_repertorio_evento_ordem", "evento_id", "ordem_execucao"),
        Index("idx_repertorio_nome_musica", "nome_musica"),
    )

    id: Mapped[int] = mapped_column(PKBigInt, primary_key=True, autoincrement=True)
    evento_id: Mapped[int] = mapped_column(
        PKBigInt,
        ForeignKey("eventos_casamento.id", ondelete="CASCADE"),
        nullable=False,
    )
    ordem_execucao: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    momento_cerimonia: Mapped[MomentoCerimoniaEnum] = mapped_column(
        SAEnum(MomentoCerimoniaEnum, name="momento_cerimonia_enum"),
        nullable=False,
    )
    descricao_momento_customizado: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    nome_musica: Mapped[str] = mapped_column(String(180), nullable=False)
    artista_versao_referencia: Mapped[Optional[str]] = mapped_column(String(180), nullable=True)
    tom_musica: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    andamento_bpm: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    link_referencia_midia: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    link_partitura_cifra_pdf: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    usa_playback: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    link_playback_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    nome_arquivo_playback: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    duracao_playback: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    observacoes_arranjo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
        server_default=func.now(),
    )

    # Relacionamento
    evento: Mapped["EventoCasamento"] = relationship("EventoCasamento", back_populates="repertorio")


# =============================================================================
# 7. MÓDULO E: SONORIZAÇÃO E LOGÍSTICA (RELACIONAMENTO 1:1 COM EVENTO)
# =============================================================================


class SonorizacaoLogistica(Base):
    __tablename__ = "sonorizacao_logistica"
    __table_args__ = (
        CheckConstraint(
            "custo_locacao_tecnico_som >= 0", name="chk_sonorizacao_custo_positivo"
        ),
        Index("idx_sonorizacao_evento_id", "evento_id"),
    )

    id: Mapped[int] = mapped_column(PKBigInt, primary_key=True, autoincrement=True)
    evento_id: Mapped[int] = mapped_column(
        PKBigInt,
        ForeignKey("eventos_casamento.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    necessita_som_proprio: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    lista_equipamentos: Mapped[List[dict[str, Any]]] = mapped_column(
        JSONBType, nullable=False, default=list
    )
    descricao_equipamentos_texto: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    responsavel_tecnico_som: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    telefone_responsavel_som: Mapped[Optional[str]] = mapped_column(String(25), nullable=True)
    custo_locacao_tecnico_som: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0.00")
    )
    status_pagamento_som: Mapped[StatusPagamentoEnum] = mapped_column(
        SAEnum(StatusPagamentoEnum, name="status_pagamento_enum"),
        nullable=False,
        default=StatusPagamentoEnum.PENDENTE,
    )
    data_pagamento_som: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    observacoes_logistica: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
        server_default=func.now(),
    )

    # Relacionamento
    evento: Mapped["EventoCasamento"] = relationship("EventoCasamento", back_populates="sonorizacao")


# =============================================================================
# 8. MÓDULO F: FINANCEIRO - PARCELAS E RECEBIMENTOS DOS NOIVOS
# =============================================================================


class ParcelaContrato(Base):
    __tablename__ = "parcelas_contrato"
    __table_args__ = (
        UniqueConstraint("evento_id", "numero_parcela", name="uq_evento_numero_parcela"),
        CheckConstraint("numero_parcela > 0", name="chk_parcela_numero_positivo"),
        CheckConstraint("valor_parcela > 0", name="chk_parcela_valor_positivo"),
        Index("idx_parcelas_evento_id", "evento_id"),
        Index("idx_parcelas_vencimento_status", "data_vencimento", "status"),
        Index("idx_parcelas_data_pagamento", "data_pagamento"),
    )

    id: Mapped[int] = mapped_column(PKBigInt, primary_key=True, autoincrement=True)
    evento_id: Mapped[int] = mapped_column(
        PKBigInt,
        ForeignKey("eventos_casamento.id", ondelete="CASCADE"),
        nullable=False,
    )
    numero_parcela: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    tipo_parcela: Mapped[TipoParcelaEnum] = mapped_column(
        SAEnum(TipoParcelaEnum, name="tipo_parcela_enum"),
        nullable=False,
        default=TipoParcelaEnum.PARCELA_INTERMEDIARIA,
    )
    descricao: Mapped[str] = mapped_column(String(150), nullable=False)
    valor_parcela: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    data_vencimento: Mapped[date] = mapped_column(Date, nullable=False)
    data_pagamento: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    forma_pagamento: Mapped[FormaPagamentoEnum] = mapped_column(
        SAEnum(FormaPagamentoEnum, name="forma_pagamento_enum"),
        nullable=False,
        default=FormaPagamentoEnum.PIX,
    )
    status: Mapped[StatusParcelaContratoEnum] = mapped_column(
        SAEnum(StatusParcelaContratoEnum, name="status_parcela_contrato_enum"),
        nullable=False,
        default=StatusParcelaContratoEnum.ABERTO,
    )
    comprovante_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    observacoes: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
        server_default=func.now(),
    )

    # Relacionamento
    evento: Mapped["EventoCasamento"] = relationship("EventoCasamento", back_populates="parcelas")


# =============================================================================
# 9. MÓDULO G: BIBLIOTECA DE PLAYBACKS (VS) PARA VIOLINO SOLO & CERIMÔNIAS
# =============================================================================


class PlaybackBiblioteca(Base):
    __tablename__ = "playbacks_biblioteca"
    __table_args__ = (
        Index("idx_playbacks_nome_musica", "nome_musica"),
        Index("idx_playbacks_momento", "momento_sugerido"),
    )

    id: Mapped[int] = mapped_column(PKBigInt, primary_key=True, autoincrement=True)
    nome_musica: Mapped[str] = mapped_column(String(180), nullable=False)
    artista_versao: Mapped[Optional[str]] = mapped_column(String(180), nullable=True)
    tom_violino: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    andamento_bpm: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    duracao_formatada: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    momento_sugerido: Mapped[Optional[MomentoCerimoniaEnum]] = mapped_column(
        SAEnum(MomentoCerimoniaEnum, name="momento_cerimonia_enum"),
        nullable=True,
    )
    arquivo_playback_url: Mapped[str] = mapped_column(String(500), nullable=False)
    nome_arquivo_original: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    link_partitura_violino_pdf: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    observacoes_execucao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    favorito: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
        server_default=func.now(),
    )
