package pe.marcona.mtc.dao;

import java.util.List;
import java.util.Map;

/**
 * Contrato de acceso a datos para registros de auditoría y trazas de acciones (action_logs).
 */
public interface IAuditoriaDao {

    void insertarRegistro(long idUsuario, String accion, String entidad, long idEntidad, String descripcion, String ip);

    long contarHistorial(Long idUsuario, String accion, String entidad, String busqueda, String fecha);

    List<Map<String, Object>> listarHistorial(Long idUsuario, String accion, String entidad, String busqueda, String fecha, int limite, long desplazamiento);

    default long contarHistorial(Long idUsuario, String accion, String entidad) {
        return contarHistorial(idUsuario, accion, entidad, null, null);
    }

    default List<Map<String, Object>> listarHistorial(Long idUsuario, String accion, String entidad, int limite, long desplazamiento) {
        return listarHistorial(idUsuario, accion, entidad, null, null, limite, desplazamiento);
    }
}



