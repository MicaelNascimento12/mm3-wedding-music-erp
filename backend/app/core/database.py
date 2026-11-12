import logging
import socket
from typing import Generator
from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session
from app.core.config import settings

logger = logging.getLogger("mm3_musica.database")


class Base(DeclarativeBase):
    """Classe base declarativa do SQLAlchemy 2.0."""
    pass


def _is_postgres_reachable(host: str, port: int, timeout: float = 1.5) -> bool:
    """Verifica rapidamente via socket se o servidor PostgreSQL está acessível."""
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def _build_engine():
    db_url = settings.DATABASE_URL
    if db_url.startswith("postgresql"):
        if _is_postgres_reachable(settings.POSTGRES_SERVER, settings.POSTGRES_PORT):
            try:
                pg_engine = create_engine(
                    db_url,
                    pool_pre_ping=True,
                    pool_size=10,
                    max_overflow=20,
                )
                with pg_engine.connect():
                    pass
                logger.info(
                    f"Conectando ao PostgreSQL em {settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
                )
                return pg_engine
            except Exception as exc:
                logger.warning(
                    f"PostgreSQL inacessível ou driver ausente ({exc}). Utilizando fallback SQLite."
                )
        if settings.ENABLE_SQLITE_FALLBACK:
            logger.warning(
                "PostgreSQL não detectado na porta configurada. Utilizando banco local SQLite (mm3_musica.db) com compatibilidade total SQLAlchemy 2.0."
            )
            sqlite_engine = create_engine(
                settings.SQLITE_FALLBACK_URL,
                connect_args={"check_same_thread": False},
            )

            @event.listens_for(sqlite_engine, "connect")
            def _set_sqlite_pragma(dbapi_connection, connection_record):
                cursor = dbapi_connection.cursor()
                cursor.execute("PRAGMA foreign_keys=ON")
                cursor.close()

            return sqlite_engine

    if db_url.startswith("sqlite"):
        sqlite_engine = create_engine(
            db_url,
            connect_args={"check_same_thread": False},
        )

        @event.listens_for(sqlite_engine, "connect")
        def _set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        return sqlite_engine

    return create_engine(db_url, pool_pre_ping=True)


engine = _build_engine()

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=Session,
    expire_on_commit=False,
)


def get_db() -> Generator[Session, None, None]:
    """Dependency injection de sessão do banco de dados para rotas FastAPI."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
