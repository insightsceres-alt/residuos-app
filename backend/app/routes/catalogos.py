from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import TipologiaResiduo, Transportista, Vehiculo, PlantaTratamiento
from ..schemas import TipologiaResiduoResponse, TransportistaResponse, VehiculoResponse

router = APIRouter(prefix="/catalogos", tags=["Catálogos"])


@router.get("/tipologias", response_model=List[TipologiaResiduoResponse])
def listar_tipologias(
    solo_activos: bool = True,
    db: Session = Depends(get_db)
):
    """Listar tipologías de residuos"""
    query = db.query(TipologiaResiduo)
    if solo_activos:
        query = query.filter(TipologiaResiduo.activo == True)
    return query.all()


@router.get("/transportistas", response_model=List[TransportistaResponse])
def listar_transportistas(
    solo_activos: bool = True,
    db: Session = Depends(get_db)
):
    """Listar transportistas"""
    query = db.query(Transportista)
    if solo_activos:
        query = query.filter(Transportista.activo == True)
    return query.all()


@router.get("/vehiculos", response_model=List[VehiculoResponse])
def listar_vehiculos(
    transportista_id: str = None,
    solo_activos: bool = True,
    db: Session = Depends(get_db)
):
    """Listar vehículos"""
    query = db.query(Vehiculo)
    if solo_activos:
        query = query.filter(Vehiculo.activo == True)
    if transportista_id:
        query = query.filter(Vehiculo.transportista_id == transportista_id)
    return query.all()


@router.get("/plantas", response_model=List)
def listar_plantas_tratamiento(
    solo_activos: bool = True,
    db: Session = Depends(get_db)
):
    """Listar plantas de tratamiento"""
    query = db.query(PlantaTratamiento)
    if solo_activos:
        query = query.filter(PlantaTratamiento.activo == True)
    return query.all()


@router.get("/provincias", response_model=List[str])
def listar_provincias(db: Session = Depends(get_db)):
    """Listar provincias únicas de los registros"""
    from ..models import RegistroResiduo
    from sqlalchemy import distinct
    
    provincias = db.query(distinct(RegistroResiduo.provincia))\
        .filter(RegistroResiduo.provincia.isnot(None))\
        .order_by(RegistroResiduo.provincia)\
        .all()
    
    return [p[0] for p in provincias if p[0]]


@router.get("/estados", response_model=List[str])
def listar_estados():
    """Listar estados posibles de un registro"""
    return ['PENDIENTE', 'EN_TRANSITO', 'ENTREGADO', 'PROCESADO', 'CANCELADO']
