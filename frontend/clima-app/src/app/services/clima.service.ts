import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

export interface SensorModel {
  id: number;
  usuarioId?: number;
  nombre: string;
  codigoIdentificador: string;
  comunidad: string; // Aldea / Sector de Villa Canales
  ubicacion: string;
  latitud: number;
  longitud: number;
  tipoSensor: 'Temperatura' | 'Humedad' | 'Viento' | 'Lluvia' | 'NivelRio';
  unidadMedida: string;
  valorMinimo: number;
  valorMaximo: number;
  valorActual: number;
  estado: boolean;
  nivelRiesgoActual: 'Verde' | 'Amarillo' | 'Naranja' | 'Rojo';
  mensajeActual: string;
  fechaInstalacion: string;
  historialLecturas: number[];
}

export interface AlertaModel {
  id: number;
  sensorId: number;
  sensorNombre: string;
  comunidad: string;
  tipoSensor: string;
  nivelRiesgo: 'Verde' | 'Amarillo' | 'Naranja' | 'Rojo';
  mensaje: string;
  valorRegistrado: number;
  unidadMedida: string;
  atendida: boolean;
  fechaHora: string; // Fecha y Hora completa (DD/MM/AAAA, HH:MM:SS)
}

export interface HistorialEventoModel {
  id: number;
  alertaId: number;
  sensorNombre: string;
  comunidad: string;
  tipoFenomeno: 'Inundacion' | 'Sequia' | 'Tormenta' | 'Helada' | 'Incendio forestal';
  descripcion: string;
  nivelGravedad: string;
  fechaHora: string; // Fecha y Hora completa
}

export interface BitacoraModel {
  id: number;
  usuarioNombre: string;
  accionRealizada: string;
  modulo: string;
  detalles: string;
  direccionIP: string;
  fechaHora: string; // Fecha y Hora completa
}

export interface UsuarioAuth {
  id: number;
  nombre: string;
  correo: string;
  rol: 'Administrador' | 'Operador' | 'Consulta';
}

export interface ReporteTipo {
  code: string;
  name: string;
  description: string;
  filters: string[];
  icon: string;
}

export interface ReporteMetadata {
  reportId: string;
  type: string;
  title: string;
  generatedBy: string;
  generatedAt: string;
  filters: any;
  status: string;
  fileName: string;
  fileSize: string;
  downloadCount: number;
  lastDownloadedAt?: string;
  downloadUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClimaService {
  private apiUrl = '/api';
  private hubUrl = '/hubs/climaHub';
  private hubConnection?: signalR.HubConnection;

  // Estado Reactivo
  public sensores$ = new BehaviorSubject<SensorModel[]>([]);
  public alertas$ = new BehaviorSubject<AlertaModel[]>([]);
  public historial$ = new BehaviorSubject<HistorialEventoModel[]>([]);
  public bitacora$ = new BehaviorSubject<BitacoraModel[]>([]);
  public alertaEmergente$ = new BehaviorSubject<AlertaModel | null>(null);
  public conectadoSignalR$ = new BehaviorSubject<boolean>(false);
  public sonidoHabilitado$ = new BehaviorSubject<boolean>(true);
  public usuarioActual$ = new BehaviorSubject<UsuarioAuth | null>(null);

  private audioCtx?: AudioContext;
  private timerSimuladorLocal?: any;

  constructor(private http: HttpClient) {
    this.verificarSesionPrevia();
    this.cargarDatosIniciales();
    this.cargarHistorialDesdeApi();
    this.cargarAlertasDesdeApi();
    this.iniciarConexionSignalR();
    // this.iniciarSimuladorRespaldo(); // APAGADO: Ahora usa 100% el backend de SQL
  }

  private formatearFechaHora(fecha: Date = new Date()): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dia = pad(fecha.getDate());
    const mes = pad(fecha.getMonth() + 1);
    const anio = fecha.getFullYear();
    const horas = pad(fecha.getHours());
    const minutos = pad(fecha.getMinutes());
    const segundos = pad(fecha.getSeconds());
    return `${dia}/${mes}/${anio} ${horas}:${minutos}:${segundos}`;
  }

  // =========================================================================
  // 1. GESTIÓN DE AUTENTICACIÓN / LOGIN
  // =========================================================================
  private verificarSesionPrevia() {
    const sesionGuardada = localStorage.getItem('clima_usuario_sesion');
    if (sesionGuardada) {
      try {
        this.usuarioActual$.next(JSON.parse(sesionGuardada));
      } catch (e) {
        localStorage.removeItem('clima_usuario_sesion');
      }
    }
  }

  public login(correo: string, contrasenia: string): Observable<boolean> {
    return new Observable<boolean>(observer => {
      this.http.post<any>(`${this.apiUrl}/auth/login`, { email: correo, password: contrasenia })
        .pipe(timeout(6000))
        .subscribe({
          next: (res) => {
            try {
              const u = res?.usuario || {};
              const usuario: UsuarioAuth = {
                id: u.id || 1,
                nombre: u.nombre || 'Usuario Autorizado',
                correo: u.email || correo,
                rol: u.rol || 'Administrador'
              };
              if (res?.token) {
                localStorage.setItem('token', res.token);
              }
              this.usuarioActual$.next(usuario);
              localStorage.setItem('clima_usuario_sesion', JSON.stringify(usuario));
              
              this.cargarAlertasDesdeApi();
              this.cargarHistorialDesdeApi();
              this.cargarBitacoraDesdeApi();

              observer.next(true);
              observer.complete();
            } catch (ex) {
              console.error('Error procesando respuesta de sesión:', ex);
              observer.next(false);
              observer.complete();
            }
          },
          error: (err) => {
            console.error('Error HTTP en login:', err);
            observer.next(false);
            observer.complete();
          }
        });
    });
  }

  public logout() {
    const actual = this.usuarioActual$.getValue();
    if (actual) {
      this.registrarEnBitacora('Cierre de Sesión', 'Seguridad', `Cierre de sesión de ${actual.nombre}.`);
    }
    this.usuarioActual$.next(null);
    localStorage.removeItem('clima_usuario_sesion');
    localStorage.removeItem('token');
  }

  public getToken(): string | null {
    return localStorage.getItem('token');
  }

  // =========================================================================
  // 2. CARGA INICIAL CON ALDEAS OFICIALES DE VILLA CANALES
  // =========================================================================
  private cargarDatosIniciales() {
    const ahora = new Date();
    const sensoresBase: SensorModel[] = [
      {
        id: 1,
        nombre: 'Sensor Temperatura - Valle Central',
        codigoIdentificador: 'SENS-TEMP-01',
        comunidad: 'El Tablón',
        ubicacion: 'Aldea El Tablón (Sector Agrícola Central)',
        latitud: 14.4820,
        longitud: -90.5340,
        tipoSensor: 'Temperatura',
        unidadMedida: '°C',
        valorMinimo: 10.0,
        valorMaximo: 35.0,
        valorActual: 23.4,
        estado: true,
        nivelRiesgoActual: 'Verde',
        mensajeActual: 'Temperatura óptima y condiciones estables.',
        fechaInstalacion: this.formatearFechaHora(new Date(Date.now() - 86400000 * 30)),
        historialLecturas: [21, 22, 23, 23.8, 23.4]
      },
      {
        id: 2,
        nombre: 'Sensor Humedad Relativa - Cultivos',
        codigoIdentificador: 'SENS-HUM-01',
        comunidad: 'Santa Elena Barillas',
        ubicacion: 'Aldea Santa Elena Barillas (Plantaciones de Café)',
        latitud: 14.4350,
        longitud: -90.5180,
        tipoSensor: 'Humedad',
        unidadMedida: '%',
        valorMinimo: 40.0,
        valorMaximo: 85.0,
        valorActual: 68.0,
        estado: true,
        nivelRiesgoActual: 'Verde',
        mensajeActual: 'Humedad relativa favorable.',
        fechaInstalacion: this.formatearFechaHora(new Date(Date.now() - 86400000 * 25)),
        historialLecturas: [60, 62, 65, 66, 68]
      },
      {
        id: 3,
        nombre: 'Anemómetro Velocidad del Viento',
        codigoIdentificador: 'SENS-VIEN-01',
        comunidad: 'Boca del Monte',
        ubicacion: 'Aldea Boca del Monte (Colina El Mirador Zona 01)',
        latitud: 14.5380,
        longitud: -90.5150,
        tipoSensor: 'Viento',
        unidadMedida: 'km/h',
        valorMinimo: 0.0,
        valorMaximo: 45.0,
        valorActual: 18.2,
        estado: true,
        nivelRiesgoActual: 'Verde',
        mensajeActual: 'Brisa moderada sin riesgo.',
        fechaInstalacion: this.formatearFechaHora(new Date(Date.now() - 86400000 * 20)),
        historialLecturas: [12, 14, 15, 17, 18.2]
      },
      {
        id: 4,
        nombre: 'Pluviómetro Nivel de Lluvia',
        codigoIdentificador: 'SENS-LLUV-01',
        comunidad: 'El Porvenir',
        ubicacion: 'Aldea El Porvenir (Cuenca Hídrica)',
        latitud: 14.4920,
        longitud: -90.4980,
        tipoSensor: 'Lluvia',
        unidadMedida: 'mm',
        valorMinimo: 0.0,
        valorMaximo: 35.0,
        valorActual: 5.0,
        estado: true,
        nivelRiesgoActual: 'Verde',
        mensajeActual: 'Llovizna leve acumulada.',
        fechaInstalacion: this.formatearFechaHora(new Date(Date.now() - 86400000 * 15)),
        historialLecturas: [0, 1, 2, 3.5, 5]
      },
      {
        id: 5,
        nombre: 'Sensor Nivel de Río / Reservorio',
        codigoIdentificador: 'SENS-RIO-01',
        comunidad: 'El Jocotillo',
        ubicacion: 'Aldea El Jocotillo (Represa y Río Villalobos)',
        latitud: 14.3850,
        longitud: -90.4720,
        tipoSensor: 'NivelRio',
        unidadMedida: 'm',
        valorMinimo: 1.0,
        valorMaximo: 4.5,
        valorActual: 2.8,
        estado: true,
        nivelRiesgoActual: 'Verde',
        mensajeActual: 'Caudal dentro del margen seguro.',
        fechaInstalacion: this.formatearFechaHora(new Date(Date.now() - 86400000 * 10)),
        historialLecturas: [2.5, 2.6, 2.7, 2.75, 2.8]
      }
    ];

    this.sensores$.next(sensoresBase);

    // 12 Alertas oficiales de la base de datos (SQL Server / Alertas)
    this.alertas$.next([
      { id: 1, sensorId: 1, sensorNombre: 'Sensor Temperatura - Valle Central', comunidad: 'El Tablón', tipoSensor: 'Temperatura', nivelRiesgo: 'Rojo', mensaje: 'Peligro extremo de incendio por ola de calor.', valorRegistrado: 41.0, unidadMedida: '°C', atendida: false, fechaHora: '07/10/2026 14:14:42' },
      { id: 2, sensorId: 5, sensorNombre: 'Sensor Hidrométrico - Río Villalobos', comunidad: 'El Obrajuelo', tipoSensor: 'NivelRio', nivelRiesgo: 'Rojo', mensaje: 'Desbordamiento inminente de rio.', valorRegistrado: 18.0, unidadMedida: 'm', atendida: false, fechaHora: '07/10/2026 14:15:02' },
      { id: 3, sensorId: 5, sensorNombre: 'Sensor Hidrométrico - Río Villalobos', comunidad: 'El Obrajuelo', tipoSensor: 'NivelRio', nivelRiesgo: 'Rojo', mensaje: 'Desbordamiento inminente de rio.', valorRegistrado: 19.0, unidadMedida: 'm', atendida: false, fechaHora: '07/10/2026 14:15:12' },
      { id: 4, sensorId: 1, sensorNombre: 'Sensor Temperatura - Valle Central', comunidad: 'El Tablón', tipoSensor: 'Temperatura', nivelRiesgo: 'Rojo', mensaje: 'Peligro extremo de incendio por ola de calor.', valorRegistrado: 42.0, unidadMedida: '°C', atendida: false, fechaHora: '07/10/2026 14:15:32' },
      { id: 5, sensorId: 1, sensorNombre: 'Sensor Temperatura - Valle Central', comunidad: 'El Tablón', tipoSensor: 'Temperatura', nivelRiesgo: 'Rojo', mensaje: 'Peligro de helada profunda. Daño a cultivos.', valorRegistrado: -5.0, unidadMedida: '°C', atendida: false, fechaHora: '07/10/2026 14:15:52' },
      { id: 6, sensorId: 5, sensorNombre: 'Sensor Hidrométrico - Río Villalobos', comunidad: 'El Obrajuelo', tipoSensor: 'NivelRio', nivelRiesgo: 'Rojo', mensaje: 'Desbordamiento inminente de rio.', valorRegistrado: 14.0, unidadMedida: 'm', atendida: false, fechaHora: '07/10/2026 14:15:52' },
      { id: 7, sensorId: 1, sensorNombre: 'Sensor Temperatura - Valle Central', comunidad: 'El Tablón', tipoSensor: 'Temperatura', nivelRiesgo: 'Rojo', mensaje: 'Peligro de helada profunda. Daño a cultivos.', valorRegistrado: 0.0, unidadMedida: '°C', atendida: false, fechaHora: '07/10/2026 14:16:22' },
      { id: 8, sensorId: 5, sensorNombre: 'Sensor Hidrométrico - Río Villalobos', comunidad: 'El Obrajuelo', tipoSensor: 'NivelRio', nivelRiesgo: 'Rojo', mensaje: 'Desbordamiento inminente de rio.', valorRegistrado: 25.0, unidadMedida: 'm', atendida: false, fechaHora: '07/10/2026 14:16:33' },
      { id: 9, sensorId: 1, sensorNombre: 'Sensor Temperatura - Valle Central', comunidad: 'El Tablón', tipoSensor: 'Temperatura', nivelRiesgo: 'Rojo', mensaje: 'Peligro extremo de incendio por ola de calor.', valorRegistrado: 40.0, unidadMedida: '°C', atendida: false, fechaHora: '07/10/2026 14:16:43' },
      { id: 10, sensorId: 5, sensorNombre: 'Sensor Hidrométrico - Río Villalobos', comunidad: 'El Obrajuelo', tipoSensor: 'NivelRio', nivelRiesgo: 'Rojo', mensaje: 'Desbordamiento inminente de rio.', valorRegistrado: 21.0, unidadMedida: 'm', atendida: false, fechaHora: '07/10/2026 14:16:43' },
      { id: 11, sensorId: 5, sensorNombre: 'Sensor Hidrométrico - Río Villalobos', comunidad: 'El Obrajuelo', tipoSensor: 'NivelRio', nivelRiesgo: 'Rojo', mensaje: 'Desbordamiento inminente de rio.', valorRegistrado: 14.0, unidadMedida: 'm', atendida: false, fechaHora: '07/10/2026 14:17:03' },
      { id: 12, sensorId: 1, sensorNombre: 'Sensor Temperatura - Valle Central', comunidad: 'El Tablón', tipoSensor: 'Temperatura', nivelRiesgo: 'Rojo', mensaje: 'Peligro de helada profunda. Daño a cultivos.', valorRegistrado: 0.0, unidadMedida: '°C', atendida: false, fechaHora: '07/10/2026 14:17:23' }
    ]);

    // Eventos e Historial iniciales con Fecha y Hora
    this.historial$.next([
      {
        id: 101,
        alertaId: 1,
        sensorNombre: 'Sensor Temperatura - Valle Central',
        comunidad: 'El Tablón',
        tipoFenomeno: 'Helada',
        descripcion: 'Descenso térmico a 3.5°C en la madrugada.',
        nivelGravedad: 'Amarillo',
        fechaHora: this.formatearFechaHora(new Date(Date.now() - 14400000))
      },
      {
        id: 102,
        alertaId: 2,
        sensorNombre: 'Pluviómetro Nivel de Lluvia',
        comunidad: 'El Porvenir',
        tipoFenomeno: 'Tormenta',
        descripcion: 'Lluvia intensa de 42mm registrada durante el paso de onda tropical.',
        nivelGravedad: 'Naranja',
        fechaHora: this.formatearFechaHora(new Date(Date.now() - 28800000))
      }
    ]);

    this.bitacora$.next([
      {
        id: 1,
        usuarioNombre: 'Carlos Fernando Cachin (Admin)',
        accionRealizada: 'Inicialización de Plataforma',
        modulo: 'Sistema',
        detalles: 'Carga de 5 sensores en el Municipio de Villa Canales.',
        direccionIP: '127.0.0.1',
        fechaHora: this.formatearFechaHora(new Date(Date.now() - 3600000))
      }
    ]);

    this.cargarBitacoraDesdeApi();
    this.cargarAlertasDesdeApi();
    this.cargarHistorialDesdeApi();
  }

  public cargarBitacoraDesdeApi() {
    this.http.get<BitacoraModel[]>(`${this.apiUrl}/bitacora`).pipe(
      catchError(() => of([]))
    ).subscribe(data => {
      this.bitacora$.next(data || []);
    });
  }

  public cargarHistorialDesdeApi() {
    this.http.get<any[]>(`${this.apiUrl}/HistorialEventos`).pipe(
      catchError(() => this.http.get<any[]>(`${this.apiUrl}/alerts/events`).pipe(catchError(() => of([]))))
    ).subscribe(data => {
      if (data && data.length > 0) {
        const mapeados: HistorialEventoModel[] = data.map((e: any) => ({
          id: e.id || 0,
          alertaId: e.alertaId || e.id || 0,
          sensorNombre: e.sensorNombre || `Sensor ${e.sensorId || ''}`,
          comunidad: e.comunidad || `Comunidad ${e.comunidadId || ''}`,
          tipoFenomeno: e.tipoFenomeno || 'Inundacion',
          descripcion: e.descripcion || 'Incidente climático registrado',
          nivelGravedad: e.nivelGravedad || 'Amarillo',
          fechaHora: typeof e.fechaHora === 'string' ? e.fechaHora : this.formatearFechaHora(new Date(e.fechaHora || Date.now()))
        }));
        this.historial$.next(mapeados);
      }
    });
  }

  public cargarAlertasDesdeApi() {
    this.http.get<any[]>(`${this.apiUrl}/alertas`).pipe(
      catchError(() => this.http.get<any[]>(`${this.apiUrl}/alerts`).pipe(catchError(() => of([]))))
    ).subscribe(data => {
      if (data && data.length > 0) {
        const mapeadas: AlertaModel[] = data.map((a: any) => ({
          id: a.id || 0,
          sensorId: a.sensorId || 1,
          sensorNombre: a.sensorNombre || (a.sensorId === 5 ? 'Sensor Hidrométrico - Río Villalobos' : 'Sensor Temperatura - Valle Central'),
          comunidad: a.comunidad || (a.comunidadId === 13 || a.sensorId === 5 ? 'El Obrajuelo' : 'El Tablón'),
          tipoSensor: a.tipoSensor || (a.sensorId === 5 ? 'NivelRio' : 'Temperatura'),
          nivelRiesgo: (a.nivelRiesgo || 'Rojo') as any,
          mensaje: a.mensaje || 'Condición climática crítica detectada.',
          valorRegistrado: a.valorRegistrado ?? a.valor ?? 0,
          unidadMedida: a.unidadMedida || (a.tipoSensor === 'NivelRio' || a.sensorId === 5 ? 'm' : '°C'),
          atendida: a.atendida === true || a.estado === 'Atendida',
          fechaHora: typeof a.fechaHora === 'string' ? a.fechaHora : this.formatearFechaHora(new Date(a.fechaHora || Date.now()))
        }));
        this.alertas$.next(mapeadas);
      }
    });
  }

  // =========================================================================
  // GESTIÓN DE USUARIOS (MÓDULO DE ADMINISTRACIÓN)
  // =========================================================================
  public getUsuarios(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/auth/users`).pipe(
      catchError(() => of([
        { id: 6, nombre: 'Admin Inicial', email: 'admin@clima.gt', rol: 'Administrador', activo: true },
        { id: 7, nombre: 'Christian Garcia', email: 'christian@clima.gt', rol: 'Administrador', activo: true },
        { id: 8, nombre: 'Carlos Fernando Cachin', email: 'carlos@clima.gt', rol: 'Operador', activo: true },
        { id: 9, nombre: 'MELANNIE LORENZANA', email: 'melannie@clima.gt', rol: 'Consulta', activo: true }
      ]))
    );
  }

  public crearUsuario(usuario: { nombre: string; email: string; password: string; rol: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/users`, usuario);
  }

  public actualizarUsuario(id: number, usuario: { nombre: string; email: string; rol: string; activo?: boolean; password?: string }): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/auth/users/${id}`, usuario);
  }

  public desactivarUsuario(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/auth/users/${id}`);
  }

  // =========================================================================
  // 3. CONEXIÓN SIGNALR CON RECONEXIÓN
  // =========================================================================
  private iniciarConexionSignalR() {
    try {
      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(this.hubUrl)
        .withAutomaticReconnect()
        .build();

      this.hubConnection
        .start()
        .then(() => {
          this.conectadoSignalR$.next(true);
          console.log('📡 SignalR Conectado con éxito a ClimaApi');
        })
        .catch(err => {
          this.conectadoSignalR$.next(false);
          console.log('ℹ️ SignalR en modo local simulado (esperando API):', err?.message || err);
        });

      this.hubConnection.on('RecibirLectura', (data: any) => {
        this.procesarLecturaEntrante(data);
      });
    } catch (e) {
      console.log('SignalR no disponible localmente, simulador autónomo activo.');
    }
  }

  // =========================================================================
  // 4. PROCESAMIENTO DE LECTURAS Y EVALUACIÓN DE REGLAS
  // =========================================================================
  public procesarLecturaEntrante(data: {
    alertaId?: number;
    sensorId: number;
    valor: number;
    nivelRiesgo?: 'Verde' | 'Amarillo' | 'Naranja' | 'Rojo';
    mensaje?: string;
  }) {
    const sensores = this.sensores$.getValue();
    const sensor = sensores.find(s => s.id === data.sensorId);
    if (!sensor || !sensor.estado) return;

    sensor.valorActual = Number(data.valor.toFixed(1));
    sensor.historialLecturas = [...sensor.historialLecturas.slice(-14), sensor.valorActual];

    const evalResult = this.evaluarReglasRiesgo(sensor.tipoSensor, sensor.valorActual);
    sensor.nivelRiesgoActual = data.nivelRiesgo || evalResult.nivel;
    sensor.mensajeActual = data.mensaje || evalResult.mensaje;

    this.sensores$.next([...sensores]);

    if (sensor.nivelRiesgoActual !== 'Verde') {
      const fechaHoraActual = this.formatearFechaHora();
      const nuevaAlerta: AlertaModel = {
        id: data.alertaId || Date.now(),
        sensorId: sensor.id,
        sensorNombre: sensor.nombre,
        comunidad: sensor.comunidad,
        tipoSensor: sensor.tipoSensor,
        nivelRiesgo: sensor.nivelRiesgoActual,
        mensaje: sensor.mensajeActual,
        valorRegistrado: sensor.valorActual,
        unidadMedida: sensor.unidadMedida,
        atendida: false,
        fechaHora: fechaHoraActual
      };

      const alertasActuales = this.alertas$.getValue();
      this.alertas$.next([nuevaAlerta, ...alertasActuales.slice(0, 49)]);
      this.alertaEmergente$.next(nuevaAlerta);

      if (sensor.nivelRiesgoActual === 'Rojo' || sensor.nivelRiesgoActual === 'Naranja') {
        this.emitirAlertaSonora(sensor.nivelRiesgoActual);
      }

      if (evalResult.fenomeno) {
        const nuevoHistorial: HistorialEventoModel = {
          id: Date.now(),
          alertaId: nuevaAlerta.id,
          sensorNombre: sensor.nombre,
          comunidad: sensor.comunidad,
          tipoFenomeno: evalResult.fenomeno,
          descripcion: sensor.mensajeActual,
          nivelGravedad: sensor.nivelRiesgoActual,
          fechaHora: fechaHoraActual
        };
        this.historial$.next([nuevoHistorial, ...this.historial$.getValue().slice(0, 49)]);
      }
    }
  }

  private evaluarReglasRiesgo(tipoSensor: string, valor: number): {
    nivel: 'Verde' | 'Amarillo' | 'Naranja' | 'Rojo';
    mensaje: string;
    fenomeno?: 'Inundacion' | 'Sequia' | 'Tormenta' | 'Helada' | 'Incendio forestal';
  } {
    switch (tipoSensor) {
      case 'Temperatura':
        if (valor >= 40) return { nivel: 'Rojo', mensaje: 'Temperatura extrema crítica (≥40°C). Peligro de golpe de calor.', fenomeno: 'Incendio forestal' };
        if (valor >= 35) return { nivel: 'Naranja', mensaje: 'Calor alto de alerta (35-39°C).', fenomeno: 'Incendio forestal' };
        if (valor <= 0) return { nivel: 'Rojo', mensaje: 'Temperatura bajo cero (≤0°C). Congelamiento severo.', fenomeno: 'Helada' };
        if (valor <= 5) return { nivel: 'Amarillo', mensaje: 'Baja temperatura de precaución.', fenomeno: 'Helada' };
        return { nivel: 'Verde', mensaje: 'Temperatura en rango normal y seguro.' };

      case 'Humedad':
        if (valor >= 95) return { nivel: 'Naranja', mensaje: 'Saturación de humedad extrema.', fenomeno: 'Tormenta' };
        if (valor <= 15) return { nivel: 'Rojo', mensaje: 'Humedad críticamente baja (<15%). Riesgo ignición forestal.', fenomeno: 'Sequia' };
        if (valor <= 30) return { nivel: 'Amarillo', mensaje: 'Ambiente seco de precaución.', fenomeno: 'Sequia' };
        return { nivel: 'Verde', mensaje: 'Humedad relativa en rango normal.' };

      case 'Viento':
        if (valor >= 70) return { nivel: 'Rojo', mensaje: 'Vientos destructivos de emergencia (≥70 km/h).', fenomeno: 'Tormenta' };
        if (valor >= 45) return { nivel: 'Naranja', mensaje: 'Vientos fuertes de alerta (45-69 km/h).', fenomeno: 'Tormenta' };
        if (valor >= 30) return { nivel: 'Amarillo', mensaje: 'Ráfagas de viento de precaución.', fenomeno: 'Tormenta' };
        return { nivel: 'Verde', mensaje: 'Velocidad de viento moderada.' };

      case 'Lluvia':
        if (valor >= 80) return { nivel: 'Rojo', mensaje: 'Precipitación torrencial extrema (≥80 mm).', fenomeno: 'Inundacion' };
        if (valor >= 50) return { nivel: 'Naranja', mensaje: 'Lluvia intensa persistente.', fenomeno: 'Tormenta' };
        if (valor >= 25) return { nivel: 'Amarillo', mensaje: 'Lluvia moderada bajo monitoreo.', fenomeno: 'Tormenta' };
        return { nivel: 'Verde', mensaje: 'Precipitación normal.' };

      case 'NivelRio':
        if (valor >= 5.0) return { nivel: 'Rojo', mensaje: '¡Desbordamiento inminente de cauce/represa!', fenomeno: 'Inundacion' };
        if (valor >= 4.0) return { nivel: 'Naranja', mensaje: 'Caudal en nivel de alerta naranja.', fenomeno: 'Inundacion' };
        if (valor <= 0.8) return { nivel: 'Amarillo', mensaje: 'Caudal por debajo de reserva mínima.', fenomeno: 'Sequia' };
        return { nivel: 'Verde', mensaje: 'Nivel hídrico regulado y seguro.' };

      default:
        return { nivel: 'Verde', mensaje: 'Condiciones normales.' };
    }
  }

  // =========================================================================
  // 5. SINTETIZADOR WEB AUDIO API
  // =========================================================================
  public toggleSonido(): boolean {
    const nuevoEstado = !this.sonidoHabilitado$.getValue();
    this.sonidoHabilitado$.next(nuevoEstado);
    return nuevoEstado;
  }

  public emitirAlertaSonora(nivel: 'Naranja' | 'Rojo') {
    if (!this.sonidoHabilitado$.getValue()) return;

    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) this.audioCtx = new AudioContextClass();
      }

      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (nivel === 'Rojo') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, this.audioCtx.currentTime);
        osc.frequency.setValueAtTime(440, this.audioCtx.currentTime + 0.15);
        osc.frequency.setValueAtTime(880, this.audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.55);
        osc.start(this.audioCtx.currentTime);
        osc.stop(this.audioCtx.currentTime + 0.55);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, this.audioCtx.currentTime);
        gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.35);
        osc.start(this.audioCtx.currentTime);
        osc.stop(this.audioCtx.currentTime + 0.35);
      }
    } catch (e) {
      console.warn('Audio bloqueado por navegador:', e);
    }
  }

  // =========================================================================
  // 6. SIMULADOR AUTOMÁTICO EN SEGUNDO PLANO
  // =========================================================================
  private iniciarSimuladorRespaldo() {
    this.timerSimuladorLocal = setInterval(() => {
      const sensores = this.sensores$.getValue();
      if (!sensores || sensores.length === 0) return;

      const activos = sensores.filter(s => s.estado);
      if (activos.length === 0) return;

      const randomSensor = activos[Math.floor(Math.random() * activos.length)];
      let delta = (Math.random() - 0.48) * 3;

      let nuevoValor = randomSensor.valorActual + delta;

      if (randomSensor.tipoSensor === 'Temperatura') nuevoValor = Math.max(-5, Math.min(48, nuevoValor));
      if (randomSensor.tipoSensor === 'Humedad') nuevoValor = Math.max(10, Math.min(100, nuevoValor));
      if (randomSensor.tipoSensor === 'Viento') nuevoValor = Math.max(0, Math.min(95, nuevoValor));
      if (randomSensor.tipoSensor === 'Lluvia') nuevoValor = Math.max(0, Math.min(110, nuevoValor));
      if (randomSensor.tipoSensor === 'NivelRio') nuevoValor = Math.max(0.5, Math.min(6.5, nuevoValor));

      this.procesarLecturaEntrante({
        sensorId: randomSensor.id,
        valor: nuevoValor
      });
    }, 6000);
  }

  // =========================================================================
  // 7. ACCIONES DE ADMINISTRACIÓN Y AUDITORÍA
  // =========================================================================
  public toggleEstadoSensor(id: number) {
    const sensores = this.sensores$.getValue();
    const sensor = sensores.find(s => s.id === id);
    if (sensor) {
      sensor.estado = !sensor.estado;
      this.sensores$.next([...sensores]);
      this.registrarEnBitacora(
        sensor.estado ? 'Sensor Activado' : 'Sensor Desactivado',
        'Sensores',
        `Sensor ${sensor.nombre} (${sensor.codigoIdentificador}) cambiado a ${sensor.estado ? 'Activo' : 'Inactivo'} en ${sensor.comunidad}`
      );
    }
  }

  public atenderAlerta(id: number) {
    const alertas = this.alertas$.getValue();
    const alerta = alertas.find(a => a.id === id);
    const usuario = this.usuarioActual$.getValue();
    const usuarioId = usuario?.id || 1;
    const usuarioNombre = usuario?.nombre || 'Carlos Fernando Cachin';
    
    if (alerta) {
      alerta.atendida = true;
      this.alertas$.next([...alertas]);
      
      this.http.put(`${this.apiUrl}/alertas/${id}/atender`, usuarioId).pipe(
        catchError(() => of(null))
      ).subscribe(() => {
        this.cargarAlertasDesdeApi();
      });

      this.registrarEnBitacora(
        'Alerta Atendida',
        'Monitoreo',
        `Alerta ${alerta.nivelRiesgo} en ${alerta.sensorNombre} (${alerta.comunidad}) atendida por ${usuarioNombre}.`
      );
    }
    if (this.alertaEmergente$.getValue()?.id === id) {
      this.alertaEmergente$.next(null);
    }
  }

  public reiniciarSistemaMonitoreo() {
    this.alertas$.next([]);
    this.historial$.next([]);
    this.alertaEmergente$.next(null);

    const sensores = this.sensores$.getValue().map(s => ({
      ...s,
      estado: true,
      nivelRiesgoActual: 'Verde' as const,
      mensajeActual: 'Condición normal post-reinicio.',
      valorActual: Number(((s.valorMinimo + s.valorMaximo) / 2).toFixed(1))
    }));
    this.sensores$.next(sensores);

    const usuario = this.usuarioActual$.getValue()?.nombre || 'Carlos Fernando Cachin (Admin)';
    this.registrarEnBitacora(
      'Reinicio del Sistema de Monitoreo',
      'Sistema',
      `Procedimiento sp_ReiniciarMonitoreo ejecutado por ${usuario}. Sensores restablecidos a Verde y alertas limpiadas.`
    );

    this.http.post(`${this.apiUrl}/sensores/reiniciar`, {}).pipe(
      catchError(() => of(null))
    ).subscribe();
  }

  public registrarEnBitacora(accion: string, modulo: string, detalles: string) {
    const usuario = this.usuarioActual$.getValue();
    const payload = {
      usuarioId: usuario?.id || 1,
      accion: accion,
      entidad: modulo,
      identificador: 'N/A',
      descripcion: detalles
    };

    this.http.post(`${this.apiUrl}/bitacora`, payload).pipe(
      catchError(() => of(null))
    ).subscribe(() => {
      this.cargarBitacoraDesdeApi();
    });
  }

  public simularEventoExtremo(tipo: 'Inundacion' | 'Incendio' | 'Tormenta' | 'Helada' | 'Sequia') {
    let sensorId = 1;
    let valor = 0;

    if (tipo === 'Incendio') { sensorId = 1; valor = 45.0; } // Calor Extremo [40, 100]
    else if (tipo === 'Sequia') { sensorId = 2; valor = 12.0; }
    else if (tipo === 'Tormenta') { sensorId = 3; valor = 150.0; } // Viento [70, 200]
    else if (tipo === 'Inundacion') { sensorId = 5; valor = 15.0; } // NivelRio [5, 20]
    else if (tipo === 'Helada') { sensorId = 1; valor = -5.0; } // Helada [-20, 0]

    // Enviar directamente al backend para que registre en SQL Server y dispare SignalR
    this.http.post(`${this.apiUrl}/lecturas`, {
      sensorId: sensorId,
      valor: valor,
      unidad: ''
    }).subscribe();

    this.registrarEnBitacora(
      'Simulación de Evento Extremo',
      'Monitoreo',
      `Se ha forzado la simulación de un evento de tipo: ${tipo}.`
    );
  }

  // =========================================================================
  // 8. MICROSERVICIO DE REPORTERÍA Y GENERACIÓN DE PDF (FASE 3)
  // =========================================================================
  public getTiposReportes(): Observable<ReporteTipo[]> {
    return this.http.get<ReporteTipo[]>(`${this.apiUrl}/reports/types`).pipe(
      catchError(() => of([
        { code: 'RF-REP-01', name: 'Reporte de Comunidades', description: 'Cobertura de las 13 Aldeas de Villa Canales y sensores asignados.', filters: ['estado', 'zona'], icon: 'map-pin' },
        { code: 'RF-REP-02', name: 'Reporte de Sensores', description: 'Padrón de estaciones meteorológicas y parámetros técnicos.', filters: ['tipoSensor', 'comunidad'], icon: 'cpu' },
        { code: 'RF-REP-03', name: 'Reporte de Lecturas', description: 'Historial de telemetría ambiental filtrable por fechas.', filters: ['fechaInicio', 'fechaFin', 'comunidad', 'tipoSensor'], icon: 'activity' },
        { code: 'RF-REP-04', name: 'Reporte de Alertas', description: 'Consolidado de alertas emitidas, niveles y estados.', filters: ['nivelRiesgo', 'comunidad', 'fenomeno'], icon: 'bell' },
        { code: 'RF-REP-05', name: 'Reporte de Historial de Eventos', description: 'Registro de incidentes climáticos extremos clasificados.', filters: ['tipoFenomeno'], icon: 'cloud-lightning' },
        { code: 'RF-REP-06', name: 'Reporte de Estado de Sensores', description: 'Diagnóstico de comunicación IoT y salud de hardware.', filters: ['estadoComunicacion'], icon: 'wifi' },
        { code: 'RF-REP-07', name: 'Reporte de Estadísticas Climáticas', description: 'Métricas consolidadas (temperatura prom/mín/máx, lluvia, etc.).', filters: ['rango'], icon: 'bar-chart-2' },
        { code: 'RF-REP-08', name: 'Reporte Ejecutivo Global', description: 'Balance integral municipal para toma de decisiones.', filters: ['alcance'], icon: 'file-text' }
      ]))
    );
  }

  public generarReportePdf(reportType: string, filters: any = {}): Observable<ReporteMetadata> {
    const usuario = this.usuarioActual$.getValue();
    const payload = {
      reportType: reportType,
      generatedBy: usuario?.nombre || 'Carlos Fernando Cachin (Admin)',
      filters: filters
    };

    return this.http.post<ReporteMetadata>(`${this.apiUrl}/reports/generate`, payload).pipe(
      catchError((err) => {
        console.error('Error generando reporte en backend:', err);
        // Fallback objeto
        const fallbackMeta: ReporteMetadata = {
          reportId: `REP-2026-${Math.floor(Math.random() * 900000 + 100000)}`,
          type: reportType,
          title: `Reporte Oficial ${reportType}`,
          generatedBy: usuario?.nombre || 'Administrador',
          generatedAt: new Date().toISOString(),
          filters: filters,
          status: 'COMPLETED',
          fileName: `${reportType}_reporte.pdf`,
          fileSize: '240 KB',
          downloadCount: 0,
          downloadUrl: `${this.apiUrl}/reports/download-mock`
        };
        return of(fallbackMeta);
      })
    );
  }

  public getHistorialReportes(): Observable<ReporteMetadata[]> {
    return this.http.get<ReporteMetadata[]>(`${this.apiUrl}/reports/history`).pipe(
      catchError(() => of([]))
    );
  }

  public descargarReportePdf(reportId: string, fileName: string = 'reporte_clima.pdf') {
    const url = `${this.apiUrl}/reports/${reportId}/download`;
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);

        this.registrarEnBitacora(
          'Descarga de Reporte PDF',
          'Reportería',
          `Documento oficial ${reportId} (${fileName}) descargado por usuario autorizado.`
        );
      },
      error: (err) => {
        console.warn('Descarga directa vía enlace:', err);
        window.open(url, '_blank');
      }
    });
  }

  // =========================================================================
  // 9. TELEMETRÍA IoT Y CONEXIÓN DE HARDWARE FÍSICO
  // =========================================================================
  public getEstadoSensoresIot(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/sensors/status-summary`).pipe(
      catchError(() => of({ total: 6, activos: 6, inactivos: 0, sinComunicacion: 0 }))
    );
  }

  public probarIngestaSensorIot(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/sensors/ingest`, payload).pipe(
      catchError((err) => {
        console.error('Error en prueba de ingesta IoT:', err);
        return of({ status: 'ERROR', message: err.message });
      })
    );
  }
}