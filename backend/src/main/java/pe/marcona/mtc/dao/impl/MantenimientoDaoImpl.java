package pe.marcona.mtc.dao.impl;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pe.marcona.mtc.dao.IMantenimientoDao;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Implementación JDBC de consultas de mantenimiento preventivo (solo lectura, consultas parametrizadas).
 */
@Repository
public class MantenimientoDaoImpl implements IMantenimientoDao {

    private static final String RANGO = "BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)";

    private final JdbcTemplate jdbcTemplate;

    public MantenimientoDaoImpl(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Map<String, Long> contarProximosAVencer(int dias) {
        var resultado = new LinkedHashMap<String, Long>();
        resultado.put("permisosTuc", contar(
                "SELECT COUNT(*) FROM permits WHERE estado = 'vigente' AND fecha_vencimiento " + RANGO, dias));
        resultado.put("soat", contar(
                "SELECT COUNT(*) FROM vehicles WHERE estado = 'activo' AND soat_vencimiento " + RANGO, dias));
        resultado.put("citv", contar(
                "SELECT COUNT(*) FROM vehicles WHERE estado = 'activo' AND rt_vencimiento " + RANGO, dias));
        resultado.put("licencias", contar(
                "SELECT COUNT(*) FROM drivers WHERE estado = 'activo' AND fecha_vencimiento_licencia " + RANGO, dias));
        return resultado;
    }

    private long contar(String sql, int dias) {
        Long total = jdbcTemplate.queryForObject(sql, Long.class, dias);
        return total == null ? 0L : total;
    }
}
