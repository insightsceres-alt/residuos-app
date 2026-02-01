from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID


# ========== Schemas para Registros de Residuos ==========

class RegistroResiduoBase(BaseModel):
    tipologia: str = Field(..., max_length=100, description="Tipo de residuo")
    codigo_ler: Optional[str] = Field(None, max_length=20, description="Código LER (Lista Europea de Residuos)")
    peso_kg: float = Field(..., gt=0, description="Peso en kilogramos")
    lugar_recogida: str = Field(..., max_length=255, description="Lugar de recogida")
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    provincia: Optional[str] = Field(None, max_length=100)
    municipio: Optional[str] = Field(None, max_length=100)
    transportista_id: Optional[str] = Field(None, max_length=50)
    vehiculo_matricula: Optional[str] = Field(None, max_length=20)
    conductor_nombre: Optional[str] = Field(None, max_length=255)
    origen: Optional[str] = Field(None, max_length=255)
    destino: Optional[str] = Field(None, max_length=255)
    planta_tratamiento: Optional[str] = Field(None, max_length=255)
    observaciones: Optional[str] = None


class RegistroResiduoCreate(RegistroResiduoBase):
    usuario_creacion: Optional[str] = Field(None, max_length=100)
    empresa_id: Optional[UUID] = None  # Se asigna automáticamente desde el token


class RegistroResiduoUpdate(BaseModel):
    tipologia: Optional[str] = Field(None, max_length=100)
    codigo_ler: Optional[str] = Field(None, max_length=20)
    peso_kg: Optional[float] = Field(None, gt=0)
    lugar_recogida: Optional[str] = Field(None, max_length=255)
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    provincia: Optional[str] = Field(None, max_length=100)
    municipio: Optional[str] = Field(None, max_length=100)
    transportista_id: Optional[str] = Field(None, max_length=50)
    vehiculo_matricula: Optional[str] = Field(None, max_length=20)
    conductor_nombre: Optional[str] = Field(None, max_length=255)
    estado: Optional[str] = Field(None, max_length=50)
    origen: Optional[str] = Field(None, max_length=255)
    destino: Optional[str] = Field(None, max_length=255)
    planta_tratamiento: Optional[str] = Field(None, max_length=255)
    observaciones: Optional[str] = None
    usuario_modificacion: Optional[str] = Field(None, max_length=100)
    
    @validator('estado')
    def validate_estado(cls, v):
        if v and v not in ['PENDIENTE', 'EN_TRANSITO', 'ENTREGADO', 'PROCESADO', 'CANCELADO']:
            raise ValueError('Estado no válido')
        return v


class RegistroResiduoResponse(RegistroResiduoBase):
    id: UUID
    empresa_id: Optional[UUID] = None
    fecha_registro: datetime
    estado: str
    numero_registro: Optional[str]
    documento_generado: bool
    documento_url: Optional[str]
    enviado_esir: bool = False
    fecha_envio_esir: Optional[datetime] = None
    usuario_creacion: Optional[str]
    fecha_creacion: datetime
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ========== Schemas para Tipologías ==========

class TipologiaResiduoResponse(BaseModel):
    id: int
    codigo: str
    nombre: str
    descripcion: Optional[str]
    ler_code: Optional[str]
    peligroso: bool
    activo: bool
    
    class Config:
        from_attributes = True


# ========== Schemas para Códigos LER ==========

class CodigoLERResponse(BaseModel):
    code: str
    name: str


# ========== Schemas para Transportistas ==========

class TransportistaBase(BaseModel):
    nombre_empresa: str = Field(..., max_length=255)
    cif: Optional[str] = Field(None, max_length=20)
    telefono: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=100)
    direccion: Optional[str] = None
    activo: bool = True


class TransportistaCreate(TransportistaBase):
    id: str = Field(..., max_length=50)


class TransportistaResponse(TransportistaBase):
    id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ========== Schemas para Vehículos ==========

class VehiculoBase(BaseModel):
    transportista_id: str = Field(..., max_length=50)
    tipo: Optional[str] = Field(None, max_length=50)
    capacidad_kg: Optional[float] = Field(None, gt=0)
    marca: Optional[str] = Field(None, max_length=50)
    modelo: Optional[str] = Field(None, max_length=50)
    activo: bool = True


class VehiculoCreate(VehiculoBase):
    matricula: str = Field(..., max_length=20)


class VehiculoResponse(VehiculoBase):
    matricula: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# ========== Schemas para Documentos ==========

class DocumentoGeneradoResponse(BaseModel):
    id: UUID
    registro_id: UUID
    tipo_documento: str
    numero_documento: Optional[str]
    fecha_generacion: datetime
    s3_url: Optional[str]
    firmado_digitalmente: bool
    
    class Config:
        from_attributes = True


# ========== Schemas para Historial ==========

class HistorialEstadoResponse(BaseModel):
    id: int
    registro_id: UUID
    estado_anterior: Optional[str]
    estado_nuevo: str
    fecha_cambio: datetime
    usuario: Optional[str]
    observaciones: Optional[str]
    
    class Config:
        from_attributes = True


# ========== Schemas para respuestas paginadas ==========

class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[RegistroResiduoResponse]


# ========== Schemas para estadísticas ==========

class EstadisticasResponse(BaseModel):
    total_registros: int
    peso_total_kg: float
    por_estado: dict
    por_tipologia: dict
    ultimos_7_dias: int


class EvolutivoMensualItem(BaseModel):
    mes: str  # "2025-01"
    mes_nombre: str  # "Enero 2025"
    tipologia: str
    total_registros: int
    peso_total_kg: float


class EvolutivoMensualResponse(BaseModel):
    meses: List[str]
    series: dict  # {tipologia: [valores por mes]}
    totales_por_mes: dict  # {mes: peso_total}
