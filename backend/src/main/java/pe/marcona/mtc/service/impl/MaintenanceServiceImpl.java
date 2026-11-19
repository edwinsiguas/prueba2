package pe.marcona.mtc.service.impl;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;
import pe.marcona.mtc.dao.ILimitePeticionesDao;
import pe.marcona.mtc.dao.IMantenimientoDao;
import pe.marcona.mtc.exception.ApiException;
import pe.marcona.mtc.service.IAuditoriaService;
import pe.marcona.mtc.service.IMaintenanceService;
import pe.marcona.mtc.service.IPermisoService;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Implementación del servicio de mantenimiento automatizado.
 * Mantiene un registro thread-safe (ConcurrentHashMap) con el historial de la última ejecución de cada Cron Job.
 */
@Service
public class MaintenanceServiceImpl implements IMaintenanceService {

    private static final Logger log = LoggerFactory.getLogger(MaintenanceServiceImpl.class);
    private static final List<String> ORDEN = List.of(EXPIRE_PERMITS, CLEANUP_RATE_LIMITS, CHECK_UPCOMING_EXPIRATIONS);

    private record Resultado(int afectados, String mensaje, Map<String, Object> detalle) {
    }

    /** Estado mutable de una tarea; todas las lecturas/escrituras se sincronizan sobre la instancia. */
    private static final class EstadoTarea {
        private final String id;
        private final String nombre;
        private final String descripcion;
        private final String cron;
        private final AtomicBoolean enEjecucion = new AtomicBoolean(false);
        private String ultimaEjecucion;
        private String ultimoEstado = "IDLE";
        private long ultimaDuracionMs;
        private int ultimosAfectados;
        private String ultimoMensaje = "Aún no ejecutada desde el arranque";
        private Map<String, Object> ultimoDetalle = Map.of();

        private EstadoTarea(String id, String nombre, String descripcion, String cron) {
            this.id = id;
            this.nombre = nombre;
            this.descripcion = descripcion;
            this.cron = cron;
        }

        private synchronized void registrar(String estado, String fecha, long duracionMs, int afectados,
                                            String mensaje, Map<String, Object> detalle) {
            this.ultimoEstado = estado;
            this.ultimaEjecucion = fecha;
            this.ultimaDuracionMs = duracionMs;
            this.ultimosAfectados = afectados;
            this.ultimoMensaje = mensaje;
            this.ultimoDetalle = detalle == null ? Map.of() : detalle;
        }
    }

    private final IPermisoService permisoService;
    private final ILimitePeticionesDao limitePeticionesDao;
    private final IMantenimientoDao mantenimientoDao;
    private final IAuditoriaService auditoriaService;
    private final String zona;
    private final long idActorSistema;
    private final int retencionHorasRateLimits;
    private final int diasProximosVencimientos;
    private final Map<String, EstadoTarea> estados = new ConcurrentHashMap<>();

    public MaintenanceServiceImpl(
            IPermisoService permisoService,
            ILimitePeticionesDao limitePeticionesDao,
            IMantenimientoDao mantenimientoDao,
            IAuditoriaService auditoriaService,
            @Value("${app.maintenance.timezone:America/Lima}") String zona,
            @Value("${app.maintenance.system-actor-id:1}") long idActorSistema,
            @Value("${app.maintenance.rate-limits-retention-hours:24}") int retencionHorasRateLimits,
            @Value("${app.maintenance.upcoming-days:15}") int diasProximosVencimientos,
            @Value("${app.maintenance.expire-permits.cron:0 5 0 * * *}") String cronExpirar,
            @Value("${app.maintenance.cleanup-rate-limits.cron:0 30 2 * * *}") String cronLimpieza,
            @Value("${app.maintenance.check-upcoming.cron:0 0 7 * * *}") String cronProximos) {
        this.permisoService = permisoService;
        this.limitePeticionesDao = limitePeticionesDao;
        this.mantenimientoDao = mantenimientoDao;
        this.auditoriaService = auditoriaService;
        this.zona = zona;
        this.idActorSistema = idActorSistema;
        this.retencionHorasRateLimits = retencionHorasRateLimits;
        this.diasProximosVencimientos = diasProximosVencimientos;

        estados.put(EXPIRE_PERMITS, new EstadoTarea(EXPIRE_PERMITS, "Vencimiento automático de permisos TUC",
                "Marca como 'vencido' los permisos TUC vigentes cuya fecha de vencimiento ya pasó.", cronExpirar));
        estados.put(CLEANUP_RATE_LIMITS, new EstadoTarea(CLEANUP_RATE_LIMITS, "Depuración de límites de peticiones",
                "Elimina registros de rate_limits con más de " + retencionHorasRateLimits
                        + " horas para mantener ligera la base de datos.", cronLimpieza));
        estados.put(CHECK_UPCOMING_EXPIRATIONS, new EstadoTarea(CHECK_UPCOMING_EXPIRATIONS,
                "Alerta de vencimientos próximos",
                "Cuenta permisos TUC, SOAT, CITV y licencias que vencen en los próximos "
                        + diasProximosVencimientos + " días.", cronProximos));
    }

    @Override
    public List<Map<String, Object>> listarTareas() {
        List<Map<String, Object>> tareas = new ArrayList<>();
        for (String id : ORDEN) {
            tareas.add(describir(estados.get(id)));
        }
        return tareas;
    }

    @Override
    public Map<String, Object> ejecutarManual(String idTarea, long idActor, HttpServletRequest solicitud) {
        return ejecutar(idTarea, idActor, solicitud, true);
    }

    @Override
    public Map<String, Object> ejecutarProgramada(String idTarea) {
        try {
            return ejecutar(idTarea, idActorSistema, null, false);
        } catch (RuntimeException ex) {
            // Un fallo (p. ej. tarea ya en ejecución) jamás debe detener el planificador
            log.warn("[CRON] Ejecución programada de {} omitida: {}", idTarea, ex.getMessage());
            return Map.of("id", String.valueOf(idTarea), "status", "SKIPPED", "message", String.valueOf(ex.getMessage()));
        }
    }

    private Map<String, Object> ejecutar(String idTarea, long idActor, HttpServletRequest solicitud, boolean manual) {
        EstadoTarea estado = idTarea == null ? null : estados.get(idTarea.trim().toUpperCase());
        if (estado == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Tarea de mantenimiento no encontrada: " + idTarea);
        }
        if (!estado.enEjecucion.compareAndSet(false, true)) {
            throw new ApiException(HttpStatus.CONFLICT, "La tarea " + estado.id + " ya se está ejecutando");
        }

        long inicio = System.nanoTime();
        String origen = manual ? "MANUAL" : "PROGRAMADA";
        log.info("[CRON] Iniciando {} ({})", estado.id, origen);
        String estadoFinal;
        int afectados = 0;
        String mensaje;
        Map<String, Object> detalle = Map.of();
        try {
            Resultado resultado = ejecutarLogica(estado.id, idActor, solicitud);
            afectados = resultado.afectados();
            mensaje = resultado.mensaje();
            detalle = resultado.detalle();
            estadoFinal = "SUCCESS";
        } catch (Exception ex) {
            estadoFinal = "ERROR";
            mensaje = "Error durante la ejecución: " + ex.getClass().getSimpleName();
            log.error("[CRON ERROR] Falló la tarea {} ({})", estado.id, origen, ex);
        } finally {
            estado.enEjecucion.set(false);
        }

        long duracionMs = (System.nanoTime() - inicio) / 1_000_000L;
        String fecha = OffsetDateTime.now(ZoneId.of(zona)).toString();
        estado.registrar(estadoFinal, fecha, duracionMs, afectados, mensaje, detalle);
        log.info("[CRON] Finalizada {} ({}) estado={} afectados={} duracion={} ms", estado.id, origen,
                estadoFinal, afectados, duracionMs);

        auditar(estado, manual, idActor, solicitud, estadoFinal, afectados, duracionMs, mensaje);

        var salida = new LinkedHashMap<String, Object>();
        salida.put("id", estado.id);
        salida.put("status", estadoFinal);
        salida.put("affectedCount", afectados);
        salida.put("durationMs", duracionMs);
        salida.put("message", mensaje);
        salida.put("lastRunAt", fecha);
        salida.put("details", detalle);
        return salida;
    }

    private Resultado ejecutarLogica(String id, long idActor, HttpServletRequest solicitud) {
        return switch (id) {
            case EXPIRE_PERMITS -> {
                List<Long> ids = permisoService.marcarExpirados(idActor, solicitud);
                int total = ids == null ? 0 : ids.size();
                yield new Resultado(total, total == 0
                        ? "Sin permisos TUC vencidos pendientes"
                        : total + " permiso(s) TUC marcado(s) como vencido(s)", Map.of());
            }
            case CLEANUP_RATE_LIMITS -> {
                int borrados = limitePeticionesDao.eliminarAnterioresA(retencionHorasRateLimits);
                yield new Resultado(borrados, borrados + " registro(s) de rate_limits con más de "
                        + retencionHorasRateLimits + " h eliminado(s)", Map.of());
            }
            case CHECK_UPCOMING_EXPIRATIONS -> {
                Map<String, Long> conteos = mantenimientoDao.contarProximosAVencer(diasProximosVencimientos);
                long total = conteos.values().stream().mapToLong(Long::longValue).sum();
                String resumen = "Próximos " + diasProximosVencimientos + " días: TUC=" + conteos.get("permisosTuc")
                        + ", SOAT=" + conteos.get("soat") + ", CITV=" + conteos.get("citv")
                        + ", Licencias=" + conteos.get("licencias");
                if (total > 0) {
                    log.warn("[ALERTA_VENCIMIENTOS] {}", resumen);
                } else {
                    log.info("[ALERTA_VENCIMIENTOS] Sin vencimientos próximos. {}", resumen);
                }
                yield new Resultado((int) total, resumen, new LinkedHashMap<>(conteos));
            }
            default -> throw new ApiException(HttpStatus.NOT_FOUND, "Tarea no soportada: " + id);
        };
    }

    private void auditar(EstadoTarea estado, boolean manual, long idActor, HttpServletRequest solicitud,
                         String estadoFinal, int afectados, long duracionMs, String mensaje) {
        boolean debeAuditar = manual || (EXPIRE_PERMITS.equals(estado.id) && afectados > 0);
        if (!debeAuditar) {
            return;
        }
        String descripcion = String.format("Cron Job %s ejecutado %s: estado=%s, afectados=%d, duración=%d ms. %s",
                estado.id, manual ? "manualmente" : "automáticamente", estadoFinal, afectados, duracionMs, mensaje);
        try {
            auditoriaService.registrarAccion(idActor, "MANTENIMIENTO", "cron_job", 0L, descripcion, solicitud);
        } catch (Exception ex) {
            log.warn("No se pudo auditar la ejecución del job {}", estado.id, ex);
        }
    }

    private Map<String, Object> describir(EstadoTarea estado) {
        var mapa = new LinkedHashMap<String, Object>();
        synchronized (estado) {
            mapa.put("id", estado.id);
            mapa.put("name", estado.nombre);
            mapa.put("description", estado.descripcion);
            mapa.put("cronExpression", estado.cron);
            mapa.put("timezone", zona);
            mapa.put("lastRunAt", estado.ultimaEjecucion);
            mapa.put("lastStatus", estado.ultimoEstado);
            mapa.put("lastDurationMs", estado.ultimaDuracionMs);
            mapa.put("lastAffectedCount", estado.ultimosAfectados);
            mapa.put("lastMessage", estado.ultimoMensaje);
            mapa.put("lastDetails", estado.ultimoDetalle);
        }
        mapa.put("running", estado.enEjecucion.get());
        mapa.put("nextRunAt", proximaEjecucion(estado.cron));
        return mapa;
    }

    private String proximaEjecucion(String cron) {
        try {
            ZonedDateTime siguiente = CronExpression.parse(cron).next(ZonedDateTime.now(ZoneId.of(zona)));
            return siguiente == null ? null : siguiente.toOffsetDateTime().toString();
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
