# Residuos Frontend

Frontend web para el sistema de gestión de transporte de residuos.

## 🚀 Tecnologías

- **React 18** - Biblioteca de UI
- **Vite** - Build tool y dev server
- **React Router** - Navegación
- **Axios** - Cliente HTTP
- **date-fns** - Manipulación de fechas

## 📦 Instalación

### Desarrollo Local

```bash
# Instalar dependencias
npm install

# Copiar archivo de entorno
cp .env.example .env

# Editar .env si es necesario (opcional en desarrollo)
# VITE_API_URL=/residuos/api

# Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 🐳 Docker

### Construir imagen

```bash
docker build -t residuos-frontend:latest .
```

### Ejecutar contenedor

```bash
docker run -d \
  -p 80:80 \
  --name residuos-frontend \
  residuos-frontend:latest
```

## 📁 Estructura del Proyecto

```
frontend/
├── public/              # Archivos estáticos
├── src/
│   ├── pages/          # Componentes de páginas
│   │   ├── Dashboard.jsx
│   │   ├── RegistrosList.jsx
│   │   └── NuevoRegistro.jsx
│   ├── services/       # Servicios API
│   │   └── api.js
│   ├── App.jsx         # Componente principal
│   ├── main.jsx        # Entry point
│   └── index.css       # Estilos globales
├── index.html
├── vite.config.js
├── package.json
├── Dockerfile
└── nginx.conf
```

## 🔌 Características

### Dashboard
- Estadísticas generales de registros
- Gráficos por estado y tipología
- Indicadores clave (total, peso, últimos 7 días)

### Listado de Registros
- Tabla paginada con todos los registros
- Filtros por estado, tipología, provincia
- Búsqueda por texto
- Cambio rápido de estado
- Visualización de detalles

### Nuevo Registro
- Formulario completo para crear registros
- Validación de campos obligatorios
- Carga dinámica de catálogos
- Vehículos filtrados por transportista

## 🛠️ Scripts Disponibles

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview

# Linting
npm run lint
```

## 🌐 Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `VITE_API_URL` | URL base del API | `/residuos/api` |

## 🎨 Estilos

El proyecto usa CSS vanilla con variables CSS para mantener consistencia:

- `--primary-color`: Color principal (verde)
- `--secondary-color`: Color secundario
- `--danger-color`: Color para acciones destructivas
- `--info-color`: Color informativo

## 📱 Responsive

La aplicación es completamente responsive y se adapta a:
- 📱 Móviles (< 768px)
- 💻 Tablets (768px - 1024px)
- 🖥️ Desktop (> 1024px)

## 🚀 Despliegue

### En S3 (Static Website)

```bash
# Build
npm run build

# Subir a S3
aws s3 sync dist/ s3://tu-bucket-residuos-frontend/ --delete
```

### En AWS con CloudFront

La infraestructura Terraform ya configura el bucket S3 para hosting estático.

## 📊 Páginas Disponibles

- `/` - Dashboard con estadísticas
- `/registros` - Listado completo de registros
- `/nuevo` - Formulario de nuevo registro

## 🔧 Configuración de Nginx

El Dockerfile incluye una configuración optimizada de Nginx que:
- Sirve archivos estáticos con cache de 1 año
- Habilita compresión gzip
- Configura headers de seguridad
- Soporta React Router con `try_files`

## 📝 Licencia

Propiedad de AGROIA © 2026
