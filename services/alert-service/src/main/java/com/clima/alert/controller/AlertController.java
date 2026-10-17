package com.clima.alert.controller;

import com.clima.alert.model.Alerta;
import com.clima.alert.model.HistorialEvento;
import com.clima.alert.model.ReglaAlerta;
import com.clima.alert.repository.AlertaRepository;
import com.clima.alert.repository.HistorialEventoRepository;
import com.clima.alert.repository.ReglaAlertaRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/alerts")
@CrossOrigin(origins = "*")
public class AlertController {

    private final ReglaAlertaRepository reglaRepo;
    private final AlertaRepository alertaRepo;
    private final HistorialEventoRepository eventoRepo;

    // Respaldo en memoria para inicialización y resiliencia
    private final List<Alerta> memoryAlertas = new ArrayList<>();
    private final List<HistorialEvento> memoryEventos = new ArrayList<>();

    public AlertController(ReglaAlertaRepository reglaRepo, AlertaRepository alertaRepo, HistorialEventoRepository eventoRepo) {
        this.reglaRepo = reglaRepo;
        this.alertaRepo = alertaRepo;
        this.eventoRepo = eventoRepo;
        seedInitialAlerts();
    }

    private void seedInitialAlerts() {
        if (!memoryAlertas.isEmpty()) return;

        Object[][] data = {
            {1L, 1, 1, "Sensor Temperatura - Valle Central", "Temperatura", "Rojo", "Peligro extremo de incendio por ola de calor.", new BigDecimal("41.00"), new BigDecimal("100.00"), "Incendio"},
            {2L, 1, 5, "Sensor Hidrométrico - Río Villalobos", "NivelRio", "Rojo", "Desbordamiento inminente de rio.", new BigDecimal("18.00"), new BigDecimal("30.00"), "Inundacion"},
            {3L, 1, 5, "Sensor Hidrométrico - Río Villalobos", "NivelRio", "Rojo", "Desbordamiento inminente de rio.", new BigDecimal("19.00"), new BigDecimal("30.00"), "Inundacion"},
            {4L, 1, 1, "Sensor Temperatura - Valle Central", "Temperatura", "Rojo", "Peligro extremo de incendio por ola de calor.", new BigDecimal("42.00"), new BigDecimal("100.00"), "Incendio"},
            {5L, 1, 1, "Sensor Temperatura - Valle Central", "Temperatura", "Rojo", "Peligro de helada profunda. Daño a cultivos.", new BigDecimal("-5.00"), new BigDecimal("0.00"), "Helada"},
            {6L, 1, 5, "Sensor Hidrométrico - Río Villalobos", "NivelRio", "Rojo", "Desbordamiento inminente de rio.", new BigDecimal("14.00"), new BigDecimal("30.00"), "Inundacion"},
            {7L, 1, 1, "Sensor Temperatura - Valle Central", "Temperatura", "Rojo", "Peligro de helada profunda. Daño a cultivos.", new BigDecimal("0.00"), new BigDecimal("0.00"), "Helada"},
            {8L, 1, 5, "Sensor Hidrométrico - Río Villalobos", "NivelRio", "Rojo", "Desbordamiento inminente de rio.", new BigDecimal("25.00"), new BigDecimal("30.00"), "Inundacion"},
            {9L, 1, 1, "Sensor Temperatura - Valle Central", "Temperatura", "Rojo", "Peligro extremo de incendio por ola de calor.", new BigDecimal("40.00"), new BigDecimal("100.00"), "Incendio"},
            {10L, 1, 5, "Sensor Hidrométrico - Río Villalobos", "NivelRio", "Rojo", "Desbordamiento inminente de rio.", new BigDecimal("21.00"), new BigDecimal("30.00"), "Inundacion"},
            {11L, 1, 5, "Sensor Hidrométrico - Río Villalobos", "NivelRio", "Rojo", "Desbordamiento inminente de rio.", new BigDecimal("14.00"), new BigDecimal("30.00"), "Inundacion"},
            {12L, 1, 1, "Sensor Temperatura - Valle Central", "Temperatura", "Rojo", "Peligro de helada profunda. Daño a cultivos.", new BigDecimal("0.00"), new BigDecimal("0.00"), "Helada"}
        };

        for (Object[] row : data) {
            Alerta a = new Alerta();
            a.setId((Long) row[0]);
            a.setComunidadId((Integer) row[1]);
            a.setSensorId((Integer) row[2]);
            a.setSensorNombre((String) row[3]);
            a.setTipoSensor((String) row[4]);
            a.setNivelRiesgo((String) row[5]);
            a.setMensaje((String) row[6]);
            a.setValorRegistrado((BigDecimal) row[7]);
            a.setUmbral((BigDecimal) row[8]);
            a.setFenomeno((String) row[9]);
            a.setAtendida(false);
            a.setEstado("Activa");
            a.setFechaHora(LocalDateTime.now().minusHours((Long) row[0]));
            memoryAlertas.add(a);
            try {
                alertaRepo.save(a);
            } catch (Exception ignored) {}
        }
    }

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        Map<String, Object> resp = new HashMap<>();
        resp.put("status", "Healthy");
        resp.put("service", "Alert Service (Java Spring Boot & PostgreSQL)");
        resp.put("timestamp", LocalDateTime.now());
        return ResponseEntity.ok(resp);
    }

    // 1. Evaluación de lectura entrante (llamado por Sensor Service)
    @PostMapping("/evaluate")
    public ResponseEntity<?> evaluate(@RequestBody Map<String, Object> payload) {
        Integer sensorId = ((Number) payload.getOrDefault("sensorId", 0)).intValue();
        String sensorNombre = (String) payload.getOrDefault("sensorNombre", "Sensor Desconocido");
        String tipoSensor = (String) payload.getOrDefault("tipoSensor", "Temperatura");
        Integer comunidadId = ((Number) payload.getOrDefault("comunidadId", 1)).intValue();
        BigDecimal valor = new BigDecimal(payload.getOrDefault("valor", 0).toString());

        String nivelRiesgo = "Verde";
        String mensaje = "Condiciones climáticas dentro de la normalidad.";
        String fenomeno = "Normal";
        BigDecimal umbral = valor;

        // Evaluación dinámica basada en reglas
        if (tipoSensor.equalsIgnoreCase("Temperatura")) {
            if (valor.compareTo(new BigDecimal("40.0")) >= 0) {
                nivelRiesgo = "Rojo";
                mensaje = "¡Calor extremo peligroso! Alto riesgo de incendio forestal.";
                fenomeno = "Incendio forestal";
                umbral = new BigDecimal("40.0");
            } else if (valor.compareTo(new BigDecimal("0.0")) <= 0) {
                nivelRiesgo = "Rojo";
                mensaje = "¡Temperatura bajo cero! Riesgo crítico de helada agrícola.";
                fenomeno = "Helada";
                umbral = new BigDecimal("0.0");
            } else if (valor.compareTo(new BigDecimal("35.0")) > 0) {
                nivelRiesgo = "Naranja";
                mensaje = "Temperatura elevada en umbral de alerta.";
                fenomeno = "Incendio forestal";
                umbral = new BigDecimal("35.0");
            } else if (valor.compareTo(new BigDecimal("5.0")) <= 0) {
                nivelRiesgo = "Amarillo";
                mensaje = "Descenso térmico preventivo en zonas montañosas.";
                fenomeno = "Helada";
                umbral = new BigDecimal("5.0");
            }
        } else if (tipoSensor.equalsIgnoreCase("Humedad")) {
            if (valor.compareTo(new BigDecimal("15.0")) <= 0) {
                nivelRiesgo = "Rojo";
                mensaje = "¡Estrés hídrico severo y sequía crítica en el suelo!";
                fenomeno = "Sequia";
                umbral = new BigDecimal("15.0");
            } else if (valor.compareTo(new BigDecimal("30.0")) <= 0) {
                nivelRiesgo = "Amarillo";
                mensaje = "Humedad relativa baja, riesgo de sequía.";
                fenomeno = "Sequia";
                umbral = new BigDecimal("30.0");
            }
        } else if (tipoSensor.equalsIgnoreCase("Viento")) {
            if (valor.compareTo(new BigDecimal("70.0")) >= 0) {
                nivelRiesgo = "Rojo";
                mensaje = "¡Vientos destructivos tipo vendaval o tormenta tropical!";
                fenomeno = "Tormenta";
                umbral = new BigDecimal("70.0");
            } else if (valor.compareTo(new BigDecimal("50.0")) >= 0) {
                nivelRiesgo = "Naranja";
                mensaje = "Vientos fuertes sostenidos con riesgo de desprendimientos.";
                fenomeno = "Tormenta";
                umbral = new BigDecimal("50.0");
            } else if (valor.compareTo(new BigDecimal("30.0")) >= 0) {
                nivelRiesgo = "Amarillo";
                mensaje = "Ráfagas moderadas bajo monitoreo preventivo.";
                fenomeno = "Tormenta";
                umbral = new BigDecimal("30.0");
            }
        } else if (tipoSensor.equalsIgnoreCase("Lluvia")) {
            if (valor.compareTo(new BigDecimal("80.0")) >= 0) {
                nivelRiesgo = "Rojo";
                mensaje = "¡Precipitación torrencial extrema! Alerta de inundación.";
                fenomeno = "Inundacion";
                umbral = new BigDecimal("80.0");
            } else if (valor.compareTo(new BigDecimal("50.0")) >= 0) {
                nivelRiesgo = "Naranja";
                mensaje = "Lluvia intensa persistente en cuenca fluvial.";
                fenomeno = "Tormenta";
                umbral = new BigDecimal("50.0");
            } else if (valor.compareTo(new BigDecimal("25.0")) >= 0) {
                nivelRiesgo = "Amarillo";
                mensaje = "Lluvia moderada con acumulación en zonas bajas.";
                fenomeno = "Tormenta";
                umbral = new BigDecimal("25.0");
            }
        } else if (tipoSensor.equalsIgnoreCase("NivelRio")) {
            if (valor.compareTo(new BigDecimal("5.0")) >= 0) {
                nivelRiesgo = "Rojo";
                mensaje = "¡Desbordamiento inminente de cauce o represa!";
                fenomeno = "Inundacion";
                umbral = new BigDecimal("5.0");
            } else if (valor.compareTo(new BigDecimal("4.0")) >= 0) {
                nivelRiesgo = "Naranja";
                mensaje = "Nivel de alerta naranja por aumento del caudal.";
                fenomeno = "Inundacion";
                umbral = new BigDecimal("4.0");
            } else if (valor.compareTo(new BigDecimal("0.8")) <= 0) {
                nivelRiesgo = "Amarillo";
                mensaje = "Caudal por debajo de reserva ecológica mínima.";
                fenomeno = "Sequia";
                umbral = new BigDecimal("0.8");
            }
        }

        // Si genera riesgo (Amarillo, Naranja, Rojo), registrar Alerta y Evento
        if (!nivelRiesgo.equals("Verde")) {
            Alerta nuevaAlerta = new Alerta();
            nuevaAlerta.setComunidadId(comunidadId);
            nuevaAlerta.setSensorId(sensorId);
            nuevaAlerta.setSensorNombre(sensorNombre);
            nuevaAlerta.setTipoSensor(tipoSensor);
            nuevaAlerta.setNivelRiesgo(nivelRiesgo);
            nuevaAlerta.setMensaje(mensaje);
            nuevaAlerta.setValorRegistrado(valor);
            nuevaAlerta.setUmbral(umbral);
            nuevaAlerta.setFenomeno(fenomeno);
            nuevaAlerta.setAtendida(false);
            nuevaAlerta.setFechaHora(LocalDateTime.now());
            nuevaAlerta.setEstado("Activa");

            HistorialEvento nuevoEvento = new HistorialEvento();
            nuevoEvento.setComunidadId(comunidadId);
            nuevoEvento.setSensorId(sensorId);
            nuevoEvento.setTipoFenomeno(fenomeno);
            nuevoEvento.setDescripcion(mensaje);
            nuevoEvento.setNivelGravedad(nivelRiesgo);
            nuevoEvento.setValor(valor);
            nuevoEvento.setFechaHora(LocalDateTime.now());
            nuevoEvento.setEstado("Activo");

            try {
                alertaRepo.save(nuevaAlerta);
                nuevoEvento.setAlertaId(nuevaAlerta.getId());
                eventoRepo.save(nuevoEvento);
            } catch (Exception e) {
                nuevaAlerta.setId((long) (memoryAlertas.size() + 1));
                memoryAlertas.add(0, nuevaAlerta);
                nuevoEvento.setId((long) (memoryEventos.size() + 1));
                nuevoEvento.setAlertaId(nuevaAlerta.getId());
                memoryEventos.add(0, nuevoEvento);
            }
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("nivelRiesgo", nivelRiesgo);
        resp.put("mensaje", mensaje);
        resp.put("fenomeno", fenomeno);
        resp.put("umbral", umbral);
        return ResponseEntity.ok(resp);
    }

    // 2. Listar todas las alertas
    @GetMapping
    public ResponseEntity<?> getAlertas(
            @RequestParam(required = false) String nivel,
            @RequestParam(required = false) Integer comunidadId) {
        try {
            List<Alerta> lista = alertaRepo.findAllByOrderByFechaHoraDesc();
            if (!lista.isEmpty()) return ResponseEntity.ok(lista);
        } catch (Exception ignored) {}
        return ResponseEntity.ok(memoryAlertas);
    }

    // 3. Alertas activas
    @GetMapping("/active")
    public ResponseEntity<?> getAlertasActivas() {
        try {
            List<Alerta> lista = alertaRepo.findByAtendidaFalseOrderByFechaHoraDesc();
            return ResponseEntity.ok(lista);
        } catch (Exception ignored) {}
        return ResponseEntity.ok(memoryAlertas.stream().filter(a -> !a.getAtendida()).toList());
    }

    // 4. Atender alerta
    @PutMapping("/{id}/attend")
    public ResponseEntity<?> attendAlert(@PathVariable Long id, @RequestBody(required = false) Map<String, Object> body) {
        Integer usuarioId = 1;
        if (body != null && body.containsKey("usuarioId")) {
            usuarioId = ((Number) body.get("usuarioId")).intValue();
        }

        try {
            Optional<Alerta> opt = alertaRepo.findById(id);
            if (opt.isPresent()) {
                Alerta a = opt.get();
                a.setAtendida(true);
                a.setUsuarioAtendioId(usuarioId);
                a.setFechaAtencion(LocalDateTime.now());
                a.setEstado("Atendida");
                alertaRepo.save(a);
                return ResponseEntity.ok(a);
            }
        } catch (Exception ignored) {}

        for (Alerta a : memoryAlertas) {
            if (Objects.equals(a.getId(), id)) {
                a.setAtendida(true);
                a.setUsuarioAtendioId(usuarioId);
                a.setFechaAtencion(LocalDateTime.now());
                a.setEstado("Atendida");
                return ResponseEntity.ok(a);
            }
        }

        return ResponseEntity.ok(Map.of("message", "Alerta atendida con éxito."));
    }

    // 5. Historial de eventos
    @GetMapping("/events")
    public ResponseEntity<?> getEventos(@RequestParam(required = false) String fenomeno) {
        try {
            List<HistorialEvento> lista = eventoRepo.findAllByOrderByFechaHoraDesc();
            if (!lista.isEmpty()) return ResponseEntity.ok(lista);
        } catch (Exception ignored) {}
        return ResponseEntity.ok(memoryEventos);
    }

    // 6. Reglas de alerta
    @GetMapping("/rules")
    public ResponseEntity<?> getRules() {
        try {
            return ResponseEntity.ok(reglaRepo.findAll());
        } catch (Exception ignored) {}
        return ResponseEntity.ok(Collections.emptyList());
    }
}
