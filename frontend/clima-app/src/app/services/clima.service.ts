import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

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
  rol: 'Administrador' | 'Operador';
}

@Injectable({
  providedIn: 'root'
})
export class ClimaService {
  private apiUrl = 'http://villacanales-clima.duckdns.org:5000/api';
  private hubUrl = 'http://villacanales-clima.duckdns.org:5000/climaHub';
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
    this.iniciarConexionSignalR();
    this.iniciarSimuladorRespaldo();
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

  public login(correo: string, contrasenia: string): boolean {
    // Validación de usuarios preconfigurados del proyecto
    if ((correo === 'ccachinm@miumg.edu.gt' || correo === 'admin@clima.gt') && (contrasenia === 'admin123' || contrasenia === 'Admin2026!')) {
      const usuario: UsuarioAuth = {
        id: 1,
        nombre: 'Carlos Fernando Cachin',
        correo: 'ccachinm@miumg.edu.gt',
        rol: 'Administrador'
      };
      this.usuarioActual$.next(usuario);
      localStorage.setItem('clima_usuario_sesion', JSON.stringify(usuario));
      this.registrarEnBitacora('Inicio de Sesión', 'Seguridad', `Ingreso exitoso como Administrador (${correo}).`);
      return true;
    }

    if (correo === 'cgarciaf11@miumg.edu.gt' && contrasenia === 'YAYA@2026') {
      const usuario: UsuarioAuth = {
        id: 3,
        nombre: 'Christian Garcia',
        correo: 'cgarciaf11@miumg.edu.gt',
        rol: 'Operador'
      };
      this.usuarioActual$.next(usuario);
      localStorage.setItem('clima_usuario_sesion', JSON.stringify(usuario));
      this.registrarEnBitacora('Inicio de Sesión', 'Seguridad', `Ingreso exitoso como Operador (${correo}).`);
      return true;
    }

    if (correo === 'mlorenzanaa@miumg.edu.gt' && contrasenia === 'ROSSE@2026') {
      const usuario: UsuarioAuth = {
        id: 4,
        nombre: 'MELANNIE LORENZANA',
        correo: 'mlorenzanaa@miumg.edu.gt',
        rol: 'Administrador'
      };
      this.usuarioActual$.next(usuario);
      localStorage.setItem('clima_usuario_sesion', JSON.stringify(usuario));
      this.registrarEnBitacora('Inicio de Sesión', 'Seguridad', `Ingreso exitoso como Administrador (${correo}).`);
      return true;
    }

    if (correo === 'operador@miumg.edu.gt' && contrasenia === 'operador123') {
      const usuario: UsuarioAuth = {
        id: 2,
        nombre: 'Operador de Monitoreo',
        correo: 'operador@miumg.edu.gt',
        rol: 'Operador'
      };
      this.usuarioActual$.next(usuario);
      localStorage.setItem('clima_usuario_sesion', JSON.stringify(usuario));
      this.registrarEnBitacora('Inicio de Sesión', 'Seguridad', `Ingreso exitoso como Operador (${correo}).`);
      return true;
    }

    return false;
  }

  public logout() {
    const actual = this.usuarioActual$.getValue();
    if (actual) {
      this.registrarEnBitacora('Cierre de Sesión', 'Seguridad', `Cierre de sesión de ${actual.nombre}.`);
    }
    this.usuarioActual$.next(null);
    localStorage.removeItem('clima_usuario_sesion');
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
        id: Date.now(),
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
    const usuario = this.usuarioActual$.getValue()?.nombre || 'Carlos Fernando Cachin';
    if (alerta) {
      alerta.atendida = true;
      this.alertas$.next([...alertas]);
      this.registrarEnBitacora(
        'Alerta Atendida',
        'Monitoreo',
        `Alerta ${alerta.nivelRiesgo} en ${alerta.sensorNombre} (${alerta.comunidad}) atendida por ${usuario}.`
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
    const bitacoraActual = this.bitacora$.getValue();
    const usuario = this.usuarioActual$.getValue()?.nombre || 'Carlos Fernando Cachin (Admin)';
    const nuevoRegistro: BitacoraModel = {
      id: Date.now(),
      usuarioNombre: usuario,
      accionRealizada: accion,
      modulo: modulo,
      detalles: detalles,
      direccionIP: '192.168.1.10',
      fechaHora: this.formatearFechaHora()
    };
    this.bitacora$.next([nuevoRegistro, ...bitacoraActual.slice(0, 49)]);
  }

  public simularEventoExtremo(tipo: 'Inundacion' | 'Incendio' | 'Tormenta' | 'Helada' | 'Sequia') {
    const sensores = this.sensores$.getValue();
    if (tipo === 'Incendio') {
      const temp = sensores.find(s => s.tipoSensor === 'Temperatura');
      if (temp) this.procesarLecturaEntrante({ sensorId: temp.id, valor: 43.5 });
    } else if (tipo === 'Inundacion') {
      const rio = sensores.find(s => s.tipoSensor === 'NivelRio');
      if (rio) this.procesarLecturaEntrante({ sensorId: rio.id, valor: 5.4 });
    } else if (tipo === 'Tormenta') {
      const viento = sensores.find(s => s.tipoSensor === 'Viento');
      if (viento) this.procesarLecturaEntrante({ sensorId: viento.id, valor: 78.0 });
    } else if (tipo === 'Helada') {
      const temp = sensores.find(s => s.tipoSensor === 'Temperatura');
      if (temp) this.procesarLecturaEntrante({ sensorId: temp.id, valor: -3.2 });
    } else if (tipo === 'Sequia') {
      const hum = sensores.find(s => s.tipoSensor === 'Humedad');
      if (hum) this.procesarLecturaEntrante({ sensorId: hum.id, valor: 12.0 });
    }
  }
}