from typing import List, Optional
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.models.models import EscalaMusico, Musico, StatusMusicoEnum
from app.schemas.schemas import MusicoCreate, MusicoUpdate


class MusicoRepository:
    @staticmethod
    def list_musicos(
        db: Session,
        search: Optional[str] = None,
        instrumento: Optional[str] = None,
        status: Optional[StatusMusicoEnum] = None,
    ) -> List[Musico]:
        query = db.query(Musico)

        if search:
            term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Musico.nome_completo.ilike(term),
                    Musico.instrumento_principal.ilike(term),
                    Musico.instrumentos_secundarios.ilike(term),
                    Musico.cidade.ilike(term),
                    Musico.email.ilike(term),
                )
            )

        if instrumento and instrumento.upper() != "TODOS":
            query = query.filter(Musico.instrumento_principal.ilike(f"%{instrumento.strip()}%"))

        if status:
            query = query.filter(Musico.status == status)

        return query.order_by(Musico.nome_completo.asc()).all()

    @staticmethod
    def get_by_id(db: Session, musico_id: int) -> Optional[Musico]:
        return db.query(Musico).filter(Musico.id == musico_id).first()

    @staticmethod
    def get_by_email(db: Session, email: str) -> Optional[Musico]:
        return db.query(Musico).filter(Musico.email == email).first()

    @staticmethod
    def create(db: Session, data: MusicoCreate) -> Musico:
        musico = Musico(**data.model_dump())
        db.add(musico)
        db.commit()
        db.refresh(musico)
        return musico

    @staticmethod
    def update(db: Session, musico: Musico, data: MusicoUpdate) -> Musico:
        update_dict = data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(musico, field, value)
        db.commit()
        db.refresh(musico)
        return musico

    @staticmethod
    def delete(db: Session, musico: Musico) -> None:
        db.query(EscalaMusico).filter(EscalaMusico.musico_id == musico.id).delete(
            synchronize_session=False
        )
        db.delete(musico)
        db.commit()

    @staticmethod
    def get_escalas_com_evento(db: Session, musico_id: int) -> List[EscalaMusico]:
        return (
            db.query(EscalaMusico)
            .options(joinedload(EscalaMusico.evento))
            .filter(EscalaMusico.musico_id == musico_id)
            .all()
        )
