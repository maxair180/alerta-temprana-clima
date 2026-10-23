import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClimaService, SensorModel, AlertaModel, HistorialEventoModel, BitacoraModel, UsuarioAuth, ReporteTipo, ReporteMetadata } from './services/clima.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  public pestanaActiva: 'dashboard' | 'alertas' | 'historial' | 'admin' | 'bitacora' | 'reportes' = 'dashboard';

  // Subpestañas del módulo de administración
  public subPestanaAdmin: 'usuarios' | 'sensores' = 'usuarios';

  // Gestión de Usuarios (Crear / Editar para Administradores)
  public usuarios: any[] = [];
  public cargandoUsuarios: boolean = false;
  public modalUsuario: boolean = false;
  public editandoUsuario: boolean = false;
  public usuarioForm: { id?: number; nombre: string; email: string; password?: string; rol: string; activo: boolean } = {
    nombre: '',
    email: '',
    password: '',
    rol: 'Operador',
    activo: true
  };

  // Autenticación
  public usuarioActual: UsuarioAuth | null = null;
  public loginForm = {
    correo: '',
    contrasenia: ''
  };
  public loginError: string = '';

  // Notificación de éxito flotante
  public mensajeExito: string | null = null;

  // Datos
  public sensores: SensorModel[] = [];
  public alertas: AlertaModel[] = [];
  public historial: HistorialEventoModel[] = [];
  public bitacora: BitacoraModel[] = [];
  public alertaEmergente: AlertaModel | null = null;
  public conectadoSignalR: boolean = false;
  public sonidoHabilitado: boolean = true;

  // Filtros
  public filtroNivelAlerta: string = 'TODOS';
  public filtroFenomeno: string = 'TODOS';
  public filtroComunidadMapa: string = 'TODAS';
  public sensorSeleccionadoGraficoId: number = 1;

  // Paginación
  public itemsPorPagina: number = 5;
  public paginaActualAlertas: number = 1;
  public paginaActualHistorial: number = 1;
  public paginaActualBitacora: number = 1;

  // Estado general de la comunidad
  public estadoComunidad: 'Normal' | 'Precaucion' | 'Alerta' | 'Emergencia' = 'Normal';

  // 13 Aldeas Oficiales del Municipio de Villa Canales
  public aldeasVillaCanales: string[] = [
    'Boca del Monte',
    'El Tablón',
    'Chichimecas',
    'Colmenas',
    'El Durazno',
    'El Zapote',
    'El Porvenir',
    'Santa Rosita',
    'Santa Elena Barillas',
    'Los Dolores',
    'Los Pocitos',
    'El Obrajuelo',
    'El Jocotillo',
    'Otra Comunidad / Sector'
  ];

  // Modal para agregar sensor
  public modalAgregarSensor: boolean = false;
  public nuevoSensor: {
    nombre: string;
    tipoSensor: 'Temperatura' | 'Humedad' | 'Viento' | 'Lluvia' | 'NivelRio';
    comunidad: string;
    ubicacion: string;
    unidadMedida: string;
    valorMinimo: number;
    valorMaximo: number;
  } = {
    nombre: '',
    tipoSensor: 'Temperatura',
    comunidad: 'Los Pocitos',
    ubicacion: '',
    unidadMedida: '°C',
    valorMinimo: 10,
    valorMaximo: 35
  };

  // Reportería (Fase 3)
  public tiposReportes: ReporteTipo[] = [];
  public reporteSeleccionado: string = 'RF-REP-01';
  public filtrosReporte: any = {
    comunidad: 'TODAS',
    tipoSensor: 'TODOS',
    nivelRiesgo: 'TODOS',
    fechaInicio: '',
    fechaFin: '',
    alcance: 'MUNICIPAL_VILLA_CANALES'
  };
  public historialReportes: ReporteMetadata[] = [];
  public generandoPdf: boolean = false;
  public ultimoReporteGenerado: ReporteMetadata | null = null;

  // Conexión y Telemetría de Sensores Físicos IoT
  public resumenIot: any = { total: 6, activos: 6, inactivos: 0, sinComunicacion: 0 };
  public sensorIotPrueba: any = {
    codigoSensor: 'SENS-TEMP-01',
    valor: 24.5,
    unidad: '°C'
  };
  public resultadoIot: any = null;
  public probandoIot: boolean = false;
  public pestanaCodigoIot: 'esp32' | 'python' | 'curl' = 'esp32';

  public snippetEsp32: string = `// ============================================================================
// CLIMASAFE RURAL - FIRMWARE ESP32 NODO SENSOR (Arduino IDE / PlatformIO)
// Archivo: iot-hardware/esp32_climasensor/esp32_climasensor.ino
// ============================================================================
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* WIFI_SSID     = "TU_RED_WIFI";
const char* WIFI_PASSWORD = "TU_CONTRASENA_WIFI";
const char* GATEWAY_URL   = "http://192.168.1.100:8080/api/sensors/ingest";
const char* SENSOR_CODIGO = "SENS-TEMP-01";
const char* SENSOR_KEY    = "API-KEY-SENS-TEMP-01-2026";

void enviarTelemetria(float valor) {
  HTTPClient http;
  http.begin(GATEWAY_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Sensor-Key", SENSOR_KEY);

  StaticJsonDocument<200> doc;
  doc["codigoSensor"] = SENSOR_CODIGO;
  doc["valor"] = valor;
  doc["unidad"] = "°C";
  doc["bateria"] = 98;

  String json;
  serializeJson(doc, json);
  int httpCode = http.POST(json);
  Serial.printf("Respuesta Gateway: %d\\n", httpCode);
  http.end();
}`;

  public snippetPython: string = `# ============================================================================
# CLIMASAFE RURAL - EMULADOR DE TRANSMISIÓN CONTINUA IoT (CLI)
# Archivo: iot-hardware/sensor_simulator_cli.py
# ============================================================================
# Ejecutar transmisión continua de las 5 variables meteorológicas cada 6 segundos:
python iot-hardware/sensor_simulator_cli.py --continuous --interval 6

# Forzar una alerta crítica de emergencia (Incendio / Calor 44°C):
python iot-hardware/sensor_simulator_cli.py --sensor SENS-TEMP-01 --valor 44.0`;

  public snippetCurl: string = `# ============================================================================
# TRANSMISIÓN HTTP DIRECTA MEDIANTE cURL
# ============================================================================
curl -X POST http://localhost:8080/api/sensors/ingest \\
  -H "Content-Type: application/json" \\
  -H "X-Sensor-Key: API-KEY-SENS-TEMP-01-2026" \\
  -d '{
    "codigoSensor": "SENS-TEMP-01",
    "valor": 26.8,
    "unidad": "°C",
    "bateria": 96,
    "ipDispositivo": "192.168.1.115"
  }'`;

  private subs: Subscription = new Subscription();

  constructor(
    public climaService: ClimaService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarReportesYIot();
    this.cargarUsuarios();
    this.subs.add(
      this.climaService.usuarioActual$.subscribe(usuario => {
        this.usuarioActual = usuario;
        if (usuario?.rol === 'Administrador') {
          this.cargarUsuarios();
        }
        this.cdr.detectChanges();
      })
    );

    this.subs.add(
      this.climaService.sensores$.subscribe(sensores => {
        this.sensores = sensores;
        this.calcularEstadoComunidad();
        this.cdr.detectChanges();
      })
    );

    this.subs.add(
      this.climaService.alertas$.subscribe(alertas => {
        this.alertas = alertas;
        this.cdr.detectChanges();
      })
    );

    this.subs.add(
      this.climaService.historial$.subscribe(historial => {
        this.historial = historial;
        this.cdr.detectChanges();
      })
    );

    this.subs.add(
      this.climaService.bitacora$.subscribe(bitacora => {
        this.bitacora = bitacora;
        this.cdr.detectChanges();
      })
    );

    this.subs.add(
      this.climaService.alertaEmergente$.subscribe(alerta => {
        this.alertaEmergente = alerta;
        this.cdr.detectChanges();
      })
    );

    this.subs.add(
      this.climaService.conectadoSignalR$.subscribe(conectado => {
        this.conectadoSignalR = conectado;
        this.cdr.detectChanges();
      })
    );

    this.subs.add(
      this.climaService.sonidoHabilitado$.subscribe(habilitado => {
        this.sonidoHabilitado = habilitado;
        this.cdr.detectChanges();
      })
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  public cargandoLogin = false;

  public ejecutarLogin() {
    this.loginError = '';
    const correoLimpio = (this.loginForm.correo || '').trim().toLowerCase();
    const claveLimpia = (this.loginForm.contrasenia || '').trim();

    if (!correoLimpio || !claveLimpia) {
      this.loginError = 'Por favor ingresa tu correo y contraseña.';
      return;
    }

    this.cargandoLogin = true;
    this.cdr.detectChanges();
    this.climaService.login(correoLimpio, claveLimpia).subscribe(exito => {
      this.cargandoLogin = false;
      if (!exito) {
        this.loginError = 'Credenciales inválidas. Verifica tu correo y contraseña.';
      } else {
        this.loginForm = { correo: '', contrasenia: '' };
      }
      this.cdr.detectChanges();
    });
  }

  public cerrarSesion() {
    this.climaService.logout();
    this.usuarioActual = null;
    this.loginForm = { correo: '', contrasenia: '' };
    this.loginError = '';
    this.cdr.detectChanges();
  }

  private calcularEstadoComunidad() {
    const algunRojo = this.sensores.some(s => s.estado && s.nivelRiesgoActual === 'Rojo');
    if (algunRojo) {
      this.estadoComunidad = 'Emergencia';
      return;
    }
    const algunNaranja = this.sensores.some(s => s.estado && s.nivelRiesgoActual === 'Naranja');
    if (algunNaranja) {
      this.estadoComunidad = 'Alerta';
      return;
    }
    const algunAmarillo = this.sensores.some(s => s.estado && s.nivelRiesgoActual === 'Amarillo');
    if (algunAmarillo) {
      this.estadoComunidad = 'Precaucion';
      return;
    }
    this.estadoComunidad = 'Normal';
  }

  public get sensorGrafico(): SensorModel | undefined {
    return this.sensores.find(s => s.id === this.sensorSeleccionadoGraficoId) || this.sensores[0];
  }

  public toggleSonido() {
    this.climaService.toggleSonido();
  }

  public toggleSensor(id: number) {
    this.climaService.toggleEstadoSensor(id);
  }

  public atenderAlerta(id: number) {
    this.climaService.atenderAlerta(id);
  }

  public cerrarAlertaEmergente() {
    this.alertaEmergente = null;
  }

  // Reinicio con notificación visual emergente
  public reiniciarSistema() {
    if (confirm('¿Deseas reiniciar el sistema de monitoreo?')) {
      this.climaService.reiniciarSistemaMonitoreo();
      this.mensajeExito = '¡Sistema de monitoreo reiniciado correctamente! Todos los sensores están activos y las alertas fueron limpiadas.';
      
      // Ocultar notificación automáticamente después de 5 segundos
      setTimeout(() => {
        this.mensajeExito = null;
      }, 5000);
    }
  }

  public simularEvento(tipo: 'Inundacion' | 'Incendio' | 'Tormenta' | 'Helada' | 'Sequia') {
    this.climaService.simularEventoExtremo(tipo);
  }

  // Getters de paginación
  public get alertasFiltradas(): AlertaModel[] {
    if (this.filtroNivelAlerta === 'TODOS') return this.alertas;
    return this.alertas.filter(a => a.nivelRiesgo === this.filtroNivelAlerta);
  }

  public get alertasPaginadas(): AlertaModel[] {
    const inicio = (this.paginaActualAlertas - 1) * this.itemsPorPagina;
    return this.alertasFiltradas.slice(inicio, inicio + this.itemsPorPagina);
  }

  public get totalPaginasAlertas(): number {
    return Math.ceil(this.alertasFiltradas.length / this.itemsPorPagina) || 1;
  }

  public get historialFiltrado(): HistorialEventoModel[] {
    if (this.filtroFenomeno === 'TODOS') return this.historial;
    return this.historial.filter(h => h.tipoFenomeno === this.filtroFenomeno);
  }

  public get historialPaginado(): HistorialEventoModel[] {
    const inicio = (this.paginaActualHistorial - 1) * this.itemsPorPagina;
    return this.historialFiltrado.slice(inicio, inicio + this.itemsPorPagina);
  }

  public get totalPaginasHistorial(): number {
    return Math.ceil(this.historialFiltrado.length / this.itemsPorPagina) || 1;
  }

  public get bitacoraPaginada(): BitacoraModel[] {
    const inicio = (this.paginaActualBitacora - 1) * this.itemsPorPagina;
    return this.bitacora.slice(inicio, inicio + this.itemsPorPagina);
  }

  public get totalPaginasBitacora(): number {
    return Math.ceil(this.bitacora.length / this.itemsPorPagina) || 1;
  }

  public cambiarPaginaAlertas(delta: number) {
    const nueva = this.paginaActualAlertas + delta;
    if (nueva >= 1 && nueva <= this.totalPaginasAlertas) {
      this.paginaActualAlertas = nueva;
    }
  }

  public cambiarPaginaHistorial(delta: number) {
    const nueva = this.paginaActualHistorial + delta;
    if (nueva >= 1 && nueva <= this.totalPaginasHistorial) {
      this.paginaActualHistorial = nueva;
    }
  }

  public cambiarPaginaBitacora(delta: number) {
    const nueva = this.paginaActualBitacora + delta;
    if (nueva >= 1 && nueva <= this.totalPaginasBitacora) {
      this.paginaActualBitacora = nueva;
    }
  }

  public get comunidadesUnicas(): string[] {
    const list = Array.from(new Set(this.sensores.map(s => s.comunidad)));
    return ['TODAS', ...list];
  }

  public get sensoresFiltradosMapa(): SensorModel[] {
    if (this.filtroComunidadMapa === 'TODAS') return this.sensores;
    return this.sensores.filter(s => s.comunidad === this.filtroComunidadMapa);
  }

  public obtenerPosicionMapa(sensor: SensorModel): { top: string; left: string } {
    const mapaCoordenadas: { [key: string]: { top: number; left: number } } = {
      'Boca del Monte': { top: 10, left: 52 },
      'El Porvenir': { top: 16, left: 72 },
      'Chichimecas': { top: 22, left: 60 },
      'El Tablón': { top: 27, left: 32 },
      'Colmenas': { top: 31, left: 76 },
      'El Zapote': { top: 35, left: 22 },
      'El Durazno': { top: 39, left: 68 },
      'Santa Rosita': { top: 47, left: 50 },
      'Santa Elena Barillas': { top: 55, left: 64 },
      'Los Dolores': { top: 67, left: 38 },
      'Los Pocitos': { top: 75, left: 26 },
      'El Jocotillo': { top: 73, left: 78 },
      'El Obrajuelo': { top: 87, left: 46 }
    };

    if (mapaCoordenadas[sensor.comunidad]) {
      const coord = mapaCoordenadas[sensor.comunidad];
      return { top: `${coord.top}%`, left: `${coord.left}%` };
    }

    const offsetTop = 20 + ((sensor.id * 17) % 65);
    const offsetLeft = 25 + ((sensor.id * 23) % 55);
    return { top: `${offsetTop}%`, left: `${offsetLeft}%` };
  }

  public generarPuntosSvg(lecturas: number[], ancho: number = 600, alto: number = 180): string {
    if (!lecturas || lecturas.length < 2) return '';
    const min = Math.min(...lecturas) * 0.9;
    const max = Math.max(...lecturas) * 1.1 || 1;
    const rango = max - min || 1;

    const puntos = lecturas.map((val, idx) => {
      const x = (idx / (lecturas.length - 1)) * ancho;
      const y = alto - ((val - min) / rango) * (alto - 30) - 15;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return puntos.join(' ');
  }

  public actualizarUnidadSegunTipo() {
    if (this.nuevoSensor.tipoSensor === 'Temperatura') this.nuevoSensor.unidadMedida = '°C';
    if (this.nuevoSensor.tipoSensor === 'Humedad') this.nuevoSensor.unidadMedida = '%';
    if (this.nuevoSensor.tipoSensor === 'Viento') this.nuevoSensor.unidadMedida = 'km/h';
    if (this.nuevoSensor.tipoSensor === 'Lluvia') this.nuevoSensor.unidadMedida = 'mm';
    if (this.nuevoSensor.tipoSensor === 'NivelRio') this.nuevoSensor.unidadMedida = 'm';
  }

  public agregarNuevoSensor() {
    if (!this.nuevoSensor.nombre || !this.nuevoSensor.comunidad) {
      alert('Por favor ingresa el nombre y selecciona la comunidad del sensor.');
      return;
    }

    this.actualizarUnidadSegunTipo();

    const ubicacionFinal = this.nuevoSensor.ubicacion 
      ? `${this.nuevoSensor.comunidad} (${this.nuevoSensor.ubicacion})`
      : `Aldea ${this.nuevoSensor.comunidad}, Villa Canales`;

    const nuevo: SensorModel = {
      id: Date.now(),
      nombre: this.nuevoSensor.nombre,
      codigoIdentificador: `SENS-${this.nuevoSensor.tipoSensor.toUpperCase().substring(0, 4)}-0${this.sensores.length + 1}`,
      comunidad: this.nuevoSensor.comunidad,
      ubicacion: ubicacionFinal,
      latitud: 14.4500 + (Math.random() - 0.5) * 0.05,
      longitud: -90.5100 + (Math.random() - 0.5) * 0.05,
      tipoSensor: this.nuevoSensor.tipoSensor,
      unidadMedida: this.nuevoSensor.unidadMedida,
      valorMinimo: this.nuevoSensor.valorMinimo,
      valorMaximo: this.nuevoSensor.valorMaximo,
      valorActual: Number(((this.nuevoSensor.valorMinimo + this.nuevoSensor.valorMaximo) / 2).toFixed(1)),
      estado: true,
      nivelRiesgoActual: 'Verde',
      mensajeActual: `Sensor instalado en ${ubicacionFinal} y operando en rango normal.`,
      fechaInstalacion: new Date().toLocaleDateString('es-GT'),
      historialLecturas: [this.nuevoSensor.valorMinimo, (this.nuevoSensor.valorMinimo + this.nuevoSensor.valorMaximo) / 2]
    };

    this.sensores.push(nuevo);
    this.climaService.sensores$.next([...this.sensores]);
    this.climaService.registrarEnBitacora(
      'Nuevo Sensor Agregado',
      'Sensores',
      `Sensor ${nuevo.nombre} (${nuevo.codigoIdentificador}) registrado en ${ubicacionFinal}.`
    );

    this.modalAgregarSensor = false;
    this.nuevoSensor = {
      nombre: '',
      tipoSensor: 'Temperatura',
      comunidad: 'Los Pocitos',
      ubicacion: '',
      unidadMedida: '°C',
      valorMinimo: 10,
      valorMaximo: 35
    };
  }

  // =========================================================================
  // GESTIÓN DE REPORTERÍA Y PDF (FASE 3)
  // =========================================================================
  public cargarReportesYIot() {
    this.climaService.getTiposReportes().subscribe(tipos => {
      this.tiposReportes = tipos;
    });

    this.climaService.getHistorialReportes().subscribe(historial => {
      this.historialReportes = historial;
    });

    this.climaService.getEstadoSensoresIot().subscribe(res => {
      this.resumenIot = res;
    });
  }

  public seleccionarReporte(codigo: string) {
    this.reporteSeleccionado = codigo;
    this.ultimoReporteGenerado = null;
  }

  public generarReporteSeleccionado() {
    this.generandoPdf = true;
    this.ultimoReporteGenerado = null;

    this.climaService.generarReportePdf(this.reporteSeleccionado, this.filtrosReporte).subscribe({
      next: (meta) => {
        this.generandoPdf = false;
        this.ultimoReporteGenerado = meta;
        this.historialReportes.unshift(meta);
        this.mensajeExito = `Reporte ${meta.type} (${meta.reportId}) generado exitosamente en formato PDF por el backend.`;
      },
      error: () => {
        this.generandoPdf = false;
        alert('Ocurrió un error al generar el reporte en el microservicio.');
      }
    });
  }

  public descargarReporte(rep: ReporteMetadata) {
    this.climaService.descargarReportePdf(rep.reportId, rep.fileName);
  }

  // =========================================================================
  // TELEMETRÍA IoT Y CONEXIÓN DE SENSORES FÍSICOS
  // =========================================================================
  public probarIngestaIot() {
    this.probandoIot = true;
    this.resultadoIot = null;

    const payload = {
      codigoSensor: this.sensorIotPrueba.codigoSensor,
      valor: Number(this.sensorIotPrueba.valor),
      unidad: this.sensorIotPrueba.unidad,
      bateria: 97,
      ipDispositivo: '192.168.1.105',
      timestamp: new Date().toISOString()
    };

    this.climaService.probarIngestaSensorIot(payload).subscribe({
      next: (res) => {
        this.probandoIot = false;
        this.resultadoIot = res;
        this.climaService.getEstadoSensoresIot().subscribe(s => this.resumenIot = s);
      },
      error: (err) => {
        this.probandoIot = false;
        this.resultadoIot = { status: 'ERROR', message: err.message };
      }
    });
  }

  public copiarComandoCurl() {
    const curl = `curl -X POST http://localhost:8080/api/sensors/ingest \\
  -H "Content-Type: application/json" \\
  -H "X-Sensor-Key: API-KEY-SENS-TEMP-01-2026" \\
  -d '{"codigoSensor":"${this.sensorIotPrueba.codigoSensor}","valor":${this.sensorIotPrueba.valor},"unidad":"${this.sensorIotPrueba.unidad}"}'`;
    navigator.clipboard.writeText(curl);
    alert('Comando cURL copiado al portapapeles.');
  }

  // =========================================================================
  // MÓDULO DE GESTIÓN DE USUARIOS (CREAR / EDITAR PARA ADMINISTRADORES)
  // =========================================================================
  public cargarUsuarios() {
    this.cargandoUsuarios = true;
    this.climaService.getUsuarios().subscribe(users => {
      this.usuarios = users || [];
      this.cargandoUsuarios = false;
      this.cdr.detectChanges();
    });
  }

  public abrirModalCrearUsuario() {
    this.editandoUsuario = false;
    this.usuarioForm = { nombre: '', email: '', password: '', rol: 'Operador', activo: true };
    this.modalUsuario = true;
    this.cdr.detectChanges();
  }

  public abrirModalEditarUsuario(u: any) {
    this.editandoUsuario = true;
    this.usuarioForm = { id: u.id, nombre: u.nombre, email: u.email, password: '', rol: u.rol, activo: u.activo !== false };
    this.modalUsuario = true;
    this.cdr.detectChanges();
  }

  public guardarUsuario() {
    if (!this.usuarioForm.nombre || !this.usuarioForm.email) {
      alert('Nombre y correo electrónico son requeridos.');
      return;
    }
    if (!this.editandoUsuario && !this.usuarioForm.password) {
      alert('La contraseña es obligatoria para nuevos usuarios.');
      return;
    }

    if (this.editandoUsuario && this.usuarioForm.id) {
      this.climaService.actualizarUsuario(this.usuarioForm.id, this.usuarioForm).subscribe({
        next: () => {
          this.modalUsuario = false;
          this.mensajeExito = `Usuario ${this.usuarioForm.nombre} actualizado correctamente.`;
          this.cargarUsuarios();
          this.cdr.detectChanges();
        },
        error: (err) => alert('Error al actualizar usuario: ' + (err?.error?.message || err.message))
      });
    } else {
      this.climaService.crearUsuario(this.usuarioForm as any).subscribe({
        next: () => {
          this.modalUsuario = false;
          this.mensajeExito = `Usuario ${this.usuarioForm.nombre} creado exitosamente.`;
          this.cargarUsuarios();
          this.cdr.detectChanges();
        },
        error: (err) => alert('Error al registrar usuario: ' + (err?.error?.message || err.message))
      });
    }
  }

  public toggleEstadoUsuario(u: any) {
    const nuevoEstado = !u.activo;
    this.climaService.actualizarUsuario(u.id, { ...u, activo: nuevoEstado }).subscribe({
      next: () => {
        u.activo = nuevoEstado;
        this.cdr.detectChanges();
      }
    });
  }
}
