from datetime import date, time
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import FormacaoMusicalEnum, StatusEventoEnum
from app.schemas.schemas import (
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
from app.services.evento_service import EventoService

router = APIRouter(prefix="/eventos", tags=["Módulos B, C, D, E, F - Casamentos & Visão 360º"])


@router.get("", response_model=List[EventoCasamentoListOut])
def listar_eventos(
    mes: Optional[int] = Query(None, ge=1, le=12, description="Filtrar por mês (1 a 12)"),
    ano: Optional[int] = Query(None, ge=2020, le=2100, description="Filtrar por ano"),
    status_evento: Optional[StatusEventoEnum] = Query(
        None, alias="status", description="Filtrar por status do casamento"
    ),
    tipo_formacao: Optional[FormacaoMusicalEnum] = Query(
        None, description="Filtrar por formação musical"
    ),
    tipo_contratacao: Optional[str] = Query(
        None, description="Filtrar por tipo de contratação (CONTRATO_PROPRIO ou FREELANCER_CACHE)"
    ),
    search: Optional[str] = Query(
        None, description="Busca por nome dos noivos, banda contratante, código de contrato ou local"
    ),
    db: Session = Depends(get_db),
):
    """Lista todos os casamentos com resumo financeiro de DRE e alertas de conflito."""
    return EventoService.listar_eventos(
        db,
        mes=mes,
        ano=ano,
        status_filtro=status_evento,
        tipo_formacao=tipo_formacao,
        tipo_contratacao=tipo_contratacao,
        search=search,
    )


@router.get("/verificar-conflito", response_model=VerificacaoConflitoOut)
def verificar_conflito_agenda(
    data_casamento: date = Query(..., description="Data do casamento (YYYY-MM-DD)"),
    horario_chegada_banda: time = Query(
        ..., description="Horário de chegada / passagem de som (HH:MM)"
    ),
    horario_inicio_cerimonia: time = Query(
        ..., description="Horário de início da cerimônia (HH:MM)"
    ),
    horario_termino_previsto: Optional[time] = Query(
        None, description="Horário previsto de término (HH:MM)"
    ),
    exclude_evento_id: Optional[int] = Query(
        None, description="ID do evento atual em caso de edição"
    ),
    db: Session = Depends(get_db),
):
    """
    Endpoint dedicado para validação em tempo real de conflito de agenda.
    Verifica se já existe outro casamento não cancelado na mesma data cuja janela entre
    horario_chegada_banda e horario_termino_previsto (ou inicio + 2h) tenha sobreposição
    ou margem inferior a 90 minutos.
    """
    return EventoService.verificar_conflito_agenda(
        db,
        data_casamento=data_casamento,
        horario_chegada_banda=horario_chegada_banda,
        horario_inicio_cerimonia=horario_inicio_cerimonia,
        horario_termino_previsto=horario_termino_previsto,
        exclude_evento_id=exclude_evento_id,
    )


@router.get("/{evento_id}", response_model=EventoCasamento360Out)
def obter_evento_360(evento_id: int, db: Session = Depends(get_db)):
    """Retorna a Visão 360º completa de um casamento (Contrato, Escala, Repertório, Som e Financeiro/DRE)."""
    return EventoService.obter_evento_360(db, evento_id)


@router.get("/{evento_id}/resumo-financeiro", response_model=ResumoFinanceiroDREOut)
def obter_resumo_financeiro_evento(evento_id: int, db: Session = Depends(get_db)):
    """Retorna exclusivamente os cálculos automáticos de DRE do casamento."""
    ev = EventoService.obter_evento_model(db, evento_id)
    return EventoService.calcular_dre_evento(ev)


@router.post(
    "",
    response_model=EventoCasamento360Out,
    status_code=status.HTTP_201_CREATED,
)
def criar_evento(data: EventoCasamentoCreate, db: Session = Depends(get_db)):
    """Cria um novo casamento, inicializa a sonorização padrão e retorna a visão 360º."""
    return EventoService.criar_evento(db, data)


@router.put("/{evento_id}", response_model=EventoCasamento360Out)
def atualizar_evento(
    evento_id: int, data: EventoCasamentoUpdate, db: Session = Depends(get_db)
):
    """Atualiza os dados cadastrais e contratuais do casamento."""
    return EventoService.atualizar_evento(db, evento_id, data)


@router.delete("/{evento_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_evento(evento_id: int, db: Session = Depends(get_db)):
    """Remove um casamento e todos os seus registros dependentes (CASCADE)."""
    EventoService.remover_evento(db, evento_id)
    return None


@router.post(
    "/{evento_id}/confirmar-cache-freelancer",
    response_model=EventoCasamento360Out,
)
def confirmar_cache_freelancer(evento_id: int, db: Session = Depends(get_db)):
    """Confirma com 1 clique que o cachê do casamento Freelancer foi recebido da banda contratante."""
    return EventoService.confirmar_recebimento_cache_freelancer(db, evento_id)


# =============================================================================
# MÓDULO C: ESCALA DE MÚSICOS DO CASAMENTO
# =============================================================================


@router.post(
    "/{evento_id}/escalas",
    response_model=EscalaMusicoOut,
    status_code=status.HTTP_201_CREATED,
)
def adicionar_musico_escala(
    evento_id: int, data: EscalaMusicoCreate, db: Session = Depends(get_db)
):
    """Escala um músico no casamento (pré-preenchendo cachê base caso não informado)."""
    return EventoService.adicionar_musico_escala(db, evento_id, data)


@router.put("/{evento_id}/escalas/{escala_id}", response_model=EscalaMusicoOut)
def atualizar_escala_musico(
    evento_id: int,
    escala_id: int,
    data: EscalaMusicoUpdate,
    db: Session = Depends(get_db),
):
    """Atualiza confirmação de presença, cachê combinado, deslocamento ou pagamento."""
    return EventoService.atualizar_escala_musico(db, evento_id, escala_id, data)


@router.post(
    "/{evento_id}/escalas/{escala_id}/baixar-pagamento",
    response_model=EscalaMusicoOut,
)
def baixar_pagamento_escala_musico(
    evento_id: int,
    escala_id: int,
    payload: Optional[EscalaMusicoBaixaPagamentoRequest] = None,
    db: Session = Depends(get_db),
):
    """Registra baixa rápida de pagamento do cachê do músico (status = PAGO e data_pagamento = hoje)."""
    return EventoService.baixar_pagamento_escala(db, evento_id, escala_id, payload)


@router.delete(
    "/{evento_id}/escalas/{escala_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remover_musico_escala(
    evento_id: int, escala_id: int, db: Session = Depends(get_db)
):
    """Remove um músico da escala do casamento."""
    EventoService.remover_musico_escala(db, evento_id, escala_id)
    return None


# =============================================================================
# MÓDULO D: REPERTÓRIO / MOMENTOS DA CERIMÔNIA
# =============================================================================


@router.post(
    "/{evento_id}/repertorio",
    response_model=RepertorioItemOut,
    status_code=status.HTTP_201_CREATED,
)
def adicionar_item_repertorio(
    evento_id: int, data: RepertorioItemCreate, db: Session = Depends(get_db)
):
    """Adiciona uma nova música/momento ao repertório da cerimônia."""
    return EventoService.adicionar_item_repertorio(db, evento_id, data)


@router.put(
    "/{evento_id}/repertorio/reordenar",
    response_model=List[RepertorioItemOut],
)
def reordenar_repertorio(
    evento_id: int,
    request: ReordenarRepertorioRequest,
    db: Session = Depends(get_db),
):
    """Reordena a sequência de execução das músicas da cerimônia."""
    return EventoService.reordenar_repertorio(db, evento_id, request)


@router.put(
    "/{evento_id}/repertorio/{item_id}",
    response_model=RepertorioItemOut,
)
def atualizar_item_repertorio(
    evento_id: int,
    item_id: int,
    data: RepertorioItemUpdate,
    db: Session = Depends(get_db),
):
    """Atualiza os detalhes de uma música do repertório (momento, tom, BPM, links, etc.)."""
    return EventoService.atualizar_item_repertorio(db, evento_id, item_id, data)


@router.delete(
    "/{evento_id}/repertorio/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remover_item_repertorio(
    evento_id: int, item_id: int, db: Session = Depends(get_db)
):
    """Remove uma música do repertório e reordena automaticamente a sequência."""
    EventoService.remover_item_repertorio(db, evento_id, item_id)
    return None


# =============================================================================
# MÓDULO E: SONORIZAÇÃO E LOGÍSTICA (1:1)
# =============================================================================


@router.put("/{evento_id}/sonorizacao", response_model=SonorizacaoOut)
def atualizar_sonorizacao(
    evento_id: int,
    data: SonorizacaoCreateUpdate,
    db: Session = Depends(get_db),
):
    """Atualiza o checklist de equipamentos de som, técnico responsável e custos de sonorização."""
    return EventoService.atualizar_sonorizacao(db, evento_id, data)


# =============================================================================
# MÓDULO F: FINANCEIRO - PARCELAS DO CONTRATO DOS NOIVOS
# =============================================================================


@router.post(
    "/{evento_id}/parcelas",
    response_model=ParcelaContratoOut,
    status_code=status.HTTP_201_CREATED,
)
def adicionar_parcela_contrato(
    evento_id: int, data: ParcelaContratoCreate, db: Session = Depends(get_db)
):
    """Adiciona uma nova parcela de recebimento dos noivos ao contrato."""
    return EventoService.adicionar_parcela(db, evento_id, data)


@router.put(
    "/{evento_id}/parcelas/{parcela_id}",
    response_model=ParcelaContratoOut,
)
def atualizar_parcela_contrato(
    evento_id: int,
    parcela_id: int,
    data: ParcelaContratoUpdate,
    db: Session = Depends(get_db),
):
    """Atualiza os dados de uma parcela do contrato."""
    return EventoService.atualizar_parcela(db, evento_id, parcela_id, data)


@router.post(
    "/{evento_id}/parcelas/{parcela_id}/baixar-pagamento",
    response_model=ParcelaContratoOut,
)
def baixar_pagamento_parcela(
    evento_id: int,
    parcela_id: int,
    payload: Optional[ParcelaContratoBaixaRequest] = None,
    db: Session = Depends(get_db),
):
    """Registra o recebimento de uma parcela dos noivos (status = PAGO e data_pagamento = hoje)."""
    return EventoService.baixar_parcela(db, evento_id, parcela_id, payload)


@router.delete(
    "/{evento_id}/parcelas/{parcela_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remover_parcela_contrato(
    evento_id: int, parcela_id: int, db: Session = Depends(get_db)
):
    """Remove uma parcela do contrato."""
    EventoService.remover_parcela(db, evento_id, parcela_id)
    return None
