package pe.marcona.mtc.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import pe.marcona.mtc.service.IAuditoriaService;
import pe.marcona.mtc.service.IAutenticacionService;
import pe.marcona.mtc.service.ILimitePeticionesService;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ActionLogController.class)
class ActionLogControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private IAuditoriaService auditoriaService;
    @MockitoBean
    private IAutenticacionService autenticacionService;
    @MockitoBean
    private ILimitePeticionesService limitePeticionesService;

    @Test
    void listsActionLogsWithDefaultPagination() throws Exception {
        when(autenticacionService.requerirUsuarioEnRoles(any(), eq(Set.of("admin", "operador"))))
                .thenReturn(Map.of("id", 1L, "role", "admin"));
        when(auditoriaService.listarHistorial(any()))
                .thenReturn(Map.of(
                        "data", List.of(Map.of("id", 1, "accion", "CREAR", "entidad", "vehiculo")),
                        "items", List.of(Map.of("id", 1, "accion", "CREAR", "entidad", "vehiculo")),
                        "total", 1L,
                        "page", 1,
                        "limit", 10,
                        "totalPages", 1L,
                        "pagination", Map.of("total", 1L, "page", 1, "limit", 10, "pages", 1L, "totalPages", 1L)));

        mockMvc.perform(get("/api/logs/list.php"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.data[0].accion").value("CREAR"))
                .andExpect(jsonPath("$.data.pagination.page").value(1))
                .andExpect(jsonPath("$.data.pagination.limit").value(10))
                .andExpect(jsonPath("$.data.pagination.total").value(1))
                .andExpect(jsonPath("$.data.pagination.totalPages").value(1));
    }

    @Test
    void listsActionLogsWithCustomPageAndFilters() throws Exception {
        when(autenticacionService.requerirUsuarioEnRoles(any(), eq(Set.of("admin", "operador"))))
                .thenReturn(Map.of("id", 1L, "role", "admin"));
        when(auditoriaService.listarHistorial(any()))
                .thenReturn(Map.of(
                        "data", List.of(Map.of("id", 15, "accion", "ANULAR", "entidad", "conductor", "descripcion", "Anulación de conductor Juan")),
                        "items", List.of(Map.of("id", 15, "accion", "ANULAR", "entidad", "conductor")),
                        "total", 25L,
                        "page", 2,
                        "limit", 10,
                        "totalPages", 3L,
                        "pagination", Map.of("total", 25L, "page", 2, "limit", 10, "pages", 3L, "totalPages", 3L)));

        mockMvc.perform(get("/api/auditoria")
                        .param("page", "2")
                        .param("limit", "10")
                        .param("accion", "ANULAR")
                        .param("entidad", "conductor")
                        .param("q", "Juan"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.data[0].accion").value("ANULAR"))
                .andExpect(jsonPath("$.data.pagination.page").value(2))
                .andExpect(jsonPath("$.data.pagination.limit").value(10))
                .andExpect(jsonPath("$.data.pagination.total").value(25))
                .andExpect(jsonPath("$.data.pagination.totalPages").value(3));
    }
}


