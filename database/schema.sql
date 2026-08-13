-- database/schema.sql
USE master;
GO

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'ClimaDB')
BEGIN
    CREATE DATABASE ClimaDB;
END
GO

USE ClimaDB;
GO

-- 1. Tabla de Usuarios (Seguridad / Autenticación)
IF OBJECT_ID('dbo.Usuarios', 'U') IS NULL
CREATE TABLE Usuarios (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(100) NOT NULL,
    Email NVARCHAR(100) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(256) NOT NULL,
    Rol NVARCHAR(50) NOT NULL DEFAULT 'Operador',
    FechaCreacion DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- 2. Tabla de Sensores (Monitoreo y Administración)
IF OBJECT_ID('dbo.Sensores', 'U') IS NULL
CREATE TABLE Sensores (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(100) NOT NULL,
    Ubicacion NVARCHAR(150) NOT NULL,
    TipoSensor NVARCHAR(50) NOT NULL, -- Temperatura, Humedad, Viento, Lluvia, NivelRio
    Estado BIT NOT NULL DEFAULT 1, -- 1: Activo, 0: Inactivo
    FechaInstalacion DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- 3. Tabla de Lecturas (Datos en Tiempo Real)
IF OBJECT_ID('dbo.Lecturas', 'U') IS NULL
CREATE TABLE Lecturas (
    Id BIGINT IDENTITY(1,1) PRIMARY KEY,
    SensorId INT NOT NULL FOREIGN KEY REFERENCES Sensores(Id),
    Valor DECIMAL(10,2) NOT NULL,
    FechaHora DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- 4. Tabla de Alertas (Generación de Alertas por Niveles)
IF OBJECT_ID('dbo.Alertas', 'U') IS NULL
CREATE TABLE Alertas (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    SensorId INT NOT NULL FOREIGN KEY REFERENCES Sensores(Id),
    NivelRiesgo NVARCHAR(20) NOT NULL, -- Verde, Amarillo, Naranja, Rojo
    Mensaje NVARCHAR(255) NOT NULL,
    FechaHora DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- 5. Tabla de Historial de Eventos
IF OBJECT_ID('dbo.HistorialEventos', 'U') IS NULL
CREATE TABLE HistorialEventos (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    AlertaId INT NOT NULL FOREIGN KEY REFERENCES Alertas(Id),
    TipoFenomeno NVARCHAR(50) NOT NULL, -- Inundacion, Sequia, Tormenta, Helada, IncendioForestal
    FechaHora DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- 6. Tabla de Bitácora de Acciones (Auditoría de Usuarios)
IF OBJECT_ID('dbo.BitacoraAcciones', 'U') IS NULL
CREATE TABLE BitacoraAcciones (
    Id BIGINT IDENTITY(1,1) PRIMARY KEY,
    UsuarioId INT NULL FOREIGN KEY REFERENCES Usuarios(Id),
    AccionRealizada NVARCHAR(100) NOT NULL,
    Detalles NVARCHAR(MAX) NULL,
    FechaHora DATETIME2 NOT NULL DEFAULT GETDATE()
);