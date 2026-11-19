import { UserRole } from '@/types'

export interface FaqItem {
  id: string
  category: string
  question: string
  answer: string
  steps?: string[]
  note?: string
  keywords: string[]
  actionLink?: {
    label: string
    to: string
  }
}

export interface RoleFaqContent {
  role: UserRole
  title: string
  subtitle: string
  badgeLabel: string
  badgeClass: string
  categories: string[]
  items: FaqItem[]
}

// ============================================================================
// 1. GUÍA EXCLUSIVA: ADMINISTRADOR (ADMIN)
// ============================================================================
const ADMIN_CONTENT: RoleFaqContent = {
  role: 'admin',
  title: 'Centro de Ayuda y Manual del Administrador',
  subtitle:
    'Guía técnica y operativa exclusiva para la administración distrital: gestión de usuarios, auditoría forense, control del padrón vehicular y emisión de TUC.',
  badgeLabel: 'Perfil: Administrador del Sistema',
  badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
  categories: [
    'Usuarios y Control de Acceso',
    'Bitácora y Auditoría Forense',
    'Padrón y Concesiones',
    'Permisos, TUC y Reportes',
    'Seguridad y Cuenta Admin',
  ],
  items: [
    {
      id: 'adm-01',
      category: 'Usuarios y Control de Acceso',
      question: '¿Cómo dar de alta un nuevo usuario y qué rol otorgarle?',
      answer:
        'Como Administrador, tienes el control exclusivo del módulo de Usuarios. El sistema cuenta con 3 roles estrictamente delimitados:',
      steps: [
        'Ingresa al módulo "Usuarios" desde el menú lateral izquierdo.',
        'Presiona el botón "Nuevo Usuario" en la barra superior.',
        'Ingresa el nombre completo, correo electrónico corporativo único y contraseña de acceso.',
        'Selecciona el Rol: "Administrador" (control total de configuración y usuarios), "Operador Municipal" (gestión del padrón y emisión de TUC) o "Fiscalizador" (inspección en vía pública y lectura QR).',
        'Haz clic en "Guardar Usuario". El usuario quedará habilitado de inmediato.',
      ],
      note: 'Aplica el principio de menor privilegio: nunca asignes el rol Administrador a personal que únicamente deba tramitar permisos o fiscalizar en campo.',
      keywords: ['crear usuario', 'nuevo usuario', 'roles', 'admin', 'operador', 'fiscalizador', 'permisos acceso'],
      actionLink: { label: 'Ir a Gestión de Usuarios', to: '/usuarios' },
    },
    {
      id: 'adm-02',
      category: 'Usuarios y Control de Acceso',
      question: '¿Cómo revocar o desactivar el acceso a un funcionario de forma inmediata?',
      answer:
        'Si un trabajador es cesado o se detecta una irregularidad, desactiva su cuenta al instante sin romper la integridad relacional de la base de datos:',
      steps: [
        'En el módulo "Usuarios", localiza al funcionario mediante el buscador por nombre o correo.',
        'En la fila del usuario, presiona el botón de estado o menú de acciones y selecciona "Desactivar".',
        'El usuario pasará a estado INACTIVO. Sus sesiones y tokens JWT serán rechazados de inmediato por el servidor.',
        'Toda su actividad previa se preserva inmutable en la bitácora de auditoría para eventuales peritajes.',
      ],
      keywords: ['desactivar usuario', 'bloquear', 'baja funcionario', 'revocar acceso', 'inactivar'],
      actionLink: { label: 'Revisar Lista de Usuarios', to: '/usuarios' },
    },
    {
      id: 'adm-03',
      category: 'Usuarios y Control de Acceso',
      question: '¿Cómo opera el limitador de peticiones (Rate Limiter) contra ataques de fuerza bruta?',
      answer:
        'El backend incorpora el interceptor ILimitePeticionesService en los endpoints críticos de autenticación (/api/auth/login.php). Si una misma dirección IP supera 5 intentos fallidos en una ventana de 15 minutos, el servidor rechaza automáticamente las peticiones subsiguientes respondiendo con código HTTP 429 (Too Many Requests), indicando con precisión cuántos minutos debe esperar el cliente.',
      keywords: ['rate limit', 'fuerza bruta', 'bloqueo ip', 'seguridad', 'intentos fallidos', '429', 'ddos'],
    },
    {
      id: 'adm-04',
      category: 'Bitácora y Auditoría Forense',
      question: '¿Cómo auditar las operaciones del personal en la Bitácora (/bitacora)?',
      answer:
        'El módulo de Bitácora implementa paginación real del lado del servidor (SQL LIMIT/OFFSET y COUNT) con ordenamiento descendente para máxima velocidad y cero sobrecarga de memoria:',
      steps: [
        'Accede al módulo "Bitácora" desde el menú lateral.',
        'Por defecto se cargan los 10 registros más recientes.',
        'Usa el buscador en tiempo real para rastrear por nombre de operador, placa vehicular, DNI, RUC o dirección IP.',
        'Filtra por fecha exacta mediante el selector de calendario.',
        'Usa la barra de paginación inferior para avanzar de página o ajusta la vista a 20 o 50 filas por página según tu análisis.',
      ],
      keywords: ['bitacora', 'auditoria', 'logs', 'paginacion', 'trazabilidad', 'quien modifico', 'ip'],
      actionLink: { label: 'Abrir Bitácora de Auditoría', to: '/bitacora' },
    },
    {
      id: 'adm-05',
      category: 'Bitácora y Auditoría Forense',
      question: '¿Qué significan los badges de acción y cómo analizar el modal forense?',
      answer:
        'El sistema sustituyó las acciones genéricas por verbos semánticos explícitos con badges cromáticos de alta visibilidad:',
      steps: [
        'CREAR (verde esmeralda): Registro de nueva empresa, vehículo, conductor, usuario o emisión de TUC.',
        'ACTUALIZAR (azul cielo): Edición de características técnicas o datos de contacto.',
        'DESACTIVAR (ámbar): Inactivación o suspensión temporal de un vehículo, chofer o usuario.',
        'ANULAR (rojo carmesí): Revocación legal de un permiso TUC o anulación de conductor/unidad.',
        'RENOVAR (púrpura): Renovación formal de TUC con nuevo correlativo y vencimiento anual.',
        'ASIGNAR / DESASIGNAR (índigo): Vinculación o desvinculación formal de un chofer con una unidad.',
      ],
      note: 'Al presionar "Ver detalle", el modal presenta la IP cliente normalizada (127.0.0.1 en local o IPv4 pública), fecha/hora de Perú, resumen estructurado de campos modificados y visor JSON técnico colapsable.',
      keywords: ['badges', 'colores', 'modal detalle', 'forense', 'ip', 'valores anteriores'],
      actionLink: { label: 'Consultar Bitácora', to: '/bitacora' },
    },
    {
      id: 'adm-06',
      category: 'Padrón y Concesiones',
      question: '¿Cuál es el flujo estricto para dar de alta unidades en el padrón municipal?',
      answer:
        'Para preservar la integridad del padrón distrital de Marcona, los operadores y administradores deben respetar este orden jerárquico:',
      steps: [
        '1. Empresa Concesionaria (/empresas): Registrar la personería jurídica o asociación con RUC activo.',
        '2. Conductor (/choferes): Registrar al chofer con DNI y Licencia de Conducir MTC vigente.',
        '3. Vehículo (/vehiculos): Registrar la mototaxi o vehículo con placa, SOAT vigente y CITV al día.',
        '4. Asignación (/asignaciones): Vincular al conductor con el vehículo dentro de la empresa concesionaria.',
        '5. Emisión de TUC (/permisos): Generar la Tarjeta Única de Circulación con su código QR institucional.',
      ],
      keywords: ['flujo padron', 'jerarquia', 'orden de registro', 'empresa', 'vehiculo', 'chofer', 'asignacion'],
      actionLink: { label: 'Ver Empresas Concesionarias', to: '/empresas' },
    },
    {
      id: 'adm-07',
      category: 'Padrón y Concesiones',
      question: '¿Qué ocurre en el sistema al anular o desactivar una empresa o vehículo?',
      answer:
        'Cuando un vehículo o empresa pasa a estado inactivo o anulado, el sistema bloquea inmediatamente la emisión o renovación de cualquier permiso TUC vinculado a dicha entidad. Asimismo, el inspector en vía pública que escanee la unidad recibirá un rechazo automático indicando que la unidad no se encuentra habilitada.',
      keywords: ['anulacion', 'desactivar vehiculo', 'baja empresa', 'bloqueo emision'],
      actionLink: { label: 'Ver Padrón de Vehículos', to: '/vehiculos' },
    },
    {
      id: 'adm-08',
      category: 'Permisos, TUC y Reportes',
      question: '¿Cómo exportar reportes oficiales a Microsoft Excel con Apache POI?',
      answer:
        'El sistema incorpora un motor de streaming basado en Apache POI 5.4.1 que genera libros .xlsx nativos optimizados:',
      steps: [
        'Ingresa al módulo "Permisos" o "Historial".',
        'Aplica los filtros de búsqueda (empresa, estado vigente/vencido o rango de fechas).',
        'Haz clic en el botón "Exportar Excel" en la esquina superior.',
        'El archivo se descarga en tiempo real con celdas numéricas formateadas, estilos institucionales y metadatos de auditoría para la Contraloría o gerencia municipal.',
      ],
      keywords: ['exportar excel', 'poi', 'reportes', 'descargar xlsx', 'auditoria contraloria'],
      actionLink: { label: 'Ir a Permisos de Circulación', to: '/permisos' },
    },
    {
      id: 'adm-09',
      category: 'Permisos, TUC y Reportes',
      question: '¿Cómo interpretar las estadísticas y alertas del Dashboard Distrital?',
      answer:
        'El Dashboard consolida métricas clave en tiempo real: número de empresas autorizadas, flota total registrada, conductores activos y relación entre permisos vigentes vs vencidos. Presta especial atención al bloque "Próximos a Vencer" (permisos que caducan en menos de 30 días) para emitir notificaciones preventivas a las empresas concesionarias.',
      keywords: ['dashboard', 'metricas', 'estadisticas', 'flota', 'proximos a vencer'],
      actionLink: { label: 'Abrir Dashboard Distrital', to: '/dashboard' },
    },
    {
      id: 'adm-10',
      category: 'Seguridad y Cuenta Admin',
      question: '¿Cómo cambiar la contraseña del Administrador y resguardar la cuenta?',
      answer:
        'Para cambiar la contraseña de tu cuenta administradora, presiona "Editar Perfil" en la parte inferior del menú lateral. Ingresa tu nueva contraseña (mínimo 8 caracteres, combinando mayúsculas, números y símbolos) y guarda los cambios. Te recomendamos cerrar sesión e iniciarla nuevamente para renovar tu token criptográfico JWT.',
      keywords: ['cambiar contraseña admin', 'password', 'seguridad cuenta', 'editar perfil'],
    },
  ],
}

// ============================================================================
// 2. GUÍA EXCLUSIVA: OPERADOR MUNICIPAL (OPERADOR)
// ============================================================================
const OPERADOR_CONTENT: RoleFaqContent = {
  role: 'operador',
  title: 'Centro de Ayuda y Manual del Operador Municipal',
  subtitle:
    'Guía técnica y operativa para la gestión del padrón distrital, validación documental, asignaciones de flota y emisión de TUC.',
  badgeLabel: 'Perfil: Operador Municipal',
  badgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
  categories: [
    'Padrón de Conductores y Empresas',
    'Registro de Unidades Vehiculares',
    'Asignaciones Conductor-Vehículo',
    'Emisión y Renovación de TUC',
    'Consultas y Perfil Operador',
  ],
  items: [
    {
      id: 'ope-01',
      category: 'Padrón de Conductores y Empresas',
      question: '¿Cómo registrar a un conductor y qué validaciones realiza el sistema?',
      answer:
        'El registro de conductores asegura que solo personas formalmente capacitadas y acreditadas por el MTC conduzcan unidades en Marcona:',
      steps: [
        'Ingresa al módulo "Conductores" desde el menú de navegación.',
        'Presiona el botón "Nuevo Conductor".',
        'Digita el DNI del conductor (8 dígitos numéricos).',
        'Ingresa el número de licencia de conducir MTC, su clase/categoría reglamentaria y la fecha exacta de vencimiento.',
        'El sistema validará que la licencia no se encuentre vencida. Si está vencida, rechazará el registro por seguridad legal.',
        'Guarda el registro. El conductor quedará listo para ser asignado a un vehículo.',
      ],
      keywords: ['registrar conductor', 'chofer', 'licencia mtc', 'dni', 'vencimiento licencia', 'categoria'],
      actionLink: { label: 'Ir a Conductores', to: '/choferes' },
    },
    {
      id: 'ope-02',
      category: 'Padrón de Conductores y Empresas',
      question: '¿Cómo registrar o actualizar los datos de una Empresa Concesionaria?',
      answer:
        'En el módulo "Empresas", presiona "Nueva Empresa". Ingresa el RUC de 11 dígitos, la razón social idéntica a SUNAT, número de teléfono, correo corporativo y dirección fiscal en Marcona. Toda unidad vehicular debe estar asociada a una empresa formalmente registrada.',
      keywords: ['registrar empresa', 'ruc', 'concesionaria', 'empresa transporte', 'razon social'],
      actionLink: { label: 'Ir a Empresas', to: '/empresas' },
    },
    {
      id: 'ope-03',
      category: 'Registro de Unidades Vehiculares',
      question: '¿Cómo dar de alta una mototaxi o vehículo urbano en el sistema?',
      answer:
        'Cada unidad vehicular requiere documentación técnica obligatoria antes de autorizar su circulación:',
      steps: [
        'Ingresa a "Vehículos" y haz clic en "Nuevo Vehículo".',
        'Ingresa la Placa de rodaje respetando el formato oficial (ej. ABC-123 o 1234-5A).',
        'Registra marca, modelo, año de fabricación y número de motor/chasis.',
        'Ingresa la fecha de vencimiento de la Póliza SOAT / AFOCAT vigente.',
        'Ingresa la fecha de vencimiento de la Inspección Técnica Vehicular (CITV).',
        'Asocia el vehículo a su respectiva Empresa Concesionaria y guarda el registro.',
      ],
      note: 'El sistema valida que ni el SOAT ni el CITV se encuentren vencidos para permitir la posterior emisión de su TUC.',
      keywords: ['nuevo vehiculo', 'placa', 'soat', 'citv', 'revision tecnica', 'mototaxi'],
      actionLink: { label: 'Ir a Vehículos', to: '/vehiculos' },
    },
    {
      id: 'ope-04',
      category: 'Asignaciones Conductor-Vehículo',
      question: '¿Por qué el sistema exige crear una Asignación antes de emitir la TUC?',
      answer:
        'Por estricta normativa de la Subgerencia de Transporte de Marcona, una Tarjeta Única de Circulación (TUC) ampara el servicio únicamente cuando el vehículo tiene plenamente identificado a su conductor responsable. Ninguna unidad puede circular en modalidad "libre" sin chofer asignado en el padrón.',
      steps: [
        'Ingresa al módulo "Asignaciones" en el menú lateral.',
        'Presiona "Nueva Asignación".',
        'Selecciona el vehículo habilitado y el conductor registrado.',
        'El sistema comprobará que ni el vehículo ni el conductor cuenten con otra asignación activa al mismo tiempo.',
        'Confirma la asignación. El vehículo quedará legalmente apto para la emisión de su TUC.',
      ],
      keywords: ['asignacion', 'vincular chofer', 'asignar conductor', 'requisito tuc'],
      actionLink: { label: 'Ir a Asignaciones', to: '/asignaciones' },
    },
    {
      id: 'ope-05',
      category: 'Asignaciones Conductor-Vehículo',
      question: '¿Cómo cambiar el conductor asignado a un vehículo?',
      answer:
        'Para cambiar de chofer, ingresa a "Asignaciones", ubica la asignación vigente de la unidad y presiona "Desasignar". La relación anterior pasará a estado inactivo. A continuación, presiona "Nueva Asignación" y vincula el vehículo con el nuevo conductor acreditado.',
      keywords: ['cambiar chofer', 'desasignar', 'reasignar vehiculo', 'cambio conductor'],
      actionLink: { label: 'Gestionar Asignaciones', to: '/asignaciones' },
    },
    {
      id: 'ope-06',
      category: 'Emisión y Renovación de TUC',
      question: '¿Cuáles son los pasos para emitir una nueva Tarjeta Única de Circulación (TUC)?',
      answer:
        'La emisión de la TUC otorga el permiso legal de circulación con código QR y número correlativo único:',
      steps: [
        'Ingresa a "Permisos" y presiona "Emitir Permiso".',
        'Selecciona el vehículo (debe tener asignación activa y documentos vigentes).',
        'Establece la fecha de vigencia (por defecto 1 año calendario).',
        'Ingresa el número de recibo de caja municipal y el monto abonado por el derecho de trámite.',
        'Presiona "Generar Permiso". El sistema asignará el número correlativo (ej. PERM-2026-00045) y generará el código QR.',
        'Imprime la credencial física para su entrega formal al administrado.',
      ],
      keywords: ['emitir permiso', 'generar tuc', 'tuc', 'recibo caja', 'monto pagado', 'codigo qr'],
      actionLink: { label: 'Ir a Permisos de Circulación', to: '/permisos' },
    },
    {
      id: 'ope-07',
      category: 'Emisión y Renovación de TUC',
      question: '¿Cómo tramitar la renovación de un permiso próximo a caducar?',
      answer:
        'En el módulo "Renovaciones", ubica la TUC por placa o número de permiso. Comprueba que el SOAT, la Revisión Técnica y la Licencia del conductor continúen vigentes, digita el nuevo número de recibo de caja y confirma la renovación. La TUC previa se marcará como RENOVADA y se emitirá una nueva con vigencia por 1 año.',
      keywords: ['renovar tuc', 'renovaciones', 'prorroga permiso', 'vencimiento tuc'],
      actionLink: { label: 'Ir a Renovaciones', to: '/renovaciones' },
    },
    {
      id: 'ope-08',
      category: 'Consultas y Perfil Operador',
      question: '¿Cómo verificar si mi trámite quedó registrado en el Historial y la Bitácora?',
      answer:
        'Puedes consultar el historial de permisos anteriores de una placa en "/historial". Asimismo, puedes entrar a "/bitacora" donde verás inmediatamente tu registro con la acción explícita (ej. CREAR o RENOVAR), la fecha, hora exacta y tu nombre de usuario, confirmando que la transacción se asentó exitosamente.',
      keywords: ['historial permisos', 'bitacora operador', 'comprobar tramite', 'confirmar emision'],
      actionLink: { label: 'Ver Historial de Permisos', to: '/historial' },
    },
    {
      id: 'ope-09',
      category: 'Consultas y Perfil Operador',
      question: '¿Puedo verificar permisos en vía pública desde mi cuenta de Operador?',
      answer:
        'Sí. Como Operador Municipal tienes acceso al módulo "/verificar". Puedes usarlo en ventanilla para escanear el QR de una TUC física o buscar por placa cuando un administrado se acerque a solicitar informes sobre el estado de su unidad.',
      keywords: ['verificar operador', 'ventanilla', 'escanear qr ventanilla', 'consulta placa'],
      actionLink: { label: 'Abrir Verificador de TUC', to: '/verificar' },
    },
    {
      id: 'ope-10',
      category: 'Consultas y Perfil Operador',
      question: '¿Cómo cambiar mi contraseña y actualizar mis datos de Operador?',
      answer:
        'En la parte inferior del menú lateral izquierdo, haz clic en "Editar Perfil". Podrás verificar tu nombre y correo corporativo. Para cambiar tu contraseña, escribe la nueva clave en el campo correspondiente y presiona "Guardar Cambios".',
      keywords: ['editar perfil operador', 'cambiar password', 'cuenta operador'],
    },
  ],
}

// ============================================================================
// 3. GUÍA EXCLUSIVA: FISCALIZADOR DE CAMPO (FISCALIZADOR)
// ============================================================================
const FISCALIZADOR_CONTENT: RoleFaqContent = {
  role: 'fiscalizador',
  title: 'Centro de Ayuda y Guía del Fiscalizador de Campo',
  subtitle:
    'Guía operativa exclusiva para inspectores de transporte: intervenciones en vía pública, lectura de código QR, verificación documental e incidencias.',
  badgeLabel: 'Perfil: Inspector Fiscalizador',
  badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  categories: [
    'Verificación en Vía Pública',
    'Interpretación de Resultados',
    'Documentos Obligatorios',
    'Protocolo ante Incidencias',
    'Cuenta y Seguridad de Campo',
  ],
  items: [
    {
      id: 'fisc-01',
      category: 'Verificación en Vía Pública',
      question: '¿Cómo escanear y verificar una unidad en la vía pública usando el celular?',
      answer:
        'El módulo de verificación está 100 % optimizado para dispositivos móviles en vía pública:',
      steps: [
        'Desde tu pantalla de inicio o menú lateral, toca el botón principal "Verificar Permiso" o "Verificar TUC".',
        'Toca el botón "Escanear QR" para habilitar la cámara de tu smartphone.',
        'Apunta al código QR impreso en la credencial TUC o en el parabrisas del vehículo.',
        'En menos de un segundo, el sistema consultará la base de datos municipal y mostrará la pantalla completa de resultados.',
      ],
      keywords: ['escanear qr', 'camara celular', 'verificar permiso', 'fiscalizar en calle', 'inspeccion'],
      actionLink: { label: 'Abrir Módulo de Verificación', to: '/verificar' },
    },
    {
      id: 'fisc-02',
      category: 'Verificación en Vía Pública',
      question: '¿Cómo realizar una búsqueda manual si la cámara no enfoca o el QR está deteriorado?',
      answer:
        'Si el código QR físico está sucio, roto o la iluminación es deficiente, toca la pestaña "Buscar por Placa / DNI" en la parte superior de la pantalla. Selecciona el tipo de búsqueda, escribe la placa de rodaje (ej. ABC-123) y presiona "Buscar". Obtendrás el mismo resultado oficial que por escaneo.',
      keywords: ['busqueda manual', 'escribir placa', 'buscar por dni', 'qr no enfoca', 'qr dañado'],
      actionLink: { label: 'Ir a Búsqueda Manual', to: '/verificar' },
    },
    {
      id: 'fisc-03',
      category: 'Interpretación de Resultados',
      question: '¿Qué significa el resultado "AUTORIZADO" (pantalla verde)?',
      answer:
        'Indica que el vehículo cumple con todos los requisitos legales para prestar servicio en Marcona:',
      steps: [
        'Permiso TUC: Vigente y emitido formalmente por la Municipalidad de Marcona.',
        'Conductor Asignado: El chofer registrado coincide plenamente con la unidad intervenida.',
        'SOAT / AFOCAT: Póliza vigente con cobertura activa.',
        'Revisión Técnica (CITV): Certificado de inspección vigente.',
        'Licencia de Conducir: En categoría reglamentaria y no vencida.',
      ],
      note: 'Verifica siempre que el DNI y rostro del conductor físico coincidan con los datos mostrados en pantalla.',
      keywords: ['autorizado', 'resultado verde', 'aprobado', 'todo conforme', 'en regla'],
      actionLink: { label: 'Ir a Verificar Permiso', to: '/verificar' },
    },
    {
      id: 'fisc-04',
      category: 'Interpretación de Resultados',
      question: '¿Qué significa el resultado "RECHAZADO" (pantalla roja) y qué debo revisar?',
      answer:
        'Si la pantalla muestra un recuadro rojo con el título RECHAZADO, el sistema detallará la lista de motivos legales de la infracción:',
      steps: [
        'Motivos frecuentes: "Permiso vencido", "Permiso anulado o revocado", "SOAT vencido", "CITV vencido", "Sin asignación activa" o "Licencia de conducir caducada".',
        'Notifica formalmente al conductor el motivo exacto del rechazo según la ordenanza distrital.',
        'Tu consulta queda automáticamente registrada en el servidor con resultado "rechazado", motivos, hora y tu usuario, sirviendo de respaldo digital para el acta de control.',
      ],
      keywords: ['rechazado', 'resultado rojo', 'infraccion', 'motivos rechazo', 'acta de control'],
      actionLink: { label: 'Ir a Verificar Permiso', to: '/verificar' },
    },
    {
      id: 'fisc-05',
      category: 'Documentos Obligatorios',
      question: '¿Cómo interpretar los badges de colores de SOAT, CITV y Licencia?',
      answer:
        'En la tarjeta de resultado de verificación, cada documento cuenta con un badge de estado cromático:',
      steps: [
        'Badge Verde (VIGENTE): Documento con más de 30 días de vigencia restante.',
        'Badge Amarillo (POR VENCER): El documento caduca en menos de 30 días. Advierte al conductor para que inicie su trámite preventivo.',
        'Badge Rojo (VENCIDO): Documento caducado. Constituye motivo inmediato de rechazo y sanción administrativa.',
      ],
      keywords: ['badges', 'soat', 'citv', 'licencia', 'por vencer', 'vencido', 'colores'],
    },
    {
      id: 'fisc-06',
      category: 'Documentos Obligatorios',
      question: '¿Qué protocolo aplicar si el conductor físico no coincide con el asignado?',
      answer:
        'La ordenanza municipal estipula que la TUC solo ampara la prestación del servicio público cuando la unidad es manejada por el chofer formalmente asignado en el padrón distrital. Si el conductor intervenido es otra persona, el vehículo está cometiendo una infracción por prestar servicio con chofer no empadronado.',
      keywords: ['chofer diferente', 'conductor no coincide', 'infraccion conductor', 'chofer no asignado'],
    },
    {
      id: 'fisc-07',
      category: 'Protocolo ante Incidencias',
      question: '¿Queda registrado cada escaneo o verificación que realizo en la calle?',
      answer:
        'Sí. Cada vez que escaneas un QR o buscas una placa en "/verificar", el servidor almacena de forma inalterable: tu ID de fiscalizador, el término buscado, el resultado (autorizado/rechazado), los motivos, la dirección IP de tu dispositivo y la fecha y hora exacta. Puedes ver el resumen de tus intervenciones del día en tu pantalla de Inicio.',
      keywords: ['registro verificacion', 'trazabilidad fiscalizador', 'auditoria de intervencion', 'mis verificaciones'],
      actionLink: { label: 'Ver Mi Actividad del Día', to: '/fiscalizador' },
    },
    {
      id: 'fisc-08',
      category: 'Protocolo ante Incidencias',
      question: '¿Qué diferencia existe entre "/verificar" y la consulta pública ciudadana?',
      answer:
        'La consulta ciudadana pública (/consulta) es una herramienta meramente informativa para pasajeros. En cambio, tu módulo "/verificar" es una herramienta policial/inspectiva protegida: verifica pólizas internas, valida estados cruzados de licencias y genera actas digitales de auditoría legal en la base de datos municipal.',
      keywords: ['diferencia consulta publica', 'verificacion oficial', 'inspeccion policial'],
      actionLink: { label: 'Ir a Verificar Permiso', to: '/verificar' },
    },
    {
      id: 'fisc-09',
      category: 'Protocolo ante Incidencias',
      question: '¿Qué hacer si hay intermitencia de señal celular en la zona de intervención?',
      answer:
        'Si la cobertura móvil es débil, aguarda unos segundos a que el teléfono recupere señal 4G/3G y utiliza la búsqueda manual por placa. Nunca autorices verbalmente a un vehículo sin que el sistema haya emitido el resultado verde de confirmación oficial.',
      keywords: ['sin señal', 'sin internet', 'cobertura celular', 'falla conexion'],
    },
    {
      id: 'fisc-10',
      category: 'Cuenta y Seguridad de Campo',
      question: '¿Cómo cambiar mi contraseña de inspector desde el celular?',
      answer:
        'Abre el menú lateral tocando el ícono de menú en la esquina superior izquierda, desplázate hasta la parte inferior y presiona "Editar Perfil". Escribe tu nueva contraseña en el campo correspondiente y presiona "Guardar Cambios".',
      keywords: ['cambiar clave fiscalizador', 'password inspector', 'editar perfil movil'],
    },
  ],
}

// ============================================================================
// DICCIONARIO PRINCIPAL ESTRICTAMENTE AISLADO POR ROL
// ============================================================================
export const FAQ_BY_ROLE: Record<UserRole, RoleFaqContent> = {
  admin: ADMIN_CONTENT,
  operador: OPERADOR_CONTENT,
  fiscalizador: FISCALIZADOR_CONTENT,
}
