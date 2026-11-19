import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { UserRole } from '@/types'
import { FAQ_BY_ROLE } from '@/data/faqData'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Search,
  HelpCircle,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  BookOpen,
  RotateCcw,
  Sparkles,
  Info,
  CheckCircle2,
  Lock,
  AlertCircle,
} from 'lucide-react'

// Normalizador insensible a acentos y mayúsculas
function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function FaqPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Rol activo estricto del usuario autenticado (sin selectores ni cruces)
  const currentRole = (user?.role as UserRole) || 'operador'
  const roleFaq = FAQ_BY_ROLE[currentRole]

  // Búsqueda y categoría activa
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('todas')

  // Acordeón: Set de IDs abiertos
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Filtrado reactivo en tiempo real únicamente sobre las preguntas del rol actual
  const filteredItems = useMemo(() => {
    if (!roleFaq) return []
    const termNorm = normalizarTexto(searchTerm)

    return roleFaq.items.filter((item) => {
      // Filtro por categoría propia
      if (selectedCategory !== 'todas' && item.category !== selectedCategory) {
        return false
      }

      // Si no hay término de búsqueda, pasa
      if (!termNorm) return true

      // Coincidencia en pregunta
      if (normalizarTexto(item.question).includes(termNorm)) return true

      // Coincidencia en respuesta
      if (normalizarTexto(item.answer).includes(termNorm)) return true

      // Coincidencia en notas o pasos
      if (item.note && normalizarTexto(item.note).includes(termNorm)) return true
      if (
        item.steps &&
        item.steps.some((step) => normalizarTexto(step).includes(termNorm))
      ) {
        return true
      }

      // Coincidencia en keywords
      if (
        item.keywords &&
        item.keywords.some((k) => normalizarTexto(k).includes(termNorm))
      ) {
        return true
      }

      return false
    })
  }, [roleFaq, selectedCategory, searchTerm])

  // Manejo de acordeón
  const toggleItem = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedIds(new Set(filteredItems.map((i) => i.id)))
  }

  const collapseAll = () => {
    setExpandedIds(new Set())
  }

  const resetFilters = () => {
    setSearchTerm('')
    setSelectedCategory('todas')
  }

  // Fallback seguro si el rol no estuviera en el diccionario
  if (!roleFaq) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Guía no disponible</h2>
        <p className="text-sm text-slate-500">
          No se encontró una guía configurada para el rol actual ({currentRole}).
        </p>
        <Button onClick={() => navigate('/')} className="rounded-xl font-bold">
          Volver al Inicio
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300 pb-16">
      {/* ==================================================================== */}
      {/* 1. ENCABEZADO EXCLUSIVO PARA EL ROL ACTIVO                          */}
      {/* ==================================================================== */}
      <div className="bg-gradient-to-br from-[#0A2342] via-[#0D2E57] to-[#123E75] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Elementos decorativos */}
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute right-12 -bottom-12 w-36 h-36 bg-sky-400/10 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold text-sky-200 border border-white/10">
              <HelpCircle className="w-4 h-4 text-sky-300" />
              <span>Centro de Ayuda Municipal</span>
            </div>

            {/* Badge distintivo del rol actual */}
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${roleFaq.badgeClass}`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{roleFaq.badgeLabel}</span>
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {roleFaq.title}
            </h1>
            <p className="text-white/80 text-sm sm:text-base font-medium mt-1 max-w-2xl leading-relaxed">
              {roleFaq.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. BARRA DE BÚSQUEDA INSTANTÁNEA DENTRO DEL ROL                     */}
      {/* ==================================================================== */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
          <Search className="w-5 h-5" />
        </div>
        <Input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por proceso, trámite o palabra clave..."
          className="pl-12 pr-10 h-13 rounded-2xl bg-white border-slate-200 text-slate-900 shadow-sm text-sm focus:ring-2 focus:ring-[#0A2342] focus:border-transparent"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-bold text-slate-400 hover:text-slate-600"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 3. FILTROS EXCLUSIVOS POR LAS CATEGORÍAS DEL ROL                    */}
      {/* ==================================================================== */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
          <span>Categorías:</span>
          <span>
            {filteredItems.length} {filteredItems.length === 1 ? 'pregunta' : 'preguntas'}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory('todas')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedCategory === 'todas'
                ? 'bg-[#0A2342] text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Todas ({roleFaq.items.length})</span>
          </button>

          {roleFaq.categories.map((catName) => {
            const count = roleFaq.items.filter((i) => i.category === catName).length
            const isSelected = selectedCategory === catName
            return (
              <button
                key={catName}
                type="button"
                onClick={() => setSelectedCategory(catName)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#0A2342] text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{catName}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. HERRAMIENTAS DE ACORDEÓN: EXPANDIR / CONTRAER                    */}
      {/* ==================================================================== */}
      {filteredItems.length > 0 && (
        <div className="flex items-center justify-between px-1 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>Preguntas y procedimientos oficiales para {roleFaq.badgeLabel.replace('Perfil: ', '')}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="text-slate-600 hover:text-[#0A2342] font-bold transition-colors"
            >
              Expandir todas
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={collapseAll}
              className="text-slate-600 hover:text-[#0A2342] font-bold transition-colors"
            >
              Contraer todas
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 5. LISTA DE PREGUNTAS FRECUENTES (ACORDEÓN EXCLUSIVO)                */}
      {/* ==================================================================== */}
      {filteredItems.length === 0 ? (
        <Card className="rounded-3xl border-dashed border-2 border-slate-200 bg-white/50 text-center py-12 px-4">
          <CardContent className="space-y-4">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                No encontramos coincidencias para "{searchTerm}"
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Intenta con otros términos clave o restablece los filtros para ver la guía completa de tu perfil.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={resetFilters}
              className="rounded-xl font-bold text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Restablecer Búsqueda y Filtros
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const isExpanded = expandedIds.has(item.id)

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border transition-all duration-200 shadow-sm overflow-hidden ${
                  isExpanded ? 'border-sky-300 ring-2 ring-sky-50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Cabecera del acordeón */}
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  aria-expanded={isExpanded}
                  className="w-full text-left p-4 sm:p-5 flex items-start justify-between gap-4 select-none focus:outline-none"
                >
                  <div className="space-y-1.5 flex-1 pr-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      {item.category}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                      {item.question}
                    </h3>
                  </div>

                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 ${
                      isExpanded
                        ? 'bg-[#0A2342] text-white rotate-180'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {/* Contenido desplegable */}
                {isExpanded && (
                  <div className="px-4 pb-5 sm:px-5 sm:pb-6 pt-1 border-t border-slate-100 space-y-4 text-sm text-slate-700 animate-in fade-in-50 duration-200">
                    <p className="leading-relaxed font-medium">{item.answer}</p>

                    {/* Pasos numerados si existen */}
                    {item.steps && item.steps.length > 0 && (
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2.5">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Procedimiento Paso a Paso:</span>
                        </p>
                        <ol className="space-y-2">
                          {item.steps.map((step, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm">
                              <span className="w-5 h-5 rounded-full bg-slate-200 text-[#0A2342] font-black flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                                {idx + 1}
                              </span>
                              <span className="leading-relaxed">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Nota de advertencia o consejo */}
                    {item.note && (
                      <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900 font-medium">
                        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                          <span className="font-bold">Importante: </span>
                          {item.note}
                        </div>
                      </div>
                    )}

                    {/* Enlace de acción directa al módulo autorizado */}
                    {item.actionLink && (
                      <div className="pt-2 flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => navigate(item.actionLink!.to)}
                          className="bg-[#0A2342] hover:bg-[#0A2342]/90 text-white rounded-xl text-xs font-bold h-9 shadow-sm"
                        >
                          <span>{item.actionLink.label}</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 6. PIE DE AYUDA Y CONTACTO MUNICIPAL                                 */}
      {/* ==================================================================== */}
      <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <CardContent className="p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#0A2342]" />
              <span>Soporte Técnico y Mesa de Ayuda Municipal</span>
            </h4>
            <p className="text-xs text-slate-500 font-medium max-w-xl">
              ¿Requieres asistencia especializada sobre las funciones de tu perfil? Comunícate con la Subgerencia de Transporte y Seguridad Vial de la Municipalidad Distrital de Marcona.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (currentRole === 'fiscalizador') {
                  navigate('/fiscalizador')
                } else {
                  navigate('/dashboard')
                }
              }}
              className="rounded-xl text-xs font-bold w-full sm:w-auto h-10"
            >
              Volver a Inicio
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
