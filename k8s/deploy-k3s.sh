#!/usr/bin/env bash
# ============================================================================
# CLIMASAFE RURAL - SCRIPT DE DESPLIEGUE AUTOMATIZADO KUBERNETES / K3s (FASE 4)
# ============================================================================
set -e

echo "🚀 Iniciando despliegue de ClimaSafe Rural en Kubernetes / K3s..."

# 1. Crear namespace
kubectl apply -f k8s/00-namespace.yaml

# 2. ConfigMaps y Secrets (incluyendo credenciales OAuth 2.0 / OIDC)
kubectl apply -f k8s/01-configmaps-secrets.yaml

# 3. Bases de datos con almacenamiento persistente (PVC)
kubectl apply -f k8s/02-databases.yaml

echo "⏳ Esperando inicialización de bases de datos heterogéneas (PostgreSQL, SQL Server, MongoDB)..."
kubectl wait --namespace clima-system --for=condition=ready pod --selector=app=postgres-db --timeout=90s || true

# 4. Microservicios heterogéneos
kubectl apply -f k8s/03-microservices.yaml

# 5. Ingress Controller y TLS HTTPS
kubectl apply -f k8s/04-ingress.yaml

# 6. Escalabilidad horizontal elástica (HPA)
kubectl apply -f k8s/05-hpa.yaml

echo "✅ Despliegue completado con éxito."
echo "📊 Estado del cluster:"
kubectl get pods,svc,ingress,hpa -n clima-system

