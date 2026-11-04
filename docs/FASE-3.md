# 🏗️ Fase 3 — Arquitectura de Microservicios Heterogéneos & Telemetría IoT
## Sistema de Monitoreo y Alerta Temprana para Riesgos Climáticos (ClimaSafe Rural)

> **Universidad Mariano Gálvez de Guatemala (UMG)**  
> **Desarrollo Web (2026)**  
> **Integrantes:** Carlos Fernando Cachin, Christian García, Melannie Lorenzana

---

## 1. Alcance de la Fase 3
* Desacoplamiento del monolito en 7 microservicios especializados:
  1. `api-gateway`: ASP.NET Core 10 con YARP.
  2. `auth-service`: Node.js / Express con TypeScript.
  3. `community-service`: .NET 10 Web API.
  4. `sensor-service`: .NET 10 Web API.
  5. `alert-service`: Java 21 con Spring Boot.
  6. `report-service`: Python FastAPI con ReportLab y WeasyPrint.
  7. `audit-service`: Python FastAPI con MongoDB.
* Persistencia heterogénea en 3 motores: PostgreSQL 16, SQL Server 2022 y MongoDB 7.0 (NoSQL).
* Microservicio de reportería con 10 reportes oficiales en formato PDF.
* Bases de hardware físico IoT: firmware ESP32 y Arduino UNO R3 para sensores climáticos.

