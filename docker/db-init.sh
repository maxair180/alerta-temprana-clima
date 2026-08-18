#!/bin/bash
# =============================================================================
# SCRIPT DE INICIALIZACIÓN AUTOMÁTICA DE BASE DE DATOS PARA DOCKER
# =============================================================================

echo "Esperando a que SQL Server esté listo para aceptar conexiones..."

# Intentar conectar durante un máximo de 60 segundos
for i in {1..60}; do
    /opt/mssql-tools18/bin/sqlcmd -S database -U sa -P "ClimaDB_Secure2026!" -C -Q "SELECT 1" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ SQL Server está listo."
        break
    fi
    echo "Reintentando conexión con SQL Server ($i/60)..."
    sleep 2
done

echo "Ejecutando schema.sql para inicializar ClimaDB..."
/opt/mssql-tools18/bin/sqlcmd -S database -U sa -P "ClimaDB_Secure2026!" -C -i /usr/src/app/schema.sql

echo "✅ Base de datos ClimaDB inicializada exitosamente en Docker."
