"""
Rutas de autenticación
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID

from ..database import get_db
from ..models import Usuario, Empresa
from ..auth import (
    authenticate_user, 
    create_access_token, 
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter(prefix="/auth", tags=["Autenticación"])


# ========== Schemas ==========

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class EmpresaResponse(BaseModel):
    id: UUID
    nombre: str
    cif: str
    direccion: Optional[str]
    provincia: Optional[str]
    municipio: Optional[str]
    sector: Optional[str]
    
    class Config:
        from_attributes = True


class UsuarioResponse(BaseModel):
    id: UUID
    email: str
    nombre: str
    apellidos: Optional[str]
    rol: str
    empresa: EmpresaResponse
    
    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    usuario: UsuarioResponse


# ========== Endpoints ==========

@router.post("/login", response_model=LoginResponse)
def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Iniciar sesión y obtener token JWT
    
    Credenciales de prueba:
    - AgroVerde S.L.: usuario@agroverde.com / agroverde123
    - EcoRecicla Industrial S.A.: usuario@ecorecicla.com / ecorecicla123
    """
    usuario = authenticate_user(db, credentials.email, credentials.password)
    
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Actualizar último login
    usuario.ultimo_login = datetime.now()
    db.commit()
    
    # Crear token
    access_token = create_access_token(
        data={
            "sub": str(usuario.id),
            "email": usuario.email,
            "empresa_id": str(usuario.empresa_id),
            "rol": usuario.rol
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "usuario": usuario
    }


@router.get("/me", response_model=UsuarioResponse)
def get_me(
    current_user: Usuario = Depends(get_current_user)
):
    """Obtener información del usuario actual"""
    return current_user


@router.post("/logout")
def logout():
    """
    Cerrar sesión (el token se invalida del lado del cliente)
    """
    return {"message": "Sesión cerrada correctamente"}
