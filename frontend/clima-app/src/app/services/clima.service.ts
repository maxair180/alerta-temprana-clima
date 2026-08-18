import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export interface SensorModel {
  id: number;
  usuarioId?: number;
  nombre: string;
  codigoIdentificador: string;
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
  tipoSensor: string;
  nivelRiesgo: 'Verde' | 'Amarillo' | 'Naranja' | 'Rojo';
  mensaje: string;
  valorRegistrado: number;
  unidadMedida: string;
  atendida: boolean;
  fechaHora: string;
}

export interface HistorialEventoModel {
  id: number;
  alertaId: number;
  sensorNombre: string;
  tipoFenomeno: 'Inundacion' | 'Sequia' | 'Tormenta' | 'Helada' | 'Incendio forestal';
  descripcion: string;
  nivelGravedad: string;
  fechaHora: string;
}

export interface BitacoraModel {
  id: number;
  usuarioNombre: string;
  accionRealizada: string;
  modulo: string;
  detalles: string;
  direccionIP: string;
  fechaHora: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClimaService {
  private apiUrl = 'http://localhost:5000/api';
  private hubUrl = 'http://localhost:5000/climaHub';
  private hubConnection?: signalR.HubConnection;

  // Reactive State
  public sensores$ = new BehaviorSubject<SensorModel[]>([]);
  public alertas$ = new BehaviorSubject<AlertaModel[]>([]);
  public historial$ = new BehaviorSubject<HistorialEventoModel[]>([]);
  public bitacora$ = new BehaviorSubject<BitacoraModel[]>([]);
  public alertaEmergente$ = new BehaviorSubject<AlertaModel | null>(null);
  public conectadoSignalR$ = new BehaviorSubject<boolean>(false);
  public sonidoHabilitado$ = new BehaviorSubject<boolean>(true);

  private audioCtx?: AudioContext;
  private timerSimuladorLocal?: any;

  constructor(private http: HttpClient) {
    this.cargarDatosIniciales();
    this.iniciarConexionSignalR();
    this.iniciarSimuladorRespaldo();
  }

  // =========================================================================
  // 1. CARGA INICIAL Y DATOS SEMILLA EN MEMORIA
  // =========================================================================
  private cargarDatosIniciales() {
    const sensoresBase: SensorModel[] = [
      {
        id: 1,
        nombre: 'Sensor Temperatura Ambiente - Valle',
        codigoIdentificador: 'SENS-TEMP-01',
        ubicacion: 'Comunidad Rural Norte (Valle Central)',
        latitud: 14.634915,
        longitud: -90.506882,
        tipoSensor: 'Temperatura',
        unidadMedida: '°C',
        valorMinimo: 10.0,
        valorMaximo: 35.0,
        valorActual: 24.5,
        estado: true,
        nivelRiesgoActual: 'Verde',
        mensajeActual: 'Temperatura óptima y condiciones estables.',
        fechaInstalacion: new Date().toISOString(),
        historialLecturas: [22, 23, 24, 23.8, 24.5]
      },
      {
        id: 2,
        nombre: 'Sensor Humedad Relativa - Parcela',
        codigoIdentificador: 'SENS-HUM-01',
        ubicacion: 'Sector Agrícola Central',
        latitud: 14.6321,
        longitud: -90.5094,
        tipoSensor: 'Humedad',
        unidadMedida: '%',
        valorMinimo: 40.0,
        valorMaximo: 85.0,
        valorActual: 68.0,
        estado: true,
        nivelRiesgoActual: 'Verde',
        mensajeActual: 'Humedad favorable para cultivos.',
        fechaInstalacion: new Date().toISOString(),
        historialLecturas: [60, 62, 65, 66, 68]
      },
      {
        id: 3,
        nombre: 'Anemómetro Velocidad del Viento',
        codigoIdentificador: 'SENS-VIEN-01',
        ubicacion: 'Colina El Mirador (Estación Alta)',
        latitud: 14.6402,
        longitud: -90.5011,
        tipoSensor: 'Viento',
        unidadMedida: 'km/h',
        valorMinimo: 0.0,
        valorMaximo: 45.0,
        valorActual: 18.2,
        estado: true,
        nivelRiesgoActual: 'Verde',
        mensajeActual: 'Brisa moderada sin riesgo.',
        fechaInstalacion: new Date().toISOString(),
        historialLecturas: [12, 14, 15, 17, 18.2]
      },
      {
        id: 4,
        nombre: 'Pluviómetro Nivel de Lluvia',
        codigoIdentificador: 'SENS-LLUV-01',
        ubicacion: 'Estación Cuenca Río',
        latitud: 14.6289,
        longitud: -90.5123,
        tipoSensor: 'Lluvia',
        unidadMedida: 'mm',
        valorMinimo: 0.0,
        valorMaximo: 35.0,
        valorActual: 4.0,
        estado: true,
        nivelRiesgoActual: 'Verde',
        mensajeActual: 'Llovizna leve acumulada.',
        fechaInstalacion: new Date().toISOString(),
        historialLecturas: [0, 1, 2, 3.5, 4]
      },
      {
        id: 5,
        nombre: 'Sensor Nivel de Río / Reservorio',
        codigoIdentificador: 'SENS-RIO-01',
        ubicacion: 'Represa Principal Comunitaria',
        latitud: 14.6255,
        longitud: -90.5188,
        tipoSensor: 'NivelRio',
        unidadMedida: 'm',
        valorMinimo: 1.0,
        valorMaximo: 4.5,
        valorActual: 2.8,
        estado: true,
        nivelRiesgoActual: 'Verde',
        mensajeActual: 'Caudal dentro del margen de seguridad.',
        fechaInstalacion: new Date().toISOString(),
        historialLecturas: [2.5, 2.6, 2.7, 2.75, 2.8]
      }
    ];

    this.sensores$.next(sensoresBase);

    // Alertas y bitácora base
    this.bitacora$.next([
      {
        id: 1,
        usuarioNombre: 'Carlos Fernando Cachin (Admin)',
        accionRealizada: 'Inicialización de Plataforma',
        modulo: 'Sistema',
        detalles: 'Carga de 5 sensores meteorológicos rurales.',
        direccionIP: '127.0.0.1',
        fechaHora: new Date(Date.now() - 3600000).toLocaleTimeString()
      }
    ]);
  }

  // =========================================================================
  // 2. CONEXIÓN SIGNALR CON RECONEXIÓN AUTOMÁTICA
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
      console.log('SignalR no disponible localmente, corriendo simulador reactivo.');
    }
  }

  // =========================================================================
  // 3. PROCESADOR DE LECTURAS Y EVALUADOR DE REGLAS DE RIESGO
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

    // Evaluación de reglas si no viene calculada del backend
    const evalResult = this.evaluarReglasRiesgo(sensor.tipoSensor, sensor.valorActual);
    sensor.nivelRiesgoActual = data.nivelRiesgo || evalResult.nivel;
    sensor.mensajeActual = data.mensaje || evalResult.mensaje;

    this.sensores$.next([...sensores]);

    // Generar Alerta si supera Verde
    if (sensor.nivelRiesgoActual !== 'Verde') {
      const nuevaAlerta: AlertaModel = {
        id: Date.now(),
        sensorId: sensor.id,
        sensorNombre: sensor.nombre,
        tipoSensor: sensor.tipoSensor,
        nivelRiesgo: sensor.nivelRiesgoActual,
        mensaje: sensor.mensajeActual,
        valorRegistrado: sensor.valorActual,
        unidadMedida: sensor.unidadMedida,
        atendida: false,
        fechaHora: new Date().toLocaleTimeString()
      };

      const alertasActuales = this.alertas$.getValue();
      this.alertas$.next([nuevaAlerta, ...alertasActuales.slice(0, 49)]);
      this.alertaEmergente$.next(nuevaAlerta);

      // Reproducir sonido para Naranja o Rojo
      if (sensor.nivelRiesgoActual === 'Rojo' || sensor.nivelRiesgoActual === 'Naranja') {
        this.emitirAlertaSonora(sensor.nivelRiesgoActual);
      }

      // Registrar en Historial de Eventos si corresponde
      if (evalResult.fenomeno) {
        const nuevoHistorial: HistorialEventoModel = {
          id: Date.now(),
          alertaId: nuevaAlerta.id,
          sensorNombre: sensor.nombre,
          tipoFenomeno: evalResult.fenomeno,
          descripcion: sensor.mensajeActual,
          nivelGravedad: sensor.nivelRiesgoActual,
          fechaHora: new Date().toLocaleTimeString()
        };
        this.historial$.next([nuevoHistorial, ...this.historial$.getValue().slice(0, 49)]);
      }
    }
  }

  // =========================================================================
  // 4. MOTOR DE EVALUACIÓN DE CONDICIONES Y FENÓMENOS (ESPECIFICACIÓN PDF)
  // =========================================================================
  private evaluarReglasRiesgo(tipoSensor: string, valor: number): {
    nivel: 'Verde' | 'Amarillo' | 'Naranja' | 'Rojo';
    mensaje: string;
    fenomeno?: 'Inundacion' | 'Sequia' | 'Tormenta' | 'Helada' | 'Incendio forestal';
  } {
    switch (tipoSensor) {
      case 'Temperatura':
        if (valor >= 40) return { nivel: 'Rojo', mensaje: 'Temperatura extrema crítica (>40°C). Alto peligro.', fenomeno: 'Incendio forestal' };
        if (valor >= 35) return { nivel: 'Naranja', mensaje: 'Calor alto de precaución (35-39°C).', fenomeno: 'Incendio forestal' };
        if (valor <= 0) return { nivel: 'Rojo', mensaje: 'Temperatura bajo cero (≤0°C). Congelamiento.', fenomeno: 'Helada' };
        if (valor <= 5) return { nivel: 'Amarillo', mensaje: 'Baja temperatura de advertencia.', fenomeno: 'Helada' };
        return { nivel: 'Verde', mensaje: 'Temperatura en rango normal y seguro.' };

      case 'Humedad':
        if (valor >= 95) return { nivel: 'Naranja', mensaje: 'Saturación de humedad extrema.', fenomeno: 'Tormenta' };
        if (valor <= 15) return { nivel: 'Rojo', mensaje: 'Humedad críticamente baja (<15%). Riesgo ignición.', fenomeno: 'Sequia' };
        if (valor <= 30) return { nivel: 'Amarillo', mensaje: 'Ambiente seco de precaución.', fenomeno: 'Sequia' };
        return { nivel: 'Verde', mensaje: 'Humedad relativa en rango normal.' };

      case 'Viento':
        if (valor >= 70) return { nivel: 'Rojo', mensaje: 'Vientos huracanados destructivos (≥70 km/h).', fenomeno: 'Tormenta' };
        if (valor >= 45) return { nivel: 'Naranja', mensaje: 'Vientos fuertes de alerta (45-69 km/h).', fenomeno: 'Tormenta' };
        if (valor >= 30) return { nivel: 'Amarillo', mensaje: 'Ráfagas de viento de precaución.', fenomeno: 'Tormenta' };
        return { nivel: 'Verde', mensaje: 'Velocidad de viento moderada.' };

      case 'Lluvia':
        if (valor >= 80) return { nivel: 'Rojo', mensaje: 'Precipitación torrencial extrema (≥80 mm).', fenomeno: 'Inundacion' };
        if (valor >= 50) return { nivel: 'Naranja', mensaje: 'Lluvia intensa persistente.', fenomeno: 'Tormenta' };
        if (valor >= 25) return { nivel: 'Amarillo', mensaje: 'Lluvia moderada bajo monitoreo.', fenomeno: 'Tormenta' };
        return { nivel: 'Verde', mensaje: 'Precipitación normal.' };

      case 'NivelRio':
        if (valor >= 5.0) return { nivel: 'Rojo', mensaje: '¡Desbordamiento inminente de presa/río!', fenomeno: 'Inundacion' };
        if (valor >= 4.0) return { nivel: 'Naranja', mensaje: 'Caudal en nivel de alerta naranja.', fenomeno: 'Inundacion' };
        if (valor <= 0.8) return { nivel: 'Amarillo', mensaje: 'Caudal por debajo de reserva mínima.', fenomeno: 'Sequia' };
        return { nivel: 'Verde', mensaje: 'Nivel hídrico regulado y seguro.' };

      default:
        return { nivel: 'Verde', mensaje: 'Condiciones normales.' };
    }
  }

  // =========================================================================
  // 5. SINTETIZADOR DE AUDIO (WEB AUDIO API - SIN ARCHIVOS MP3 EXTERNOS)
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
        // Doble tono agudo de emergencia
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, this.audioCtx.currentTime); // La5
        osc.frequency.setValueAtTime(440, this.audioCtx.currentTime + 0.15);
        osc.frequency.setValueAtTime(880, this.audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.55);
        osc.start(this.audioCtx.currentTime);
        osc.stop(this.audioCtx.currentTime + 0.55);
      } else {
        // Tono suave de advertencia naranja
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, this.audioCtx.currentTime); // Mi5
        gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.35);
        osc.start(this.audioCtx.currentTime);
        osc.stop(this.audioCtx.currentTime + 0.35);
      }
    } catch (e) {
      console.warn('Audio no disponible o bloqueado por navegador:', e);
    }
  }

  // =========================================================================
  // 6. SIMULADOR AUTOMÁTICO EN SEGUNDO PLANO
  // =========================================================================
  private iniciarSimuladorRespaldo() {
    this.timerSimuladorLocal = setInterval(() => {
      const sensores = this.sensores$.getValue();
      if (!sensores || sensores.length === 0) return;

      // Elegir un sensor aleatorio activo para simular lectura continua
      const activos = sensores.filter(s => s.estado);
      if (activos.length === 0) return;

      const randomSensor = activos[Math.floor(Math.random() * activos.length)];
      let delta = (Math.random() - 0.48) * 3; // Pequeña fluctuación natural

      let nuevoValor = randomSensor.valorActual + delta;

      // Mantener dentro de límites físicos lógicos
      if (randomSensor.tipoSensor === 'Temperatura') nuevoValor = Math.max(-5, Math.min(48, nuevoValor));
      if (randomSensor.tipoSensor === 'Humedad') nuevoValor = Math.max(10, Math.min(100, nuevoValor));
      if (randomSensor.tipoSensor === 'Viento') nuevoValor = Math.max(0, Math.min(95, nuevoValor));
      if (randomSensor.tipoSensor === 'Lluvia') nuevoValor = Math.max(0, Math.min(110, nuevoValor));
      if (randomSensor.tipoSensor === 'NivelRio') nuevoValor = Math.max(0.5, Math.min(6.5, nuevoValor));

      this.procesarLecturaEntrante({
        sensorId: randomSensor.id,
        valor: nuevoValor
      });
    }, 6000); // Cada 6 segundos una actualización viva
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
        `Sensor ${sensor.nombre} (${sensor.codigoIdentificador}) cambiado a ${sensor.estado ? 'Activo' : 'Inactivo'}`
      );
    }
  }

  public atenderAlerta(id: number) {
    const alertas = this.alertas$.getValue();
    const alerta = alertas.find(a => a.id === id);
    if (alerta) {
      alerta.atendida = true;
      this.alertas$.next([...alertas]);
      this.registrarEnBitacora(
        'Alerta Atendida',
        'Monitoreo',
        `Alerta ${alerta.nivelRiesgo} en ${alerta.sensorNombre} atendida por el operador.`
      );
    }
    if (this.alertaEmergente$.getValue()?.id === id) {
      this.alertaEmergente$.next(null);
    }
  }

  public reiniciarSistemaMonitoreo() {
    // 1. Limpiar alertas e historial
    this.alertas$.next([]);
    this.historial$.next([]);
    this.alertaEmergente$.next(null);

    // 2. Reactivar sensores a valores óptimos verdes
    const sensores = this.sensores$.getValue().map(s => ({
      ...s,
      estado: true,
      nivelRiesgoActual: 'Verde' as const,
      mensajeActual: 'Condición normal post-reinicio.',
      valorActual: (s.valorMinimo + s.valorMaximo) / 2
    }));
    this.sensores$.next(sensores);

    // 3. Registrar en bitácora
    this.registrarEnBitacora(
      'Reinicio del Sistema de Monitoreo',
      'Sistema',
      'Se ejecutó el procedimiento sp_ReiniciarMonitoreo. Sensores reactivados y alertas limpiadas.'
    );

    // Llamada al backend si está disponible
    this.http.post(`${this.apiUrl}/sensores/reiniciar`, {}).pipe(
      catchError(() => of(null))
    ).subscribe();
  }

  public registrarEnBitacora(accion: string, modulo: string, detalles: string) {
    const bitacoraActual = this.bitacora$.getValue();
    const nuevoRegistro: BitacoraModel = {
      id: Date.now(),
      usuarioNombre: 'Carlos Fernando Cachin (Admin)',
      accionRealizada: accion,
      modulo: modulo,
      detalles: detalles,
      direccionIP: '192.168.1.10',
      fechaHora: new Date().toLocaleTimeString()
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