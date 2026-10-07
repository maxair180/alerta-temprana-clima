
SELECT * FROM Alertas;
SELECT * FROM BitacoraAcciones;
SELECT * FROM HistorialEventos;
SELECT * FROM Lecturas;
SELECT * FROM Sensores;
SELECT * FROM Usuarios;

INSERT INTO Usuarios (Nombre, Email, PasswordHash, Rol, Activo, FechaCreacion)
VALUES 
(
    'Usuario', 
    'ccachinm@miumg.edu.gt', 
    CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'CACHIN@2026'), 2), 
    'Operador', 
    1, 
    '2026-08-16 01:06:58.5461226'
)
;

-- Actualizar nombres reales por correo
UPDATE Usuarios SET Nombre = 'Christian García' WHERE Email = 'cgarciaf11@miumg.edu.gt';
UPDATE Usuarios SET Nombre = 'Melannie Lorenzana' WHERE Email = 'mlorenzanaa@miumg.edu.gt';
UPDATE Usuarios SET Nombre = 'Carlos Cachín' WHERE Email = 'ccachinm@miumg.edu.gt';