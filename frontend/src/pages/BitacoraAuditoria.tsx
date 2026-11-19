import { useEffect, useState, useMemo } from 'react'
import { apiClient } from '@/lib/api-client'
import { ActionLog } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import {
  ShieldCheck,
  History,
  Filter,
  Search,
  Calendar,
  User,
  Activity,
  FileText,
  Truck,
  Building2,
  Download,
  RefreshCw,
  Laptop,
  Eye,
  AlertTriangle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Database,
  Layers,
  Sparkles,
  CheckCircle2,
  XCircle,
  Code,
  ChevronDown,
  ChevronUp,
  Clock,
  Globe,
  ArrowRight
} from 'lucide-react'

type ActionCategory =
  | 'ANULACION'
  | 'CREACION'
  | 'REACTIVACION'
  | 'ASIGNACION'
  | 'DESASIGNACION'
  | 'RENOVACION'
  | 'LOGIN'
  | 'LOGOUT'
  | 'ACTUALIZACION'

interface ParsedActionInfo {
  category: ActionCategory
  label: string
  badgeClass: string
  dotClass: string
  icon: typeof Activity
  isCritical: boolean
}

export function BitacoraAuditoria() {
  const [logs, setLogs] = useState<ActionLog[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedLog, setSelectedLog] = useState<ActionLog | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [showRawJson, setShowRawJson] = useState(false)

  // Paginación real de servidor (por defecto 10 registros por página)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)

  // Filtros visuales y de servidor
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('todos')
  const [entityFilter, setEntityFilter] = useState<string>('todos')
  const [dateFilter, setDateFilter] = useState<string>('')
  const [quickDatePreset, setQuickDatePreset] = useState<'all' | 'today' | 'week' | 'month'>('all')

  // Carga reactiva cada vez que cambia la página, límite o filtros de servidor
  useEffect(() => {
    loadAuditoria()
  }, [page, limit, actionFilter, entityFilter, dateFilter, quickDatePreset])

  // Reiniciar página a 1 cuando el usuario teclea en el buscador
  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1)
      loadAuditoria()
    }, 350)
    return () => clearTimeout(handler)
  }, [searchQuery])

  async function loadAuditoria(isManualRefresh = false) {
    try {
      if (isManualRefresh) setRefreshing(true)
      else setLoading(true)

      const params: Record<string, any> = {
        page,
        limit,
      }

      if (actionFilter !== 'todos') {
        params.accion = actionFilter
      }
      if (entityFilter !== 'todos') {
        params.entidad = entityFilter
      }
      if (searchQuery.trim()) {
        params.q = searchQuery.trim()
      }

      // Manejo de fechas rápidas o fecha específica
      if (dateFilter) {
        params.fecha = dateFilter
      } else if (quickDatePreset === 'today') {
        params.fecha = new Date().toISOString().slice(0, 10)
      }

      const res = await apiClient.listAuditoria(params)
      if (res && res.success && res.data) {
        const dataList: ActionLog[] = res.data.data || (res.data as any).items || []
        setLogs(dataList)

        const pagination = res.data.pagination || (res.data as any)
        if (pagination) {
          const total = Number(pagination.total ?? dataList.length)
          const pages = Number(pagination.totalPages ?? pagination.pages ?? Math.max(1, Math.ceil(total / limit)))
          setTotalRecords(total)
          setTotalPages(Math.max(1, pages))
        } else {
          setTotalRecords(dataList.length)
          setTotalPages(1)
        }
      } else {
        setLogs([])
        setTotalRecords(0)
        setTotalPages(1)
      }
    } catch (err) {
      console.error('Error al cargar la bitácora de auditoría:', err)
      toast.error('No se pudo cargar la bitácora de auditoría')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  function handleResetFilters() {
    setSearchQuery('')
    setActionFilter('todos')
    setEntityFilter('todos')
    setDateFilter('')
    setQuickDatePreset('all')
    setPage(1)
  }

  function handleQuickDate(preset: 'all' | 'today' | 'week' | 'month') {
    setQuickDatePreset(preset)
    if (preset === 'today') {
      setDateFilter(new Date().toISOString().slice(0, 10))
    } else {
      setDateFilter('')
    }
    setPage(1)
  }

  // Clasificador e interpretador semántico de acciones (compatibilidad con logs antiguos y nuevos)
  function parseLogAction(log: ActionLog | null): ParsedActionInfo {
    if (!log) {
      return {
        category: 'ACTUALIZACION',
        label: 'Operación General',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        dotClass: 'bg-slate-400',
        icon: Activity,
        isCritical: false,
      }
    }

    const rawAction = (log.accion || '').toUpperCase().trim()
    const desc = (log.descripcion || '').toLowerCase()

    // 1. Detección de Anulación / Desactivación / Suspensión / Revocación
    const isAnulacion =
      rawAction.includes('ANUL') ||
      rawAction.includes('REVOC') ||
      rawAction.includes('ELIMIN') ||
      rawAction.includes('DESACTIV') ||
      rawAction.includes('BLOQUE') ||
      rawAction.includes('SUSPEND') ||
      (rawAction.includes('ACTUALIZ') && (desc.includes('anulad') || desc.includes('inactiv') || desc.includes('suspendid') || desc.includes('bloquead') || desc.includes('desactiv')))

    if (isAnulacion) {
      let label = 'Anulación / Baja'
      if (log.entidad === 'chofer' || log.entidad === 'conductor') label = 'Anulación de Conductor'
      else if (log.entidad === 'vehiculo') label = 'Desactivación de Vehículo'
      else if (log.entidad === 'permiso') label = 'Revocación de Permiso'
      else if (log.entidad === 'empresa') label = 'Suspensión de Empresa'
      else if (log.entidad === 'usuario') label = 'Bloqueo de Usuario'

      return {
        category: 'ANULACION',
        label,
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 shadow-2xs',
        dotClass: 'bg-rose-500 animate-pulse',
        icon: XCircle,
        isCritical: true,
      }
    }

    // 2. Detección de Reactivación / Habilitación
    if (
      rawAction.includes('REACTIV') ||
      rawAction.includes('HABILIT') ||
      (rawAction.includes('ACTUALIZ') && (desc.includes('habilitad') || desc.includes('reactivad')))
    ) {
      let label = 'Reactivación / Alta'
      if (log.entidad === 'chofer' || log.entidad === 'conductor') label = 'Habilitación de Chofer'
      else if (log.entidad === 'vehiculo') label = 'Reactivación Vehicular'
      else if (log.entidad === 'empresa') label = 'Reactivación Empresa'
      else if (log.entidad === 'usuario') label = 'Desbloqueo Usuario'

      return {
        category: 'REACTIVACION',
        label,
        badgeClass: 'bg-teal-50 text-teal-700 border-teal-200 shadow-2xs',
        dotClass: 'bg-teal-500',
        icon: CheckCircle2,
        isCritical: false,
      }
    }

    // 3. Creación / Emisión
    if (rawAction.includes('CREAR') || rawAction.includes('INSERT') || rawAction.includes('REGISTR') || rawAction.includes('EMIT')) {
      let label = 'Creación / Registro'
      if (log.entidad === 'permiso') label = 'Emisión de Permiso TUC'
      else if (log.entidad === 'vehiculo') label = 'Nuevo Vehículo'
      else if (log.entidad === 'chofer' || log.entidad === 'conductor') label = 'Nuevo Conductor'
      else if (log.entidad === 'empresa') label = 'Nueva Empresa'
      else if (log.entidad === 'usuario') label = 'Nuevo Usuario'

      return {
        category: 'CREACION',
        label,
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs',
        dotClass: 'bg-emerald-500',
        icon: Sparkles,
        isCritical: false,
      }
    }

    // 4. Asignación vehicular
    if (rawAction.includes('ASIGNAR') && !rawAction.includes('DESASIGNAR')) {
      return {
        category: 'ASIGNACION',
        label: 'Asignación Vehicular',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 shadow-2xs',
        dotClass: 'bg-amber-500',
        icon: Layers,
        isCritical: false,
      }
    }

    // 5. Desasignación vehicular
    if (rawAction.includes('DESASIGNAR')) {
      return {
        category: 'DESASIGNACION',
        label: 'Desasignación Vehicular',
        badgeClass: 'bg-orange-50 text-orange-700 border-orange-200 shadow-2xs',
        dotClass: 'bg-orange-500',
        icon: Layers,
        isCritical: false,
      }
    }

    // 6. Renovación
    if (rawAction.includes('RENOV')) {
      return {
        category: 'RENOVACION',
        label: 'Renovación de Permiso',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-2xs',
        dotClass: 'bg-indigo-500',
        icon: RotateCcw,
        isCritical: false,
      }
    }

    // 7. Login / Logout
    if (rawAction.includes('LOGIN') || rawAction.includes('AUTH')) {
      return {
        category: 'LOGIN',
        label: rawAction.includes('FALL') ? 'Login Fallido' : 'Inicio de Sesión',
        badgeClass: rawAction.includes('FALL')
          ? 'bg-red-50 text-red-700 border-red-200'
          : 'bg-purple-50 text-purple-700 border-purple-200 shadow-2xs',
        dotClass: rawAction.includes('FALL') ? 'bg-red-500' : 'bg-purple-500',
        icon: ShieldCheck,
        isCritical: rawAction.includes('FALL'),
      }
    }

    if (rawAction.includes('LOGOUT')) {
      return {
        category: 'LOGOUT',
        label: 'Cierre de Sesión',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        dotClass: 'bg-slate-400',
        icon: ShieldCheck,
        isCritical: false,
      }
    }

    // 8. Por defecto: Actualización
    return {
      category: 'ACTUALIZACION',
      label: 'Actualización de Datos',
      badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 shadow-2xs',
      dotClass: 'bg-sky-500',
      icon: Activity,
      isCritical: false,
    }
  }

  // Generador de resumen legible para la tabla
  function getLogSummary(log: ActionLog) {
    if (!log.descripcion || log.descripcion.trim() === '') {
      return `Operación registrada sobre ${log.entidad} #${log.entidad_id || '-'}`
    }

    // Si es un log antiguo que decía "Chofer actualizado" o "Vehículo actualizado"
    const parsed = parseLogAction(log)
    if (log.descripcion.toLowerCase() === 'chofer actualizado') {
      return parsed.category === 'ANULACION'
        ? `Se anuló/suspendió al conductor ID #${log.entidad_id}`
        : `Modificación de datos del conductor ID #${log.entidad_id}`
    }
    if (log.descripcion.toLowerCase() === 'vehículo actualizado') {
      return parsed.category === 'ANULACION'
        ? `Se desactivó el vehículo ID #${log.entidad_id}`
        : `Modificación técnica del vehículo ID #${log.entidad_id}`
    }

    return log.descripcion
  }

  // Extracción de datos estructurados para el modal de detalle
  function parseDetailChanges(log: ActionLog | null) {
    if (!log || !log.descripcion) return []

    const items: { campo: string; anterior?: string; nuevo?: string; valor?: string }[] = []
    const desc = log.descripcion

    // 1. Patrón: "Estado: ACTIVO -> INACTIVO" o "Estado cambió de 'X' a 'Y'"
    const stateMatch = desc.match(/Estado:\s*([A-Za-z0-9_]+)\s*->\s*([A-Za-z0-9_]+)/i)
    if (stateMatch) {
      items.push({
        campo: 'Estado de la Entidad',
        anterior: stateMatch[1].toUpperCase(),
        nuevo: stateMatch[2].toUpperCase(),
      })
    } else {
      const stateMatch2 = desc.match(/cambi[óo]\s*de\s*['"]?([A-Za-z0-9_]+)['"]?\s*a\s*['"]?([A-Za-z0-9_]+)['"]?/i)
      if (stateMatch2) {
        items.push({
          campo: 'Estado Operativo',
          anterior: stateMatch2[1].toUpperCase(),
          nuevo: stateMatch2[2].toUpperCase(),
        })
      }
    }

    // 2. Patrón de campos modificados: "(campos modificados: a, b, c)"
    const fieldsMatch = desc.match(/campos(?:\s*modificados)?:\s*([^)]+)/i)
    if (fieldsMatch) {
      const fields = fieldsMatch[1].split(',').map((f) => f.trim())
      fields.forEach((f) => {
        items.push({
          campo: f.replace(/_/g, ' ').toUpperCase(),
          valor: 'Valor actualizado por el operador',
        })
      })
    }

    // 3. Patrón de Placa
    const placaMatch = desc.match(/placa\s*([A-Z0-9-]{6,7})/i)
    if (placaMatch) {
      items.push({
        campo: 'Placa Vehicular',
        valor: placaMatch[1].toUpperCase(),
      })
    }

    // 4. Patrón de DNI
    const dniMatch = desc.match(/DNI\s*([0-9]{8})/i)
    if (dniMatch) {
      items.push({
        campo: 'DNI Titular',
        valor: dniMatch[1],
      })
    }

    // 5. Patrón de RUC
    const rucMatch = desc.match(/RUC\s*([0-9]{11})/i)
    if (rucMatch) {
      items.push({
        campo: 'RUC Empresa',
        valor: rucMatch[1],
      })
    }

    // 6. Patrón de N° Permiso
    const permMatch = desc.match(/(?:TUC\s*N°\s*|permiso(?:\s*generado:)?\s*)([A-Z0-9-]+)/i)
    if (permMatch && !permMatch[1].toLowerCase().includes('cread') && !permMatch[1].toLowerCase().includes('actualiz')) {
      items.push({
        campo: 'N° Permiso / TUC',
        valor: permMatch[1].toUpperCase(),
      })
    }

    // 7. Patrón de Motivo
    const motivoMatch = desc.match(/motivo:\s*([^.]+)/i)
    if (motivoMatch) {
      items.push({
        campo: 'Motivo Sustentatorio',
        valor: motivoMatch[1].trim(),
      })
    }

    return items
  }

  function getEntityIcon(entity: string) {
    const ent = (entity || '').toLowerCase()
    if (ent.includes('vehic')) return <Truck className="w-3.5 h-3.5 text-blue-600" />
    if (ent.includes('permis') || ent.includes('tuc')) return <FileText className="w-3.5 h-3.5 text-indigo-600" />
    if (ent.includes('empresa') || ent.includes('compan')) return <Building2 className="w-3.5 h-3.5 text-amber-600" />
    if (ent.includes('conductor') || ent.includes('chofer') || ent.includes('driver')) return <User className="w-3.5 h-3.5 text-emerald-600" />
    if (ent.includes('asignacion')) return <Layers className="w-3.5 h-3.5 text-orange-600" />
    if (ent.includes('usuario') || ent.includes('user')) return <ShieldCheck className="w-3.5 h-3.5 text-violet-600" />
    return <Database className="w-3.5 h-3.5 text-slate-500" />
  }

  function formatIpDisplay(ip: string | null) {
    if (!ip || ip === '127.0.0.1' || ip === 'localhost') {
      return {
        ip: ip || '127.0.0.1',
        isLocal: true,
        tag: 'Localhost / Loopback',
      }
    }
    return {
      ip,
      isLocal: false,
      tag: 'Red / Remota',
    }
  }

  // Métricas ejecutivas
  const metrics = useMemo(() => {
    const criticalInPage = logs.filter((l) => parseLogAction(l).isCritical).length
    return {
      total: totalRecords,
      criticalInPage,
      pageCount: logs.length,
    }
  }, [logs, totalRecords])

  function exportToCsv() {
    if (logs.length === 0) {
      toast.warning('No hay datos en la bitácora para exportar')
      return
    }

    const headers = ['ID', 'Fecha/Hora', 'Usuario', 'Email', 'Acción', 'Acción Detallada', 'Entidad', 'ID Entidad', 'IP', 'Detalles']
    const csvRows = [
      headers.join(','),
      ...logs.map((l) => {
        const actionInfo = parseLogAction(l)
        return [
          l.id,
          `"${l.created_at}"`,
          `"${l.usuario_nombre || 'Sistema'}"`,
          `"${l.email || '-'}"`,
          `"${l.accion}"`,
          `"${actionInfo.label}"`,
          `"${l.entidad}"`,
          l.entidad_id ?? '',
          `"${l.ip_address || '127.0.0.1'}"`,
          `"${(l.descripcion || '').replace(/"/g, '""')}"`,
        ].join(',')
      }),
    ]

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `bitacora_auditoria_marcona_pag${page}_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Página de bitácora exportada en formato CSV correctamente')
  }

  // Generador inteligente de números de página para la barra de navegación
  const paginationRange = useMemo(() => {
    const delta = 2
    const range: (number | string)[] = []
    const rangeWithDots: (number | string)[] = []

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
        range.push(i)
      }
    }

    let prev: number | null = null
    for (const i of range) {
      if (typeof i === 'number') {
        if (prev !== null && i - prev !== 1) {
          rangeWithDots.push('...')
        }
        rangeWithDots.push(i)
        prev = i
      }
    }

    return rangeWithDots
  }, [page, totalPages])

  const parsedCurrentLog = selectedLog ? parseLogAction(selectedLog) : null
  const parsedDetailItems = selectedLog ? parseDetailChanges(selectedLog) : []

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Encabezado Superior Institucional */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0A2342]" />
            <span>Trazabilidad Forense &bull; Paginación en Servidor &bull; MTC Marcona</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <History className="w-7 h-7 text-[#0A2342]" />
            Bitácora Visual de Auditoría
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Trazabilidad detallada de mutaciones, anulaciones y accesos al sistema con control de carga optimizado a {limit} registros por página.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAuditoria(true)}
            disabled={refreshing || loading}
            className="border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin text-[#0A2342]' : ''}`} />
            Sincronizar
          </Button>

          <Button
            size="sm"
            onClick={exportToCsv}
            className="bg-[#0A2342] hover:bg-[#0c2f5a] text-white font-semibold shadow-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Tarjetas de Métricas Ejecutivas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total en Base de Datos</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{totalRecords.toLocaleString()}</h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Eventos registrados en MySQL
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Database className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Carga Optimizada</p>
              <h3 className="text-2xl font-black text-[#0A2342] mt-1">{logs.length} de {totalRecords}</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                Mostrando página {page} de {totalPages} ({limit} por pág.)
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Layers className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Anulaciones / Bajas (En Vista)</p>
              <h3 className="text-2xl font-black text-rose-600 mt-1">{metrics.criticalInPage}</h3>
              <p className="text-[11px] text-rose-500 font-medium mt-1">Acciones críticas detectadas en esta página</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros Visuales */}
      <Card className="border-slate-200/80 shadow-xs">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#0A2342]" />
              <span className="text-sm font-bold text-slate-800">Filtros de Búsqueda y Trazabilidad</span>
              <span className="text-xs text-slate-400 font-normal">
                ({totalRecords} eventos encontrados)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Rango rápido:</span>
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickDate('all')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    quickDatePreset === 'all' && !dateFilter ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDate('today')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    quickDatePreset === 'today' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Hoy
                </button>
              </div>

              {(searchQuery || actionFilter !== 'todos' || entityFilter !== 'todos' || dateFilter || quickDatePreset !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="text-xs text-slate-500 hover:text-slate-800 h-8"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Limpiar filtros
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Buscador General por Servidor */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">
                Búsqueda Rápida (Usuario, Placa, DNI, IP, Detalle)
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Buscar texto en servidor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white border-slate-200 text-sm focus:ring-[#0A2342]"
                />
              </div>
            </div>

            {/* Filtro por Acción */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">
                Tipo de Acción
              </label>
              <Select value={actionFilter} onValueChange={(val) => { setActionFilter(val); setPage(1); }}>
                <SelectTrigger className="bg-white border-slate-200 text-sm">
                  <SelectValue placeholder="Seleccionar acción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas las acciones</SelectItem>
                  <SelectItem value="ANULAR">ANULAR / DESACTIVAR / SUSPENDER</SelectItem>
                  <SelectItem value="CREAR">CREAR / EMITIR</SelectItem>
                  <SelectItem value="ACTUALIZAR">ACTUALIZAR DATOS</SelectItem>
                  <SelectItem value="REACTIVAR">REACTIVAR / HABILITAR</SelectItem>
                  <SelectItem value="ASIGNAR">ASIGNAR CONDUCTOR</SelectItem>
                  <SelectItem value="DESASIGNAR">DESASIGNAR CONDUCTOR</SelectItem>
                  <SelectItem value="RENOVAR">RENOVAR PERMISO</SelectItem>
                  <SelectItem value="LOGIN">INICIO DE SESIÓN</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Entidad */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">
                Módulo / Entidad Afectada
              </label>
              <Select value={entityFilter} onValueChange={(val) => { setEntityFilter(val); setPage(1); }}>
                <SelectTrigger className="bg-white border-slate-200 text-sm">
                  <SelectValue placeholder="Seleccionar entidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas las entidades</SelectItem>
                  <SelectItem value="vehiculo">Vehículo</SelectItem>
                  <SelectItem value="conductor">Conductor / Chofer</SelectItem>
                  <SelectItem value="permiso">Permiso (TUC)</SelectItem>
                  <SelectItem value="asignacion">Asignación Vehicular</SelectItem>
                  <SelectItem value="empresa">Empresa</SelectItem>
                  <SelectItem value="usuario">Usuario del Sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Fecha Específica */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">
                Fecha Específica
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value)
                    setQuickDatePreset('all')
                    setPage(1)
                  }}
                  className="pl-9 bg-white border-slate-200 text-sm focus:ring-[#0A2342]"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla Principal: Bitácora Paginada */}
      <Card className="border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#0A2342]" />
            <span className="font-bold text-slate-900 text-sm">Trazabilidad de Auditoría</span>
            <span className="text-xs font-semibold bg-[#0A2342] text-white px-2.5 py-0.5 rounded-full">
              Página {page} de {totalPages || 1}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
            <span>
              Total en sistema: <strong className="text-slate-800">{totalRecords}</strong> registros
            </span>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5">
              <span>Filas por página:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value))
                  setPage(1)
                }}
                className="bg-white border border-slate-200 rounded px-2 py-0.5 font-bold text-slate-800 cursor-pointer focus:ring-[#0A2342]"
              >
                <option value={10}>10 (Recomendado)</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-100/60">
              <TableRow className="hover:bg-transparent border-slate-200">
                <TableHead className="w-[160px] text-xs font-bold text-slate-700 uppercase">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Fecha / Hora
                  </div>
                </TableHead>
                <TableHead className="w-[220px] text-xs font-bold text-slate-700 uppercase">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Usuario (Actor)
                  </div>
                </TableHead>
                <TableHead className="w-[190px] text-xs font-bold text-slate-700 uppercase">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-slate-400" />
                    Acción Realizada
                  </div>
                </TableHead>
                <TableHead className="w-[150px] text-xs font-bold text-slate-700 uppercase">
                  <div className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-slate-400" />
                    Entidad Afectada
                  </div>
                </TableHead>
                <TableHead className="w-[140px] text-xs font-bold text-slate-700 uppercase">
                  <div className="flex items-center gap-1.5">
                    <Laptop className="w-3.5 h-3.5 text-slate-400" />
                    Dirección IP
                  </div>
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 uppercase">
                  Detalles Explícitos de la Operación
                </TableHead>
                <TableHead className="w-[70px] text-center text-xs font-bold text-slate-700 uppercase">
                  Ver
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                      <RefreshCw className="w-6 h-6 animate-spin text-[#0A2342]" />
                      <p className="text-sm font-semibold">Cargando 10 registros de la bitácora desde la base de datos...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <ShieldCheck className="w-10 h-10 stroke-[1.5] text-slate-300" />
                      <p className="text-sm font-semibold text-slate-700">No se encontraron eventos en la bitácora</p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        Intenta ajustar los filtros de búsqueda o restablecer para ver las últimas transacciones.
                      </p>
                      <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-2 text-xs">
                        Restablecer filtros
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const actionInfo = parseLogAction(log)
                  const ActionIcon = actionInfo.icon
                  const ipInfo = formatIpDisplay(log.ip_address)
                  const initials = (log.usuario_nombre || 'Sistema')
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()

                  return (
                    <TableRow
                      key={log.id}
                      className={`hover:bg-slate-50/80 transition-colors border-slate-100 group ${
                        actionInfo.isCritical ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      {/* Fecha y Hora */}
                      <TableCell className="align-middle">
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs text-slate-800">
                            {log.created_at ? log.created_at.split(' ')[0] : '-'}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            {log.created_at ? log.created_at.split(' ')[1] || '' : ''}
                          </span>
                        </div>
                      </TableCell>

                      {/* Usuario (Actor) */}
                      <TableCell className="align-middle">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8 bg-[#0A2342] text-white text-[11px] font-bold">
                            <AvatarFallback className="bg-[#0A2342] text-white">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {log.usuario_nombre || 'Sistema Automatizado'}
                            </span>
                            <span className="text-[11px] text-slate-400 truncate">
                              {log.email || 'sistema@marcona.gob.pe'}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Acción Realizada (Badge Semántico Explícito) */}
                      <TableCell className="align-middle">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${actionInfo.badgeClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${actionInfo.dotClass}`} />
                            <ActionIcon className="w-3.5 h-3.5 shrink-0" />
                            {actionInfo.label}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tight">
                            SQL: {log.accion}
                          </span>
                        </div>
                      </TableCell>

                      {/* Entidad Afectada */}
                      <TableCell className="align-middle">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100/90 text-slate-800 border border-slate-200/60">
                          {getEntityIcon(log.entidad)}
                          <span className="capitalize">{log.entidad}</span>
                          {log.entidad_id ? (
                            <span className="font-mono text-[10px] text-slate-500 font-semibold">
                              #{log.entidad_id}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>

                      {/* Dirección IP */}
                      <TableCell className="align-middle">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 inline-block w-fit">
                            {ipInfo.ip}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            {ipInfo.tag}
                          </span>
                        </div>
                      </TableCell>

                      {/* Detalles Explícitos */}
                      <TableCell className="align-middle max-w-sm">
                        <div className="space-y-0.5">
                          <p className="text-xs text-slate-800 font-medium leading-snug line-clamp-2" title={log.descripcion || ''}>
                            {getLogSummary(log)}
                          </p>
                          {actionInfo.isCritical && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                              <AlertTriangle className="w-2.5 h-2.5" /> Cambio de Estado / Restricción
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Botón Ver Detalle */}
                      <TableCell className="align-middle text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLog(log)
                            setShowRawJson(false)
                            setDetailOpen(true)
                          }}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-[#0A2342] hover:bg-slate-100 rounded-lg transition-colors"
                          title="Inspeccionar detalle completo"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Barra de Paginación Profesional Completa */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>
              Mostrando <strong className="text-slate-800">{logs.length > 0 ? (page - 1) * limit + 1 : 0}</strong>–
              <strong className="text-slate-800">{Math.min(page * limit, totalRecords)}</strong> de{' '}
              <strong className="text-slate-800">{totalRecords}</strong> registros
            </span>
            <span className="text-slate-300">&bull;</span>
            <span>
              Página <strong className="text-slate-800">{page}</strong> de <strong className="text-slate-800">{totalPages || 1}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Primera Página */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(1)}
              disabled={page <= 1 || loading}
              className="h-8 px-2.5 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              title="Ir a la primera página"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </Button>

            {/* Página Anterior */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1 || loading}
              className="h-8 px-3 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 font-semibold"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              Anterior
            </Button>

            {/* Números de Página con Truncado Inteligente */}
            <div className="hidden sm:flex items-center gap-1 mx-1">
              {paginationRange.map((item, idx) => {
                if (item === '...') {
                  return (
                    <span key={`dots-${idx}`} className="px-2 py-1 text-slate-400 font-bold select-none">
                      ...
                    </span>
                  )
                }
                const pageNumber = Number(item)
                const isCurrent = pageNumber === page
                return (
                  <button
                    key={`page-${pageNumber}`}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    disabled={loading || isCurrent}
                    className={`h-8 min-w-[32px] px-2 rounded-md font-bold text-xs transition-all ${
                      isCurrent
                        ? 'bg-[#0A2342] text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {pageNumber}
                  </button>
                )
              })}
            </div>

            {/* Página Siguiente */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || loading}
              className="h-8 px-3 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 font-semibold"
            >
              Siguiente
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>

            {/* Última Página */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages || loading}
              className="h-8 px-2.5 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              title="Ir a la última página"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Modal Detallado de Inspección Forense de Auditoría */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 pr-6">
              <DialogTitle className="flex items-center gap-2 text-slate-900 text-base font-extrabold">
                <ShieldCheck className="w-5 h-5 text-[#0A2342]" />
                Detalle Forense del Evento #{selectedLog?.id}
              </DialogTitle>
              {parsedCurrentLog && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${parsedCurrentLog.badgeClass}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${parsedCurrentLog.dotClass}`} />
                  {parsedCurrentLog.label}
                </span>
              )}
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Registro inmutable de auditoría generado automáticamente en la base de datos MySQL de Marcona.
            </DialogDescription>
          </DialogHeader>

          {selectedLog && parsedCurrentLog && (
            <div className="space-y-4 text-xs mt-3">
              {/* Alerta si es operación crítica */}
              {parsedCurrentLog.isCritical && (
                <div className="bg-rose-50 border-l-4 border-rose-500 p-3.5 rounded-r-xl flex items-start gap-3 shadow-2xs">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-rose-900 text-xs">Acción de Baja / Restricción Operativa</h4>
                    <p className="text-[11px] text-rose-700 leading-relaxed">
                      Esta operación modificó el estado activo de la entidad a inactivo, suspendido o revocado.
                    </p>
                  </div>
                </div>
              )}

              {/* SECCIÓN 1: Resumen de la Operación */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Descripción y Alcance de la Operación
                </span>
                <p className="text-sm font-semibold text-slate-900 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                  {getLogSummary(selectedLog)}
                </p>
              </div>

              {/* SECCIÓN 2: Metadatos de Trazabilidad */}
              <div className="grid grid-cols-2 gap-3">
                {/* Usuario Actor */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-start gap-3">
                  <Avatar className="h-9 w-9 bg-[#0A2342] text-white text-xs font-bold shrink-0">
                    <AvatarFallback className="bg-[#0A2342] text-white">
                      {(selectedLog.usuario_nombre || 'S')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Usuario Ejecutor</span>
                    <span className="font-bold text-slate-900 block truncate">{selectedLog.usuario_nombre || 'Sistema'}</span>
                    <span className="text-[11px] text-slate-500 truncate block">{selectedLog.email}</span>
                    <span className="font-mono text-[10px] text-slate-400">ID Usuario: #{selectedLog.user_id}</span>
                  </div>
                </div>

                {/* Conexión e IP */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Dirección IP y Origen</span>
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      {selectedLog.ip_address || '127.0.0.1'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    {formatIpDisplay(selectedLog.ip_address).tag}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{selectedLog.created_at}</span>
                  </div>
                </div>

                {/* Entidad Afectada */}
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Entidad Modificada</span>
                  <div className="flex items-center gap-2 mt-1.5 font-bold text-slate-800 text-xs">
                    {getEntityIcon(selectedLog.entidad)}
                    <span className="capitalize">{selectedLog.entidad}</span>
                    {selectedLog.entidad_id && (
                      <span className="font-mono text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        ID: #{selectedLog.entidad_id}
                      </span>
                    )}
                  </div>
                </div>

                {/* Código de Acción en Base de Datos */}
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Acción SQL Registrada</span>
                  <div className="mt-1 font-mono font-bold text-xs text-slate-800 bg-slate-100 px-2 py-1 rounded inline-block">
                    {selectedLog.accion}
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: Desglose Estructurado de Cambios Realizados */}
              {parsedDetailItems.length > 0 && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Propiedades y Cambios Detectados
                  </span>
                  <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="text-left p-2.5">Propiedad / Campo</th>
                          <th className="text-left p-2.5">Detalle / Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedDetailItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-2.5 font-semibold text-slate-700">{item.campo}</td>
                            <td className="p-2.5 font-mono">
                              {item.anterior && item.nuevo ? (
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 line-through">
                                    {item.anterior}
                                  </span>
                                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                                    {item.nuevo}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-800 font-semibold">{item.valor}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SECCIÓN 4: JSON Técnico Colapsable */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 font-bold text-slate-700 text-xs">
                    <Code className="w-4 h-4 text-slate-500" />
                    <span>Ver JSON técnico de auditoría</span>
                    <span className="text-[10px] text-slate-400 font-normal">(Para inspección forense)</span>
                  </div>
                  {showRawJson ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {showRawJson && (
                  <div className="p-3 bg-slate-900 border-t border-slate-200">
                    <pre className="font-mono text-[11px] text-emerald-400 whitespace-pre-wrap overflow-x-auto leading-relaxed">
                      {JSON.stringify(selectedLog, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Trazabilidad Inmutable Certificada &bull; MTC Marcona</span>
                </div>
                <span className="font-mono">Log ID #{selectedLog.id}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default BitacoraAuditoria
