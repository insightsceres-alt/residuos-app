from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ARRAY, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from .database import Base


class RegistroResiduo(Base):
    __tablename__ = "registros_residuos"
    
    # Identificador
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Información temporal
    fecha_registro = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Información del residuo
    tipologia = Column(String(100), nullable=False)
    peso_kg = Column(Float, nullable=False)
    
    # Ubicación
    lugar_recogida = Column(String(255), nullable=False)
    latitud = Column(Float)
    longitud = Column(Float)
    provincia = Column(String(100))
    municipio = Column(String(100))
    
    # Transportista
    transportista_id = Column(String(50), ForeignKey("transportistas.id"))
    vehiculo_matricula = Column(String(20), ForeignKey("vehiculos.matricula"))
    conductor_nombre = Column(String(255))
    
    # Origen y destino
    origen = Column(String(255))
    destino = Column(String(255))
    planta_tratamiento = Column(String(255))
    
    # Estado
    estado = Column(String(50), default="PENDIENTE")
    numero_registro = Column(String(50), unique=True)
    
    # Documentación
    documento_generado = Column(Boolean, default=False)
    documento_url = Column(Text)
    observaciones = Column(Text)
    
    # Auditoría
    usuario_creacion = Column(String(100))
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())
    usuario_modificacion = Column(String(100))
    fecha_modificacion = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    transportista = relationship("Transportista", back_populates="registros")
    vehiculo = relationship("Vehiculo", back_populates="registros")
    documentos = relationship("DocumentoGenerado", back_populates="registro", cascade="all, delete-orphan")
    historial = relationship("HistorialEstado", back_populates="registro", cascade="all, delete-orphan")
    
    __table_args__ = (
        CheckConstraint('peso_kg > 0', name='check_peso_positivo'),
        CheckConstraint("estado IN ('PENDIENTE', 'EN_TRANSITO', 'ENTREGADO', 'PROCESADO', 'CANCELADO')", 
                       name='check_estado_valido'),
    )


class TipologiaResiduo(Base):
    __tablename__ = "tipologias_residuos"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    codigo = Column(String(20), unique=True, nullable=False)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(Text)
    ler_code = Column(String(20))
    peligroso = Column(Boolean, default=False)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Transportista(Base):
    __tablename__ = "transportistas"
    
    id = Column(String(50), primary_key=True)
    nombre_empresa = Column(String(255), nullable=False)
    cif = Column(String(20))
    telefono = Column(String(20))
    email = Column(String(100))
    direccion = Column(Text)
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    registros = relationship("RegistroResiduo", back_populates="transportista")
    vehiculos = relationship("Vehiculo", back_populates="transportista")


class Vehiculo(Base):
    __tablename__ = "vehiculos"
    
    matricula = Column(String(20), primary_key=True)
    transportista_id = Column(String(50), ForeignKey("transportistas.id"))
    tipo = Column(String(50))
    capacidad_kg = Column(Float)
    marca = Column(String(50))
    modelo = Column(String(50))
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    transportista = relationship("Transportista", back_populates="vehiculos")
    registros = relationship("RegistroResiduo", back_populates="vehiculo")


class PlantaTratamiento(Base):
    __tablename__ = "plantas_tratamiento"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    codigo = Column(String(50), unique=True, nullable=False)
    nombre = Column(String(255), nullable=False)
    direccion = Column(Text)
    provincia = Column(String(100))
    municipio = Column(String(100))
    latitud = Column(Float)
    longitud = Column(Float)
    telefono = Column(String(20))
    email = Column(String(100))
    tipos_aceptados = Column(ARRAY(String))
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class DocumentoGenerado(Base):
    __tablename__ = "documentos_generados"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    registro_id = Column(UUID(as_uuid=True), ForeignKey("registros_residuos.id", ondelete="CASCADE"))
    tipo_documento = Column(String(50), nullable=False)
    numero_documento = Column(String(100), unique=True)
    fecha_generacion = Column(DateTime(timezone=True), server_default=func.now())
    s3_url = Column(Text)
    pdf_hash = Column(String(64))
    firmado_digitalmente = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    registro = relationship("RegistroResiduo", back_populates="documentos")


class HistorialEstado(Base):
    __tablename__ = "historial_estados"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    registro_id = Column(UUID(as_uuid=True), ForeignKey("registros_residuos.id", ondelete="CASCADE"))
    estado_anterior = Column(String(50))
    estado_nuevo = Column(String(50), nullable=False)
    fecha_cambio = Column(DateTime(timezone=True), server_default=func.now())
    usuario = Column(String(100))
    observaciones = Column(Text)
    latitud = Column(Float)
    longitud = Column(Float)
    
    # Relationships
    registro = relationship("RegistroResiduo", back_populates="historial")
