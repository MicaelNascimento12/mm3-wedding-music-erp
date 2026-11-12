from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    oauth2_scheme,
    verify_password,
)
from app.models.models import Usuario
from app.schemas.schemas import LoginRequest, TokenResponse, UsuarioCreate, UsuarioOut

router = APIRouter(prefix="/auth", tags=["Autenticação & Usuários"])


def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Optional[Usuario]:
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            return None
        return db.query(Usuario).filter(Usuario.id == int(user_id)).first()
    except Exception:
        return None


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """Autentica um usuário por e-mail e senha e retorna um token JWT válido."""
    usuario = db.query(Usuario).filter(Usuario.email == str(data.email)).first()
    if not usuario or not verify_password(data.senha, usuario.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos.",
        )
    if not usuario.ativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário inativo. Contate o administrador.",
        )

    usuario.ultimo_login = datetime.now(timezone.utc)
    db.commit()
    db.refresh(usuario)

    token = create_access_token(
        subject=usuario.id,
        extra_claims={"email": usuario.email, "perfil": usuario.perfil.value},
    )
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        usuario=UsuarioOut.model_validate(usuario),
    )


@router.post(
    "/registrar",
    response_model=UsuarioOut,
    status_code=status.HTTP_201_CREATED,
)
def registrar_usuario(data: UsuarioCreate, db: Session = Depends(get_db)):
    """Registra um novo usuário gestor/coordenador/financeiro no sistema."""
    existente = db.query(Usuario).filter(Usuario.email == str(data.email)).first()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe um usuário cadastrado com este e-mail.",
        )
    novo = Usuario(
        nome_completo=data.nome_completo,
        email=str(data.email),
        senha_hash=get_password_hash(data.senha),
        perfil=data.perfil,
        ativo=data.ativo,
    )
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return UsuarioOut.model_validate(novo)


@router.get("/me", response_model=UsuarioOut)
def obter_usuario_logado(
    usuario: Optional[Usuario] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Retorna o usuário autenticado ou o Admin Gestor padrão da sessão."""
    if usuario:
        return UsuarioOut.model_validate(usuario)
    padrao = db.query(Usuario).order_by(Usuario.id.asc()).first()
    if not padrao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nenhum usuário encontrado.",
        )
    return UsuarioOut.model_validate(padrao)
