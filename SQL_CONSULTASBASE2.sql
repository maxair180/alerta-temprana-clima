<<<<<<< HEAD



--CREACION DE USUARIOS
INSERT INTO Usuarios (Nombre, Email, PasswordHash, Rol, Activo, FechaCreacion)
VALUES (
    'MELANNIE LORENZANA',
    'mlorenzanaa@miumg.edu.gt',
    CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'ROSSE@2026'), 2),
    'Administrador',
    1,
    GETDATE()
);

DELETE FROM HistorialEventos;
DELETE FROM Alertas;
DELETE FROM Lecturas;
DELETE FROM BitacoraAcciones;
=======



--CREACION DE USUARIOS
INSERT INTO Usuarios (Nombre, Email, PasswordHash, Rol, Activo, FechaCreacion)
VALUES (
    'MELANNIE LORENZANA',
    'mlorenzanaa@miumg.edu.gt',
    CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'ROSSE@2026'), 2),
    'Administrador',
    1,
    GETDATE()
);

DELETE FROM HistorialEventos;
DELETE FROM Alertas;
DELETE FROM Lecturas;
DELETE FROM BitacoraAcciones;
>>>>>>> fix/backend-signalr-estabilizacion
