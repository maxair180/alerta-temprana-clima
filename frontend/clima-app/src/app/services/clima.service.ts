import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ClimaService {
  private apiUrl = 'https://localhost:7000/api';
  private hubUrl = 'https://localhost:7000/climaHub';
  private hubConnection!: signalR.HubConnection;

  public lecturas$ = new BehaviorSubject<any>(null);

  constructor(private http: HttpClient) {
    this.iniciarConexionSignalR();
  }

  private iniciarConexionSignalR() {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl)
      .withAutomaticReconnect()
      .build();

    this.hubConnection
      .start()
      .then(() => console.log('Conexión SignalR establecida'))
      .catch(err => console.error('Error al conectar con SignalR:', err));

    this.hubConnection.on('RecibirLectura', (data) => {
      this.lecturas$.next(data);
    });
  }

  getSensores(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/sensores`);
  }

  getAlertas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/alertas`);
  }

  getHistorial(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/alertas/historial`);
  }
}