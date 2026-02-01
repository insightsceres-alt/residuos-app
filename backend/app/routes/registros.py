from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, extract
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta
from ..database import get_db
from ..models import RegistroResiduo, HistorialEstado, Usuario
from ..auth import get_current_user
from ..schemas import (
    RegistroResiduoCreate,
    RegistroResiduoUpdate,
    RegistroResiduoResponse,
    PaginatedResponse,
    EstadisticasResponse,
    EvolutivoMensualResponse
)

router = APIRouter(prefix="/registros", tags=["Registros"])


@router.post("/", response_model=RegistroResiduoResponse, status_code=201)
def crear_registro(
    registro: RegistroResiduoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Crear un nuevo registro de residuo (asociado a la empresa del usuario)"""
    registro_data = registro.model_dump()
    registro_data['empresa_id'] = current_user.empresa_id  # Asignar empresa del usuario
    
    db_registro = RegistroResiduo(**registro_data)
    
    db.add(db_registro)
    db.commit()
    db.refresh(db_registro)
    
    return db_registro


@router.get("/", response_model=PaginatedResponse)
def listar_registros(
    page: int = Query(1, ge=1, description="Número de página"),
    page_size: int = Query(50, ge=1, le=100, description="Tamaño de página"),
    estado: Optional[str] = Query(None, description="Filtrar por estado"),
    tipologia: Optional[str] = Query(None, description="Filtrar por tipología"),
    fecha_desde: Optional[datetime] = Query(None, description="Fecha desde"),
    fecha_hasta: Optional[datetime] = Query(None, description="Fecha hasta"),
    transportista_id: Optional[str] = Query(None, description="Filtrar por transportista"),
    provincia: Optional[str] = Query(None, description="Filtrar por provincia"),
    search: Optional[str] = Query(None, description="Búsqueda en lugar_recogida"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Listar registros con filtros y paginación (solo de la empresa del usuario)"""
    
    # Construir query con filtros - SOLO registros de la empresa del usuario
    query = db.query(RegistroResiduo).filter(
        RegistroResiduo.empresa_id == current_user.empresa_id
    )
    
    if estado:
        query = query.filter(RegistroResiduo.estado == estado)
    if tipologia:
        # Si es un código de 2 dígitos (grupo LER), filtrar por prefijo del código LER
        if len(tipologia) == 2 and tipologia.isdigit():
            query = query.filter(RegistroResiduo.codigo_ler.like(f"{tipologia}%"))
        else:
            query = query.filter(RegistroResiduo.tipologia == tipologia)
    if fecha_desde:
        query = query.filter(RegistroResiduo.fecha_registro >= fecha_desde)
    if fecha_hasta:
        query = query.filter(RegistroResiduo.fecha_registro <= fecha_hasta)
    if transportista_id:
        query = query.filter(RegistroResiduo.transportista_id == transportista_id)
    if provincia:
        query = query.filter(RegistroResiduo.provincia == provincia)
    if search:
        query = query.filter(
            or_(
                RegistroResiduo.lugar_recogida.ilike(f"%{search}%"),
                RegistroResiduo.numero_registro.ilike(f"%{search}%")
            )
        )
    
    # Contar total
    total = query.count()
    
    # Aplicar paginación y ordenar
    offset = (page - 1) * page_size
    items = query.order_by(RegistroResiduo.fecha_registro.desc())\
                 .offset(offset)\
                 .limit(page_size)\
                 .all()
    
    total_pages = (total + page_size - 1) // page_size
    
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "items": items
    }


@router.get("/estadisticas", response_model=EstadisticasResponse)
def obtener_estadisticas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Obtener estadísticas generales (solo de la empresa del usuario)"""
    
    # Filtrar por empresa del usuario
    base_query = db.query(RegistroResiduo).filter(
        RegistroResiduo.empresa_id == current_user.empresa_id
    )
    
    total_registros = base_query.count()
    peso_total = db.query(func.sum(RegistroResiduo.peso_kg)).filter(
        RegistroResiduo.empresa_id == current_user.empresa_id
    ).scalar() or 0.0
    
    # Por estado - filtrado por empresa
    por_estado = db.query(
        RegistroResiduo.estado,
        func.count(RegistroResiduo.id).label('count')
    ).filter(
        RegistroResiduo.empresa_id == current_user.empresa_id
    ).group_by(RegistroResiduo.estado).all()
    
    # Por tipología - filtrado por empresa
    por_tipologia = db.query(
        RegistroResiduo.tipologia,
        func.count(RegistroResiduo.id).label('count')
    ).filter(
        RegistroResiduo.empresa_id == current_user.empresa_id
    ).group_by(RegistroResiduo.tipologia).all()
    
    # Últimos 7 días - filtrado por empresa
    fecha_hace_7_dias = datetime.now() - timedelta(days=7)
    ultimos_7_dias = db.query(func.count(RegistroResiduo.id)).filter(
        RegistroResiduo.empresa_id == current_user.empresa_id,
        RegistroResiduo.fecha_registro >= fecha_hace_7_dias
    ).scalar()
    
    return {
        "total_registros": total_registros,
        "peso_total_kg": peso_total,
        "por_estado": {estado: count for estado, count in por_estado},
        "por_tipologia": {tip: count for tip, count in por_tipologia},
        "ultimos_7_dias": ultimos_7_dias
    }


@router.get("/estadisticas/evolutivo-mensual", response_model=EvolutivoMensualResponse)
def obtener_evolutivo_mensual(
    meses: int = Query(12, ge=1, le=24, description="Número de meses hacia atrás"),
    grupo_ler: Optional[str] = Query(None, description="Filtrar por grupo LER (código de 2 dígitos)"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Obtener evolutivo mensual de residuos por grupo LER (solo de la empresa del usuario)
    Devuelve datos de los últimos N meses para mostrar en gráfico
    Opcionalmente filtrado por un grupo LER específico (2 primeros dígitos del código)
    """
    from .catalogos import get_grupo_ler, _load_codigos_ler
    
    # Asegurar que los códigos LER están cargados
    _load_codigos_ler()
    
    # Calcular fecha de inicio
    fecha_inicio = datetime.now() - timedelta(days=meses * 30)
    
    # Construir query base - agrupar por código LER
    query = db.query(
        extract('year', RegistroResiduo.fecha_registro).label('year'),
        extract('month', RegistroResiduo.fecha_registro).label('month'),
        RegistroResiduo.codigo_ler,
        func.count(RegistroResiduo.id).label('total_registros'),
        func.sum(RegistroResiduo.peso_kg).label('peso_total')
    ).filter(
        RegistroResiduo.empresa_id == current_user.empresa_id,
        RegistroResiduo.fecha_registro >= fecha_inicio
    )
    
    # Aplicar filtro de grupo LER si se especifica
    if grupo_ler:
        query = query.filter(RegistroResiduo.codigo_ler.like(f"{grupo_ler}%"))
    
    # Consulta agrupada por año-mes y código LER
    resultados = query.group_by(
        extract('year', RegistroResiduo.fecha_registro),
        extract('month', RegistroResiduo.fecha_registro),
        RegistroResiduo.codigo_ler
    ).order_by(
        extract('year', RegistroResiduo.fecha_registro),
        extract('month', RegistroResiduo.fecha_registro)
    ).all()
    
    # Organizar datos - generar lista de meses
    meses_list = []
    current = datetime.now()
    for i in range(meses - 1, -1, -1):
        mes_date = current - timedelta(days=i * 30)
        mes_key = f"{int(mes_date.year)}-{int(mes_date.month):02d}"
        if mes_key not in meses_list:
            meses_list.append(mes_key)
    
    # Agrupar por grupo LER (2 primeros dígitos)
    series_por_grupo = {}
    totales_por_mes = {m: 0 for m in meses_list}
    
    for row in resultados:
        mes_key = f"{int(row.year)}-{int(row.month):02d}"
        peso = float(row.peso_total or 0)
        
        # Obtener grupo LER
        grupo_info = get_grupo_ler(row.codigo_ler)
        grupo_nombre = grupo_info["nombre"]
        
        if grupo_nombre not in series_por_grupo:
            series_por_grupo[grupo_nombre] = {m: 0 for m in meses_list}
        
        if mes_key in series_por_grupo[grupo_nombre]:
            series_por_grupo[grupo_nombre][mes_key] += peso
        
        if mes_key in totales_por_mes:
            totales_por_mes[mes_key] += peso
    
    # Convertir series a listas
    series_listas = {}
    for grupo, datos in series_por_grupo.items():
        series_listas[grupo] = [datos.get(m, 0) for m in meses_list]
    
    return {
        "meses": meses_list,
        "series": series_listas,
        "totales_por_mes": totales_por_mes
    }


@router.get("/{registro_id}", response_model=RegistroResiduoResponse)
def obtener_registro(
    registro_id: UUID,
    db: Session = Depends(get_db)
):
    """Obtener un registro específico por ID"""
    registro = db.query(RegistroResiduo).filter(RegistroResiduo.id == registro_id).first()
    
    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    
    return registro


@router.put("/{registro_id}", response_model=RegistroResiduoResponse)
def actualizar_registro(
    registro_id: UUID,
    registro_update: RegistroResiduoUpdate,
    db: Session = Depends(get_db)
):
    """Actualizar un registro existente"""
    db_registro = db.query(RegistroResiduo).filter(RegistroResiduo.id == registro_id).first()
    
    if not db_registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    
    # Guardar estado anterior si cambia
    estado_anterior = db_registro.estado
    
    # Actualizar campos
    update_data = registro_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_registro, field, value)
    
    db_registro.fecha_modificacion = datetime.now()
    
    # Si cambió el estado, registrar en historial
    if 'estado' in update_data and update_data['estado'] != estado_anterior:
        historial = HistorialEstado(
            registro_id=registro_id,
            estado_anterior=estado_anterior,
            estado_nuevo=update_data['estado'],
            usuario=registro_update.usuario_modificacion
        )
        db.add(historial)
    
    db.commit()
    db.refresh(db_registro)
    
    return db_registro


@router.delete("/{registro_id}", status_code=204)
def eliminar_registro(
    registro_id: UUID,
    db: Session = Depends(get_db)
):
    """Eliminar un registro"""
    db_registro = db.query(RegistroResiduo).filter(RegistroResiduo.id == registro_id).first()
    
    if not db_registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    
    db.delete(db_registro)
    db.commit()
    
    return None


@router.post("/{registro_id}/enviar-esir", response_model=RegistroResiduoResponse)
def marcar_enviado_esir(
    registro_id: UUID,
    db: Session = Depends(get_db)
):
    """Marcar un registro como enviado al E-SIR"""
    db_registro = db.query(RegistroResiduo).filter(RegistroResiduo.id == registro_id).first()
    
    if not db_registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    
    db_registro.enviado_esir = True
    db_registro.fecha_envio_esir = datetime.now()
    db_registro.fecha_modificacion = datetime.now()
    
    db.commit()
    db.refresh(db_registro)
    
    return db_registro


@router.get("/{registro_id}/historial", response_model=List)
def obtener_historial(
    registro_id: UUID,
    db: Session = Depends(get_db)
):
    """Obtener historial de cambios de estado de un registro"""
    # Verificar que el registro existe
    registro = db.query(RegistroResiduo).filter(RegistroResiduo.id == registro_id).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    
    historial = db.query(HistorialEstado)\
        .filter(HistorialEstado.registro_id == registro_id)\
        .order_by(HistorialEstado.fecha_cambio.desc())\
        .all()
    
    return historial
