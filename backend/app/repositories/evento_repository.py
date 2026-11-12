from datetime import date
from typing import List, Optional
from sqlalchemy import extract, or_
from sqlalchemy.orm import Session, joinedload

from app.models.models import (
    EscalaMusico,
    EventoCasamento,
    FormacaoMusicalEnum,
    ParcelaContrato,
    RepertorioCerimonia,
    SonorizacaoLogistica,
    StatusEventoEnum,
)


class EventoRepository:
    @staticmethod
    def list_eventos(
        db: Session,
        mes: Optional[int] = None,
        ano: Optional[int] = None,
        status: Optional[StatusEventoEnum] = None,
        tipo_formacao: Optional[FormacaoMusicalEnum] = None,
        tipo_contratacao: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[EventoCasamento]:
        query = db.query(EventoCasamento).options(
            joinedload(EventoCasamento.escalas).joinedload(EscalaMusico.musico),
            joinedload(EventoCasamento.sonorizacao),
            joinedload(EventoCasamento.parcelas),
        )

        if ano:
            query = query.filter(extract("year", EventoCasamento.data_casamento) == ano)
        if mes:
            query = query.filter(extract("month", EventoCasamento.data_casamento) == mes)
        if status:
            query = query.filter(EventoCasamento.status == status)
        if tipo_formacao:
            query = query.filter(EventoCasamento.tipo_formacao == tipo_formacao)
        if tipo_contratacao:
            query = query.filter(EventoCasamento.tipo_contratacao == tipo_contratacao)
        if search:
            term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    EventoCasamento.nome_noivos.ilike(term),
                    EventoCasamento.nome_banda_contratante.ilike(term),
                    EventoCasamento.codigo_contrato.ilike(term),
                    EventoCasamento.local_cerimonia.ilike(term),
                    EventoCasamento.cidade_cerimonia.ilike(term),
                )
            )

        return query.order_by(
            EventoCasamento.data_casamento.asc(),
            EventoCasamento.horario_inicio_cerimonia.asc(),
        ).all()

    @staticmethod
    def get_by_id_360(db: Session, evento_id: int) -> Optional[EventoCasamento]:
        return (
            db.query(EventoCasamento)
            .options(
                joinedload(EventoCasamento.escalas).joinedload(EscalaMusico.musico),
                joinedload(EventoCasamento.repertorio),
                joinedload(EventoCasamento.sonorizacao),
                joinedload(EventoCasamento.parcelas),
            )
            .filter(EventoCasamento.id == evento_id)
            .first()
        )

    @staticmethod
    def get_by_codigo_contrato(db: Session, codigo_contrato: str) -> Optional[EventoCasamento]:
        return (
            db.query(EventoCasamento)
            .filter(EventoCasamento.codigo_contrato == codigo_contrato)
            .first()
        )

    @staticmethod
    def get_eventos_ativos_na_data(
        db: Session,
        data_casamento: date,
        exclude_evento_id: Optional[int] = None,
    ) -> List[EventoCasamento]:
        query = db.query(EventoCasamento).filter(
            EventoCasamento.data_casamento == data_casamento,
            EventoCasamento.status != StatusEventoEnum.CANCELADO,
        )
        if exclude_evento_id is not None:
            query = query.filter(EventoCasamento.id != exclude_evento_id)
        return query.order_by(EventoCasamento.horario_chegada_banda.asc()).all()

    @staticmethod
    def get_escalas_musico_na_data(
        db: Session,
        musico_id: int,
        data_casamento: date,
        exclude_evento_id: Optional[int] = None,
    ) -> List[EscalaMusico]:
        query = (
            db.query(EscalaMusico)
            .join(EventoCasamento, EscalaMusico.evento_id == EventoCasamento.id)
            .options(joinedload(EscalaMusico.evento))
            .filter(
                EscalaMusico.musico_id == musico_id,
                EventoCasamento.data_casamento == data_casamento,
                EventoCasamento.status != StatusEventoEnum.CANCELADO,
            )
        )
        if exclude_evento_id is not None:
            query = query.filter(EventoCasamento.id != exclude_evento_id)
        return query.all()

    @staticmethod
    def get_escala_by_id(db: Session, escala_id: int) -> Optional[EscalaMusico]:
        return (
            db.query(EscalaMusico)
            .options(joinedload(EscalaMusico.musico), joinedload(EscalaMusico.evento))
            .filter(EscalaMusico.id == escala_id)
            .first()
        )

    @staticmethod
    def get_repertorio_item_by_id(
        db: Session, item_id: int
    ) -> Optional[RepertorioCerimonia]:
        return db.query(RepertorioCerimonia).filter(RepertorioCerimonia.id == item_id).first()

    @staticmethod
    def get_sonorizacao_by_evento(
        db: Session, evento_id: int
    ) -> Optional[SonorizacaoLogistica]:
        return (
            db.query(SonorizacaoLogistica)
            .filter(SonorizacaoLogistica.evento_id == evento_id)
            .first()
        )

    @staticmethod
    def get_parcela_by_id(db: Session, parcela_id: int) -> Optional[ParcelaContrato]:
        return db.query(ParcelaContrato).filter(ParcelaContrato.id == parcela_id).first()
