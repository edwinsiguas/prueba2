package pe.marcona.mtc.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.marcona.mtc.dto.ApiResponse;
import pe.marcona.mtc.service.IAutenticacionService;
import pe.marcona.mtc.service.IMaintenanceService;
import pe.marcona.mtc.service.IMonitoringService;

import java.util.List;
import java.util.Map;

/**
 * Controlador REST de monitoreo y mantenimiento operacional.
 * Todos los endpoints son EXCLUSIVOS del rol {@code admin}.
 */
@RestController
@RequestMapping("/api/monitoring")
public class MonitoringController {

    private final IMonitoringService monitoringService;
    private final IMaintenanceService maintenanceService;
    private final IAutenticacionService autenticacionService;

    public MonitoringController(
            IMonitoringService monitoringService,
            IMaintenanceService maintenanceService,
            IAutenticacionService autenticacionService) {
        this.monitoringService = monitoringService;
        this.maintenanceService = maintenanceService;
        this.autenticacionService = autenticacionService;
    }

    @GetMapping("/summary")
    public ApiResponse<Map<String, Object>> summary(HttpServletRequest request) {
        autenticacionService.requerirUsuario(request, "admin");
        return ApiResponse.success(monitoringService.obtenerResumen(), null);
    }

    @GetMapping("/jobs")
    public ApiResponse<List<Map<String, Object>>> jobs(HttpServletRequest request) {
        autenticacionService.requerirUsuario(request, "admin");
        return ApiResponse.success(maintenanceService.listarTareas(), null);
    }

    @PostMapping("/jobs/{jobId}/run")
    public ApiResponse<Map<String, Object>> runJob(@PathVariable String jobId, HttpServletRequest request) {
        Map<String, Object> usuario = autenticacionService.requerirUsuario(request, "admin");
        long idActor = ((Number) usuario.get("id")).longValue();
        Map<String, Object> resultado = maintenanceService.ejecutarManual(jobId, idActor, request);
        return ApiResponse.success(resultado, "Tarea " + resultado.get("id") + " ejecutada");
    }
}
