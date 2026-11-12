import os
import re
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import MomentoCerimoniaEnum, PlaybackBiblioteca
from app.schemas.schemas import (
    PlaybackBibliotecaCreate,
    PlaybackBibliotecaOut,
    PlaybackBibliotecaUpdate,
    UploadPlaybackOut,
)

router = APIRouter(
    prefix="/playbacks",
    tags=["Módulo G - Biblioteca de Playbacks (VS) & Violino Solo"],
)

UPLOAD_DIR = Path(__file__).resolve().parents[4] / "uploads" / "playbacks"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _sanitize_filename(filename: str) -> str:
    base, ext = os.path.splitext(filename or "playback.mp3")
    clean_base = re.sub(r"[^a-zA-Z0-9_-]+", "_", base).strip("_") or "playback"
    clean_ext = re.sub(r"[^a-zA-Z0-9.]+", "", ext).lower() or ".mp3"
    return f"{clean_base}_{uuid.uuid4().hex[:8]}{clean_ext}"


@router.get("", response_model=List[PlaybackBibliotecaOut])
def listar_playbacks(
    search: Optional[str] = Query(
        None, description="Busca por nome da música, artista/versão ou tom"
    ),
    momento: Optional[MomentoCerimoniaEnum] = Query(
        None, description="Filtrar por momento sugerido da cerimônia"
    ),
    apenas_favoritos: bool = Query(
        False, description="Filtrar apenas playbacks marcados como favoritos"
    ),
    db: Session = Depends(get_db),
):
    """Lista o acervo de Playbacks (VS) para Violino Solo e Cerimônias."""
    query = db.query(PlaybackBiblioteca)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                PlaybackBiblioteca.nome_musica.ilike(term),
                PlaybackBiblioteca.artista_versao.ilike(term),
                PlaybackBiblioteca.tom_violino.ilike(term),
                PlaybackBiblioteca.observacoes_execucao.ilike(term),
            )
        )
    if momento:
        query = query.filter(PlaybackBiblioteca.momento_sugerido == momento)
    if apenas_favoritos:
        query = query.filter(PlaybackBiblioteca.favorito.is_(True))

    itens = query.order_by(
        PlaybackBiblioteca.favorito.desc(),
        PlaybackBiblioteca.nome_musica.asc(),
    ).all()
    return [PlaybackBibliotecaOut.model_validate(i) for i in itens]


@router.post(
    "/upload-arquivo",
    response_model=UploadPlaybackOut,
    status_code=status.HTTP_201_CREATED,
)
async def upload_arquivo_playback(arquivo: UploadFile = File(...)):
    """
    Recebe o upload de um arquivo de áudio (.mp3, .wav, .m4a, .ogg, .flac, .aac)
    do computador do usuário, salva localmente em /uploads/playbacks e retorna a URL.
    """
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    nome_original = arquivo.filename or "playback.mp3"
    nome_salvo = _sanitize_filename(nome_original)
    caminho_destino = UPLOAD_DIR / nome_salvo

    conteudo = await arquivo.read()
    if not conteudo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O arquivo enviado está vazio.",
        )

    with open(caminho_destino, "wb") as f:
        f.write(conteudo)

    return UploadPlaybackOut(
        arquivo_url=f"/uploads/playbacks/{nome_salvo}",
        nome_arquivo_original=nome_original,
        tamanho_bytes=len(conteudo),
    )


@router.post(
    "",
    response_model=PlaybackBibliotecaOut,
    status_code=status.HTTP_201_CREATED,
)
def criar_playback(data: PlaybackBibliotecaCreate, db: Session = Depends(get_db)):
    """Salva um novo Playback (VS) na Biblioteca Geral."""
    novo = PlaybackBiblioteca(**data.model_dump())
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return PlaybackBibliotecaOut.model_validate(novo)


@router.put("/{playback_id}", response_model=PlaybackBibliotecaOut)
def atualizar_playback(
    playback_id: int,
    data: PlaybackBibliotecaUpdate,
    db: Session = Depends(get_db),
):
    """Atualiza os dados de um Playback (VS) da biblioteca."""
    item = (
        db.query(PlaybackBiblioteca)
        .filter(PlaybackBiblioteca.id == playback_id)
        .first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playback não encontrado na biblioteca.",
        )

    update_dict = data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return PlaybackBibliotecaOut.model_validate(item)


@router.delete("/{playback_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_playback(playback_id: int, db: Session = Depends(get_db)):
    """Exclui um Playback (VS) da biblioteca."""
    item = (
        db.query(PlaybackBiblioteca)
        .filter(PlaybackBiblioteca.id == playback_id)
        .first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playback não encontrado na biblioteca.",
        )
    db.delete(item)
    db.commit()
    return None
