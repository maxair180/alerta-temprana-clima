// ============================================================================
// SCRIPT DE INICIALIZACIÓN MONGODB (FASE 3 - REPORTERÍA Y AUDITORÍA NOSQL)
// ============================================================================

// 1. BASE DE DATOS DE REPORTERÍA
db = db.getSiblingDB('clima_reports_db');

db.createCollection('generated_reports');
db.generated_reports.createIndex({ "reportId": 1 }, { unique: true });
db.generated_reports.createIndex({ "type": 1 });
db.generated_reports.createIndex({ "generatedAt": -1 });

// Seed de metadata de reportes iniciales
db.generated_reports.insertMany([
  {
    reportId: "REP-2026-000001",
    type: "ALERT_HISTORY",
    title: "Reporte de Historial de Alertas",
    generatedBy: "Carlos Fernando Cachin (Admin)",
    generatedAt: new Date("2026-10-22T10:30:00Z"),
    filters: {
      communityId: 4,
      from: "2026-10-01",
      to: "2026-10-22",
      dangerLevel: "TODOS"
    },
    status: "COMPLETED",
    fileName: "reporte_alertas_20261022.pdf",
    fileSize: "245 KB",
    filePath: "/app/storage/reports/reporte_alertas_20261022.pdf",
    downloadCount: 3,
    lastDownloadedAt: new Date("2026-10-22T11:15:00Z")
  },
  {
    reportId: "REP-2026-000002",
    type: "EXECUTIVE_SUMMARY",
    title: "Reporte Ejecutivo Global de Situación Climática",
    generatedBy: "Melannie Lorenzana (Admin)",
    generatedAt: new Date("2026-10-22T14:00:00Z"),
    filters: {
      scope: "MUNICIPAL_VILLA_CANALES",
      includeSensors: true,
      includeEvents: true
    },
    status: "COMPLETED",
    fileName: "reporte_ejecutivo_20261022.pdf",
    fileSize: "380 KB",
    filePath: "/app/storage/reports/reporte_ejecutivo_20261022.pdf",
    downloadCount: 1,
    lastDownloadedAt: new Date("2026-10-22T14:05:00Z")
  }
]);

// 2. BASE DE DATOS DE AUDITORÍA
db = db.getSiblingDB('clima_audit_db');

db.createCollection('bitacora_acciones');
db.bitacora_acciones.createIndex({ "fechaHora": -1 });
db.bitacora_acciones.createIndex({ "modulo": 1 });
db.bitacora_acciones.createIndex({ "usuarioId": 1 });

db.bitacora_acciones.insertMany([
  {
    usuarioId: 1,
    usuarioNombre: "Carlos Fernando Cachin (Admin)",
    accionRealizada: "Inicio de Sesión",
    modulo: "Autenticación",
    detalles: "Autenticación exitosa mediante credenciales centralizadas con JWT.",
    direccionIP: "192.168.1.50",
    fechaHora: new Date("2026-10-22T08:00:00Z"),
    resultado: "Éxito"
  },
  {
    usuarioId: 1,
    usuarioNombre: "Carlos Fernando Cachin (Admin)",
    accionRealizada: "Generación de Reporte PDF",
    modulo: "Reportería",
    detalles: "Generación de reporte oficial RF-REP-08 (Reporte Ejecutivo Global) en formato PDF.",
    direccionIP: "192.168.1.50",
    fechaHora: new Date("2026-10-22T10:30:00Z"),
    resultado: "Éxito"
  },
  {
    usuarioId: 2,
    usuarioNombre: "Melannie Lorenzana (Admin)",
    accionRealizada: "Registro de Dispositivo IoT",
    modulo: "Sensores",
    detalles: "Alta de estación meteorológica SENS-TEMP-02 en Los Pocitos con API Key generada.",
    direccionIP: "192.168.1.55",
    fechaHora: new Date("2026-10-22T11:45:00Z"),
    resultado: "Éxito"
  }
]);
