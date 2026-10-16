-- ============================================================================
-- SCRIPT DE INICIALIZACIÓN SQL SERVER 2022+ (FASE 3 - SENSOR SERVICE & IOT)
-- Base de datos: SensorDB
-- ============================================================================

USE master;
GO

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'SensorDB')
BEGIN
    CREATE DATABASE SensorDB COLLATE Modern_Spanish_CI_AS;
END
GO

USE SensorDB;
GO

-- 1. TABLA: Sensores
IF OBJECT_ID('dbo.Lecturas', 'U') IS NOT NULL DROP TABLE dbo.Lecturas;
IF OBJECT_ID('dbo.Sensores', 'U') IS NOT NULL DROP TABLE dbo.Sensores;
GO

CREATE TABLE dbo.Sensores (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Codigo VARCHAR(50) NOT NULL UNIQUE,
    Nombre NVARCHAR(120) NOT NULL,
    TipoSensor NVARCHAR(50) NOT NULL CHECK (TipoSensor IN ('Temperatura', 'Humedad', 'Viento', 'Lluvia', 'NivelRio')),
    ComunidadId INT NOT NULL,
    ComunidadNombre NVARCHAR(100) NOT NULL,
    Ubicacion NVARCHAR(200) NOT NULL,
    Latitud DECIMAL(9,6) NULL,
    Longitud DECIMAL(9,6) NULL,
    UnidadMedida NVARCHAR(20) NOT NULL,
    ValorMinimo DECIMAL(10,2) NOT NULL,
    ValorMaximo DECIMAL(10,2) NOT NULL,
    ValorActual DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    NivelRiesgoActual NVARCHAR(20) NOT NULL DEFAULT 'Verde' CHECK (NivelRiesgoActual IN ('Verde', 'Amarillo', 'Naranja', 'Rojo')),
    MensajeActual NVARCHAR(300) NOT NULL DEFAULT 'Condición ambiental normal.',
    Estado BIT NOT NULL DEFAULT 1,
    ApiKey VARCHAR(100) NOT NULL DEFAULT NEWID(), -- Clave de autenticación para sensor físico / IoT
    UltimaLectura DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME(),
    FechaInstalacion DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

-- 2. TABLA: Lecturas (Telemetría de Sensores Físicos / Simulados)
CREATE TABLE dbo.Lecturas (
    Id BIGINT IDENTITY(1,1) PRIMARY KEY,
    SensorId INT NOT NULL,
    Valor DECIMAL(10,2) NOT NULL,
    UnidadMedida NVARCHAR(20) NOT NULL,
    Bateria INT NULL DEFAULT 100,
    IpOrigen VARCHAR(45) NULL,
    FechaHora DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Lecturas_Sensores FOREIGN KEY (SensorId) 
        REFERENCES dbo.Sensores (Id) ON DELETE CASCADE
);
GO

CREATE NONCLUSTERED INDEX IX_Lecturas_SensorId_FechaHora 
ON dbo.Lecturas (SensorId, FechaHora DESC) 
INCLUDE (Valor, UnidadMedida);
GO

-- Seed de Estaciones Meteorológicas oficiales para las Aldeas de Villa Canales
INSERT INTO dbo.Sensores 
(Codigo, Nombre, TipoSensor, ComunidadId, ComunidadNombre, Ubicacion, Latitud, Longitud, UnidadMedida, ValorMinimo, ValorMaximo, ValorActual, NivelRiesgoActual, MensajeActual, Estado, ApiKey)
VALUES
('SENS-TEMP-01', 'Sensor Temperatura - Valle Central', 'Temperatura', 4, 'El Tablón', 'Aldea El Tablón (Sector Agrícola Central)', 14.4820, -90.5340, '°C', 10.0, 35.0, 23.4, 'Verde', 'Temperatura óptima y condiciones estables.', 1, 'API-KEY-SENS-TEMP-01-2026'),
('SENS-HUM-01', 'Sensor Humedad Relativa - Cultivos', 'Humedad', 9, 'Santa Elena Barillas', 'Aldea Santa Elena Barillas (Plantaciones de Café)', 14.4350, -90.5180, '%', 40.0, 85.0, 68.2, 'Verde', 'Humedad relativa en margen seguro.', 1, 'API-KEY-SENS-HUM-01-2026'),
('SENS-WIND-01', 'Anemómetro - Cerro Las Minas', 'Viento', 5, 'Colmenas', 'Aldea Colmenas (Zona de Vientos Norte)', 14.4980, -90.4900, 'km/h', 0.0, 45.0, 18.5, 'Verde', 'Velocidad de viento moderada.', 1, 'API-KEY-SENS-WIND-01-2026'),
('SENS-RAIN-01', 'Pluviómetro - Cuenca Norte', 'Lluvia', 1, 'Boca del Monte', 'Aldea Boca del Monte (Ladera Urbana)', 14.5420, -90.5180, 'mm', 0.0, 35.0, 4.2, 'Verde', 'Precipitación pluvial baja.', 1, 'API-KEY-SENS-RAIN-01-2026'),
('SENS-RIVR-01', 'Sensor Hidrométrico - Río Villalobos', 'NivelRio', 13, 'El Obrajuelo', 'Aldea El Obrajuelo (Ribera Principal del Río)', 14.3710, -90.5510, 'm', 1.0, 4.5, 2.3, 'Verde', 'Caudal del afluente en nivel seguro.', 1, 'API-KEY-SENS-RIVR-01-2026'),
('SENS-TEMP-02', 'Sensor Térmico - Corredor Seco', 'Temperatura', 11, 'Los Pocitos', 'Aldea Los Pocitos (Sector Árido)', 14.3980, -90.5480, '°C', 12.0, 38.0, 29.1, 'Verde', 'Condiciones térmicas normales en corredor seco.', 1, 'API-KEY-SENS-TEMP-02-2026');
GO

-- Seed de lecturas iniciales para telemetría
INSERT INTO dbo.Lecturas (SensorId, Valor, UnidadMedida, Bateria, IpOrigen, FechaHora)
VALUES
(1, 23.4, '°C', 98, '192.168.1.101', DATEADD(MINUTE, -2, SYSUTCDATETIME())),
(2, 68.2, '%', 95, '192.168.1.102', DATEADD(MINUTE, -2, SYSUTCDATETIME())),
(3, 18.5, 'km/h', 92, '192.168.1.103', DATEADD(MINUTE, -2, SYSUTCDATETIME())),
(4, 4.2, 'mm', 89, '192.168.1.104', DATEADD(MINUTE, -2, SYSUTCDATETIME())),
(5, 2.3, 'm', 97, '192.168.1.105', DATEADD(MINUTE, -2, SYSUTCDATETIME())),
(6, 29.1, '°C', 94, '192.168.1.106', DATEADD(MINUTE, -2, SYSUTCDATETIME()));
GO
