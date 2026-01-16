-- ============================================
-- Script de Inicialización de Base de Datos
-- Sistema de Gestión de Transporte de Residuos
-- ============================================

-- Crear extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear extensión para PostGIS (opcional, si necesitas funciones geoespaciales)
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- TABLA PRINCIPAL: registros_residuos
-- ============================================

CREATE TABLE IF NOT EXISTS registros_residuos (
    -- Identificador único
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Información temporal
    fecha_registro TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Información del residuo
    tipologia VARCHAR(100) NOT NULL,
    peso_kg DECIMAL(10,2) NOT NULL CHECK (peso_kg > 0),
    
    -- Ubicación de recogida
    lugar_recogida VARCHAR(255) NOT NULL,
    latitud DECIMAL(10,8),
    longitud DECIMAL(11,8),
    provincia VARCHAR(100),
    municipio VARCHAR(100),
    
    -- Información del transportista
    transportista_id VARCHAR(50),
    vehiculo_matricula VARCHAR(20),
    conductor_nombre VARCHAR(255),
    
    -- Origen y destino
    origen VARCHAR(255),
    destino VARCHAR(255),
    planta_tratamiento VARCHAR(255),
    
    -- Estado y trazabilidad
    estado VARCHAR(50) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'EN_TRANSITO', 'ENTREGADO', 'PROCESADO', 'CANCELADO')),
    numero_registro VARCHAR(50) UNIQUE,
    
    -- Documentación
    documento_generado BOOLEAN DEFAULT FALSE,
    documento_url TEXT,
    observaciones TEXT,
    
    -- Auditoría
    usuario_creacion VARCHAR(100),
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    usuario_modificacion VARCHAR(100),
    fecha_modificacion TIMESTAMP,
    
    -- Timestamps automáticos
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ÍNDICES para optimizar consultas
-- ============================================

CREATE INDEX IF NOT EXISTS idx_registros_fecha_registro ON registros_residuos(fecha_registro DESC);
CREATE INDEX IF NOT EXISTS idx_registros_tipologia ON registros_residuos(tipologia);
CREATE INDEX IF NOT EXISTS idx_registros_estado ON registros_residuos(estado);
CREATE INDEX IF NOT EXISTS idx_registros_lugar_recogida ON registros_residuos(lugar_recogida);
CREATE INDEX IF NOT EXISTS idx_registros_provincia ON registros_residuos(provincia);
CREATE INDEX IF NOT EXISTS idx_registros_transportista ON registros_residuos(transportista_id);
CREATE INDEX IF NOT EXISTS idx_registros_numero ON registros_residuos(numero_registro);

-- Índice compuesto para búsquedas comunes
CREATE INDEX IF NOT EXISTS idx_registros_estado_fecha ON registros_residuos(estado, fecha_registro DESC);

-- ============================================
-- TABLA: tipologias_residuos (catálogo)
-- ============================================

CREATE TABLE IF NOT EXISTS tipologias_residuos (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    ler_code VARCHAR(20), -- Código LER (Lista Europea de Residuos)
    peligroso BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insertar tipologías iniciales
INSERT INTO tipologias_residuos (codigo, nombre, descripcion, ler_code, peligroso) VALUES
('ORG', 'Orgánico', 'Residuos biodegradables de origen vegetal o animal', '20 01 08', FALSE),
('PLAS', 'Plástico', 'Envases y productos plásticos', '15 01 02', FALSE),
('PAP', 'Papel/Cartón', 'Papel, cartón y envases de papel', '15 01 01', FALSE),
('VID', 'Vidrio', 'Envases de vidrio y productos vítreos', '15 01 07', FALSE),
('MET', 'Metales', 'Chatarra metálica y envases metálicos', '15 01 04', FALSE),
('RCD', 'Escombros', 'Residuos de construcción y demolición', '17 01 07', FALSE),
('RAEE', 'Aparatos Eléctricos', 'Residuos de aparatos eléctricos y electrónicos', '20 01 35', TRUE),
('PEL', 'Peligrosos', 'Residuos peligrosos varios', '15 01 10', TRUE),
('ACEITE', 'Aceites Usados', 'Aceites minerales o sintéticos usados', '13 02 08', TRUE),
('BATERIAS', 'Baterías', 'Pilas y acumuladores usados', '16 06 01', TRUE)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================
-- TABLA: transportistas
-- ============================================

CREATE TABLE IF NOT EXISTS transportistas (
    id VARCHAR(50) PRIMARY KEY,
    nombre_empresa VARCHAR(255) NOT NULL,
    cif VARCHAR(20),
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABLA: vehiculos
-- ============================================

CREATE TABLE IF NOT EXISTS vehiculos (
    matricula VARCHAR(20) PRIMARY KEY,
    transportista_id VARCHAR(50) REFERENCES transportistas(id),
    tipo VARCHAR(50), -- 'Camión', 'Furgoneta', 'Trailer'
    capacidad_kg DECIMAL(10,2),
    marca VARCHAR(50),
    modelo VARCHAR(50),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABLA: plantas_tratamiento
-- ============================================

CREATE TABLE IF NOT EXISTS plantas_tratamiento (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    direccion TEXT,
    provincia VARCHAR(100),
    municipio VARCHAR(100),
    latitud DECIMAL(10,8),
    longitud DECIMAL(11,8),
    telefono VARCHAR(20),
    email VARCHAR(100),
    tipos_aceptados TEXT[], -- Array de tipos de residuos que acepta
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABLA: documentos_generados
-- ============================================

CREATE TABLE IF NOT EXISTS documentos_generados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registro_id UUID REFERENCES registros_residuos(id) ON DELETE CASCADE,
    tipo_documento VARCHAR(50) NOT NULL, -- 'DI', 'Albarán', 'Certificado'
    numero_documento VARCHAR(100) UNIQUE,
    fecha_generacion TIMESTAMP DEFAULT NOW(),
    s3_url TEXT,
    pdf_hash VARCHAR(64), -- SHA256 del PDF para verificación
    firmado_digitalmente BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABLA: historial_estados
-- ============================================

CREATE TABLE IF NOT EXISTS historial_estados (
    id SERIAL PRIMARY KEY,
    registro_id UUID REFERENCES registros_residuos(id) ON DELETE CASCADE,
    estado_anterior VARCHAR(50),
    estado_nuevo VARCHAR(50) NOT NULL,
    fecha_cambio TIMESTAMP DEFAULT NOW(),
    usuario VARCHAR(100),
    observaciones TEXT,
    latitud DECIMAL(10,8), -- Para trackear ubicación del cambio
    longitud DECIMAL(11,8)
);

-- Índice para búsquedas por registro
CREATE INDEX IF NOT EXISTS idx_historial_registro ON historial_estados(registro_id, fecha_cambio DESC);

-- ============================================
-- FUNCIÓN: Actualizar updated_at automáticamente
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para registros_residuos
CREATE TRIGGER update_registros_residuos_updated_at
    BEFORE UPDATE ON registros_residuos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para transportistas
CREATE TRIGGER update_transportistas_updated_at
    BEFORE UPDATE ON transportistas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCIÓN: Generar número de registro automático
-- ============================================

CREATE OR REPLACE FUNCTION generar_numero_registro()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_registro IS NULL THEN
        NEW.numero_registro := 'RES-' || 
                               TO_CHAR(NEW.fecha_registro, 'YYYYMMDD') || '-' || 
                               LPAD(NEXTVAL('seq_numero_registro')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Secuencia para números de registro
CREATE SEQUENCE IF NOT EXISTS seq_numero_registro START 1;

-- Trigger para generar número de registro
CREATE TRIGGER trigger_generar_numero_registro
    BEFORE INSERT ON registros_residuos
    FOR EACH ROW
    EXECUTE FUNCTION generar_numero_registro();

-- ============================================
-- FUNCIÓN: Registrar cambios de estado
-- ============================================

CREATE OR REPLACE FUNCTION registrar_cambio_estado()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.estado IS DISTINCT FROM NEW.estado THEN
        INSERT INTO historial_estados (
            registro_id,
            estado_anterior,
            estado_nuevo,
            usuario,
            fecha_cambio
        ) VALUES (
            NEW.id,
            OLD.estado,
            NEW.estado,
            NEW.usuario_modificacion,
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para registrar cambios de estado
CREATE TRIGGER trigger_registrar_cambio_estado
    AFTER UPDATE ON registros_residuos
    FOR EACH ROW
    EXECUTE FUNCTION registrar_cambio_estado();

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista: Resumen de registros por estado
CREATE OR REPLACE VIEW vista_resumen_estados AS
SELECT 
    estado,
    COUNT(*) as total_registros,
    SUM(peso_kg) as peso_total_kg,
    COUNT(CASE WHEN documento_generado THEN 1 END) as con_documento
FROM registros_residuos
GROUP BY estado;

-- Vista: Registros pendientes de documentar
CREATE OR REPLACE VIEW vista_pendientes_documentar AS
SELECT 
    r.id,
    r.numero_registro,
    r.fecha_registro,
    r.tipologia,
    r.peso_kg,
    r.transportista_id,
    r.estado
FROM registros_residuos r
WHERE r.documento_generado = FALSE
ORDER BY r.fecha_registro DESC;

-- Vista: Estadísticas por transportista
CREATE OR REPLACE VIEW vista_stats_transportistas AS
SELECT 
    t.id as transportista_id,
    t.nombre_empresa,
    COUNT(r.id) as total_servicios,
    SUM(r.peso_kg) as peso_total_kg,
    COUNT(CASE WHEN r.estado = 'ENTREGADO' THEN 1 END) as servicios_completados
FROM transportistas t
LEFT JOIN registros_residuos r ON r.transportista_id = t.id
WHERE t.activo = TRUE
GROUP BY t.id, t.nombre_empresa;

-- ============================================
-- PERMISOS (ajustar según usuario de aplicación)
-- ============================================

-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO residuos_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO residuos_app;

-- ============================================
-- DATOS DE PRUEBA (opcional, comentar en producción)
-- ============================================

-- Transportista de ejemplo
INSERT INTO transportistas (id, nombre_empresa, cif, telefono, email) VALUES
('T001', 'Transportes García SL', 'B12345678', '912345678', 'contacto@tgarcia.com')
ON CONFLICT (id) DO NOTHING;

-- Vehículo de ejemplo
INSERT INTO vehiculos (matricula, transportista_id, tipo, capacidad_kg, marca, modelo) VALUES
('1234ABC', 'T001', 'Camión', 15000.00, 'Mercedes', 'Actros')
ON CONFLICT (matricula) DO NOTHING;

-- Planta de tratamiento de ejemplo
INSERT INTO plantas_tratamiento (codigo, nombre, direccion, provincia, municipio) VALUES
('PT001', 'Planta de Reciclaje Centro', 'Calle Industrial 45', 'Madrid', 'Alcalá de Henares')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================

-- Verificar creación de tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Mensaje de finalización
DO $$
BEGIN
    RAISE NOTICE 'Base de datos inicializada correctamente';
    RAISE NOTICE 'Tablas creadas: registros_residuos, tipologias_residuos, transportistas, vehiculos, plantas_tratamiento, documentos_generados, historial_estados';
    RAISE NOTICE 'Triggers configurados para: updated_at, numero_registro, historial_estados';
END $$;
