from datetime import date, datetime, time
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from app.models.models import (
    FormaPagamentoEnum,
    FormacaoMusicalEnum,
    MomentoCerimoniaEnum,
    PerfilUsuarioEnum,
    StatusConfirmacaoEscalaEnum,
    StatusEventoEnum,
    StatusMusicoEnum,
    StatusPagamentoEnum,
    StatusParcelaContratoEnum,
    TipoContratacaoEventoEnum,
    TipoParcelaEnum,
)


# =============================================================================
# 1. SCHEMAS DE AUTENTICAÇÃO E USUÁRIOS
# =============================================================================


class LoginRequest(BaseModel):
    email: EmailStr
    senha: str


class UsuarioBase(BaseModel):
    nome_completo: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    perfil: PerfilUsuarioEnum = PerfilUsuarioEnum.ADMIN_GESTOR
    ativo: bool = True


class UsuarioCreate(UsuarioBase):
    senha: str = Field(..., min_length=6, max_length=100)


class UsuarioUpdate(BaseModel):
    nome_completo: Optional[str] = Field(None, min_length=2, max_length=150)
    email: Optional[EmailStr] = None
    perfil: Optional[PerfilUsuarioEnum] = None
    ativo: Optional[bool] = None
    senha: Optional[str] = Field(None, min_length=6, max_length=100)


class UsuarioOut(UsuarioBase):
    id: int
    ultimo_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioOut


# =============================================================================
# 2. MÓDULO A: SCHEMAS DE MÚSICOS E HISTÓRICO FINANCEIRO
# =============================================================================


class MusicoBase(BaseModel):
    nome_completo: str = Field(..., min_length=2, max_length=150)
    instrumento_principal: str = Field(..., min_length=2, max_length=80)
    instrumentos_secundarios: Optional[str] = Field(None, max_length=255)
    telefone_whatsapp: str = Field(..., min_length=8, max_length=25)
    email: Optional[EmailStr] = None
    chave_pix: str = Field(..., min_length=3, max_length=180)
    tipo_chave_pix: Optional[str] = Field(
        default="CPF", max_length=30
    )
    valor_cache_base: Decimal = Field(default=Decimal("0.00"), ge=0)
    cidade: str = Field(..., min_length=2, max_length=100)
    bairro: Optional[str] = Field(None, max_length=100)
    status: StatusMusicoEnum = StatusMusicoEnum.ATIVO
    observacoes: Optional[str] = None


class MusicoCreate(MusicoBase):
    pass


class MusicoUpdate(BaseModel):
    nome_completo: Optional[str] = Field(None, min_length=2, max_length=150)
    instrumento_principal: Optional[str] = Field(None, min_length=2, max_length=80)
    instrumentos_secundarios: Optional[str] = Field(None, max_length=255)
    telefone_whatsapp: Optional[str] = Field(None, min_length=8, max_length=25)
    email: Optional[EmailStr] = None
    chave_pix: Optional[str] = Field(None, min_length=3, max_length=180)
    tipo_chave_pix: Optional[str] = Field(None, max_length=30)
    valor_cache_base: Optional[Decimal] = Field(None, ge=0)
    cidade: Optional[str] = Field(None, min_length=2, max_length=100)
    bairro: Optional[str] = Field(None, max_length=100)
    status: Optional[StatusMusicoEnum] = None
    observacoes: Optional[str] = None


class MusicoOut(MusicoBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HistoricoEscalaMusicoItem(BaseModel):
    escala_id: int
    evento_id: int
    codigo_contrato: Optional[str] = None
    nome_noivos: str
    data_casamento: date
    local_cerimonia: str
    cidade_cerimonia: str
    instrumento_no_evento: str
    valor_cache_combinado: Decimal
    taxa_deslocamento_combustivel: Decimal
    valor_total_musico: Decimal
    status_confirmacao: StatusConfirmacaoEscalaEnum
    status_pagamento: StatusPagamentoEnum
    data_pagamento: Optional[date] = None
    observacoes_escala: Optional[str] = None


class HistoricoFinanceiroMusicoOut(BaseModel):
    musico: MusicoOut
    total_casamentos_escalado: int
    total_casamentos_confirmados: int
    total_caches_pagos: Decimal
    saldo_pendente_a_receber: Decimal
    total_geral_acumulado: Decimal
    historico_escalas: List[HistoricoEscalaMusicoItem]


# =============================================================================
# 3. MÓDULO C: SCHEMAS DE ESCALA DE MÚSICOS POR CASAMENTO
# =============================================================================


class EscalaMusicoBase(BaseModel):
    musico_id: int
    instrumento_no_evento: Optional[str] = Field(None, max_length=80)
    valor_cache_combinado: Optional[Decimal] = Field(None, ge=0)
    taxa_deslocamento_combustivel: Decimal = Field(default=Decimal("0.00"), ge=0)
    status_confirmacao: StatusConfirmacaoEscalaEnum = StatusConfirmacaoEscalaEnum.PENDENTE
    status_pagamento: StatusPagamentoEnum = StatusPagamentoEnum.PENDENTE
    data_pagamento: Optional[date] = None
    comprovante_pagamento_url: Optional[str] = Field(None, max_length=500)
    observacoes_escala: Optional[str] = Field(None, max_length=255)


class EscalaMusicoCreate(EscalaMusicoBase):
    pass


class EscalaMusicoUpdate(BaseModel):
    instrumento_no_evento: Optional[str] = Field(None, max_length=80)
    valor_cache_combinado: Optional[Decimal] = Field(None, ge=0)
    taxa_deslocamento_combustivel: Optional[Decimal] = Field(None, ge=0)
    status_confirmacao: Optional[StatusConfirmacaoEscalaEnum] = None
    status_pagamento: Optional[StatusPagamentoEnum] = None
    data_pagamento: Optional[date] = None
    comprovante_pagamento_url: Optional[str] = Field(None, max_length=500)
    observacoes_escala: Optional[str] = Field(None, max_length=255)


class EscalaMusicoBaixaPagamentoRequest(BaseModel):
    data_pagamento: Optional[date] = None
    comprovante_pagamento_url: Optional[str] = None
    observacoes_escala: Optional[str] = None


class ConflitoMusicoEscalaAlerta(BaseModel):
    possui_conflito: bool = False
    mensagem: Optional[str] = None
    eventos_conflitantes: List[str] = []


class EscalaMusicoOut(BaseModel):
    id: int
    evento_id: int
    musico_id: int
    instrumento_no_evento: str
    valor_cache_combinado: Decimal
    taxa_deslocamento_combustivel: Decimal
    valor_total: Decimal = Decimal("0.00")
    status_confirmacao: StatusConfirmacaoEscalaEnum
    status_pagamento: StatusPagamentoEnum
    data_pagamento: Optional[date] = None
    comprovante_pagamento_url: Optional[str] = None
    observacoes_escala: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    musico: Optional[MusicoOut] = None
    alerta_conflito: Optional[ConflitoMusicoEscalaAlerta] = None

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def compute_valor_total(self) -> "EscalaMusicoOut":
        cache = self.valor_cache_combinado or Decimal("0.00")
        desloc = self.taxa_deslocamento_combustivel or Decimal("0.00")
        self.valor_total = cache + desloc
        return self


# =============================================================================
# 4. MÓDULO D: SCHEMAS DE REPERTÓRIO / MOMENTOS DA CERIMÔNIA
# =============================================================================


class RepertorioItemBase(BaseModel):
    ordem_execucao: Optional[int] = Field(None, gt=0)
    momento_cerimonia: MomentoCerimoniaEnum
    descricao_momento_customizado: Optional[str] = Field(None, max_length=120)
    nome_musica: str = Field(..., min_length=1, max_length=180)
    artista_versao_referencia: Optional[str] = Field(None, max_length=180)
    tom_musica: Optional[str] = Field(None, max_length=30)
    andamento_bpm: Optional[int] = Field(None, gt=0)
    link_referencia_midia: Optional[str] = Field(None, max_length=500)
    link_partitura_cifra_pdf: Optional[str] = Field(None, max_length=500)
    usa_playback: bool = False
    link_playback_url: Optional[str] = Field(None, max_length=500)
    nome_arquivo_playback: Optional[str] = Field(None, max_length=255)
    duracao_playback: Optional[str] = Field(None, max_length=40)
    observacoes_arranjo: Optional[str] = None


class RepertorioItemCreate(RepertorioItemBase):
    pass


class RepertorioItemUpdate(BaseModel):
    ordem_execucao: Optional[int] = Field(None, gt=0)
    momento_cerimonia: Optional[MomentoCerimoniaEnum] = None
    descricao_momento_customizado: Optional[str] = Field(None, max_length=120)
    nome_musica: Optional[str] = Field(None, min_length=1, max_length=180)
    artista_versao_referencia: Optional[str] = Field(None, max_length=180)
    tom_musica: Optional[str] = Field(None, max_length=30)
    andamento_bpm: Optional[int] = Field(None, gt=0)
    link_referencia_midia: Optional[str] = Field(None, max_length=500)
    link_partitura_cifra_pdf: Optional[str] = Field(None, max_length=500)
    usa_playback: Optional[bool] = None
    link_playback_url: Optional[str] = Field(None, max_length=500)
    nome_arquivo_playback: Optional[str] = Field(None, max_length=255)
    duracao_playback: Optional[str] = Field(None, max_length=40)
    observacoes_arranjo: Optional[str] = None


class RepertorioItemOut(RepertorioItemBase):
    id: int
    evento_id: int
    ordem_execucao: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReordenarRepertorioItem(BaseModel):
    id: int
    ordem_execucao: int = Field(..., gt=0)


class ReordenarRepertorioRequest(BaseModel):
    itens: List[ReordenarRepertorioItem]


# =============================================================================
# 5. MÓDULO E: SCHEMAS DE SONORIZAÇÃO E LOGÍSTICA (1:1)
# =============================================================================


class EquipamentoSomItem(BaseModel):
    item: str = Field(..., min_length=1, max_length=200)
    quantidade: int = Field(default=1, ge=1)
    conferido: bool = False


class SonorizacaoBase(BaseModel):
    necessita_som_proprio: bool = True
    lista_equipamentos: List[EquipamentoSomItem] = Field(default_factory=list)
    descricao_equipamentos_texto: Optional[str] = None
    responsavel_tecnico_som: Optional[str] = Field(None, max_length=150)
    telefone_responsavel_som: Optional[str] = Field(None, max_length=25)
    custo_locacao_tecnico_som: Decimal = Field(default=Decimal("0.00"), ge=0)
    status_pagamento_som: StatusPagamentoEnum = StatusPagamentoEnum.PENDENTE
    data_pagamento_som: Optional[date] = None
    observacoes_logistica: Optional[str] = None


class SonorizacaoCreateUpdate(SonorizacaoBase):
    pass


class SonorizacaoOut(SonorizacaoBase):
    id: int
    evento_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =============================================================================
# 6. MÓDULO F: SCHEMAS DE PARCELAS DO CONTRATO E RESUMO FINANCEIRO (DRE)
# =============================================================================


class ParcelaContratoBase(BaseModel):
    numero_parcela: Optional[int] = Field(None, gt=0)
    tipo_parcela: TipoParcelaEnum = TipoParcelaEnum.PARCELA_INTERMEDIARIA
    descricao: str = Field(..., min_length=2, max_length=150)
    valor_parcela: Decimal = Field(..., gt=0)
    data_vencimento: date
    data_pagamento: Optional[date] = None
    forma_pagamento: FormaPagamentoEnum = FormaPagamentoEnum.PIX
    status: StatusParcelaContratoEnum = StatusParcelaContratoEnum.ABERTO
    comprovante_url: Optional[str] = Field(None, max_length=500)
    observacoes: Optional[str] = Field(None, max_length=255)


class ParcelaContratoCreate(ParcelaContratoBase):
    pass


class ParcelaContratoUpdate(BaseModel):
    numero_parcela: Optional[int] = Field(None, gt=0)
    tipo_parcela: Optional[TipoParcelaEnum] = None
    descricao: Optional[str] = Field(None, min_length=2, max_length=150)
    valor_parcela: Optional[Decimal] = Field(None, gt=0)
    data_vencimento: Optional[date] = None
    data_pagamento: Optional[date] = None
    forma_pagamento: Optional[FormaPagamentoEnum] = None
    status: Optional[StatusParcelaContratoEnum] = None
    comprovante_url: Optional[str] = Field(None, max_length=500)
    observacoes: Optional[str] = Field(None, max_length=255)


class ParcelaContratoBaixaRequest(BaseModel):
    data_pagamento: Optional[date] = None
    forma_pagamento: Optional[FormaPagamentoEnum] = None
    comprovante_url: Optional[str] = None
    observacoes: Optional[str] = None


class ParcelaContratoOut(ParcelaContratoBase):
    id: int
    evento_id: int
    numero_parcela: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ResumoFinanceiroDREOut(BaseModel):
    """DRE e Resumo Financeiro Automático por Casamento (Regras do Módulo F)."""
    evento_id: int
    receita_bruta: Decimal
    receita_ja_recebida: Decimal
    saldo_a_receber_noivos: Decimal
    total_musicos_escalados: int
    musicos_confirmados: int
    custo_caches: Decimal
    custo_deslocamento: Decimal
    custo_sonorizacao: Decimal
    despesas_totais: Decimal
    total_pago_musicos: Decimal
    total_pendente_musicos: Decimal
    lucro_liquido_banda: Decimal
    margem_lucro_percentual: Decimal


# =============================================================================
# 7. MÓDULO B: SCHEMAS DE CASAMENTOS / EVENTOS E CONFLITO DE AGENDA
# =============================================================================


class ConflitoAgendaItem(BaseModel):
    evento_id: int
    codigo_contrato: Optional[str] = None
    nome_noivos: str
    data_casamento: date
    horario_chegada_banda: time
    horario_inicio_cerimonia: time
    horario_termino_considerado: time
    local_cerimonia: str
    cidade_cerimonia: str
    status: StatusEventoEnum
    tipo_conflito: str  # "SOBREPOSICAO_DIRETA" | "MARGEM_INFERIOR_90_MIN"
    diferenca_minutos: int
    mensagem_detalhada: str


class VerificacaoConflitoOut(BaseModel):
    possui_conflito: bool
    margem_minima_recomendada_minutos: int = 90
    total_conflitos: int
    conflitos: List[ConflitoAgendaItem]


class EventoCasamentoBase(BaseModel):
    codigo_contrato: Optional[str] = Field(None, max_length=30)
    tipo_contratacao: TipoContratacaoEventoEnum = TipoContratacaoEventoEnum.CONTRATO_PROPRIO
    nome_banda_contratante: Optional[str] = Field(None, max_length=200)
    nome_noivos: str = Field(..., min_length=3, max_length=200)
    cpf_cnpj_contratante: str = Field(default="ISENTO-FREELANCER", min_length=3, max_length=20)
    telefone_contato: str = Field(..., min_length=8, max_length=25)
    email_contratante: Optional[EmailStr] = None
    data_casamento: date
    horario_inicio_cerimonia: time
    horario_termino_previsto: Optional[time] = None
    horario_chegada_banda: time
    local_cerimonia: str = Field(..., min_length=2, max_length=200)
    endereco_completo: Optional[str] = Field(None, max_length=255)
    cidade_cerimonia: str = Field(..., min_length=2, max_length=100)
    estado_uf: str = Field(default="SP", min_length=2, max_length=2)
    tipo_formacao: FormacaoMusicalEnum
    descricao_formacao: Optional[str] = Field(None, max_length=255)
    status: StatusEventoEnum = StatusEventoEnum.ORCAMENTO
    link_arquivo_contrato_pdf: Optional[str] = Field(None, max_length=500)
    valor_total_bruto: Decimal = Field(default=Decimal("0.00"), ge=0)
    observacoes_gerais: Optional[str] = None

    @model_validator(mode="after")
    def validate_horarios(self) -> "EventoCasamentoBase":
        if self.horario_chegada_banda > self.horario_inicio_cerimonia:
            raise ValueError(
                "O horário de chegada da banda (passagem de som) deve ser anterior ou igual ao horário de início da cerimônia."
            )
        return self


class EventoCasamentoCreate(EventoCasamentoBase):
    forcar_criacao_com_conflito: bool = True
    status_cache_freelancer: Optional[str] = "ABERTO"


class EventoCasamentoUpdate(BaseModel):
    codigo_contrato: Optional[str] = Field(None, max_length=30)
    tipo_contratacao: Optional[TipoContratacaoEventoEnum] = None
    nome_banda_contratante: Optional[str] = Field(None, max_length=200)
    nome_noivos: Optional[str] = Field(None, min_length=3, max_length=200)
    cpf_cnpj_contratante: Optional[str] = Field(None, min_length=3, max_length=20)
    telefone_contato: Optional[str] = Field(None, min_length=8, max_length=25)
    email_contratante: Optional[EmailStr] = None
    data_casamento: Optional[date] = None
    horario_inicio_cerimonia: Optional[time] = None
    horario_termino_previsto: Optional[time] = None
    horario_chegada_banda: Optional[time] = None
    local_cerimonia: Optional[str] = Field(None, min_length=2, max_length=200)
    endereco_completo: Optional[str] = Field(None, max_length=255)
    cidade_cerimonia: Optional[str] = Field(None, min_length=2, max_length=100)
    estado_uf: Optional[str] = Field(None, min_length=2, max_length=2)
    tipo_formacao: Optional[FormacaoMusicalEnum] = None
    descricao_formacao: Optional[str] = Field(None, max_length=255)
    status: Optional[StatusEventoEnum] = None
    link_arquivo_contrato_pdf: Optional[str] = Field(None, max_length=500)
    valor_total_bruto: Optional[Decimal] = Field(None, ge=0)
    observacoes_gerais: Optional[str] = None


class EventoCasamentoListOut(EventoCasamentoBase):
    id: int
    created_at: datetime
    updated_at: datetime
    resumo_financeiro: Optional[ResumoFinanceiroDREOut] = None
    alerta_conflito_agenda: Optional[VerificacaoConflitoOut] = None

    model_config = ConfigDict(from_attributes=True)


class EventoCasamento360Out(EventoCasamentoBase):
    id: int
    created_at: datetime
    updated_at: datetime
    escalas: List[EscalaMusicoOut] = []
    repertorio: List[RepertorioItemOut] = []
    sonorizacao: Optional[SonorizacaoOut] = None
    parcelas: List[ParcelaContratoOut] = []
    resumo_financeiro: ResumoFinanceiroDREOut
    alerta_conflito_agenda: Optional[VerificacaoConflitoOut] = None

    model_config = ConfigDict(from_attributes=True)


# =============================================================================
# 8. SCHEMAS DO DASHBOARD EXECUTIVO
# =============================================================================


class AlertaFinanceiroItem(BaseModel):
    tipo: str  # "PARCELA_NOIVOS" | "CACHE_MUSICO" | "SOM_LOGISTICA"
    evento_id: int
    codigo_contrato: Optional[str] = None
    nome_noivos: str
    descricao: str
    favorecido_ou_pagador: str
    valor: Decimal
    data_referencia: date
    status_alerta: str  # "ATRASADO" | "VENCENDO_SEMANA" | "PENDENTE"


class DashboardOverviewOut(BaseModel):
    faturamento_mes: Decimal
    lucro_liquido_previsto_ano: Decimal
    receita_bruta_ano: Decimal
    despesas_totais_ano: Decimal
    total_casamentos_ano: int
    total_casamentos_confirmados_ano: int
    caches_pendentes_pagamento: Decimal
    quantidade_caches_pendentes: int
    saldo_a_receber_noivos_total: Decimal
    proximos_casamentos: List[EventoCasamentoListOut]
    alertas_vencimentos: List[AlertaFinanceiroItem]


# =============================================================================
# 9. MÓDULO G: SCHEMAS DE BIBLIOTECA DE PLAYBACKS (VS)
# =============================================================================


class PlaybackBibliotecaBase(BaseModel):
    nome_musica: str = Field(..., min_length=1, max_length=180)
    artista_versao: Optional[str] = Field(None, max_length=180)
    tom_violino: Optional[str] = Field(None, max_length=40)
    andamento_bpm: Optional[int] = Field(None, gt=0)
    duracao_formatada: Optional[str] = Field(None, max_length=40)
    momento_sugerido: Optional[MomentoCerimoniaEnum] = None
    arquivo_playback_url: str = Field(..., min_length=1, max_length=500)
    nome_arquivo_original: Optional[str] = Field(None, max_length=255)
    link_partitura_violino_pdf: Optional[str] = Field(None, max_length=500)
    observacoes_execucao: Optional[str] = None
    favorito: bool = False


class PlaybackBibliotecaCreate(PlaybackBibliotecaBase):
    pass


class PlaybackBibliotecaUpdate(BaseModel):
    nome_musica: Optional[str] = Field(None, min_length=1, max_length=180)
    artista_versao: Optional[str] = Field(None, max_length=180)
    tom_violino: Optional[str] = Field(None, max_length=40)
    andamento_bpm: Optional[int] = Field(None, gt=0)
    duracao_formatada: Optional[str] = Field(None, max_length=40)
    momento_sugerido: Optional[MomentoCerimoniaEnum] = None
    arquivo_playback_url: Optional[str] = Field(None, min_length=1, max_length=500)
    nome_arquivo_original: Optional[str] = Field(None, max_length=255)
    link_partitura_violino_pdf: Optional[str] = Field(None, max_length=500)
    observacoes_execucao: Optional[str] = None
    favorito: Optional[bool] = None


class PlaybackBibliotecaOut(PlaybackBibliotecaBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UploadPlaybackOut(BaseModel):
    arquivo_url: str
    nome_arquivo_original: str
    tamanho_bytes: int
