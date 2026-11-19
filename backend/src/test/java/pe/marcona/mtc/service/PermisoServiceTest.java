package pe.marcona.mtc.service;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.marcona.mtc.dao.IPermisoDao;
import pe.marcona.mtc.service.impl.PermisoServiceImpl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PermisoServiceTest {

    @Mock
    private IPermisoDao permisoDao;

    @Mock
    private ICodigoQrService codigoQrService;

    @Mock
    private IAuditoriaService auditoriaService;

    @Mock
    private HttpServletRequest request;

    private PermisoServiceImpl permisoService;

    @BeforeEach
    void setUp() {
        permisoService = new PermisoServiceImpl(
                permisoDao,
                codigoQrService,
                auditoriaService,
                "http://localhost:3000",
                "http://localhost/api"
        );
    }

    @Test
    void generarPermiso_debePasarReciboYMontoCorrectamente() {
        long idVehiculo = 10L;
        LocalDate fechaVencimiento = LocalDate.now().plusMonths(6);

        when(permisoDao.obtenerVehiculoPorId(idVehiculo)).thenReturn(Optional.of(Map.of(
                "id", idVehiculo,
                "estado", "activo",
                "placa", "ABC-123",
                "company_id", 2L
        )));

        when(permisoDao.obtenerAsignacionActivaPorVehiculo(idVehiculo)).thenReturn(Optional.of(Map.of(
                "id", 50L,
                "driver_id", 15L,
                "nombre_completo", "Carlos Santana",
                "fecha_vencimiento_licencia", LocalDate.now().plusYears(2).toString(),
                "placa", "ABC-123"
        )));

        when(permisoDao.contarPermisosVigentesPorAsignacion(50L)).thenReturn(0);
        when(permisoDao.obtenerSiguienteSecuencia(anyInt())).thenReturn(1);
        when(codigoQrService.generarQrBase64(anyString())).thenReturn("base64qr");

        when(permisoDao.insertarPermiso(
                eq(50L), eq(idVehiculo), eq(15L), eq(2L),
                anyString(), eq("libre_transito"), eq(fechaVencimiento),
                eq("Observacion de prueba"), eq("base64qr"), eq(1L),
                eq("REC-9876"), eq(new BigDecimal("150.50"))
        )).thenReturn(100L);

        when(permisoDao.obtenerPorId(100L)).thenReturn(Optional.of(Map.of(
                "id", 100L,
                "numero_permiso", "PERM-2026-00001",
                "placa", "ABC-123",
                "monto_pagado", new BigDecimal("150.50"),
                "numero_recibo", "REC-9876"
        )));

        Map<String, Object> input = Map.of(
                "vehicle_id", idVehiculo,
                "fecha_vencimiento", fechaVencimiento.toString(),
                "tipo_permiso", "libre_transito",
                "observaciones", "Observacion de prueba",
                "numero_recibo", "REC-9876",
                "monto_pagado", "150.50"
        );

        Map<String, Object> resultado = permisoService.generarPermiso(input, 1L, request);

        assertNotNull(resultado);
        assertEquals(100L, resultado.get("id"));

        verify(permisoDao).insertarPermiso(
                eq(50L), eq(idVehiculo), eq(15L), eq(2L),
                anyString(), eq("libre_transito"), eq(fechaVencimiento),
                eq("Observacion de prueba"), eq("base64qr"), eq(1L),
                eq("REC-9876"), eq(new BigDecimal("150.50"))
        );
        verify(auditoriaService).registrarAccion(
                eq(1L), eq("CREAR"), eq("permiso"), eq(100L), anyString(), eq(request)
        );
    }
}
