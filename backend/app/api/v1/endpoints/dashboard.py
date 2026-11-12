from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.schemas import DashboardOverviewOut
from app.services.evento_service import EventoService

router = APIRouter(prefix="/dashboard", tags=["Dashboard Executivo"])


@router.get("", response_model=DashboardOverviewOut)
def obter_resumo_dashboard(
    mes: Optional[int] = Query(None, ge=1, le=12, description="Mês de referência"),
    ano: Optional[int] = Query(None, ge=2020, le=2100, description="Ano de referência"),
    db: Session = Depends(get_db),
):
    """
    Retorna os indicadores executivos (Faturamento do Mês, Lucro Líquido Previsto,
    Total de Casamentos no Ano, Cachês Pendentes), Próximos Casamentos e Alertas de Vencimento.
    """
    return EventoService.obter_dashboard(db, mes_ref=mes, ano_ref=ano)
