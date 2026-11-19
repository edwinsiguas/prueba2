package pe.marcona.mtc.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import pe.marcona.mtc.exception.ApiException;
import pe.marcona.mtc.service.IAutenticacionService;
import pe.marcona.mtc.service.IMaintenanceService;
import pe.marcona.mtc.service.IMonitoringService;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MonitoringController.class)
class MonitoringControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private IMonitoringService monitoringService;
    @MockitoBean
    private IMaintenanceService maintenanceService;
    @MockitoBean
    private IAutenticacionService autenticacionService;

    private void autenticarComoAdmin() {
        when(autenticacionService.requerirUsuario(any(), eq("admin")))
                .thenReturn(Map.of("id", 7L, "role", "admin"));
    }

    private void denegarAcceso(HttpStatus estado) {
        when(autenticacionService.requerirUsuario(any(), eq("admin")))
                .thenThrow(new ApiException(estado, "Acceso denegado"));
    }

    @Test
    void summaryDevuelveEstructuraCompletaParaAdmin() throws Exception {
        autenticarComoAdmin();
        var resumen = new LinkedHashMap<String, Object>();
        resumen.put("health", Map.of("status", "UP", "database", Map.of("status", "UP", "latencyMs", 12)));
        resumen.put("osHealth", Map.of("osName", "Linux", "heapUsagePercent", 41.5, "uptimeSeconds", 120));
        resumen.put("performance", Map.of("totalRequests", 10, "slowRequests", 1, "recentEvents", List.of()));
        resumen.put("maintenance", List.of(Map.of("id", "EXPIRE_PERMITS", "lastStatus", "IDLE")));
        when(monitoringService.obtenerResumen()).thenReturn(resumen);

        mockMvc.perform(get("/api/monitoring/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.health.status").value("UP"))
                .andExpect(jsonPath("$.data.health.database.latencyMs").value(12))
                .andExpect(jsonPath("$.data.osHealth.osName").value("Linux"))
                .andExpect(jsonPath("$.data.performance.totalRequests").value(10))
                .andExpect(jsonPath("$.data.maintenance[0].id").value("EXPIRE_PERMITS"));
    }

    @Test
    void summaryDeniegaAUsuariosQueNoSonAdmin() throws Exception {
        denegarAcceso(HttpStatus.FORBIDDEN);

        mockMvc.perform(get("/api/monitoring/summary"))
                .andExpect(status().isForbidden());

        verify(monitoringService, never()).obtenerResumen();
    }

    @Test
    void summaryRechazaPeticionesSinSesion() throws Exception {
        denegarAcceso(HttpStatus.UNAUTHORIZED);

        mockMvc.perform(get("/api/monitoring/summary"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void jobsListaTareasParaAdmin() throws Exception {
        autenticarComoAdmin();
        when(maintenanceService.listarTareas()).thenReturn(List.of(
                Map.of("id", "EXPIRE_PERMITS"),
                Map.of("id", "CLEANUP_RATE_LIMITS"),
                Map.of("id", "CHECK_UPCOMING_EXPIRATIONS")));

        mockMvc.perform(get("/api/monitoring/jobs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(3))
                .andExpect(jsonPath("$.data[2].id").value("CHECK_UPCOMING_EXPIRATIONS"));
    }

    @Test
    void jobsDeniegaAOperadorYFiscalizador() throws Exception {
        denegarAcceso(HttpStatus.FORBIDDEN);

        mockMvc.perform(get("/api/monitoring/jobs")).andExpect(status().isForbidden());

        verify(maintenanceService, never()).listarTareas();
    }

    @Test
    void ejecutaManualmenteUnJobComoAdmin() throws Exception {
        autenticarComoAdmin();
        var resultado = new LinkedHashMap<String, Object>();
        resultado.put("id", "CLEANUP_RATE_LIMITS");
        resultado.put("status", "SUCCESS");
        resultado.put("affectedCount", 4);
        resultado.put("durationMs", 25L);
        resultado.put("message", "4 registro(s) eliminado(s)");
        resultado.put("lastRunAt", "2026-11-19T02:30:00-05:00");
        when(maintenanceService.ejecutarManual(eq("CLEANUP_RATE_LIMITS"), eq(7L), any())).thenReturn(resultado);

        mockMvc.perform(post("/api/monitoring/jobs/CLEANUP_RATE_LIMITS/run"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.affectedCount").value(4))
                .andExpect(jsonPath("$.data.durationMs").value(25))
                .andExpect(jsonPath("$.data.message").value("4 registro(s) eliminado(s)"))
                .andExpect(jsonPath("$.data.lastRunAt").value("2026-11-19T02:30:00-05:00"));
    }

    @Test
    void ejecucionManualDeniegaAUsuariosNoAdmin() throws Exception {
        denegarAcceso(HttpStatus.FORBIDDEN);

        mockMvc.perform(post("/api/monitoring/jobs/EXPIRE_PERMITS/run"))
                .andExpect(status().isForbidden());

        verify(maintenanceService, never()).ejecutarManual(any(), anyLong(), any());
    }

    @Test
    void ejecucionManualDeUnJobInexistenteDevuelve404() throws Exception {
        autenticarComoAdmin();
        when(maintenanceService.ejecutarManual(eq("NO_EXISTE"), anyLong(), any()))
                .thenThrow(new ApiException(HttpStatus.NOT_FOUND, "Tarea de mantenimiento no encontrada"));

        mockMvc.perform(post("/api/monitoring/jobs/NO_EXISTE/run"))
                .andExpect(status().isNotFound());
    }

    @Test
    void respuestasIncluyenHeaderXRequestId() throws Exception {
        autenticarComoAdmin();
        when(monitoringService.obtenerResumen()).thenReturn(Map.of());

        mockMvc.perform(get("/api/monitoring/summary").header("X-Request-ID", "abc12345"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Request-ID", "abc12345"));
    }
}
