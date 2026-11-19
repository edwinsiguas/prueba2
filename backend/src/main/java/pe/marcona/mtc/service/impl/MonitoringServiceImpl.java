package pe.marcona.mtc.service.impl;

import com.zaxxer.hikari.HikariDataSource;
import com.zaxxer.hikari.HikariPoolMXBean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import pe.marcona.mtc.service.IMaintenanceService;
import pe.marcona.mtc.service.IMonitoringService;
import pe.marcona.mtc.service.monitoring.RequestMetricsRegistry;

import javax.sql.DataSource;
import java.io.File;
import java.lang.management.ManagementFactory;
import java.lang.management.RuntimeMXBean;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Implementación del servicio de monitoreo. Reúne salud de BD/HikariCP, SO/JVM, rendimiento HTTP
 * (memoria) y estado de Cron Jobs, evitando consultas costosas a TiDB (solo un {@code SELECT 1}).
 */
@Service
public class MonitoringServiceImpl implements IMonitoringService {

    private static final Logger log = LoggerFactory.getLogger(MonitoringServiceImpl.class);
    private static final double MB = 1024.0 * 1024.0;
    private static final double GB = 1024.0 * 1024.0 * 1024.0;
    private static final int EVENTOS_RECIENTES = 10;

    private final JdbcTemplate jdbcTemplate;
    private final DataSource dataSource;
    private final RequestMetricsRegistry metricsRegistry;
    private final IMaintenanceService maintenanceService;
    private final String aplicacion;
    private final String entorno;

    public MonitoringServiceImpl(
            JdbcTemplate jdbcTemplate,
            DataSource dataSource,
            RequestMetricsRegistry metricsRegistry,
            IMaintenanceService maintenanceService,
            @Value("${spring.application.name:mtc-java-service}") String aplicacion,
            @Value("${app.environment:development}") String entorno) {
        this.jdbcTemplate = jdbcTemplate;
        this.dataSource = dataSource;
        this.metricsRegistry = metricsRegistry;
        this.maintenanceService = maintenanceService;
        this.aplicacion = aplicacion;
        this.entorno = entorno;
    }

    @Override
    public Map<String, Object> obtenerResumen() {
        var resumen = new LinkedHashMap<String, Object>();
        resumen.put("generatedAt", OffsetDateTime.now().toString());
        resumen.put("health", construirSalud());
        resumen.put("osHealth", construirSaludSistema());
        resumen.put("performance", construirRendimiento());
        resumen.put("maintenance", maintenanceService.listarTareas());
        return resumen;
    }

    private Map<String, Object> construirSalud() {
        Map<String, Object> baseDatos = medirBaseDatos();
        boolean dbArriba = "UP".equals(baseDatos.get("status"));

        var salud = new LinkedHashMap<String, Object>();
        salud.put("status", dbArriba ? "UP" : "DEGRADED");
        salud.put("service", "UP");
        salud.put("application", aplicacion);
        salud.put("environment", entorno);
        salud.put("database", baseDatos);
        return salud;
    }

    private Map<String, Object> medirBaseDatos() {
        var db = new LinkedHashMap<String, Object>();
        long inicio = System.nanoTime();
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            db.put("status", "UP");
            db.put("latencyMs", (System.nanoTime() - inicio) / 1_000_000L);
            db.put("message", "Conexión a la base de datos operativa");
        } catch (Exception ex) {
            log.error("Fallo al verificar conectividad con la base de datos", ex);
            db.put("status", "DOWN");
            db.put("latencyMs", (System.nanoTime() - inicio) / 1_000_000L);
            db.put("message", "No se pudo conectar a la base de datos");
        }
        agregarPool(db);
        return db;
    }

    private void agregarPool(Map<String, Object> db) {
        int activas = 0;
        int inactivas = 0;
        int total = 0;
        int esperando = 0;
        int maximo = 0;
        try {
            HikariDataSource hikari = dataSource instanceof HikariDataSource directo
                    ? directo
                    : (dataSource.isWrapperFor(HikariDataSource.class) ? dataSource.unwrap(HikariDataSource.class) : null);
            if (hikari != null) {
                maximo = hikari.getMaximumPoolSize();
                HikariPoolMXBean pool = hikari.getHikariPoolMXBean();
                if (pool != null) {
                    activas = pool.getActiveConnections();
                    inactivas = pool.getIdleConnections();
                    total = pool.getTotalConnections();
                    esperando = pool.getThreadsAwaitingConnection();
                }
            }
        } catch (Exception ex) {
            log.debug("No fue posible leer el estado del pool HikariCP", ex);
        }
        db.put("activeConnections", activas);
        db.put("idleConnections", inactivas);
        db.put("totalConnections", total);
        db.put("threadsAwaiting", esperando);
        db.put("maxPoolSize", maximo);
    }

    private Map<String, Object> construirSaludSistema() {
        var so = new LinkedHashMap<String, Object>();
        var osBean = ManagementFactory.getOperatingSystemMXBean();
        so.put("osName", System.getProperty("os.name"));
        so.put("osArch", System.getProperty("os.arch"));
        so.put("javaVersion", System.getProperty("java.version"));
        so.put("availableProcessors", Runtime.getRuntime().availableProcessors());

        double cpuSistema = 0;
        double cpuProceso = 0;
        if (osBean instanceof com.sun.management.OperatingSystemMXBean sunBean) {
            cpuSistema = porcentajeCpu(sunBean.getCpuLoad());
            cpuProceso = porcentajeCpu(sunBean.getProcessCpuLoad());
        }
        so.put("systemCpuLoad", cpuSistema);
        so.put("processCpuLoad", cpuProceso);

        Runtime runtime = Runtime.getRuntime();
        double heapUsado = (runtime.totalMemory() - runtime.freeMemory()) / MB;
        double heapMaximo = runtime.maxMemory() / MB;
        so.put("heapUsedMB", redondear(heapUsado));
        so.put("heapMaxMB", redondear(heapMaximo));
        so.put("heapUsagePercent", heapMaximo <= 0 ? 0.0 : redondear(heapUsado * 100.0 / heapMaximo));
        so.put("liveThreads", ManagementFactory.getThreadMXBean().getThreadCount());

        File raiz = Path.of("").toAbsolutePath().toFile();
        double discoTotal = raiz.getTotalSpace() / GB;
        double discoLibre = raiz.getUsableSpace() / GB;
        so.put("diskTotalGB", redondear(discoTotal));
        so.put("diskFreeGB", redondear(discoLibre));
        so.put("diskUsagePercent", discoTotal <= 0 ? 0.0 : redondear((discoTotal - discoLibre) * 100.0 / discoTotal));

        RuntimeMXBean rt = ManagementFactory.getRuntimeMXBean();
        long uptimeSegundos = rt.getUptime() / 1000L;
        so.put("uptimeSeconds", uptimeSegundos);
        so.put("uptimeFormatted", formatearUptime(uptimeSegundos));
        return so;
    }

    private Map<String, Object> construirRendimiento() {
        RequestMetricsRegistry.Snapshot snap = metricsRegistry.snapshot(EVENTOS_RECIENTES);
        var rendimiento = new LinkedHashMap<String, Object>();
        rendimiento.put("totalRequests", snap.total());
        rendimiento.put("status2xx", snap.count2xx() + snap.count3xx());
        rendimiento.put("status4xx", snap.count4xx());
        rendimiento.put("status5xx", snap.count5xx());
        rendimiento.put("errorRatePercent", snap.errorRatePercent());
        rendimiento.put("successRatePercent", snap.successRatePercent());
        rendimiento.put("avgLatencyMs", snap.avgLatencyMs());
        rendimiento.put("maxLatencyMs", snap.maxLatencyMs());
        rendimiento.put("slowRequests", snap.slowRequests());
        rendimiento.put("slowThresholdMs", RequestMetricsRegistry.SLOW_THRESHOLD_MS);

        List<Map<String, Object>> eventos = new ArrayList<>();
        for (RequestMetricsRegistry.RequestEvent e : snap.recentEvents()) {
            var evento = new LinkedHashMap<String, Object>();
            evento.put("requestId", e.requestId());
            evento.put("method", e.method());
            evento.put("path", e.path());
            evento.put("status", e.status());
            evento.put("durationMs", e.durationMs());
            evento.put("timestamp", e.timestamp());
            evento.put("type", e.type());
            eventos.add(evento);
        }
        rendimiento.put("recentEvents", eventos);
        return rendimiento;
    }

    private static double porcentajeCpu(double carga) {
        return carga < 0 ? 0.0 : redondear(carga * 100.0);
    }

    private static double redondear(double valor) {
        return Math.round(valor * 100.0) / 100.0;
    }

    static String formatearUptime(long segundos) {
        long dias = segundos / 86400;
        long horas = (segundos % 86400) / 3600;
        long minutos = (segundos % 3600) / 60;
        long resto = segundos % 60;
        if (dias > 0) {
            return String.format("%dd %dh %dm", dias, horas, minutos);
        }
        if (horas > 0) {
            return String.format("%dh %dm %ds", horas, minutos, resto);
        }
        return String.format("%dm %ds", minutos, resto);
    }
}
