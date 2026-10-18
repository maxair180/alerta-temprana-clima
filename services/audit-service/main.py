import os
import datetime
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pymongo

app = FastAPI(
    title="ClimaSafe Audit Service",
    description="Microservicio de auditoría inmutable con persistencia NoSQL en MongoDB.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongo-db:27017")
is_mongo_connected = False
audit_collection = None

try:
    mongo_client = pymongo.MongoClient(MONGO_URI, serverSelectionTimeoutMS=2500)
    db = mongo_client["clima_audit_db"]
    audit_collection = db["bitacora_acciones"]
    mongo_client.server_info()
    is_mongo_connected = True
    print("[OK] Audit Service: Conectado exitosamente a MongoDB (clima_audit_db)")
except Exception as e:
    print(f"[WARN] Audit Service: MongoDB no disponible aun ({e}). Operando con memoria.")
    is_mongo_connected = False

memory_audit: List[Dict[str, Any]] = [
    {
        "id": 1,
        "usuarioId": 1,
        "usuarioNombre": "Carlos Fernando Cachin",
        "accionRealizada": "Inicio de Sesión",
        "modulo": "Autenticación",
        "detalles": "Autenticación exitosa mediante credenciales centralizadas con JWT.",
        "direccionIP": "192.168.1.50",
        "fechaHora": datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=4),
        "resultado": "Éxito"
    },
    {
        "id": 2,
        "usuarioId": 1,
        "usuarioNombre": "Carlos Fernando Cachin",
        "accionRealizada": "Generación de Reporte PDF",
        "modulo": "Reportería",
        "detalles": "Generación de reporte oficial RF-REP-08 (Reporte Ejecutivo Global) en formato PDF.",
        "direccionIP": "192.168.1.50",
        "fechaHora": datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=2),
        "resultado": "Éxito"
    },
    {
        "id": 3,
        "usuarioId": 2,
        "usuarioNombre": "Melannie Lorenzana",
        "accionRealizada": "Alta de Sensor IoT",
        "modulo": "Sensores",
        "detalles": "Estación meteorológica SENS-TEMP-02 en Los Pocitos dada de alta con API Key.",
        "direccionIP": "192.168.1.55",
        "fechaHora": datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=1),
        "resultado": "Éxito"
    }
]

class AuditLogEntry(BaseModel):
    usuarioId: Optional[int] = 1
    usuarioNombre: Optional[str] = "Sistema"
    accion: Optional[str] = None
    accionRealizada: Optional[str] = None
    modulo: Optional[str] = None
    entidad: Optional[str] = None
    detalles: Optional[str] = None
    descripcion: Optional[str] = None
    direccionIP: Optional[str] = "127.0.0.1"
    resultado: Optional[str] = "Éxito"

@app.get("/api/audit/health")
def health():
    return {
        "status": "Healthy",
        "service": "Audit Service (Python FastAPI & MongoDB NoSQL)",
        "mongoConnected": is_mongo_connected,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

@app.post("/api/audit/log")
def log_action(entry: AuditLogEntry):
    now = datetime.datetime.now(datetime.timezone.utc)
    accion = entry.accionRealizada or entry.accion or "Acción General"
    modulo = entry.modulo or entry.entidad or "Sistema"
    detalles = entry.detalles or entry.descripcion or "Registro automático de auditoría."

    doc = {
        "id": len(memory_audit) + 1,
        "usuarioId": entry.usuarioId or 1,
        "usuarioNombre": entry.usuarioNombre or "Carlos Fernando Cachin",
        "accionRealizada": accion,
        "modulo": modulo,
        "detalles": detalles,
        "direccionIP": entry.direccionIP or "127.0.0.1",
        "fechaHora": now,
        "resultado": entry.resultado or "Éxito"
    }

    if is_mongo_connected and audit_collection is not None:
        try:
            audit_collection.insert_one(doc.copy())
        except Exception as e:
            print(f"Error insertando en Mongo audit: {e}")

    memory_audit.insert(0, doc)
    return {"status": "LOGGED", "timestamp": now.isoformat()}

# Endpoint compatible con el frontend existente: POST /api/bitacora
@app.post("/api/audit")
def log_action_alt(entry: AuditLogEntry):
    return log_action(entry)

@app.get("/api/audit")
def get_audit_trail(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    modulo: Optional[str] = None,
    usuarioId: Optional[int] = None
):
    skip = (page - 1) * limit
    if is_mongo_connected and audit_collection is not None:
        try:
            query = {}
            if modulo: query["modulo"] = modulo
            if usuarioId: query["usuarioId"] = usuarioId
            total = audit_collection.count_documents(query)
            cursor = audit_collection.find(query, {"_id": 0}).sort("fechaHora", -1).skip(skip).limit(limit)
            items = list(cursor)
            for it in items:
                if isinstance(it.get("fechaHora"), datetime.datetime):
                    it["fechaHora"] = it["fechaHora"].strftime("%d/%m/%Y, %H:%M:%S")
            return {
                "total": total,
                "pagina": page,
                "tamano": limit,
                "data": items
            }
        except Exception as e:
            print(f"Error consultando Mongo: {e}")

    # Fallback memoria
    filtered = memory_audit
    if modulo:
        filtered = [x for x in filtered if x.get("modulo") == modulo]
    if usuarioId:
        filtered = [x for x in filtered if x.get("usuarioId") == usuarioId]

    paginated = filtered[skip : skip + limit]
    formatted = []
    for it in paginated:
        c = it.copy()
        if "_id" in c: del c["_id"]
        if isinstance(c.get("fechaHora"), datetime.datetime):
            c["fechaHora"] = c["fechaHora"].strftime("%d/%m/%Y, %H:%M:%S")
        formatted.append(c)

    return {
        "total": len(filtered),
        "pagina": page,
        "tamano": limit,
        "data": formatted
    }

@app.get("/api/audit/summary")
def get_audit_summary():
    total_actions = len(memory_audit)
    if is_mongo_connected and audit_collection is not None:
        try:
            total_actions = audit_collection.count_documents({})
        except Exception:
            pass
    return {
        "totalRegistros": total_actions,
        "ultimas24h": total_actions,
        "modulosActivos": ["Autenticación", "Sensores", "Reportería", "Alertas", "Monitoreo"],
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
