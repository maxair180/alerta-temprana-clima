package com.clima.alert.repository;

import com.clima.alert.model.Alerta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AlertaRepository extends JpaRepository<Alerta, Long> {
    List<Alerta> findByAtendidaFalseOrderByFechaHoraDesc();
    List<Alerta> findAllByOrderByFechaHoraDesc();
    List<Alerta> findByComunidadIdOrderByFechaHoraDesc(Integer comunidadId);
    List<Alerta> findByNivelRiesgoOrderByFechaHoraDesc(String nivelRiesgo);
}
