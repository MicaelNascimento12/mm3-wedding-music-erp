from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import StatusMusicoEnum
from app.schemas.schemas import (
    HistoricoFinanceiroMusicoOut,
    MusicoCreate,
    MusicoOut,
    MusicoUpdate,
)
from app.services.musico_service import MusicoService

router = APIRouter(prefix="/musicos", tags=["Módulo A - Músicos"])


@router.get("", response_model=List[MusicoOut])
def listar_musicos(
    search: Optional[str] = Query(None, description="Busca por nome, instrumento ou cidade"),
    instrumento: Optional[str] = Query(None, description="Filtro rápido por instrumento principal"),
    status_musico: Optional[StatusMusicoEnum] = Query(
        None, alias="status", description="Filtro por status ATIVO ou INATIVO"
    ),
    db: Session = Depends(get_db),
):
    """Lista todos os músicos cadastrados com filtros rápidos."""
    musicos = MusicoService.listar_musicos(
        db, search=search, instrumento=instrumento, status_filtro=status_musico
    )
    return [MusicoOut.model_validate(m) for m in musicos]


@router.get("/{musico_id}", response_model=MusicoOut)
def obter_musico(musico_id: int, db: Session = Depends(get_db)):
    """Retorna os dados cadastrais de um músico específico."""
    musico = MusicoService.obter_musico(db, musico_id)
    return MusicoOut.model_validate(musico)


@router.get(
    "/{musico_id}/historico-financeiro",
    response_model=HistoricoFinanceiroMusicoOut,
)
def obter_historico_financeiro_musico(
    musico_id: int, db: Session = Depends(get_db)
):
    """
    Retorna todos os casamentos em que o músico foi escalado,
    o total de cachês já pagos e o saldo total pendente a receber.
    """
    return MusicoService.obter_historico_financeiro(db, musico_id)


@router.post("", response_model=MusicoOut, status_code=status.HTTP_201_CREATED)
def criar_musico(data: MusicoCreate, db: Session = Depends(get_db)):
    """Cadastra um novo músico (fixo ou freelancer)."""
    musico = MusicoService.criar_musico(db, data)
    return MusicoOut.model_validate(musico)


@router.put("/{musico_id}", response_model=MusicoOut)
def atualizar_musico(
    musico_id: int, data: MusicoUpdate, db: Session = Depends(get_db)
):
    """Atualiza os dados de um músico existente."""
    musico = MusicoService.atualizar_musico(db, musico_id, data)
    return MusicoOut.model_validate(musico)


@router.delete("/{musico_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_musico(musico_id: int, db: Session = Depends(get_db)):
    """Remove um músico caso não possua escalas vinculadas."""
    MusicoService.remover_musico(db, musico_id)
    return None
