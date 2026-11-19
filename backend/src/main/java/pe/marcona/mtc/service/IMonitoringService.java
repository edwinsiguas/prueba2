package pe.marcona.mtc.service;

import java.util.Map;

/**
 * Contrato de servicio para el monitoreo de salud del sistema (BD, HikariCP, SO/JVM),
 * rendimiento HTTP y estado de tareas de mantenimiento.
 */
public interface IMonitoringService {

    /** Construye el resumen consolidado para el panel /monitoreo (consulta mínima a la BD: SELECT 1). */
    Map<String, Object> obtenerResumen();
}
