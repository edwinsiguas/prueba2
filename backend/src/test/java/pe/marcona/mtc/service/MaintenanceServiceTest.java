package pe.marcona.mtc.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import pe.marcona.mtc.dao.ILimitePeticionesDao;
import pe.marcona.mtc.dao.IMantenimientoDao;
import pe.marcona.mtc.exception.ApiException;
import pe.marcona.mtc.service.impl.MaintenanceServiceImpl;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MaintenanceServiceTest {

    @Mock
    private IPermisoService permisoService;
    @Mock
    private ILimitePeticionesDao limitePeticionesDao;
    @Mock
    private IMantenimientoDao mantenimientoDao;
    @Mock
    private IAuditoriaService auditoriaService;

    private MaintenanceServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new MaintenanceServiceImpl(permisoService, limitePeticionesDao, mantenimientoDao,
                auditoriaService, "America/Lima", 1L, 24, 15,
                "0 5 0 * * *", "0 30 2 * * *", "0 0 7 * * *");
    }

    private Map<String, Object> job(String id) {
        return service.listarTareas().stream().filter(t -> id.equals(t.get("id"))).findFirst().orElseThrow();
    }

    @Test
    void listaLosTresJobsEnEstadoIdleConSuCronYZona() {
        List<Map<String, Object>> tareas = service.listarTareas();

        assertEquals(3, tareas.size());
        assertEquals("EXPIRE_PERMITS", tareas.get(0).get("id"));
        assertEquals("0 5 0 * * *", tareas.get(0).get("cronExpression"));
        assertEquals("0 30 2 * * *", tareas.get(1).get("cronExpression"));
        assertEquals("0 0 7 * * *", tareas.get(2).get("cronExpression"));
        for (Map<String, Object> tarea : tareas) {
            assertEquals("America/Lima", tarea.get("timezone"));
            assertEquals("IDLE", tarea.get("lastStatus"));
            assertNull(tarea.get("lastRunAt"));
            assertNotNull(tarea.get("nextRunAt"));
        }
    }

    @Test
    void expirePermitsActualizaMetadatosYAuditaCuandoHayAfectados() {
        when(permisoService.marcarExpirados(eq(1L), any())).thenReturn(List.of(10L, 11L));

        Map<String, Object> resultado = service.ejecutarProgramada(IMaintenanceService.EXPIRE_PERMITS);

        assertEquals("SUCCESS", resultado.get("status"));
        assertEquals(2, resultado.get("affectedCount"));
        Map<String, Object> estado = job(IMaintenanceService.EXPIRE_PERMITS);
        assertEquals("SUCCESS", estado.get("lastStatus"));
        assertEquals(2, estado.get("lastAffectedCount"));
        assertNotNull(estado.get("lastRunAt"));
        assertNotNull(estado.get("lastDurationMs"));
        verify(auditoriaService).registrarAccion(eq(1L), eq("MANTENIMIENTO"), eq("cron_job"), eq(0L), anyString(), any());
    }

    @Test
    void expirePermitsProgramadoSinAfectadosNoLlenaLaBitacora() {
        when(permisoService.marcarExpirados(anyLong(), any())).thenReturn(List.of());

        service.ejecutarProgramada(IMaintenanceService.EXPIRE_PERMITS);

        assertEquals("SUCCESS", job(IMaintenanceService.EXPIRE_PERMITS).get("lastStatus"));
        verify(auditoriaService, never()).registrarAccion(anyLong(), anyString(), anyString(), anyLong(), anyString(), any());
    }

    @Test
    void ejecucionManualSiempreAudita() {
        when(limitePeticionesDao.eliminarAnterioresA(24)).thenReturn(0);

        Map<String, Object> resultado = service.ejecutarManual(IMaintenanceService.CLEANUP_RATE_LIMITS, 7L, null);

        assertEquals(0, resultado.get("affectedCount"));
        verify(auditoriaService).registrarAccion(eq(7L), eq("MANTENIMIENTO"), eq("cron_job"), eq(0L), anyString(), any());
    }

    @Test
    void cleanupRateLimitsEliminaRegistrosAntiguos() {
        when(limitePeticionesDao.eliminarAnterioresA(24)).thenReturn(37);

        Map<String, Object> resultado = service.ejecutarProgramada(IMaintenanceService.CLEANUP_RATE_LIMITS);

        assertEquals("SUCCESS", resultado.get("status"));
        assertEquals(37, resultado.get("affectedCount"));
        Map<String, Object> estado = job(IMaintenanceService.CLEANUP_RATE_LIMITS);
        assertEquals(37, estado.get("lastAffectedCount"));
        verify(limitePeticionesDao).eliminarAnterioresA(24);
    }

    @Test
    void checkUpcomingExpirationsResumeConteosPorCategoria() {
        var conteos = new LinkedHashMap<String, Long>();
        conteos.put("permisosTuc", 3L);
        conteos.put("soat", 2L);
        conteos.put("citv", 1L);
        conteos.put("licencias", 4L);
        when(mantenimientoDao.contarProximosAVencer(15)).thenReturn(conteos);

        Map<String, Object> resultado = service.ejecutarProgramada(IMaintenanceService.CHECK_UPCOMING_EXPIRATIONS);

        assertEquals("SUCCESS", resultado.get("status"));
        assertEquals(10, resultado.get("affectedCount"));
        Map<String, Object> estado = job(IMaintenanceService.CHECK_UPCOMING_EXPIRATIONS);
        assertEquals(10, estado.get("lastAffectedCount"));
        assertEquals(conteos, estado.get("lastDetails"));
        assertEquals(true, String.valueOf(estado.get("lastMessage")).contains("SOAT=2"));
        verify(auditoriaService, never()).registrarAccion(anyLong(), anyString(), anyString(), anyLong(), anyString(), any());
    }

    @Test
    void unaExcepcionNoSePropagaYQuedaRegistradaComoError() {
        when(limitePeticionesDao.eliminarAnterioresA(anyInt())).thenThrow(new IllegalStateException("BD caída"));

        Map<String, Object> resultado = service.ejecutarProgramada(IMaintenanceService.CLEANUP_RATE_LIMITS);

        assertEquals("ERROR", resultado.get("status"));
        Map<String, Object> estado = job(IMaintenanceService.CLEANUP_RATE_LIMITS);
        assertEquals("ERROR", estado.get("lastStatus"));
        assertNotNull(estado.get("lastRunAt"));
    }

    @Test
    void jobInexistenteLanzaNotFound() {
        ApiException ex = assertThrows(ApiException.class, () -> service.ejecutarManual("NO_EXISTE", 1L, null));
        assertEquals(HttpStatus.NOT_FOUND, ex.status());
    }

    @Test
    void ejecutarProgramadaDeJobInexistenteNoLanzaExcepcion() {
        Map<String, Object> resultado = service.ejecutarProgramada("NO_EXISTE");
        assertEquals("SKIPPED", resultado.get("status"));
    }
}
