-- ============================================================================
-- PROYECTO DESARROLLO WEB 2026
-- Sistema Web de Monitoreo y Alerta Temprana para Riesgos Climáticos
-- Base de Datos: SQL Server 2022+ (ClimaDB)
-- Rol: Integrante 3 (Base de Datos & DevOps)
-- Seguridad: Inmunidad a Inyección SQL mediante Consultas Parametrizadas y Paginación Optimizada
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
-- 1. ELIMINACIÓN DE TABLAS SI YA EXISTEN (ORDEN REFERENCIAL PARA DESPLIEGUE LIMPIO)
-- ============================================================================
IF OBJECT_ID('dbo.BitacoraAcciones', 'U') IS NOT NULL DROP TABLE dbo.BitacoraAcciones;
IF OBJECT_ID('dbo.HistorialEventos', 'U') IS NOT NULL DROP TABLE dbo.HistorialEventos;
IF OBJECT_ID('dbo.Alertas', 'U') IS NOT NULL DROP TABLE dbo.Alertas;
IF OBJECT_ID('dbo.Lecturas', 'U') IS NOT NULL DROP TABLE dbo.Lecturas;
IF OBJECT_ID('dbo.Sensores', 'U') IS NOT NULL DROP TABLE dbo.Sensores;
IF OBJECT_ID('dbo.Usuarios', 'U') IS NOT NULL DROP TABLE dbo.Usuarios;
GO

-- ============================================================================
-- 2. CREACIÓN DE LAS 6 TABLAS (100% RELACIONADAS CON CLAVES FORÁNEAS)
-- ============================================================================

-- 2.1 Tabla: Usuarios
CREATE TABLE dbo.Usuarios (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(100) NOT NULL,
    Email NVARCHAR(150) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    Rol NVARCHAR(50) NOT NULL DEFAULT 'Operador' CHECK (Rol IN ('Administrador', 'Operador')),
    Activo BIT NOT NULL DEFAULT 1,
    FechaCreacion DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

-- 2.2 Tabla: Sensores
CREATE TABLE dbo.Sensores (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UsuarioId INT NULL,
    Nombre NVARCHAR(100) NOT NULL,
    CodigoIdentificador NVARCHAR(50) NOT NULL UNIQUE,
    Ubicacion NVARCHAR(200) NOT NULL,
    Latitud DECIMAL(9,6) NULL,
    Longitud DECIMAL(9,6) NULL,
    TipoSensor NVARCHAR(50) NOT NULL CHECK (TipoSensor IN ('Temperatura', 'Humedad', 'Viento', 'Lluvia', 'NivelRio')),
    UnidadMedida NVARCHAR(20) NOT NULL,
    ValorMinimo DECIMAL(10,2) NOT NULL,
    ValorMaximo DECIMAL(10,2) NOT NULL,
    Estado BIT NOT NULL DEFAULT 1,
    FechaInstalacion DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME(),
    UltimaActualizacion DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Sensores_Usuarios FOREIGN KEY (UsuarioId) 
        REFERENCES dbo.Usuarios (Id) ON DELETE SET NULL
);
GO

-- 2.3 Tabla: Lecturas
CREATE TABLE dbo.Lecturas (
    Id BIGINT IDENTITY(1,1) PRIMARY KEY,
    SensorId INT NOT NULL,
    Valor DECIMAL(10,2) NOT NULL,
    FechaHora DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Lecturas_Sensores FOREIGN KEY (SensorId) 
        REFERENCES dbo.Sensores (Id) ON DELETE CASCADE
);
GO

-- 2.4 Tabla: Alertas
CREATE TABLE dbo.Alertas (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    SensorId INT NOT NULL,
    UsuarioAtendioId INT NULL,
    NivelRiesgo NVARCHAR(20) NOT NULL CHECK (NivelRiesgo IN ('Verde', 'Amarillo', 'Naranja', 'Rojo')),
    Mensaje NVARCHAR(500) NOT NULL,
    ValorRegistrado DECIMAL(10,2) NOT NULL,
    Atendida BIT NOT NULL DEFAULT 0,
    FechaHora DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME(),
    FechaAtencion DATETIME2(7) NULL,
    CONSTRAINT FK_Alertas_Sensores FOREIGN KEY (SensorId) 
        REFERENCES dbo.Sensores (Id) ON DELETE CASCADE,
    CONSTRAINT FK_Alertas_Usuarios FOREIGN KEY (UsuarioAtendioId) 
        REFERENCES dbo.Usuarios (Id) ON DELETE SET NULL
);
GO

-- 2.5 Tabla: HistorialEventos
CREATE TABLE dbo.HistorialEventos (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    AlertaId INT NOT NULL,
    TipoFenomeno NVARCHAR(50) NOT NULL CHECK (TipoFenomeno IN ('Inundacion', 'Sequia', 'Tormenta', 'Helada', 'Incendio forestal')),
    Descripcion NVARCHAR(500) NOT NULL,
    NivelGravedad NVARCHAR(20) NOT NULL CHECK (NivelGravedad IN ('Verde', 'Amarillo', 'Naranja', 'Rojo')),
    FechaHora DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_HistorialEventos_Alertas FOREIGN KEY (AlertaId) 
        REFERENCES dbo.Alertas (Id) ON DELETE CASCADE
);
GO

-- 2.6 Tabla: BitacoraAcciones
CREATE TABLE dbo.BitacoraAcciones (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UsuarioId INT NULL,
    AccionRealizada NVARCHAR(200) NOT NULL,
    Modulo NVARCHAR(100) NOT NULL,
    Detalles NVARCHAR(1000) NULL,
    DireccionIP NVARCHAR(45) NULL,
    FechaHora DATETIME2(7) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_BitacoraAcciones_Usuarios FOREIGN KEY (UsuarioId) 
        REFERENCES dbo.Usuarios (Id) ON DELETE SET NULL
);
GO

-- ============================================================================
-- 3. ÍNDICES DE ALTO RENDIMIENTO (OPTIMIZADOS PARA PAGINACIÓN Y TIEMPO REAL)
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Lecturas_SensorId_FechaHora' AND object_id = OBJECT_ID('dbo.Lecturas'))
    CREATE NONCLUSTERED INDEX IX_Lecturas_SensorId_FechaHora ON dbo.Lecturas (SensorId, FechaHora DESC) INCLUDE (Valor);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Alertas_FechaHora' AND object_id = OBJECT_ID('dbo.Alertas'))
    CREATE NONCLUSTERED INDEX IX_Alertas_FechaHora ON dbo.Alertas (FechaHora DESC) INCLUDE (SensorId, NivelRiesgo, Atendida);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_HistorialEventos_FechaHora' AND object_id = OBJECT_ID('dbo.HistorialEventos'))
    CREATE NONCLUSTERED INDEX IX_HistorialEventos_FechaHora ON dbo.HistorialEventos (FechaHora DESC) INCLUDE (TipoFenomeno, NivelGravedad);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_BitacoraAcciones_FechaHora' AND object_id = OBJECT_ID('dbo.BitacoraAcciones'))
    CREATE NONCLUSTERED INDEX IX_BitacoraAcciones_FechaHora ON dbo.BitacoraAcciones (FechaHora DESC) INCLUDE (Modulo, UsuarioId);
GO

-- ============================================================================
-- 4. PROCEDIMIENTOS ALMACENADOS PARAMETRIZADOS (INMUNES A SQL INJECTION)
-- ============================================================================

-- 4.1 Procedimiento: Reiniciar Monitoreo
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

-- 4.2 Procedimiento: Obtener Historial Paginado (Offset-Fetch Seguro)
IF OBJECT_ID('dbo.sp_ObtenerHistorialPaginado', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_ObtenerHistorialPaginado;
GO
CREATE PROCEDURE dbo.sp_ObtenerHistorialPaginado
    @Pagina INT = 1,
    @TamanoPagina INT = 10,
    @TipoFenomeno NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @Offset INT = (@Pagina - 1) * @TamanoPagina;

    SELECT 
        h.Id,
        h.AlertaId,
        s.Nombre AS SensorNombre,
        s.Ubicacion AS Comunidad,
        h.TipoFenomeno,
        h.Descripcion,
        h.NivelGravedad,
        h.FechaHora
    FROM dbo.HistorialEventos h
    INNER JOIN dbo.Alertas a ON h.AlertaId = a.Id
    INNER JOIN dbo.Sensores s ON a.SensorId = s.Id
    WHERE (@TipoFenomeno IS NULL OR h.TipoFenomeno = @TipoFenomeno)
    ORDER BY h.FechaHora DESC
    OFFSET @Offset ROWS
    FETCH NEXT @TamanoPagina ROWS ONLY;
END;
GO

-- 4.3 Procedimiento: Obtener Bitácora Paginada (Offset-Fetch Seguro)
IF OBJECT_ID('dbo.sp_ObtenerBitacoraPaginada', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_ObtenerBitacoraPaginada;
GO
CREATE PROCEDURE dbo.sp_ObtenerBitacoraPaginada
    @Pagina INT = 1,
    @TamanoPagina INT = 10,
    @Modulo NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Offset INT = (@Pagina - 1) * @TamanoPagina;

    SELECT 
        b.Id,
        ISNULL(u.Nombre, N'Sistema Automático') AS UsuarioNombre,
        b.AccionRealizada,
        b.Modulo,
        b.Detalles,
        b.DireccionIP,
        b.FechaHora
    FROM dbo.BitacoraAcciones b
    LEFT JOIN dbo.Usuarios u ON b.UsuarioId = u.Id
    WHERE (@Modulo IS NULL OR b.Modulo = @Modulo)
    ORDER BY b.FechaHora DESC
    OFFSET @Offset ROWS
    FETCH NEXT @TamanoPagina ROWS ONLY;
END;
GO

-- ============================================================================
-- 5. DATOS SEMILLA
-- ============================================================================
INSERT INTO dbo.Usuarios (Nombre, Email, PasswordHash, Rol, Activo)
VALUES 
(N'Carlos Fernando Cachin', N'ccachinm@miumg.edu.gt', N'A665A45920422F9D417E4867EFDC4FB8A04A1F3FFF1FA07E998E86F7F7A27AE3', N'Administrador', 1),
(N'Operador de Monitoreo', N'operador@miumg.edu.gt', N'7110EDA4D09E062AA5E4A390B0A572AC0D2C0220AC529241BE07FAAA4AA33126', N'Operador', 1);

-- 5 Sensores vinculados al Administrador (UsuarioId = 1) en Villa Canales
INSERT INTO dbo.Sensores (UsuarioId, Nombre, CodigoIdentificador, Ubicacion, Latitud, Longitud, TipoSensor, UnidadMedida, ValorMinimo, ValorMaximo, Estado)
VALUES
(1, N'Sensor Temperatura - Valle Central', N'SENS-TEMP-01', N'Aldea El Tablón, Villa Canales', 14.482000, -90.534000, N'Temperatura', N'°C', 10.00, 35.00, 1),
(1, N'Sensor Humedad Relativa - Cultivos',  N'SENS-HUM-01',  N'Aldea Santa Elena Barillas, Villa Canales', 14.435000, -90.518000, N'Humedad', N'%', 40.00, 85.00, 1),
(1, N'Anemómetro Velocidad del Viento',     N'SENS-VIEN-01', N'Aldea Boca del Monte, Villa Canales', 14.538000, -90.515000, N'Viento', N'km/h', 0.00, 45.00, 1),
(1, N'Pluviómetro Nivel de Lluvia',        N'SENS-LLUV-01', N'Aldea El Porvenir, Villa Canales', 14.492000, -90.498000, N'Lluvia', N'mm', 0.00, 35.00, 1),
(1, N'Sensor Nivel de Río / Reservorio',   N'SENS-RIO-01',  N'Aldea El Jocotillo, Villa Canales', 14.385000, -90.472000, N'NivelRio', N'm', 1.00, 4.50, 1);

-- Bitácora de inicialización
INSERT INTO dbo.BitacoraAcciones (UsuarioId, AccionRealizada, Modulo, Detalles, DireccionIP)
VALUES (1, N'Instalación del Esquema Relacional', N'Sistema', N'Esquema unificado con 6 entidades, índices y procedimientos de paginación parametrizados.', N'127.0.0.1');
GO

PRINT N'========================================================================';
PRINT N' ClimaDB: 6 Tablas + Procedimientos Paginados Anti-SQL Injection Listos! ';
PRINT N'========================================================================';