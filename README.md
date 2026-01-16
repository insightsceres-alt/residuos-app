# 🚛 Sistema de Gestión de Transporte de Residuos

Sistema completo para el registro y gestión de transporte de residuos con backend FastAPI y frontend React.

## 📋 Descripción

Aplicación web para gestionar el transporte de residuos que incluye:
- Registro de movimientos de residuos
- Gestión de transportistas y vehículos
- Seguimiento de estados y plantas de tratamiento
- Generación automática de números de registro
- Dashboard con estadísticas y gráficos
- Historial completo de cambios

## 🏗️ Arquitectura

```
residuos-app/
├── backend/              # API FastAPI
│   ├── app/
│   │   ├── models.py    # Modelos SQLAlchemy
│   │   ├── schemas.py   # Validación Pydantic
│   │   ├── routes/      # Endpoints API
│   │   ├── database.py  # Conexión BD
│   │   └── main.py      # App principal
│   ├── init-db.sql      # Script inicialización BD
│   └── Dockerfile
├── frontend/            # UI React + Vite
│   ├── src/
│   │   ├── pages/      # Componentes páginas
│   │   └── services/   # Cliente API
│   ├── Dockerfile
│   └── nginx.conf
└── docker-compose.yml   # Orquestación local
```

## 🚀 Inicio Rápido

### Prerrequisitos

- Docker y Docker Compose
- Puertos disponibles: 5432 (PostgreSQL), 8002 (Backend), 3000/80 (Frontend)

### Opción 1: Entorno de Desarrollo

```bash
# Levantar stack completo en modo desarrollo
docker-compose --profile dev up -d

# Ver logs
docker-compose logs -f

# Acceder
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:8002/residuos/api/docs
# - PostgreSQL: localhost:5432
```

### Opción 2: Entorno de Producción

```bash
# Levantar stack en modo producción
docker-compose --profile prod up -d

# Acceder
# - Frontend: http://localhost
# - Backend API: http://localhost:8002/residuos/api/docs
```

### Detener Servicios

```bash
docker-compose down

# Eliminar también los datos
docker-compose down -v
```

## 🗄️ Base de Datos

### Tablas Principales

- **registros_residuos** - Registro principal de movimientos
- **tipologias_residuos** - Catálogo de tipos de residuos
- **transportistas** - Empresas transportistas
- **vehiculos** - Vehículos por transportista
- **plantas_tratamiento** - Destinos de residuos
- **historial_estados** - Auditoría de cambios
- **documentos_generados** - PDFs y documentación

### Inicialización

La base de datos se inicializa automáticamente con:
- Esquema completo (tablas, índices, constraints)
- Triggers para auditoría y números automáticos
- Datos de ejemplo (tipologías, transportistas, vehículos)

Ver [backend/init-db.sql](backend/init-db.sql) para detalles.

## 🔌 API Endpoints

### Registros
- `GET /residuos/api/registros` - Listar con filtros y paginación
- `POST /residuos/api/registros` - Crear nuevo registro
- `GET /residuos/api/registros/{id}` - Obtener por ID
- `PUT /residuos/api/registros/{id}` - Actualizar (guarda historial)
- `DELETE /residuos/api/registros/{id}` - Eliminar
- `GET /residuos/api/registros/estadisticas` - Métricas y gráficos
- `GET /residuos/api/registros/{id}/historial` - Ver cambios

### Catálogos
- `GET /residuos/api/tipologias` - Tipos de residuos
- `GET /residuos/api/transportistas` - Empresas
- `GET /residuos/api/vehiculos` - Vehículos (filtrable por transportista)
- `GET /residuos/api/plantas` - Plantas de tratamiento
- `GET /residuos/api/provincias` - Códigos de provincias
- `GET /residuos/api/estados` - Estados posibles

Documentación interactiva: http://localhost:8002/residuos/api/docs

## 🎨 Frontend

### Páginas

1. **Dashboard** (`/`)
   - Total de registros y peso
   - Gráficos por estado y tipología
   - Actividad reciente

2. **Listado de Registros** (`/registros`)
   - Tabla paginada
   - Filtros: estado, tipología, provincia, búsqueda
   - Cambio rápido de estado
   - Ver detalles en modal

3. **Nuevo Registro** (`/nuevo`)
   - Formulario completo
   - Validación de campos
   - Catálogos dinámicos

### Desarrollo Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Servidor de desarrollo
npm run dev

# Build producción
npm run build
```

## 🐳 Docker

### Construir Imágenes

```bash
# Backend
cd backend
docker build -t residuos-backend:latest .

# Frontend
cd frontend
docker build -t residuos-frontend:latest .
```

### Variables de Entorno

#### Backend
- `DB_HOST` - Host PostgreSQL
- `DB_PORT` - Puerto BD (default: 5432)
- `DB_NAME` - Nombre BD
- `DB_USER` - Usuario BD
- `DB_PASSWORD` - Password BD
- `APP_ENV` - Entorno (development/production)
- `LOG_LEVEL` - Nivel de logs (DEBUG/INFO)
- `CORS_ORIGINS` - Orígenes permitidos CORS

#### Frontend
- `VITE_API_URL` - URL base del API

## 🚀 Despliegue en AWS

### Infraestructura Terraform

La infraestructura está definida en `../agroia-infrastructure/`:

- **RDS PostgreSQL** - Base de datos multi-AZ
- **ECR** - Repositorio de imágenes Docker
- **ECS Fargate** - Contenedores del backend
- **ALB** - Balanceador con ruta `/residuos/api/*`
- **S3** - Hosting del frontend estático

### Comandos de Despliegue

```bash
cd ../agroia-infrastructure

# Inicializar Terraform
cd environments/dev  # o prod
terraform init

# Planificar cambios
terraform plan

# Aplicar infraestructura
terraform apply

# Obtener outputs (endpoints, URLs)
terraform output
```

### Subir Imágenes a ECR

```bash
# Login en ECR
aws ecr get-login-password --region eu-west-1 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.eu-west-1.amazonaws.com

# Tag y push backend
docker tag residuos-backend:latest <account-id>.dkr.ecr.eu-west-1.amazonaws.com/residuos-backend:latest
docker push <account-id>.dkr.ecr.eu-west-1.amazonaws.com/residuos-backend:latest

# Actualizar servicio ECS
aws ecs update-service \
  --cluster agroia-dev-cluster \
  --service residuos-backend \
  --force-new-deployment
```

### Desplegar Frontend en S3

```bash
cd frontend

# Build
npm run build

# Subir a S3
aws s3 sync dist/ s3://agroia-dev-residuos-frontend/ --delete
```

## 📊 Modelo de Datos

### Registro de Residuo (Principal)

```sql
registros_residuos:
  - id (UUID, PK)
  - numero_registro (auto, único)
  - tipologia_residuo_id (FK)
  - peso_kg (decimal)
  - fecha_recogida (date)
  - provincia_recogida (código)
  - municipio_recogida (varchar)
  - direccion_recogida (text)
  - transportista_id (FK)
  - vehiculo_id (FK)
  - planta_tratamiento_id (FK)
  - estado (enum)
  - observaciones (text)
  - created_at, updated_at
```

### Estados Posibles

- `PENDIENTE` - Registro creado
- `EN_TRANSITO` - En camino
- `ENTREGADO` - En planta
- `PROCESADO` - Tratado
- `CANCELADO` - Anulado

## 🛠️ Desarrollo

### Requisitos

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+

### Setup Local sin Docker

#### Backend
```bash
cd backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar .env
cp .env.example .env
# Editar .env con credenciales de BD

# Ejecutar migraciones (init-db.sql)
psql -h localhost -U residuos_user -d residuos_db -f init-db.sql

# Iniciar servidor
uvicorn app.main:app --reload --port 8002
```

#### Frontend
```bash
cd frontend

# Instalar dependencias
npm install

# Configurar .env
cp .env.example .env

# Iniciar dev server
npm run dev
```

## 📝 Datos de Prueba

El script `init-db.sql` incluye datos de ejemplo:

- 3 Tipologías de residuos
- 2 Transportistas
- 4 Vehículos
- 2 Plantas de tratamiento

## 🔒 Seguridad

- Passwords en Secrets Manager (AWS)
- Non-root users en containers
- CORS configurado explícitamente
- Headers de seguridad en Nginx
- Health checks en todos los servicios
- Validación de entrada con Pydantic

## 📈 Monitorización

- CloudWatch Logs para backend
- RDS Performance Insights
- Alarmas: CPU >80%, Storage <5GB, Conexiones >80
- Health checks HTTP en todos los servicios

## 🧪 Testing

```bash
# Backend tests (TODO)
cd backend
pytest

# Frontend tests (TODO)
cd frontend
npm test
```

## 📄 Licencia

Propiedad de AGROIA © 2026

## 🤝 Soporte

Para problemas o preguntas contactar al equipo de desarrollo.
