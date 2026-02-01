from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import os
from ..database import get_db
from ..models import TipologiaResiduo, Transportista, Vehiculo, PlantaTratamiento
from ..schemas import TipologiaResiduoResponse, TransportistaResponse, VehiculoResponse, CodigoLERResponse

router = APIRouter(prefix="/catalogos", tags=["Catálogos"])

# Cache para códigos LER (se carga una vez)
_codigos_ler_cache: List[dict] = []
_grupos_ler_cache: dict = {}


def _load_codigos_ler() -> List[dict]:
    """Cargar códigos LER desde el archivo Excel"""
    global _codigos_ler_cache, _grupos_ler_cache
    
    if _codigos_ler_cache:
        return _codigos_ler_cache
    
    try:
        import openpyxl
        # Buscar el archivo codes.xlsx en diferentes ubicaciones
        possible_paths = [
            "/app/codes.xlsx",  # Docker
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "codes.xlsx"),  # Desarrollo
            "codes.xlsx"  # Directorio actual
        ]
        
        excel_path = None
        for path in possible_paths:
            if os.path.exists(path):
                excel_path = path
                break
        
        if not excel_path:
            return []
        
        wb = openpyxl.load_workbook(excel_path, read_only=True)
        sheet = wb.active
        
        for row in sheet.iter_rows(min_row=2, values_only=True):
            code = row[0]  # columna 'code'
            name = row[3]  # columna 'name#es'
            if code and name:
                code_str = str(code).strip()
                name_str = str(name).strip()
                _codigos_ler_cache.append({
                    "code": code_str,
                    "name": name_str
                })
                # Guardar grupos (códigos de 2 dígitos)
                if len(code_str) == 2 or (len(code_str) == 5 and code_str[2:] == ' 00'):
                    grupo_code = code_str[:2]
                    _grupos_ler_cache[grupo_code] = name_str
        
        wb.close()
    except Exception as e:
        print(f"Error cargando códigos LER: {e}")
    
    return _codigos_ler_cache


def get_grupo_ler(codigo_ler: str) -> dict:
    """Obtener el grupo (categoría principal) de un código LER"""
    if not _codigos_ler_cache:
        _load_codigos_ler()
    
    if not codigo_ler:
        return {"codigo": "00", "nombre": "Sin clasificar"}
    
    # Extraer los primeros 2 dígitos
    grupo_code = codigo_ler.strip()[:2]
    
    if grupo_code in _grupos_ler_cache:
        return {"codigo": grupo_code, "nombre": _grupos_ler_cache[grupo_code]}
    
    return {"codigo": grupo_code, "nombre": f"Grupo {grupo_code}"}


@router.get("/codigos-ler", response_model=List[CodigoLERResponse])
def buscar_codigos_ler(
    search: Optional[str] = Query(None, description="Texto a buscar en la descripción"),
    limit: int = Query(20, ge=1, le=100, description="Límite de resultados")
):
    """Buscar códigos LER por descripción"""
    codigos = _load_codigos_ler()
    
    if not search:
        return codigos[:limit]
    
    # Búsqueda case-insensitive en la descripción
    search_lower = search.lower()
    resultados = [
        c for c in codigos 
        if search_lower in c["name"].lower()
    ]
    
    return resultados[:limit]


@router.get("/grupos-ler", response_model=List[CodigoLERResponse])
def listar_grupos_ler():
    """Listar grupos principales de códigos LER (categorías de 2 dígitos)"""
    if not _codigos_ler_cache:
        _load_codigos_ler()
    
    grupos = [
        {"code": codigo, "name": nombre}
        for codigo, nombre in sorted(_grupos_ler_cache.items())
    ]
    return grupos


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
def listar_provincias():
    """Listar todas las provincias de España"""
    provincias = [
        "Álava", "Albacete", "Alicante", "Almería", "Asturias", "Ávila",
        "Badajoz", "Barcelona", "Burgos", "Cáceres", "Cádiz", "Cantabria",
        "Castellón", "Ciudad Real", "Córdoba", "Cuenca", "Girona", "Granada",
        "Guadalajara", "Guipúzcoa", "Huelva", "Huesca", "Illes Balears",
        "Jaén", "La Coruña", "La Rioja", "Las Palmas", "León", "Lleida",
        "Lugo", "Madrid", "Málaga", "Murcia", "Navarra", "Ourense", "Palencia",
        "Pontevedra", "Salamanca", "Santa Cruz de Tenerife", "Segovia",
        "Sevilla", "Soria", "Tarragona", "Teruel", "Toledo", "Valencia",
        "Valladolid", "Vizcaya", "Zamora", "Zaragoza", "Ceuta", "Melilla"
    ]
    return sorted(provincias)


@router.get("/estados", response_model=List[str])
def listar_estados():
    """Listar estados posibles de un registro"""
    return ['PENDIENTE', 'EN_TRANSITO', 'ENTREGADO', 'PROCESADO', 'CANCELADO']


@router.get("/municipios", response_model=List[str])
def listar_municipios(provincia: str = Query(..., description="Provincia para filtrar municipios")):
    """Listar municipios por provincia"""
    municipios_por_provincia = {
        "Álava": ["Vitoria-Gasteiz", "Llodio", "Amurrio", "Oyón-Oion", "Salvatierra", "Alegría-Dulantzi"],
        "Albacete": ["Albacete", "Hellín", "Villarrobledo", "Almansa", "La Roda", "Caudete", "Tobarra"],
        "Alicante": ["Alicante", "Elche", "Torrevieja", "Orihuela", "Benidorm", "Alcoy", "Elda", "San Vicente del Raspeig", "Dénia", "Villena", "Petrer", "Crevillent", "Novelda"],
        "Almería": ["Almería", "El Ejido", "Roquetas de Mar", "Níjar", "Vícar", "Adra", "Huércal-Overa", "Vera"],
        "Asturias": ["Oviedo", "Gijón", "Avilés", "Langreo", "Mieres", "Siero", "Castrillón", "San Martín del Rey Aurelio"],
        "Ávila": ["Ávila", "Arévalo", "Arenas de San Pedro", "Las Navas del Marqués", "Candeleda"],
        "Badajoz": ["Badajoz", "Mérida", "Don Benito", "Almendralejo", "Villanueva de la Serena", "Zafra", "Montijo"],
        "Barcelona": ["Barcelona", "L'Hospitalet de Llobregat", "Badalona", "Terrassa", "Sabadell", "Mataró", "Santa Coloma de Gramenet", "Cornellà de Llobregat", "Sant Boi de Llobregat", "Rubí", "Vilanova i la Geltrú", "Granollers", "Manresa"],
        "Burgos": ["Burgos", "Miranda de Ebro", "Aranda de Duero", "Briviesca", "Medina de Pomar"],
        "Cáceres": ["Cáceres", "Plasencia", "Navalmoral de la Mata", "Trujillo", "Coria", "Miajadas"],
        "Cádiz": ["Cádiz", "Jerez de la Frontera", "Algeciras", "San Fernando", "El Puerto de Santa María", "Chiclana de la Frontera", "Sanlúcar de Barrameda", "La Línea de la Concepción", "Rota"],
        "Cantabria": ["Santander", "Torrelavega", "Castro-Urdiales", "Camargo", "Piélagos", "El Astillero", "Laredo"],
        "Castellón": ["Castellón de la Plana", "Vila-real", "Burriana", "Vall d'Uixó", "Vinaròs", "Benicarló", "Almassora", "Onda"],
        "Ciudad Real": ["Ciudad Real", "Puertollano", "Tomelloso", "Alcázar de San Juan", "Valdepeñas", "Manzanares", "Daimiel"],
        "Córdoba": ["Córdoba", "Lucena", "Puente Genil", "Montilla", "Priego de Córdoba", "Cabra", "Baena", "Palma del Río"],
        "Cuenca": ["Cuenca", "Tarancón", "San Clemente", "Quintanar del Rey", "Las Pedroñeras", "Motilla del Palancar"],
        "Girona": ["Girona", "Figueres", "Blanes", "Lloret de Mar", "Olot", "Salt", "Palafrugell", "Sant Feliu de Guíxols", "Roses"],
        "Granada": ["Granada", "Motril", "Almuñécar", "Armilla", "Maracena", "Baza", "Loja", "Guadix", "Las Gabias"],
        "Guadalajara": ["Guadalajara", "Azuqueca de Henares", "Alovera", "El Casar", "Sigüenza", "Marchamalo"],
        "Guipúzcoa": ["San Sebastián", "Irún", "Errenteria", "Eibar", "Zarautz", "Arrasate", "Hernani", "Tolosa", "Hondarribia"],
        "Huelva": ["Huelva", "Lepe", "Almonte", "Isla Cristina", "Moguer", "Ayamonte", "Aljaraque", "Punta Umbría"],
        "Huesca": ["Huesca", "Monzón", "Barbastro", "Fraga", "Jaca", "Sabiñánigo", "Binéfar"],
        "Illes Balears": ["Palma", "Calvià", "Manacor", "Llucmajor", "Marratxí", "Ibiza", "Santa Eulària des Riu", "Inca", "Mahón", "Ciutadella de Menorca"],
        "Jaén": ["Jaén", "Linares", "Andújar", "Úbeda", "Martos", "Alcalá la Real", "Baeza", "La Carolina"],
        "La Coruña": ["A Coruña", "Santiago de Compostela", "Ferrol", "Narón", "Oleiros", "Carballo", "Arteixo", "Culleredo", "Cambre"],
        "La Rioja": ["Logroño", "Calahorra", "Arnedo", "Haro", "Alfaro", "Lardero", "Nájera"],
        "Las Palmas": ["Las Palmas de Gran Canaria", "Telde", "Santa Lucía de Tirajana", "Arrecife", "San Bartolomé de Tirajana", "Arucas", "Puerto del Rosario", "Ingenio"],
        "León": ["León", "Ponferrada", "San Andrés del Rabanedo", "Villaquilambre", "Astorga", "La Bañeza"],
        "Lleida": ["Lleida", "Balaguer", "Tàrrega", "Mollerussa", "La Seu d'Urgell", "Cervera"],
        "Lugo": ["Lugo", "Monforte de Lemos", "Viveiro", "Vilalba", "Sarria", "Ribadeo", "Burela"],
        "Madrid": ["Madrid", "Móstoles", "Alcalá de Henares", "Fuenlabrada", "Leganés", "Getafe", "Alcorcón", "Torrejón de Ardoz", "Parla", "Alcobendas", "Las Rozas", "San Sebastián de los Reyes", "Pozuelo de Alarcón", "Coslada", "Rivas-Vaciamadrid", "Valdemoro", "Majadahonda", "Collado Villalba", "Aranjuez", "Arganda del Rey"],
        "Málaga": ["Málaga", "Marbella", "Mijas", "Vélez-Málaga", "Fuengirola", "Torremolinos", "Benalmádena", "Estepona", "Ronda", "Antequera", "Rincón de la Victoria", "Alhaurín de la Torre"],
        "Murcia": ["Murcia", "Cartagena", "Lorca", "Molina de Segura", "Alcantarilla", "Mazarrón", "Cieza", "Águilas", "Yecla", "Torre-Pacheco", "San Javier"],
        "Navarra": ["Pamplona", "Tudela", "Barañáin", "Burlada", "Estella-Lizarra", "Zizur Mayor", "Tafalla", "Ansoáin"],
        "Ourense": ["Ourense", "Verín", "O Barco de Valdeorras", "O Carballiño", "Xinzo de Limia", "Ribadavia"],
        "Palencia": ["Palencia", "Aguilar de Campoo", "Guardo", "Venta de Baños", "Villamuriel de Cerrato"],
        "Pontevedra": ["Vigo", "Pontevedra", "Vilagarcía de Arousa", "Redondela", "Cangas", "Marín", "Ponteareas", "Lalín", "O Porriño", "Nigrán", "Sanxenxo", "Moaña"],
        "Salamanca": ["Salamanca", "Santa Marta de Tormes", "Béjar", "Ciudad Rodrigo", "Carbajosa de la Sagrada", "Villares de la Reina"],
        "Santa Cruz de Tenerife": ["Santa Cruz de Tenerife", "San Cristóbal de La Laguna", "Arona", "Adeje", "La Orotava", "Granadilla de Abona", "Los Realejos", "Puerto de la Cruz", "Candelaria"],
        "Segovia": ["Segovia", "Cuéllar", "El Espinar", "San Ildefonso", "Palazuelos de Eresma", "Cantalejo"],
        "Sevilla": ["Sevilla", "Dos Hermanas", "Alcalá de Guadaíra", "Utrera", "Mairena del Aljarafe", "Écija", "Los Palacios y Villafranca", "La Rinconada", "Carmona", "Coria del Río", "Tomares", "Bormujos"],
        "Soria": ["Soria", "Almazán", "El Burgo de Osma", "San Esteban de Gormaz", "Ólvega"],
        "Tarragona": ["Tarragona", "Reus", "Tortosa", "El Vendrell", "Cambrils", "Salou", "Valls", "Amposta", "Vila-seca", "Calafell"],
        "Teruel": ["Teruel", "Alcañiz", "Andorra", "Calamocha", "Utrillas", "Monreal del Campo"],
        "Toledo": ["Toledo", "Talavera de la Reina", "Illescas", "Seseña", "Torrijos", "Consuegra", "Madridejos", "Sonseca", "Mora", "Quintanar de la Orden"],
        "Valencia": ["Valencia", "Torrent", "Gandía", "Paterna", "Sagunto", "Mislata", "Burjassot", "Ontinyent", "Aldaia", "Manises", "Alfafar", "Xirivella", "Alzira", "Quart de Poblet", "Sueca", "Requena", "Cullera"],
        "Valladolid": ["Valladolid", "Laguna de Duero", "Medina del Campo", "Arroyo de la Encomienda", "Tordesillas", "Tudela de Duero", "Simancas"],
        "Vizcaya": ["Bilbao", "Barakaldo", "Getxo", "Portugalete", "Santurtzi", "Basauri", "Leioa", "Galdakao", "Durango", "Sestao", "Erandio"],
        "Zamora": ["Zamora", "Benavente", "Toro", "Morales del Vino", "Fuentesaúco"],
        "Zaragoza": ["Zaragoza", "Calatayud", "Utebo", "Ejea de los Caballeros", "Tarazona", "Caspe", "La Almunia de Doña Godina", "Cuarte de Huerva", "Zuera"],
        "Ceuta": ["Ceuta"],
        "Melilla": ["Melilla"]
    }
    
    return sorted(municipios_por_provincia.get(provincia, []))
