# ☸️ Guía de Despliegue en Kubernetes (K8s / K3s)
## ClimaSafe Rural — Fase 3 y Preparación para Fase 4

> **Universidad Mariano Gálvez de Guatemala (UMG)**  
> **Facultad de Ingeniería en Sistemas de Información y Ciencias de la Computación**  
> **Desarrollo Web (2026)**

---

## 1. Visión General de la Arquitectura K8s

En cumplimiento con los requerimientos de la **Fase 3** y la preparación para la **Fase 4**, todos los microservicios han sido diseñados con principios de arquitectura **Cloud-Native y Stateless**:

1. **Microservicios Stateless:** `api-gateway`, `auth-service`, `community-service`, `sensor-service`, `alert-service`, `report-service`, `audit-service`. Todos escalables horizontalmente mediante réplicas sin estado en memoria compartida.
2. **Health Checks:** Implementación de sondas `livenessProbe` y `readinessProbe` mediante endpoints `/health` en todos los servicios.
3. **Graceful Shutdown:** Configuración de `preStop` hooks en contenedores para drenado limpio de conexiones y peticiones en vuelo.
4. **Almacenamiento Persistente:** Manifiestos `PersistentVolumeClaim` (PVC) desacoplados para SQL Server, PostgreSQL y MongoDB NoSQL.
5. **Configuración Segura:** Separación estricta de variables de entorno mediante `ConfigMap` (`clima-global-config`) y credenciales sensibles mediante `Secret` (`clima-secrets`).
6. **Ingress Controller & TLS:** Enrutamiento HTTP/HTTPS unificado mediante Nginx Ingress con soporte para WebSockets (`/hubs`) y certificados SSL/TLS automáticos.

---

## 2. Estructura de Manifiestos en `/k8s`

* `00-namespace.yaml`: Espacio de nombres aislado `clima-system`.
* `01-configmaps-secrets.yaml`: Variables globales y llaves criptográficas JWT y contraseñas.
* `02-databases.yaml`: PVCs y Deployments para PostgreSQL 16, SQL Server 2022+ y MongoDB 7.0.
* `03-microservices.yaml`: Despliegue de los 7 microservicios backend con réplicas, probes y límites de CPU/RAM.
* `04-ingress.yaml`: Reglas de enrutamiento Ingress y terminación TLS.

---

## 3. Instrucciones de Despliegue Paso a Paso en K3s / Kubernetes

### Paso 1: Crear el Namespace y Secretos
```bash
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-configmaps-secrets.yaml
```

### Paso 2: Desplegar Bases de Datos Heterogéneas
```bash
kubectl apply -f k8s/02-databases.yaml

# Verificar que los pods de bases de datos estén en estado Running:
kubectl get pods -n clima-system -l "app in (postgres-db, sqlserver-db, mongo-db)"
```

### Paso 3: Desplegar Microservicios Stateless
```bash
kubectl apply -f k8s/03-microservices.yaml

# Verificar estado de todos los pods y réplicas:
kubectl get pods -n clima-system
```

### Paso 4: Aplicar Reglas de Ingress
```bash
kubectl apply -f k8s/04-ingress.yaml

# Consultar dirección IP asignada por el Ingress Controller:
kubectl get ingress -n clima-system
```

---

## 4. Hoja de Ruta hacia la Fase 4 (OAuth 2.0 / OIDC & K3s)

1. **OAuth 2.0 / OIDC:**
   * La tabla `usuarios` en PostgreSQL ya cuenta con los campos preparados: `oauth_provider` (Google, GitHub, Microsoft) y `oauth_id`.
   * El endpoint `GET /api/auth/oauth-providers` del `Auth Service` ya expone el catálogo de proveedores federados para su activación en Fase 4.
2. **K3s en VPS:**
   * Para migrar desde Docker Compose hacia K3s en el VPS, se puede instalar K3s con un solo comando:
     ```bash
     curl -sfL https://get.k3s.io | sh -
     ```
   * Y aplicar los mismos manifiestos de la carpeta `k8s/`.
