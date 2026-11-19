package pe.marcona.mtc.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.InetAddress;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Restringe el acceso a los endpoints sensibles de Actuator (/metrics, /prometheus, /info).
 * <ul>
 *   <li>{@code /actuator/health/**} es público (Render, UptimeRobot).</li>
 *   <li>Si existe {@code MONITORING_SCRAPE_TOKEN}, se exige en {@code X-Monitoring-Token} o {@code Authorization: Bearer}.</li>
 *   <li>Si no existe, solo se permiten orígenes de red interna (loopback / red privada) sin reenvío de proxy,
 *       lo que habilita Prometheus local en Docker y bloquea el acceso desde Internet (Render).</li>
 * </ul>
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 5)
public class ActuatorProtectionFilter extends OncePerRequestFilter {

    private final String scrapeToken;

    public ActuatorProtectionFilter(@Value("${app.monitoring.scrape-token:}") String scrapeToken) {
        this.scrapeToken = scrapeToken == null ? "" : scrapeToken.trim();
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path == null || !path.startsWith("/actuator") || path.startsWith("/actuator/health");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (isAuthorized(request)) {
            chain.doFilter(request, response);
            return;
        }
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"success\":false,\"data\":null,\"message\":\"Acceso restringido a monitoreo interno\"}");
    }

    private boolean isAuthorized(HttpServletRequest request) {
        if (!scrapeToken.isEmpty()) {
            String provided = request.getHeader("X-Monitoring-Token");
            if (provided == null) {
                String authorization = request.getHeader("Authorization");
                if (authorization != null && authorization.startsWith("Bearer ")) {
                    provided = authorization.substring(7).trim();
                }
            }
            return provided != null && MessageDigest.isEqual(
                    provided.getBytes(StandardCharsets.UTF_8), scrapeToken.getBytes(StandardCharsets.UTF_8));
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return false; // tráfico que llegó vía proxy público
        }
        return isInternalAddress(request.getRemoteAddr());
    }

    private static boolean isInternalAddress(String remoteAddr) {
        if (remoteAddr == null || remoteAddr.isBlank()) {
            return false;
        }
        try {
            InetAddress address = InetAddress.getByName(remoteAddr);
            return address.isLoopbackAddress() || address.isSiteLocalAddress() || address.isLinkLocalAddress();
        } catch (Exception ex) {
            return false;
        }
    }
}
