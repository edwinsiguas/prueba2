package pe.marcona.mtc.service;

import jakarta.servlet.http.HttpServletRequest;

import java.util.List;
import java.util.Map;

/**
 * Contrato de servicio para el mantenimiento automatizado (Cron Jobs) del sistema:
 * ejecución programada o manual, y consulta del historial de la última ejecución de cada tarea.
 */
public interface IMaintenanceService {

    String EXPIRE_PERMITS = "EXPIRE_PERMITS";
    String CLEANUP_RATE_LIMITS = "CLEANUP_RATE_LIMITS";
    String CHECK_UPCOMING_EXPIRATIONS = "CHECK_UPCOMING_EXPIRATIONS";

    /** Lista las tareas con su estado y metadatos de la última ejecución. */
    List<Map<String, Object>> listarTareas();

    /**
     * Ejecuta manualmente una tarea (acción del administrador); siempre queda registrada en auditoría.
     *
     * @throws pe.marcona.mtc.exception.ApiException 404 si la tarea no existe, 409 si ya está en ejecución.
     */
    Map<String, Object> ejecutarManual(String idTarea, long idActor, HttpServletRequest solicitud);

    /** Ejecución disparada por el planificador (@Scheduled). Nunca lanza excepciones. */
    Map<String, Object> ejecutarProgramada(String idTarea);
}
