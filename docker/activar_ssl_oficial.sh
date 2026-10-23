#!/bin/bash
# ============================================================================
# ACTIVACIÓN AUTOMÁTICA DE CERTIFICADO SSL OFICIAL (LET'S ENCRYPT)
# Dominio: villacanales-clima.duckdns.org
# ============================================================================
set -e

echo "🔒 Iniciando proceso de certificación oficial con Let's Encrypt..."

# 1. Instalar Certbot si no existe
if ! command -v certbot &> /dev/null; then
    echo "📦 Instalando certbot en el servidor..."
    apt-get update -y && apt-get install -y certbot
fi

# 2. Detener temporalmente el frontend para liberar el puerto 80
echo "⏸️ Deteniendo contenedor de frontend por unos segundos..."
docker stop clima_frontend || true

# 3. Solicitar certificado oficial gratuito para el dominio
echo "🌐 Solicitando certificado a Let's Encrypt para villacanales-clima.duckdns.org..."
certbot certonly --standalone \
    -d villacanales-clima.duckdns.org \
    --non-interactive \
    --agree-tos \
    --register-unsafely-without-email

# 4. Vincular certificados a la carpeta ssl del proyecto
echo "📋 Vinculando certificados a la configuración de Nginx..."
mkdir -p ./ssl
cp -L /etc/letsencrypt/live/villacanales-clima.duckdns.org/fullchain.pem ./ssl/fullchain.pem
cp -L /etc/letsencrypt/live/villacanales-clima.duckdns.org/privkey.pem ./ssl/privkey.pem
chmod 644 ./ssl/fullchain.pem ./ssl/privkey.pem

# 5. Eliminar contenedor previo para evitar bug 'ContainerConfig' de docker-compose v1
echo "🚀 Levantando servidor frontend con SSL oficial..."
docker rm -f clima_frontend 2>/dev/null || true

if docker compose version &>/dev/null; then
    docker compose up -d --build frontend
else
    docker-compose up -d --build frontend
fi

echo "============================================================================"
echo "✅ ¡CERTIFICADO SSL OFICIAL ACTIVADO EXITOSAMENTE!"
echo "Tu sitio ahora es 100% SEGURO con candado oficial 🔒 en todos los navegadores:"
echo "https://villacanales-clima.duckdns.org"
echo "============================================================================"
