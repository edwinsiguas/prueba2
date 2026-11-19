package pe.marcona.mtc.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import pe.marcona.mtc.service.monitoring.RequestMetricsRegistry;

import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Filtro de observabilidad HTTP.
 * <ul>
 *   <li>Genera o propaga un {@code X-Request-ID} (Correlation-ID) y lo coloca en el MDC ({@code requestId}).</li>
 *   <li>Mide la latencia real de cada petición y emite logs INFO / WARN [SLOW_REQUEST] / ERROR.</li>
 *   <li>Alimenta {@link RequestMetricsRegistry} para el panel /monitoreo (sin consultar la BD).</li>
 * </ul>
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class RequestMonitoringFilter extends OncePerRequestFilter {

    public static final String REQUEST_ID_HEADER = "X-Request-ID";
    public static final String MDC_KEY = "requestId";

    private static final Logger log = LoggerFactory.getLogger(RequestMonitoringFilter.class);
    private static final Pattern VALID_REQUEST_ID = Pattern.compile("^[A-Za-z0-9_-]{4,64}$");

    private final ObjectProvider<RequestMetricsRegistry> registryProvider;

    public RequestMonitoringFilter(ObjectProvider<RequestMetricsRegistry> registryProvider) {
        this.registryProvider = registryProvider;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String requestId = resolveRequestId(request.getHeader(REQUEST_ID_HEADER));
        long start = System.nanoTime();
        MDC.put(MDC_KEY, requestId);
        response.setHeader(REQUEST_ID_HEADER, requestId);

        try {
            chain.doFilter(request, response);
        } finally {
            try {
                long durationMs = (System.nanoTime() - start) / 1_000_000L;
                report(request, response.getStatus(), durationMs, requestId);
            } finally {
                MDC.clear();
            }
        }
    }

    private void report(HttpServletRequest request, int status, long durationMs, String requestId) {
        String method = request.getMethod();
        String path = request.getRequestURI();
        boolean healthOk = path != null && path.startsWith("/actuator/health") && status == 200;
        if (healthOk) {
            return; // evita ruido de Render / UptimeRobot
        }

        RequestMetricsRegistry registry = registryProvider.getIfAvailable();
        if (registry != null) {
            registry.record(requestId, method, path, status, durationMs);
        }

        String ip = normalizeIp(request);
        if (status >= 500) {
            log.error("{} {} -> {} ({} ms) ip={}", method, path, status, durationMs, ip);
        } else if (durationMs >= RequestMetricsRegistry.SLOW_THRESHOLD_MS) {
            log.warn("[SLOW_REQUEST] {} {} -> {} ({} ms) ip={}", method, path, status, durationMs, ip);
        } else {
            log.info("{} {} -> {} ({} ms) ip={}", method, path, status, durationMs, ip);
        }
    }

    static String resolveRequestId(String incoming) {
        if (incoming != null && VALID_REQUEST_ID.matcher(incoming).matches()) {
            return incoming;
        }
        return UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }

    static String normalizeIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        String ip = (forwarded != null && !forwarded.isBlank())
                ? forwarded.split(",")[0].trim()
                : request.getRemoteAddr();
        if (ip == null || ip.isBlank()) {
            return "unknown";
        }
        if ("::1".equals(ip) || "0:0:0:0:0:0:0:1".equals(ip)) {
            return "127.0.0.1";
        }
        return ip.startsWith("::ffff:") ? ip.substring(7) : ip;
    }
}
