#!/bin/sh
# ============================================================================
# ENTRYPOINT NGINX: CLIMASAFE FRONTEND
# Detecta si existen certificados oficiales Let's Encrypt o usa los de respaldo
# ============================================================================

if [ -f /etc/nginx/ssl/custom/fullchain.pem ] && [ -f /etc/nginx/ssl/custom/privkey.pem ]; then
    echo "🔒 [SSL] Cargando Certificado Oficial Let's Encrypt para villacanales-clima.duckdns.org..."
    cp /etc/nginx/ssl/custom/fullchain.pem /etc/nginx/ssl/nginx-selfsigned.crt
    cp /etc/nginx/ssl/custom/privkey.pem /etc/nginx/ssl/nginx-selfsigned.key
elif [ -f /etc/nginx/ssl/custom/cert.crt ] && [ -f /etc/nginx/ssl/custom/cert.key ]; then
    echo "🔒 [SSL] Cargando Certificado Oficial cert.crt..."
    cp /etc/nginx/ssl/custom/cert.crt /etc/nginx/ssl/nginx-selfsigned.crt
    cp /etc/nginx/ssl/custom/cert.key /etc/nginx/ssl/nginx-selfsigned.key
else
    echo "ℹ️ [SSL] Usando certificado estándar de producción..."
fi

exec nginx -g "daemon off;"
