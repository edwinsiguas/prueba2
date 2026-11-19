package pe.marcona.mtc.dao;

import java.util.Map;

/**
 * Contrato de acceso a datos para consultas de mantenimiento preventivo
 * (documentos próximos a vencer).
 */
public interface IMantenimientoDao {

    /**
     * Cuenta documentos que vencen entre hoy y los próximos {@code dias} días.
     * Claves: {@code permisosTuc}, {@code soat}, {@code citv}, {@code licencias}.
     */
    Map<String, Long> contarProximosAVencer(int dias);
}
