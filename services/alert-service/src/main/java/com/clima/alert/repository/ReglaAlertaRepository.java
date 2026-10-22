package com.clima.alert.repository;

import com.clima.alert.model.ReglaAlerta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ReglaAlertaRepository extends JpaRepository<ReglaAlerta, Long> {
    List<ReglaAlerta> findByTipoSensorIgnoreCaseAndEstadoTrue(String tipoSensor);
}
