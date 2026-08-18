import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClimaService, SensorModel, AlertaModel, HistorialEventoModel, BitacoraModel, UsuarioAuth } from './services/clima.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  public pestanaActiva: 'dashboard' | 'alertas' | 'historial' | 'admin' | 'bitacora' = 'dashboard';

  // Autenticación
  public usuarioActual: UsuarioAuth | null = null;
  public loginForm = {
    correo: 'ccachinm@miumg.edu.gt',
    contrasenia: 'admin123'
  };
  public loginError: string = '';

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
    ubicacion: 'Finca Agrícola El Manantial',
    unidadMedida: '°C',
    valorMinimo: 10,
    valorMaximo: 35
  };

  private subs: Subscription = new Subscription();

  constructor(public climaService: ClimaService) {}

  ngOnInit() {
    this.subs.add(
      this.climaService.usuarioActual$.subscribe(usuario => {
        this.usuarioActual = usuario;
      })
    );

    this.subs.add(
      this.climaService.sensores$.subscribe(sensores => {
        this.sensores = sensores;
        this.calcularEstadoComunidad();
      })
    );

    this.subs.add(
      this.climaService.alertas$.subscribe(alertas => {
        this.alertas = alertas;
      })
    );

    this.subs.add(
      this.climaService.historial$.subscribe(historial => {
        this.historial = historial;
      })
    );

    this.subs.add(
      this.climaService.bitacora$.subscribe(bitacora => {
        this.bitacora = bitacora;
      })
    );

    this.subs.add(
      this.climaService.alertaEmergente$.subscribe(alerta => {
        this.alertaEmergente = alerta;
      })
    );

    this.subs.add(
      this.climaService.conectadoSignalR$.subscribe(conectado => {
        this.conectadoSignalR = conectado;
      })
    );

    this.subs.add(
      this.climaService.sonidoHabilitado$.subscribe(habilitado => {
        this.sonidoHabilitado = habilitado;
      })
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  public ejecutarLogin() {
    this.loginError = '';
    const exito = this.climaService.login(this.loginForm.correo, this.loginForm.contrasenia);
    if (!exito) {
      this.loginError = 'Credenciales inválidas. Usa ccachinm@miumg.edu.gt (clave: admin123) o selecciona un acceso rápido.';
    }
  }

  public loginRapido(rol: 'admin' | 'operador') {
    if (rol === 'admin') {
      this.loginForm.correo = 'ccachinm@miumg.edu.gt';
      this.loginForm.contrasenia = 'admin123';
    } else {
      this.loginForm.correo = 'operador@miumg.edu.gt';
      this.loginForm.contrasenia = 'operador123';
    }
    this.ejecutarLogin();
  }

  public cerrarSesion() {
    this.climaService.logout();
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

  public reiniciarSistema() {
    if (confirm('¿Estás seguro de reiniciar el sistema de monitoreo? Esto restablecerá todos los sensores al estado normal y limpiará las alertas activas según el procedimiento sp_ReiniciarMonitoreo.')) {
      this.climaService.reiniciarSistemaMonitoreo();
    }
  }

  public simularEvento(tipo: 'Inundacion' | 'Incendio' | 'Tormenta' | 'Helada' | 'Sequia') {
    this.climaService.simularEventoExtremo(tipo);
  }

  public get alertasFiltradas(): AlertaModel[] {
    if (this.filtroNivelAlerta === 'TODOS') return this.alertas;
    return this.alertas.filter(a => a.nivelRiesgo === this.filtroNivelAlerta);
  }

  public get historialFiltrado(): HistorialEventoModel[] {
    if (this.filtroFenomeno === 'TODOS') return this.historial;
    return this.historial.filter(h => h.tipoFenomeno === this.filtroFenomeno);
  }

  public get comunidadesUnicas(): string[] {
    const list = Array.from(new Set(this.sensores.map(s => s.comunidad)));
    return ['TODAS', ...list];
  }

  public get sensoresFiltradosMapa(): SensorModel[] {
    if (this.filtroComunidadMapa === 'TODAS') return this.sensores;
    return this.sensores.filter(s => s.comunidad === this.filtroComunidadMapa);
  }

  // Coordenadas geográficas calibradas para las 13 Aldeas de Villa Canales
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
}
