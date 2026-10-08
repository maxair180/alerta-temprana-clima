<<<<<<< HEAD
-- Usar la base de datos correcta
USE ClimaDB;
GO

PRINT '=== USUARIOS ===';
SELECT * FROM dbo.Usuarios;

PRINT '=== COMUNIDADES ===';
SELECT * FROM dbo.Comunidades;

PRINT '=== SENSORES ===';
SELECT * FROM dbo.Sensores;

PRINT '=== REGLAS DE ALERTA ===';
SELECT * FROM dbo.ReglasAlerta;

PRINT '=== LECTURAS (Clima en tiempo real) ===';
SELECT TOP 100 * FROM dbo.Lecturas ORDER BY FechaHora DESC;

PRINT '=== ALERTAS ACTIVAS ===';
SELECT * FROM dbo.Alertas;

PRINT '=== HISTORIAL DE EVENTOS ===';
SELECT * FROM dbo.HistorialEventos;

PRINT '=== BITACORA DE ACCIONES ===';
SELECT * FROM dbo.BitacoraAcciones ORDER BY FechaHora DESC;
=======
-- Usar la base de datos correcta
USE ClimaDB;
GO

PRINT '=== USUARIOS ===';
SELECT * FROM dbo.Usuarios;

PRINT '=== COMUNIDADES ===';
SELECT * FROM dbo.Comunidades;

PRINT '=== SENSORES ===';
SELECT * FROM dbo.Sensores;

PRINT '=== REGLAS DE ALERTA ===';
SELECT * FROM dbo.ReglasAlerta;

PRINT '=== LECTURAS (Clima en tiempo real) ===';
SELECT TOP 100 * FROM dbo.Lecturas ORDER BY FechaHora DESC;

PRINT '=== ALERTAS ACTIVAS ===';
SELECT * FROM dbo.Alertas;

PRINT '=== HISTORIAL DE EVENTOS ===';
SELECT * FROM dbo.HistorialEventos;

PRINT '=== BITACORA DE ACCIONES ===';
SELECT * FROM dbo.BitacoraAcciones ORDER BY FechaHora DESC;
>>>>>>> fix/backend-signalr-estabilizacion
