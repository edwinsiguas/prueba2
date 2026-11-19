import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '@/lib/api-client'
import { MonitoringSummary, CronJobStatus } from '@/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import {
  Activity,
  Server,
  Database,
  Cpu,
  HardDrive,
  Clock,
  Play,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Zap,
  Layers,
  Calendar,
  AlertOctagon,
  Timer
} from 'lucide-react'

type TabKey = 'health' | 'performance' | 'maintenance'

export function MonitoreoMantenimiento() {
  const [data, setData] = useState<MonitoringSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('health')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [runningJobId, setRunningJobId] = useState<string | null>(null)
  const intervalRef = useRef<number | null>(null)

  const fetchSummary = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true)
    try {
      const summary = await apiClient.getMonitoringSummary()
      setData(summary)
    } catch (err: any) {
      toast.error('No se pudo cargar el estado de monitoreo', {
        description: err?.response?.data?.message || err?.message || 'Error de conexión'
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = window.setInterval(() => {
        fetchSummary(true)
      }, 15000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [autoRefresh, fetchSummary])

  const handleRunJob = async (jobId: string) => {
    setRunningJobId(jobId)
    try {
      const res = await apiClient.runMaintenanceJob(jobId)
      toast.success(`Tarea ${jobId} completada`, {
        description: `${res.message} (${res.affectedCount} registros afectados en ${res.durationMs} ms)`
      })
      await fetchSummary(true)
    } catch (err: any) {
      toast.error(`Error al ejecutar tarea ${jobId}`, {
        description: err?.response?.data?.message || err?.message || 'Fallo inesperado'
      })
    } finally {
      setRunningJobId(null)
    }
  }

  const getProgressColor = (percent: number) => {
    if (percent > 85) return 'bg-rose-500'
    if (percent >= 70) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'UP':
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Operativo
          </span>
        )
      case 'DEGRADED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5" />
            Degradado
          </span>
        )
      case 'DOWN':
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5" />
            Crítico / Error
          </span>
        )
      case 'IDLE':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <Clock className="w-3.5 h-3.5" />
            Inactivo (En espera)
          </span>
        )
    }
  }

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <RotateCw className="w-8 h-8 text-[#0A2342] animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Cargando telemetría del sistema...</p>
      </div>
    )
  }

  const health = data?.health
  const os = data?.osHealth
  const perf = data?.performance
  const jobs = data?.maintenance || []

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#0A2342] text-white rounded-xl shadow-sm">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Monitoreo y Mantenimiento del Sistema
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Telemetría en tiempo real, observabilidad de infraestructura y tareas automatizadas (Exclusivo Administrador)
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Indicador de estado general */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-2xs">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Estado Global:</span>
            {getStatusBadge(health?.status || 'UP')}
          </div>

          {/* Toggle de Auto-refresco */}
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              autoRefresh
                ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="Activa el refresco cada 15s (paúsalo para cuidar RUs de TiDB)"
          >
            <Timer className={`w-3.5 h-3.5 ${autoRefresh ? 'text-amber-600 animate-spin' : 'text-slate-400'}`} />
            Auto-refresco: {autoRefresh ? '15s (Activo)' : 'Pausado'}
          </button>

          {/* Botón Refrescar Ahora */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchSummary()}
            disabled={refreshing}
            className="flex items-center gap-1.5 bg-white border-slate-200 text-slate-800 font-bold hover:bg-slate-50"
          >
            <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#0A2342]' : 'text-slate-500'}`} />
            Actualizar ahora
          </Button>
        </div>
      </div>

      {/* Selector de Pestañas */}
      <div className="flex gap-2 border-b border-slate-200 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('health')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'health'
              ? 'bg-[#0A2342] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Server className="w-4 h-4" />
          1. Salud del SO, JVM y BD
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('performance')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'performance'
              ? 'bg-[#0A2342] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Zap className="w-4 h-4" />
          2. Rendimiento HTTP y Trazas
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('maintenance')}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'maintenance'
              ? 'bg-[#0A2342] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <RotateCw className="w-4 h-4" />
          3. Mantenimiento y Cron Jobs
        </button>
      </div>

      {/* PESTAÑA 1: OS HEALTH & JVM & DATABASE */}
      {activeTab === 'health' && os && health && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tarjeta 1: Memoria JVM */}
            <Card className="border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Server className="w-4 h-4 text-[#0A2342]" />
                    Memoria JVM (Heap)
                  </CardTitle>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                    {os.heapUsagePercent}%
                  </span>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  Render Container (Límite 512 MB)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${getProgressColor(
                      os.heapUsagePercent
                    )}`}
                    style={{ width: `${Math.min(os.heapUsagePercent, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-600 pt-1">
                  <span>En uso: <strong>{os.heapUsedMB} MB</strong></span>
                  <span>Máximo: <strong>{os.heapMaxMB} MB</strong></span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Hilos activos JVM: {os.liveThreads ?? 'N/D'}
                </div>
              </CardContent>
            </Card>

            {/* Tarjeta 2: CPU del Sistema y Proceso */}
            <Card className="border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[#0A2342]" />
                    Carga de CPU
                  </CardTitle>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                    {os.processCpuLoad}%
                  </span>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  {os.osName} ({os.osArch}) • {os.availableProcessors} núcleos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${getProgressColor(
                      os.processCpuLoad
                    )}`}
                    style={{ width: `${Math.min(os.processCpuLoad, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-600 pt-1">
                  <span>Proceso Java: <strong>{os.processCpuLoad}%</strong></span>
                  <span>Host total: <strong>{os.systemCpuLoad}%</strong></span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Java Version: {os.javaVersion || '21'}
                </div>
              </CardContent>
            </Card>

            {/* Tarjeta 3: Disco */}
            <Card className="border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-[#0A2342]" />
                    Almacenamiento en Disco
                  </CardTitle>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                    {os.diskUsagePercent}%
                  </span>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  Directorio raíz y logs temporales
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${getProgressColor(
                      os.diskUsagePercent
                    )}`}
                    style={{ width: `${Math.min(os.diskUsagePercent, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-600 pt-1">
                  <span>Libre: <strong>{os.diskFreeGB} GB</strong></span>
                  <span>Total: <strong>{os.diskTotalGB} GB</strong></span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Ruta de logs: /tmp/mtc-logs
                </div>
              </CardContent>
            </Card>

            {/* Tarjeta 4: Tiempo Activo (Uptime) */}
            <Card className="border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#0A2342]" />
                    Tiempo Activo (Uptime)
                  </CardTitle>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    ONLINE
                  </span>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  Disponibilidad desde el último reinicio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xl font-black text-slate-900 tracking-tight">
                  {os.uptimeFormatted}
                </div>
                <div className="text-xs text-slate-600">
                  Total segundos: <strong>{os.uptimeSeconds.toLocaleString()} s</strong>
                </div>
                <div className="text-[11px] text-slate-400">
                  Entorno: <strong>{health.environment}</strong>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tarjeta Detallada de Base de Datos y Pool HikariCP */}
          <Card className="border border-slate-200 shadow-xs">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-[#0A2342]" />
                  <CardTitle className="text-base font-bold text-slate-900">
                    Base de Datos (TiDB Cloud MySQL 8.0) y Pool de Conexiones HikariCP
                  </CardTitle>
                </div>
                <div>{getStatusBadge(health.database.status)}</div>
              </div>
              <CardDescription className="text-xs text-slate-500">
                Latencia de verificación mediante SELECT 1 y métricas de saturación del pool
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500 font-semibold block">Latencia Ping BD</span>
                  <span className="text-xl font-black text-slate-900">{health.database.latencyMs} ms</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500 font-semibold block">Conexiones Activas</span>
                  <span className="text-xl font-black text-emerald-700">{health.database.activeConnections}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500 font-semibold block">Conexiones Inactivas</span>
                  <span className="text-xl font-black text-slate-700">{health.database.idleConnections}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500 font-semibold block">Hilos Esperando</span>
                  <span className={`text-xl font-black ${health.database.threadsAwaiting > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                    {health.database.threadsAwaiting}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-xs text-slate-500 font-semibold block">Tamaño Máximo Pool</span>
                  <span className="text-xl font-black text-slate-900">{health.database.maxPoolSize || 5}</span>
                </div>
              </div>

              {health.database.status !== 'UP' && (
                <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{health.database.message || 'Error de conexión a TiDB Cloud. Revisa credenciales y conectividad SSL.'}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* PESTAÑA 2: PERFORMANCE HTTP & TRAZAS */}
      {activeTab === 'performance' && perf && (
        <div className="space-y-6">
          {/* Métricas Principales */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-center">
            <Card className="p-4 border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 block">Total Peticiones</span>
              <span className="text-2xl font-black text-slate-900">{perf.totalRequests.toLocaleString()}</span>
            </Card>
            <Card className="p-4 border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 block">Exitosas (2xx/3xx)</span>
              <span className="text-2xl font-black text-emerald-600">{perf.status2xx.toLocaleString()}</span>
            </Card>
            <Card className="p-4 border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 block">Errores Cliente (4xx)</span>
              <span className="text-2xl font-black text-amber-600">{perf.status4xx.toLocaleString()}</span>
            </Card>
            <Card className="p-4 border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 block">Errores Servidor (5xx)</span>
              <span className="text-2xl font-black text-rose-600">{perf.status5xx.toLocaleString()}</span>
            </Card>
            <Card className="p-4 border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 block">Latencia Promedio</span>
              <span className="text-2xl font-black text-slate-900">{perf.avgLatencyMs} ms</span>
            </Card>
            <Card className="p-4 border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 block">Peticiones Lentas (&ge;500ms)</span>
              <span className={`text-2xl font-black ${perf.slowRequests > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                {perf.slowRequests.toLocaleString()}
              </span>
            </Card>
          </div>

          {/* Tabla de Eventos Recientes con X-Request-ID */}
          <Card className="border border-slate-200 shadow-xs">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" />
                    Últimos Eventos Relevantes (Lentos o con Error)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Buffer circular en memoria con Correlation-ID (X-Request-ID) para trazabilidad en logs de Render
                  </CardDescription>
                </div>
                <Link
                  to="/bitacora"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0A2342] hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Ir a Bitácora Funcional
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {perf.recentEvents.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  No se han registrado eventos lentos ni errores HTTP desde el inicio de la sesión.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      <TableHead className="text-xs font-bold text-slate-600">X-Request-ID</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600">Método</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600">Ruta (URI)</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600 text-center">Status</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600 text-right">Duración</TableHead>
                      <TableHead className="text-xs font-bold text-slate-600">Hora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {perf.recentEvents.map((evt, idx) => (
                      <TableRow key={`${evt.requestId}-${idx}`} className="hover:bg-slate-50/60">
                        <TableCell className="font-mono text-xs font-semibold text-slate-800">
                          {evt.requestId}
                        </TableCell>
                        <TableCell>
                          <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
                            {evt.method}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-700 font-mono truncate max-w-xs">
                          {evt.path}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-black ${
                              evt.status >= 500
                                ? 'bg-rose-100 text-rose-800'
                                : evt.status >= 400
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {evt.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold">
                          <span className={evt.durationMs >= 500 ? 'text-amber-600' : 'text-slate-800'}>
                            {evt.durationMs} ms
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* PESTAÑA 3: CRON JOBS Y MANTENIMIENTO */}
      {activeTab === 'maintenance' && (
        <div className="space-y-6">
          <Card className="border border-slate-200 shadow-xs">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <RotateCw className="w-5 h-5 text-[#0A2342]" />
                    Suite de Cron Jobs y Mantenimiento Automatizado
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Tareas programadas en zona horaria America/Lima con posibilidad de disparo manual inmediato para el Administrador
                  </CardDescription>
                </div>
                <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-md">
                  Zona Horaria: <strong>America/Lima (UTC-5)</strong>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {jobs.map((job: CronJobStatus) => (
                  <div
                    key={job.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-[#0A2342] text-white">
                          {job.id}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900">{job.name}</h3>
                        {getStatusBadge(job.lastStatus)}
                      </div>
                      <p className="text-xs text-slate-600">{job.description}</p>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                        <span>
                          Expresión Cron: <strong className="font-mono text-slate-700">{job.cronExpression}</strong>
                        </span>
                        <span>
                          Última Ejecución:{' '}
                          <strong className="text-slate-700">
                            {job.lastRunAt ? new Date(job.lastRunAt).toLocaleString() : 'No ejecutada'}
                          </strong>
                        </span>
                        <span>
                          Duración:{' '}
                          <strong className="text-slate-700">{job.lastDurationMs} ms</strong>
                        </span>
                        <span>
                          Registros Afectados:{' '}
                          <strong className="text-slate-700">{job.lastAffectedCount}</strong>
                        </span>
                      </div>

                      {/* Resumen o mensaje */}
                      <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 mt-2 font-medium">
                        Resumen: {job.lastMessage}
                      </div>
                    </div>

                    <div className="shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleRunJob(job.id)}
                        disabled={runningJobId === job.id}
                        className="w-full md:w-auto bg-[#0A2342] text-white hover:bg-[#0c2f5a] font-bold flex items-center gap-1.5 shadow-2xs"
                      >
                        <Play className={`w-3.5 h-3.5 ${runningJobId === job.id ? 'animate-spin' : ''}`} />
                        {runningJobId === job.id ? 'Ejecutando...' : 'Ejecutar ahora'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
