package com.clima.alert.repository;

import com.clima.alert.model.HistorialEvento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface HistorialEventoRepository extends JpaRepository<HistorialEvento, Long> {
    List<HistorialEvento> findAllByOrderByFechaHoraDesc();
    List<HistorialEvento> findByTipoFenomenoOrderByFechaHoraDesc(String tipoFenomeno);
}
