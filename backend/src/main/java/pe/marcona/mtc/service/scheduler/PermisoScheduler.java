package pe.marcona.mtc.service.scheduler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import pe.marcona.mtc.service.IMaintenanceService;

/**
 * Planificador de tareas programadas (Cron Jobs) del sistema.
 * Requerimiento de la Unidad 4: Monitoreo y Mantenimiento Operacional.
 * <p>
 * Las expresiones Cron y la zona horaria ({@code America/Lima}) son configurables por propiedades
 * ({@code app.maintenance.*}). La lógica y el historial viven en {@link IMaintenanceService};
 * cada ejecución está protegida para que una excepción nunca detenga al planificador.
 */
@Component
public class PermisoScheduler {

    private static final Logger log = LoggerFactory.getLogger(PermisoScheduler.class);

    private final IMaintenanceService maintenanceService;

    public PermisoScheduler(IMaintenanceService maintenanceService) {
        this.maintenanceService = maintenanceService;
    }

    /** EXPIRE_PERMITS: marca como vencidos los permisos TUC caducados (diario 00:05 Lima por defecto). */
    @Scheduled(cron = "${app.maintenance.expire-permits.cron:0 5 0 * * *}",
            zone = "${app.maintenance.timezone:America/Lima}")
    public void verificarPermisosVencidos() {
        ejecutar(IMaintenanceService.EXPIRE_PERMITS);
    }

    /** CLEANUP_RATE_LIMITS: depura registros antiguos de rate_limits (diario 02:30 Lima por defecto). */
    @Scheduled(cron = "${app.maintenance.cleanup-rate-limits.cron:0 30 2 * * *}",
            zone = "${app.maintenance.timezone:America/Lima}")
    public void depurarLimitesDePeticiones() {
        ejecutar(IMaintenanceService.CLEANUP_RATE_LIMITS);
    }

    /** CHECK_UPCOMING_EXPIRATIONS: alerta operativa de vencimientos próximos (diario 07:00 Lima por defecto). */
    @Scheduled(cron = "${app.maintenance.check-upcoming.cron:0 0 7 * * *}",
            zone = "${app.maintenance.timezone:America/Lima}")
    public void revisarVencimientosProximos() {
        ejecutar(IMaintenanceService.CHECK_UPCOMING_EXPIRATIONS);
    }

    private void ejecutar(String idTarea) {
        try {
            maintenanceService.ejecutarProgramada(idTarea);
        } catch (Exception ex) {
            log.error("[CRON SCHEDULER ERROR] Fallo inesperado al ejecutar {}", idTarea, ex);
        }
    }
}
