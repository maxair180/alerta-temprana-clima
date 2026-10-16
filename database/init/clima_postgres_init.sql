-- ============================================================================
-- SCRIPT DE INICIALIZACIÓN POSTGRESQL (FASE 3 - MICROSERVICIOS)
-- Bases de datos: auth_db, community_db, alert_db
-- ============================================================================

-- ============================================================================
-- 1. BASE DE DATOS Y ESQUEMA: AUTH SERVICE
-- ============================================================================
CREATE DATABASE auth_db;
\c auth_db;

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(50) NOT NULL DEFAULT 'Operador' CHECK (rol IN ('Administrador', 'Operador', 'Consulta')),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Preparación para OAuth 2.0 / OIDC (Fase 4)
    oauth_provider VARCHAR(50) NULL,
    oauth_id VARCHAR(150) NULL,
    avatar_url VARCHAR(255) NULL
);

CREATE TABLE IF NOT EXISTS roles_permisos (
    id SERIAL PRIMARY KEY,
    rol VARCHAR(50) NOT NULL,
    permiso VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE
);

-- Seed de usuarios iniciales (contraseñas con hash bcrypt o compatibles)
-- Admin2026! -> $2a$12$e0M2/B2/uK7nIbmk1L3z6.C.7G1E5yZq0g4wMps3H6L.iY2K9S0mC (o bcrypt validado en runtime)
INSERT INTO usuarios (nombre, email, password_hash, rol, activo) VALUES
('Carlos Fernando Cachin (Admin)', 'carlos@clima.gt', '$2a$10$wK1m4S4f3S3cur3P4ssw0rdH4shAdm1n2026.V1ll4C4n4l3sGTM001', 'Administrador', true),
('Carlos Fernando Cachin (Admin)', 'ccachinm@miumg.edu.gt', '$2a$10$wK1m4S4f3S3cur3P4ssw0rdH4shAdm1n2026.V1ll4C4n4l3sGTM001', 'Administrador', true),
('Christian Garcia (Admin)', 'christian@clima.gt', '$2a$10$wK1m4S4f3S3cur3P4ssw0rdH4shAdm1n2026.V1ll4C4n4l3sGTM001', 'Administrador', true),
('Christian García (Operador)', 'cgarciaf11@miumg.edu.gt', '$2a$10$wK1m4S4f3S3cur3P4ssw0rdH4shAdm1n2026.V1ll4C4n4l3sGTM001', 'Operador', true),
('Melannie Lorenzana (Admin)', 'melannie@clima.gt', '$2a$10$wK1m4S4f3S3cur3P4ssw0rdH4shAdm1n2026.V1ll4C4n4l3sGTM001', 'Administrador', true),
('Melannie Lorenzana (Admin)', 'mlorenzanaa@miumg.edu.gt', '$2a$10$wK1m4S4f3S3cur3P4ssw0rdH4shAdm1n2026.V1ll4C4n4l3sGTM001', 'Administrador', true),
('Operador Monitoreo', 'operador@miumg.edu.gt', '$2a$10$wK1m4S4f3S3cur3P4ssw0rdH4shAdm1n2026.V1ll4C4n4l3sGTM001', 'Operador', true),
('Admin ClimaSafe', 'admin@clima.gt', '$2a$10$wK1m4S4f3S3cur3P4ssw0rdH4shAdm1n2026.V1ll4C4n4l3sGTM001', 'Administrador', true),
('Admin Inicial', 'admin@clima.com', '$2a$10$wK1m4S4f3S3cur3P4ssw0rdH4shAdm1n2026.V1ll4C4n4l3sGTM001', 'Administrador', true)
ON CONFLICT (email) DO NOTHING;

INSERT INTO roles_permisos (rol, permiso) VALUES
('Administrador', 'REPORTES_GENERAR'),
('Administrador', 'REPORTES_DESCARGAR'),
('Administrador', 'SENSORES_ADMIN'),
('Administrador', 'ALERTAS_ATENDER'),
('Administrador', 'SISTEMA_REINICIAR'),
('Administrador', 'AUDITORIA_VER'),
('Operador', 'ALERTAS_ATENDER'),
('Operador', 'SENSORES_VER'),
('Operador', 'REPORTES_VER'),
('Consulta', 'DASHBOARD_VER')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 2. BASE DE DATOS Y ESQUEMA: COMMUNITY SERVICE
-- ============================================================================
CREATE DATABASE community_db;
\c community_db;

CREATE TABLE IF NOT EXISTS comunidades (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL UNIQUE,
    municipio VARCHAR(100) NOT NULL DEFAULT 'Villa Canales',
    departamento VARCHAR(100) NOT NULL DEFAULT 'Guatemala',
    pais VARCHAR(100) NOT NULL DEFAULT 'Guatemala',
    coordenadas VARCHAR(60) NOT NULL,
    latitud NUMERIC(9,6) NOT NULL,
    longitud NUMERIC(9,6) NOT NULL,
    descripcion TEXT,
    zona VARCHAR(50) NOT NULL,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed de las 13 Aldeas Oficiales del Municipio de Villa Canales
INSERT INTO comunidades (nombre, municipio, departamento, pais, coordenadas, latitud, longitud, descripcion, zona, estado) VALUES
('Boca del Monte', 'Villa Canales', 'Guatemala', 'Guatemala', '14.5420,-90.5180', 14.542000, -90.518000, 'Zona urbana-norte de alta densidad poblacional y laderas de riesgo.', 'Norte', true),
('El Porvenir', 'Villa Canales', 'Guatemala', 'Guatemala', '14.5290,-90.5140', 14.529000, -90.514000, 'Área semi-urbana con cuencas pluviales hacia el lago.', 'Norte', true),
('Chichimecas', 'Villa Canales', 'Guatemala', 'Guatemala', '14.5120,-90.5050', 14.512000, -90.505000, 'Sector rural montañoso con vulnerabilidad a deslizamientos.', 'Norte', true),
('El Tablón', 'Villa Canales', 'Guatemala', 'Guatemala', '14.4820,-90.5340', 14.482000, -90.534000, 'Valle agrícola central de alta producción hortícola.', 'Norte', true),
('Colmenas', 'Villa Canales', 'Guatemala', 'Guatemala', '14.4980,-90.4900', 14.498000, -90.490000, 'Comunidad montañosa con microclima templado y vientos fuertes.', 'Norte', true),
('El Zapote', 'Villa Canales', 'Guatemala', 'Guatemala', '14.4600,-90.5280', 14.460000, -90.528000, 'Zona de colinas y quebradas con afluentes pluviales.', 'Centro', true),
('El Durazno', 'Villa Canales', 'Guatemala', 'Guatemala', '14.4500,-90.5120', 14.450000, -90.512000, 'Sector rural boscoso propicio a bajas térmicas y heladas.', 'Centro', true),
('Santa Rosita', 'Villa Canales', 'Guatemala', 'Guatemala', '14.4420,-90.5010', 14.442000, -90.501000, 'Área intermedia de plantaciones agrícolas y cuenca media.', 'Centro', true),
('Santa Elena Barillas', 'Villa Canales', 'Guatemala', 'Guatemala', '14.4350,-90.5180', 14.435000, -90.518000, 'Faldas del Volcán de Pacaya, cafetales y mirador sur.', 'Centro', true),
('Los Dolores', 'Villa Canales', 'Guatemala', 'Guatemala', '14.4150,-90.5320', 14.415000, -90.532000, 'Valle cálido y seco susceptible a incendios y sequías.', 'Sur', true),
('Los Pocitos', 'Villa Canales', 'Guatemala', 'Guatemala', '14.3980,-90.5480', 14.398000, -90.548000, 'Corredor seco y de altas temperaturas en época de estiaje.', 'Sur', true),
('El Jocotillo', 'Villa Canales', 'Guatemala', 'Guatemala', '14.3820,-90.5620', 14.382000, -90.562000, 'Comunidad sureña fronteriza con actividad ganadera y piñera.', 'Sur', true),
('El Obrajuelo', 'Villa Canales', 'Guatemala', 'Guatemala', '14.3710,-90.5510', 14.371000, -90.551000, 'Ribera de afluentes y reservas hídricas del río Villalobos.', 'Sur', true)
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================================
-- 3. BASE DE DATOS Y ESQUEMA: ALERT SERVICE
-- ============================================================================
CREATE DATABASE alert_db;
\c alert_db;

CREATE TABLE IF NOT EXISTS reglas_alerta (
    id SERIAL PRIMARY KEY,
    tipo_sensor VARCHAR(50) NOT NULL,
    nivel_peligro VARCHAR(20) NOT NULL CHECK (nivel_peligro IN ('Verde', 'Amarillo', 'Naranja', 'Rojo')),
    valor_minimo NUMERIC(10,2) NOT NULL,
    valor_maximo NUMERIC(10,2) NOT NULL,
    tipo_fenomeno VARCHAR(50) NOT NULL,
    mensaje VARCHAR(500) NOT NULL,
    estado BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS alertas (
    id SERIAL PRIMARY KEY,
    comunidad_id INT NOT NULL,
    sensor_id INT NOT NULL,
    sensor_nombre VARCHAR(120) NOT NULL,
    tipo_sensor VARCHAR(50) NOT NULL,
    nivel_riesgo VARCHAR(20) NOT NULL CHECK (nivel_riesgo IN ('Verde', 'Amarillo', 'Naranja', 'Rojo')),
    mensaje VARCHAR(500) NOT NULL,
    valor_registrado NUMERIC(10,2) NOT NULL,
    umbral NUMERIC(10,2) NOT NULL,
    fenomeno VARCHAR(50) NOT NULL,
    atendida BOOLEAN NOT NULL DEFAULT FALSE,
    usuario_atendio_id INT NULL,
    fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_atencion TIMESTAMP WITH TIME ZONE NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'Activa'
);

CREATE TABLE IF NOT EXISTS historial_eventos (
    id SERIAL PRIMARY KEY,
    alerta_id INT NULL,
    comunidad_id INT NOT NULL,
    sensor_id INT NOT NULL,
    tipo_fenomeno VARCHAR(50) NOT NULL CHECK (tipo_fenomeno IN ('Inundacion', 'Sequia', 'Tormenta', 'Helada', 'Incendio forestal')),
    descripcion VARCHAR(500) NOT NULL,
    nivel_gravedad VARCHAR(20) NOT NULL CHECK (nivel_gravedad IN ('Verde', 'Amarillo', 'Naranja', 'Rojo')),
    valor NUMERIC(10,2) NOT NULL,
    fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(30) NOT NULL DEFAULT 'Activo'
);

-- Seed de Reglas de Alerta Oficiales (Temperatura, Humedad, Viento, Lluvia, NivelRio)
INSERT INTO reglas_alerta (tipo_sensor, nivel_peligro, valor_minimo, valor_maximo, tipo_fenomeno, mensaje, estado) VALUES
-- Temperatura
('Temperatura', 'Rojo', 40.0, 100.0, 'Incendio forestal', '¡Calor extremo peligroso! Alto riesgo de propagación de incendio forestal.', true),
('Temperatura', 'Rojo', -50.0, 0.0, 'Helada', '¡Temperatura bajo cero! Riesgo crítico de helada agrícola en cultivos.', true),
('Temperatura', 'Naranja', 35.1, 39.9, 'Incendio forestal', 'Temperatura elevada en umbral de alerta.', true),
('Temperatura', 'Amarillo', 0.1, 5.0, 'Helada', 'Descenso térmico preventivo en zonas montañosas.', true),
('Temperatura', 'Verde', 5.1, 35.0, 'Normal', 'Temperatura en rango seguro y confortable.', true),

-- Humedad
('Humedad', 'Rojo', 0.0, 15.0, 'Sequia', '¡Estrés hídrico severo y sequía crítica en el suelo!', true),
('Humedad', 'Amarillo', 15.1, 30.0, 'Sequia', 'Humedad relativa baja, riesgo de sequía.', true),
('Humedad', 'Verde', 30.1, 90.0, 'Normal', 'Humedad ambiental óptima para la vegetación.', true),

-- Viento
('Viento', 'Rojo', 70.0, 300.0, 'Tormenta', '¡Vientos destructivos tipo vendaval o tormenta tropical!', true),
('Viento', 'Naranja', 50.0, 69.9, 'Tormenta', 'Vientos fuertes sostenidos con riesgo de desprendimientos.', true),
('Viento', 'Amarillo', 30.0, 49.9, 'Tormenta', 'Ráfagas moderadas bajo monitoreo preventivo.', true),
('Viento', 'Verde', 0.0, 29.9, 'Normal', 'Brisa ligera a moderada en condiciones seguras.', true),

-- Lluvia
('Lluvia', 'Rojo', 80.0, 500.0, 'Inundacion', '¡Precipitación torrencial extrema! Alerta de desbordamiento e inundación.', true),
('Lluvia', 'Naranja', 50.0, 79.9, 'Tormenta', 'Lluvia intensa persistente en cuenca fluvial.', true),
('Lluvia', 'Amarillo', 25.0, 49.9, 'Tormenta', 'Lluvia moderada con acumulación en zonas bajas.', true),
('Lluvia', 'Verde', 0.0, 24.9, 'Normal', 'Precipitación normal o cielo despejado.', true),

-- Nivel de Río
('NivelRio', 'Rojo', 5.0, 30.0, 'Inundacion', '¡Desbordamiento inminente de cauce o reservorio hídrico!', true),
('NivelRio', 'Naranja', 4.0, 4.99, 'Inundacion', 'Nivel de alerta naranja por aumento del caudal.', true),
('NivelRio', 'Amarillo', 0.0, 0.8, 'Sequia', 'Caudal crítico por debajo de reserva ecológica mínima.', true),
('NivelRio', 'Verde', 0.81, 3.99, 'Normal', 'Caudal dentro de los parámetros hidrológicos normales.', true)
ON CONFLICT DO NOTHING;
