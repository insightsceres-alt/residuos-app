# Residuos Backend API

Backend API para el sistema de gestión de transporte de residuos.

## 🚀 Tecnologías

- **FastAPI** - Framework web moderno y rápido
- **SQLAlchemy** - ORM para PostgreSQL
- **Pydantic** - Validación de datos
- **PostgreSQL** - Base de datos relacional
- **Uvicorn** - Servidor ASGI

## 📦 Instalación

### Desarrollo Local

```bash
# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
# Windows
.\venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Copiar archivo de entorno
cp .env.example .env

# Editar .env con tus credenciales de base de datos
```

### Inicializar Base de Datos

```bash
# Ejecutar script de inicialización
psql -h localhost -U postgres -d residuos -f init-db.sql
```

### Ejecutar en Desarrollo

```bash
uvicorn app.main:app --reload --port 8002
```

La API estará disponible en `http://localhost:8002`

## 🐳 Docker

### Construir imagen

```bash
docker build -t residuos-backend:latest .
```

### Ejecutar contenedor

```bash
docker run -d \
  -p 8002:8002 \
  -e DB_HOST=host.docker.internal \
  -e DB_PASSWORD=yourpassword \
  --name residuos-backend \
  residuos-backend:latest
```

## 📚 Documentación API

Una vez ejecutado el servidor, visita:

- **Swagger UI**: http://localhost:8002/docs
- **ReDoc**: http://localhost:8002/redoc

## 🔌 Endpoints Principales

### Registros

- `POST /residuos/api/registros` - Crear registro
- `GET /residuos/api/registros` - Listar con filtros
- `GET /residuos/api/registros/{id}` - Obtener detalle
- `PUT /residuos/api/registros/{id}` - Actualizar
- `DELETE /residuos/api/registros/{id}` - Eliminar
- `GET /residuos/api/registros/estadisticas` - Estadísticas
- `GET /residuos/api/registros/{id}/historial` - Historial de cambios

### Catálogos

- `GET /residuos/api/catalogos/tipologias` - Tipos de residuos
- `GET /residuos/api/catalogos/transportistas` - Transportistas
- `GET /residuos/api/catalogos/vehiculos` - Vehículos
- `GET /residuos/api/catalogos/plantas` - Plantas de tratamiento
- `GET /residuos/api/catalogos/provincias` - Provincias
- `GET /residuos/api/catalogos/estados` - Estados posibles

## 🔐 Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `ENVIRONMENT` | Entorno de ejecución | `development` |
| `DEBUG` | Modo debug | `True` |
| `DB_HOST` | Host de PostgreSQL | `localhost` |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `DB_NAME` | Nombre de base de datos | `residuos` |
| `DB_USERNAME` | Usuario de BD | `postgres` |
| `DB_PASSWORD` | Password de BD | - |
| `AWS_REGION` | Región AWS | `eu-west-1` |
| `S3_BUCKET_DOCUMENTS` | Bucket S3 para documentos | - |

## 🧪 Testing

```bash
# Instalar dependencias de testing
pip install pytest pytest-cov httpx

# Ejecutar tests
pytest

# Con coverage
pytest --cov=app tests/
```

## 📁 Estructura del Proyecto

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py           # Aplicación FastAPI
│   ├── config.py         # Configuración
│   ├── database.py       # Conexión a BD
│   ├── models.py         # Modelos SQLAlchemy
│   ├── schemas.py        # Schemas Pydantic
│   └── routes/
│       ├── registros.py  # Endpoints de registros
│       └── catalogos.py  # Endpoints de catálogos
├── Dockerfile
├── requirements.txt
├── .env.example
└── init-db.sql          # Script de inicialización BD
```

## 🚀 Despliegue en AWS ECS

El backend se despliega automáticamente en AWS ECS Fargate cuando se hace push a ECR.

```bash
# Login a ECR
aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin <ECR_URL>

# Tag imagen
docker tag residuos-backend:latest <ECR_URL>:latest

# Push a ECR
docker push <ECR_URL>:latest

# ECS actualizará automáticamente el servicio
```

## 📊 Modelo de Datos

### Principales Entidades

- **registros_residuos**: Registros de transporte
- **tipologias_residuos**: Catálogo de tipos de residuos
- **transportistas**: Empresas transportistas
- **vehiculos**: Vehículos de transporte
- **plantas_tratamiento**: Plantas de destino
- **documentos_generados**: Documentos PDF generados
- **historial_estados**: Trazabilidad de cambios de estado

## 📝 Licencia

Propiedad de AGROIA © 2026
