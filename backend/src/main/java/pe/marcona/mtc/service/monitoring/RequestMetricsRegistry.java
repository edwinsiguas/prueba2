package pe.marcona.mtc.service.monitoring;

import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Deque;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Registro liviano en memoria de estadísticas de peticiones HTTP.
 * Usa contadores atómicos y un buffer circular acotado (últimos 50 eventos lentos o con error),
 * por lo que no consume memoria significativa ni consulta la base de datos.
 */
@Component
public class RequestMetricsRegistry {

    /** Tamaño máximo del buffer circular de eventos relevantes. */
    public static final int MAX_EVENTS = 50;
    /** Umbral (ms) a partir del cual una petición se considera lenta. */
    public static final long SLOW_THRESHOLD_MS = 500L;

    /** Evento resumido (sin datos sensibles: no incluye query string, cuerpo ni cabeceras). */
    public record RequestEvent(String requestId, String method, String path, int status,
                               long durationMs, String timestamp, String type) {
    }

    /** Fotografía inmutable de las métricas acumuladas desde el arranque. */
    public record Snapshot(long total, long count2xx, long count3xx, long count4xx, long count5xx,
                           double errorRatePercent, double successRatePercent,
                           double avgLatencyMs, long maxLatencyMs, long slowRequests,
                           List<RequestEvent> recentEvents) {
    }

    private final AtomicLong total = new AtomicLong();
    private final AtomicLong count2xx = new AtomicLong();
    private final AtomicLong count3xx = new AtomicLong();
    private final AtomicLong count4xx = new AtomicLong();
    private final AtomicLong count5xx = new AtomicLong();
    private final AtomicLong slow = new AtomicLong();
    private final AtomicLong totalLatencyMs = new AtomicLong();
    private final AtomicLong maxLatencyMs = new AtomicLong();
    private final Deque<RequestEvent> events = new ArrayDeque<>(MAX_EVENTS);

    /** Registra una petición finalizada. */
    public void record(String requestId, String method, String path, int status, long durationMs) {
        total.incrementAndGet();
        totalLatencyMs.addAndGet(durationMs);
        maxLatencyMs.accumulateAndGet(durationMs, Math::max);

        if (status >= 500) {
            count5xx.incrementAndGet();
        } else if (status >= 400) {
            count4xx.incrementAndGet();
        } else if (status >= 300) {
            count3xx.incrementAndGet();
        } else {
            count2xx.incrementAndGet();
        }

        boolean isSlow = durationMs >= SLOW_THRESHOLD_MS;
        if (isSlow) {
            slow.incrementAndGet();
        }

        if (isSlow || status >= 400) {
            String type = status >= 500 ? "ERROR_5XX" : (status >= 400 ? "ERROR_4XX" : "SLOW");
            if (isSlow && status >= 400) {
                type = type + "+SLOW";
            }
            var event = new RequestEvent(requestId, method, path, status, durationMs,
                    OffsetDateTime.now().toString(), type);
            synchronized (events) {
                if (events.size() >= MAX_EVENTS) {
                    events.pollFirst();
                }
                events.addLast(event);
            }
        }
    }

    /** Devuelve la fotografía actual con los últimos {@code maxEvents} eventos (más recientes primero). */
    public Snapshot snapshot(int maxEvents) {
        long totalValue = total.get();
        long c2 = count2xx.get() + count3xx.get();
        long c4 = count4xx.get();
        long c5 = count5xx.get();

        List<RequestEvent> copy;
        synchronized (events) {
            copy = new ArrayList<>(events);
        }
        Collections.reverse(copy);
        if (copy.size() > maxEvents) {
            copy = new ArrayList<>(copy.subList(0, maxEvents));
        }

        double errorRate = totalValue == 0 ? 0.0 : round2((c4 + c5) * 100.0 / totalValue);
        double successRate = totalValue == 0 ? 100.0 : round2(c2 * 100.0 / totalValue);
        double avg = totalValue == 0 ? 0.0 : round2((double) totalLatencyMs.get() / totalValue);

        return new Snapshot(totalValue, count2xx.get(), count3xx.get(), c4, c5, errorRate, successRate,
                avg, maxLatencyMs.get(), slow.get(), List.copyOf(copy));
    }

    private static double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
