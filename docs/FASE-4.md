# 🌐 Fase 4 — Autenticación Externa, Kubernetes/K3s y Arquitectura Distribuida
## Sistema de Monitoreo y Alerta Temprana para Riesgos Climáticos (ClimaSafe Rural)

> **Universidad Mariano Gálvez de Guatemala (UMG)**  
> **Facultad de Ingeniería en Sistemas de Información y Ciencias de la Computación**  
> **Curso:** Desarrollo Web (2026)  
> **Integrantes:**
> - **Carlos Fernando Cachin** (`CACHIN1563`) — Database, DevOps & Microservicios
> - **Melannie Lorenzana** (`Melannie24`) — Backend, Reportería & Motores de Inferencia
> - **Christian García** (`maxair180`) — Frontend SPA, WebSockets & UX/UI

---

## 1. Descripción Ejecutiva de la Fase 4

La **Fase 4** representa la culminación y madurez del sistema ClimaSafe Rural. Sobre la arquitectura de microservicios desarrollada en la Fase 3, se incorporan dos capacidades de nivel empresarial:

1. **Autenticación Externa Federada (OAuth 2.0 & OpenID Connect - OIDC):** Se integran proveedores de identidad de clase mundial (**Google Identity Services** y **GitHub Enterprise**), centralizados de forma estricta en el `Auth Service` (Node.js/TypeScript). Los microservicios downstream consumen y validan de forma transparente los tokens **JWT (JSON Web Tokens)** generados por este sistema.
2. **Orquestación en Kubernetes / K3s:** Se migra la infraestructura desde Docker Compose hacia un clúster de **Kubernetes / K3s** mediante `Pods`, `Deployments` multi-réplica, `Services` internos, `Ingress Controller` con terminación TLS/HTTPS y DNS, `ConfigMaps` para configuración desacoplada, `Secrets` para llaves criptográficas y credenciales sensibles, `PersistentVolumeClaims (PVC)` para almacenamiento duradero de bases de datos, y sondas de salud (`LivenessProbe` y `ReadinessProbe`) para autorreparación y alta disponibilidad.

---

## 2. Cumplimiento de Requerimientos Funcionales y No Funcionales

| Código | Requerimiento Oficial | Estado | Evidencia de Implementación |
| :--- | :--- | :---: | :--- |
| **RF-OAUTH-01** | Implementación estándar OAuth 2.0 | ✅ CUMPLIDO | Flujo *Authorization Code Grant* implementado en `Auth Service` (`/api/auth/oauth/*`). |
| **RF-OAUTH-02** | OpenID Connect (OIDC) | ✅ CUMPLIDO | Solicitud y consumo de scopes `openid`, `profile` y `email` para identificación fehaciente. |
| **RF-OAUTH-03** | Proveedor Externo: Google | ✅ CUMPLIDO | Login federado vía Google OAuth2 (`/api/auth/oauth/google` y `/api/auth/callback/google`). |
| **RF-OAUTH-04** | Proveedor Externo: GitHub | ✅ CUMPLIDO | Login federado vía GitHub OAuth (`/api/auth/oauth/github` y `/api/auth/callback/github`). |
| **RF-OAUTH-05** | Arquitectura Extensible | ✅ CUMPLIDO | Endpoint `/api/auth/oauth-providers` y adaptador modular para Microsoft Entra ID / Facebook. |
| **RNF-OAUTH-01** | Secretos fuera del código fuente | ✅ CUMPLIDO | `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_SECRET` inyectados vía variables de entorno. |
| **RNF-OAUTH-02** | Secretos en Kubernetes Secrets | ✅ CUMPLIDO | Manifiesto `k8s/01-configmaps-secrets.yaml` (Secret `clima-secrets`). |
| **RNF-OAUTH-03** | Rutas protegidas por roles | ✅ CUMPLIDO | Matriz RBAC para `ADMIN`, `OPERATOR` y `VIEWER` en todos los controladores. |
| **RNF-OAUTH-04** | Rechazo de JWT expirados | ✅ CUMPLIDO | Validación criptográfica de expiración (`exp`) y emisión (`iss`, `aud`). |
| **RNF-OAUTH-05** | Validación interna en APIs | ✅ CUMPLIDO | Middleware JWT en API Gateway y verificación de firma simétrica HMAC-SHA256. |

---

## 3. Arquitectura Distribuida Final (Kubernetes / K3s)

```
                                  INTERNET
                                      |
                                      v
                        DNS / HTTPS (Let's Encrypt TLS)
                                      |
                                      v
                       +-----------------------------+
                       |   Ingress Controller NGINX  |
                       +--------------+--------------+
                                      |
                                      v
                       +-----------------------------+
                       | API Gateway (ASP.NET 10)    |
                       | YARP Proxy / Port 8080      |
                       +--------------+--------------+
                                      |
        +-----------------------------+-----------------------------+
        |                             |                             |
        v                             v                             v
+---------------+             +---------------+             +---------------+
| Auth Service  |             | Sensor Service|             |Community Serv.|
| Node / TS     |             | .NET 10       |             | .NET 10       |
| Port: 3000    |             | Port: 5002    |             | Port: 5001    |
+-------+-------+             +-------+-------+             +-------+-------+
        |                             |                             |
        v                             v                             v
  PostgreSQL 16                 SQL Server 2022               PostgreSQL 16
  (auth_db - PVC)               (clima_db - PVC)              (comm_db - PVC)

        +-----------------------------+-----------------------------+
        |                             |                             |
        v                             v                             v
+---------------+             +---------------+             +---------------+
| Alert Service |             | Report Service|             | Audit Service |
| Java / Spring |             | Python FastAPI|             | Python FastAPI|
| Port: 8081    |             | Port: 8000    |             | Port: 8001    |
+-------+-------+             +-------+-------+             +-------+-------+
        |                             |                             |
        v                             v                             v
  PostgreSQL 16                 MongoDB 7.0 NoSQL             MongoDB 7.0 NoSQL
  (alert_db - PVC)              (reports_db - PVC)            (audit_db - PVC)
```

---

## 4. Flujo de Autenticación Federada

```
Usuario ---> Angular SPA ---> Auth Service ---> [ Google / GitHub ]
                                    |
                                    v
                         Validación de Identidad
                                    |
                                    v
                     Persistencia / Sincronización DB
                                    |
                                    v
                      Emisión de JWT Estandarizado
                                    |
                                    v
        Angular SPA ---> API Gateway ---> Microservicios Internos
```

### Especificación Oficial del Payload JWT:
```json
{
  "sub": "user-1",
  "email": "carlos@clima.gt",
  "name": "Carlos Fernando Cachin",
  "roles": [
    "ADMIN"
  ],
  "provider": "google",
  "iss": "climate-auth",
  "aud": "climate-api",
  "exp": 1790000000
}
```

---

## 5. Manifiestos de Infraestructura Kubernetes / K3s

Los manifiestos se encuentran organizados en el directorio [`k8s/`](file:///c:/Users/cachi/OneDrive/Desktop/UMG/8%20SEMESTRE/DESARROLLO%20WEB/PROYECTO/k8s/):

1. **`00-namespace.yaml`:** Namespace aislado `clima-system`.
2. **`01-configmaps-secrets.yaml`:**
   - `ConfigMap (clima-global-config)`: Variables globales, issuers, audiences y endpoints internos.
   - `Secret (clima-secrets)`: Llaves JWT, contraseñas de bases de datos y Client Secrets OAuth.
3. **`02-databases.yaml`:**
   - Almacenamiento persistente mediante `PersistentVolumeClaim (PVC)` de 10Gi por motor.
   - Deployments y Services para PostgreSQL 16, SQL Server 2022 y MongoDB 7.0.
4. **`03-microservices.yaml`:**
   - Deployments multi-réplica (2 Pods por servicio stateless).
   - Sondas `livenessProbe` y `readinessProbe` configuradas en endpoints `/health`.
   - Asignación de recursos (`requests` y `limits` de CPU/RAM).
5. **`04-ingress.yaml`:**
   - Ingress Controller NGINX con reglas de enrutamiento para API, WebSockets y Frontend.
   - Certificado SSL/TLS con Let's Encrypt para el dominio oficial `sistema-climatico.example`.
6. **`05-hpa.yaml`:**
   - Autoescalado horizontal elástico (HPA) basado en uso de CPU (umbral 75%).

---

## 6. Despliegue en 1 Clic (K3s / VPS)

Para desplegar la Fase 4 completa en un servidor Ubuntu o VPS con K3s:

```bash
chmod +x k8s/deploy-k3s.sh
./k8s/deploy-k3s.sh
```

Verificación del estado del clúster:
```bash
kubectl get pods,svc,ingress,hpa -n clima-system
```

