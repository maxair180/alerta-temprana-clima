-- ============================================================================
-- PROYECTO DESARROLLO WEB 2026
-- Sistema Web de Monitoreo y Alerta Temprana para Riesgos Climáticos
-- Base de Datos: SQL Server 2022+ (ClimaDB)
-- Rol: Integrante 3 (Base de Datos & DevOps)
-- ============================================================================

USE master;
GO

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'ClimaDB')
BEGIN
    CREATE DATABASE ClimaDB COLLATE Modern_Spanish_CI_AS;
END
GO

USE ClimaDB;
GO

-- ============================================================================
-- 1. ELIMINACIÓN DE TABLAS SI YA EXISTEN (PARA DESPLIEGUE LIMPIO)
-- ============================================================================
IF OBJECT_ID('dbo.BitacoraAcciones', 'U') IS NOT NULL DROP TABLE dbo.BitacoraAcciones;
IF OBJECT_ID('dbo.HistorialEventos', 'U') IS NOT NULL DROP TABLE dbo.HistorialEventos;
IF OBJECT_ID('dbo.Alertas', 'U') IS NOT NULL DROP TABLE dbo.Alertas;
IF OBJECT_ID('dbo.Lecturas', 'U') IS NOT NULL DROP TABLE dbo.Lecturas;
IF OBJECT_ID('dbo.Sensores', 'U') IS NOT NULL DROP TABLE dbo.Sensores;
IF OBJECT_ID('dbo.Usuarios', 'U') IS NOT NULL DROP TABLE dbo.Usuarios;
GO

-- ============================================================================
-- 2. CREACIÓN DE TABLAS 100% RELACIONADAS (6 ENTIDADES)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLA 1: USUARIOS (Seguridad, Autenticación y Auditoría)
-- ----------------------------------------------------------------------------
CREATE TABLE dbo.Usuarios (
    Id INT IDENTITY(1,1) NOT NULL,
    Nombre NVARCHAR(100) NOT NULL,
    Email NVARCHAR(100) NOT NULL,
    PasswordHash NVARCHAR(256) NOT NULL,
    Rol NVARCHAR(30) NOT NULL CONSTRAINT DF_Usuarios_Rol DEFAULT 'Operador', -- Administrador, Operador, Supervisor
    Activo BIT NOT NULL CONSTRAINT DF_Usuarios_Activo DEFAULT 1,
    FechaCreacion DATETIME2(7) NOT NULL CONSTRAINT DF_Usuarios_FechaCreacion DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Usuarios PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT UQ_Usuarios_Email UNIQUE (Email),
    CONSTRAINT CK_Usuarios_Rol CHECK (Rol IN ('Administrador', 'Operador', 'Supervisor'))
);
GO

-- ----------------------------------------------------------------------------
-- TABLA 2: SENSORES (Dispositivos de Monitoreo en la Comunidad)
-- Relación N:1 con Usuarios (Operador/Admin que instaló o gestiona el sensor)
-- ----------------------------------------------------------------------------
CREATE TABLE dbo.Sensores (
    Id INT IDENTITY(1,1) NOT NULL,
    UsuarioId INT NULL, -- Operador responsable que administra el sensor
    Nombre NVARCHAR(100) NOT NULL,
    CodigoIdentificador NVARCHAR(50) NOT NULL,
    Ubicacion NVARCHAR(150) NOT NULL,
    Latitud DECIMAL(10,7) NULL,  -- Para el mapa interactivo de la comunidad
    Longitud DECIMAL(10,7) NULL, -- Para el mapa interactivo de la comunidad
    TipoSensor NVARCHAR(30) NOT NULL, -- Temperatura, Humedad, Viento, Lluvia, NivelRio
    UnidadMedida NVARCHAR(20) NOT NULL, -- °C, %, km/h, mm, m
    ValorMinimo DECIMAL(8,2) NOT NULL,
    ValorMaximo DECIMAL(8,2) NOT NULL,
    Estado BIT NOT NULL CONSTRAINT DF_Sensores_Estado DEFAULT 1, -- 1: Activo, 0: Inactivo
    FechaInstalacion DATETIME2(7) NOT NULL CONSTRAINT DF_Sensores_FechaInstalacion DEFAULT SYSUTCDATETIME(),
    UltimaActualizacion DATETIME2(7) NOT NULL CONSTRAINT DF_Sensores_UltimaActualizacion DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Sensores PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT UQ_Sensores_Codigo UNIQUE (CodigoIdentificador),
    CONSTRAINT CK_Sensores_TipoSensor CHECK (TipoSensor IN ('Temperatura', 'Humedad', 'Viento', 'Lluvia', 'NivelRio')),
    CONSTRAINT FK_Sensores_Usuarios FOREIGN KEY (UsuarioId) 
        REFERENCES dbo.Usuarios (Id) ON DELETE SET NULL
);
GO

-- ----------------------------------------------------------------------------
-- TABLA 3: LECTURAS (Datos en Tiempo Real Generados por Sensores / Simulador)
-- Relación N:1 con Sensores
-- ----------------------------------------------------------------------------
CREATE TABLE dbo.Lecturas (
    Id BIGINT IDENTITY(1,1) NOT NULL,
    SensorId INT NOT NULL,
    Valor DECIMAL(10,2) NOT NULL,
    FechaHora DATETIME2(7) NOT NULL CONSTRAINT DF_Lecturas_FechaHora DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Lecturas PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_Lecturas_Sensores FOREIGN KEY (SensorId) 
        REFERENCES dbo.Sensores (Id) ON DELETE CASCADE
);
GO

-- ----------------------------------------------------------------------------
-- TABLA 4: ALERTAS (Detección de Riesgos y Gestión de Emergencias)
-- Relación N:1 con Sensores (Sensor que originó el riesgo)
-- Relación N:1 con Usuarios (Operador que atendió/gestionó la alerta)
-- ----------------------------------------------------------------------------
CREATE TABLE dbo.Alertas (
    Id INT IDENTITY(1,1) NOT NULL,
    SensorId INT NOT NULL,
    UsuarioAtendioId INT NULL, -- Operador que confirmó o atendió la alerta
    NivelRiesgo NVARCHAR(20) NOT NULL, -- Verde, Amarillo, Naranja, Rojo
    Mensaje NVARCHAR(255) NOT NULL,
    ValorRegistrado DECIMAL(10,2) NOT NULL CONSTRAINT DF_Alertas_ValorRegistrado DEFAULT 0.00,
    Atendida BIT NOT NULL CONSTRAINT DF_Alertas_Atendida DEFAULT 0,
    FechaHora DATETIME2(7) NOT NULL CONSTRAINT DF_Alertas_FechaHora DEFAULT SYSUTCDATETIME(),
    FechaAtencion DATETIME2(7) NULL,
    CONSTRAINT PK_Alertas PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_Alertas_Sensores FOREIGN KEY (SensorId) 
        REFERENCES dbo.Sensores (Id) ON DELETE CASCADE,
    CONSTRAINT FK_Alertas_Usuarios FOREIGN KEY (UsuarioAtendioId) 
        REFERENCES dbo.Usuarios (Id) ON DELETE SET NULL,
    CONSTRAINT CK_Alertas_NivelRiesgo CHECK (NivelRiesgo IN ('Verde', 'Amarillo', 'Naranja', 'Rojo'))
);
GO

-- ----------------------------------------------------------------------------
-- TABLA 5: HISTORIAL DE EVENTOS (Registro y Clasificación de Fenómenos)
-- Relación N:1 con Alertas
-- ----------------------------------------------------------------------------
CREATE TABLE dbo.HistorialEventos (
    Id INT IDENTITY(1,1) NOT NULL,
    AlertaId INT NOT NULL,
    TipoFenomeno NVARCHAR(50) NOT NULL, -- Inundacion, Sequia, Tormenta, Helada, Incendio forestal
    Descripcion NVARCHAR(500) NULL,
    NivelGravedad NVARCHAR(20) NULL,
    FechaHora DATETIME2(7) NOT NULL CONSTRAINT DF_HistorialEventos_FechaHora DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_HistorialEventos PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_HistorialEventos_Alertas FOREIGN KEY (AlertaId) 
        REFERENCES dbo.Alertas (Id) ON DELETE CASCADE,
    CONSTRAINT CK_HistorialEventos_Fenomeno CHECK (TipoFenomeno IN ('Inundacion', 'Sequia', 'Tormenta', 'Helada', 'Incendio forestal', 'IncendioForestal'))
);
GO

-- ----------------------------------------------------------------------------
-- TABLA 6: BITÁCORA DE ACCIONES (Auditoría Integral del Sistema)
-- Relación N:1 con Usuarios
-- ----------------------------------------------------------------------------
CREATE TABLE dbo.BitacoraAcciones (
    Id BIGINT IDENTITY(1,1) NOT NULL,
    UsuarioId INT NULL, -- NULL si es acción autónoma del sistema/simulador
    AccionRealizada NVARCHAR(100) NOT NULL,
    Modulo NVARCHAR(50) NOT NULL,
    Detalles NVARCHAR(MAX) NULL,
    DireccionIP NVARCHAR(45) NULL,
    FechaHora DATETIME2(7) NOT NULL CONSTRAINT DF_BitacoraAcciones_FechaHora DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_BitacoraAcciones PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_BitacoraAcciones_Usuarios FOREIGN KEY (UsuarioId) 
        REFERENCES dbo.Usuarios (Id) ON DELETE SET NULL
);
GO

-- ============================================================================
-- 3. ÍNDICES DE RENDIMIENTO (OPTIMIZACIÓN PARA CONSULTAS EN TIEMPO REAL)
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Lecturas_SensorId_FechaHora' AND object_id = OBJECT_ID('dbo.Lecturas'))
    CREATE NONCLUSTERED INDEX IX_Lecturas_SensorId_FechaHora ON dbo.Lecturas (SensorId, FechaHora DESC) INCLUDE (Valor);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Alertas_FechaHora' AND object_id = OBJECT_ID('dbo.Alertas'))
    CREATE NONCLUSTERED INDEX IX_Alertas_FechaHora ON dbo.Alertas (FechaHora DESC) INCLUDE (SensorId, NivelRiesgo, Atendida);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_HistorialEventos_FechaHora' AND object_id = OBJECT_ID('dbo.HistorialEventos'))
    CREATE NONCLUSTERED INDEX IX_HistorialEventos_FechaHora ON dbo.HistorialEventos (FechaHora DESC);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_BitacoraAcciones_FechaHora' AND object_id = OBJECT_ID('dbo.BitacoraAcciones'))
    CREATE NONCLUSTERED INDEX IX_BitacoraAcciones_FechaHora ON dbo.BitacoraAcciones (FechaHora DESC);
GO

-- ============================================================================
-- 4. PROCEDIMIENTO: REINICIAR MONITOREO (Requisito Administrativo)
-- ============================================================================
IF OBJECT_ID('dbo.sp_ReiniciarMonitoreo', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_ReiniciarMonitoreo;
GO
CREATE PROCEDURE dbo.sp_ReiniciarMonitoreo
    @UsuarioId INT = NULL,
    @IpOrigen NVARCHAR(45) = '127.0.0.1'
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        DELETE FROM dbo.HistorialEventos;
        DELETE FROM dbo.Alertas;
        DELETE FROM dbo.Lecturas;
        UPDATE dbo.Sensores SET Estado = 1, UltimaActualizacion = SYSUTCDATETIME();

        INSERT INTO dbo.BitacoraAcciones (UsuarioId, AccionRealizada, Modulo, Detalles, DireccionIP)
        VALUES (@UsuarioId, N'Reiniciar Sistema de Monitoreo', N'Sistema', N'Reinicio de alertas, lecturas y reactivación de sensores.', @IpOrigen);

        COMMIT TRANSACTION;
        SELECT 1 AS Exito, N'Sistema reiniciado correctamente.' AS Mensaje;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- ============================================================================
-- 5. DATOS SEMILLA (USUARIOS Y SENSORES INICIALES VINCULADOS)
-- ============================================================================
INSERT INTO dbo.Usuarios (Nombre, Email, PasswordHash, Rol, Activo)
VALUES 
(N'Administrador', N'admin@climasafe.org', N'A665A45920422F9D417E4867EFDC4FB8A04A1F3FFF1FA07E998E86F7F7A27AE3', N'Administrador', 1),
(N'Operador Rural', N'operador@climasafe.org', N'7110EDA4D09E062AA5E4A390B0A572AC0D2C0220AC529241BE07FAAA4AA33126', N'Operador', 1);

-- 5 Sensores vinculados al Administrador (UsuarioId = 1)
INSERT INTO dbo.Sensores (UsuarioId, Nombre, CodigoIdentificador, Ubicacion, Latitud, Longitud, TipoSensor, UnidadMedida, ValorMinimo, ValorMaximo, Estado)
VALUES
(1, N'Sensor Temperatura Ambiente - Valle', N'SENS-TEMP-01', N'Comunidad Rural Norte', 14.634915, -90.506882, N'Temperatura', N'°C', 10.00, 35.00, 1),
(1, N'Sensor Humedad Relativa - Parcela',   N'SENS-HUM-01',  N'Sector Agrícola Central', 14.632100, -90.509400, N'Humedad', N'%', 40.00, 85.00, 1),
(1, N'Anemómetro Velocidad del Viento',     N'SENS-VIEN-01', N'Colina El Mirador',      14.640200, -90.501100, N'Viento', N'km/h', 0.00, 45.00, 1),
(1, N'Pluviómetro Nivel de Lluvia',        N'SENS-LLUV-01', N'Estación Cuenca Río',    14.628900, -90.512300, N'Lluvia', N'mm', 0.00, 35.00, 1),
(1, N'Sensor Nivel de Río / Reservorio',   N'SENS-RIO-01',  N'Represa Principal',      14.625500, -90.518800, N'NivelRio', N'm', 1.00, 4.50, 1);

-- Bitácora de inicialización
INSERT INTO dbo.BitacoraAcciones (UsuarioId, AccionRealizada, Modulo, Detalles, DireccionIP)
VALUES (1, N'Instalación del Esquema Relacional', N'Sistema', N'Esquema unificado con 6 entidades y relaciones completas.', N'127.0.0.1');
GO

PRINT N'===========================================================';
PRINT N' ClimaDB: 6 Tablas 100% Relacionadas Creadas con Éxito! ';
PRINT N'===========================================================';