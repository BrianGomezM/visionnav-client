/**
 * Protocolo de la evaluación con usuarios (Objetivo 3) — lógica pura, sin React.
 *
 * Refleja el contrato v3 de /api/study/* (backend: app/routes/study.py,
 * docs/EVALUACION_USUARIOS.md). El backend vuelve a validar todo: estas
 * funciones solo evitan enviar formularios incompletos y documentan las reglas
 * en el cliente. Verificación: node scripts/check-study.mjs
 *
 * Fuente metodológica: "27 - Preparación evaluación final Objetivo 3".
 */

// ─────────────────────────────────────────────
// Tipos del contrato
// ─────────────────────────────────────────────

export type TipoParticipante = 'objetivo' | 'piloto'
export type TipoCeguera = 'congenita' | 'adquirida' | 'no_aplica'
export type EtapaAdquisicion = 'infancia' | 'adolescencia' | 'adultez' | 'no_informa'
export type SiNoNoInforma = 'si' | 'no' | 'no_informa'
export type Tecnologia = 'lector_pantalla' | 'smartphone' | 'computador' | 'tableta' | 'linea_braille' | 'otra' | 'ninguna'
export type Lector = 'nvda' | 'jaws' | 'voiceover' | 'talkback' | 'otro' | 'no_utiliza'
export type Frecuencia = 'diaria' | 'varias_por_semana' | 'ocasional' | 'no_utiliza_actualmente'
export type Dispositivo = 'computador' | 'telefono' | 'tableta' | 'otro'
export type Reproduccion = 'audifonos' | 'parlantes' | 'otro'
export type ModoRegistro = 'formal' | 'ensayo'
export type SiNoReportada = 'si' | 'no' | 'no_reportada'
export type Comprendida = 'si' | 'no' | 'no_evaluada'
export type RangoEdad = '18_29' | '30_44' | '45_59' | '60_mas' | 'no_informa'
export type Audicion = 'sin_dificultad' | 'con_dificultad' | 'no_informa'
export type Codificacion = 'objetos' | 'relaciones' | 'ubicacion' | 'distancia' | 'cambio'
export type PercepcionCambio = 'menciona_cambio_real' | 'no_menciona_cambio' | 'menciona_cambio_inexistente' | 'no_responde'
export type TipoAclaracion = 'pregunta' | 'escala' | 'otra'

export interface Ficha {
  condicion_visual: {
    tipo_ceguera: TipoCeguera
    etapa_adquisicion: EtapaAdquisicion | null
    experiencia_visual_previa: SiNoNoInforma | null
  }
  tecnologias: {
    utiliza: Tecnologia[]
    otra_descripcion: string | null
    lectores_pantalla: Lector[]
    lector_otro: string | null
    frecuencia_uso: Frecuencia | null
  }
  experiencia_descripcion_audio: SiNoNoInforma
  /** Rango (nunca la edad exacta) y audición autodeclarada: obligatorios en sesiones nuevas. */
  rango_edad?: RangoEdad | null
  audicion_autodeclarada?: Audicion | null
}

export interface EntornoTecnico {
  navegador: string | null
  sistema_operativo: string | null
  tipo_dispositivo: string | null
  user_agent: string | null
}

export interface Contexto {
  dispositivo: Dispositivo
  dispositivo_otro: string | null
  reproduccion_audio: Reproduccion
  reproduccion_otro: string | null
  entorno_tecnico: EntornoTecnico | null
}

/** Consentimiento verbal (§12 del documento): las cuatro afirmaciones son obligatorias. */
export interface Consentimiento {
  /** Versión del documento leído; el servidor exige la del tipo de participante. */
  version: string
  acepta_participar: boolean
  puede_detenerse: boolean
  autoriza_grabacion: boolean
  autoriza_uso_academico: boolean
}

/** Grabación de la lectura del consentimiento (obligatoria, se envía al crear la sesión). */
export interface GrabacionConsentimiento {
  content_type: string
  data_base64: string
  duracion_s: number | null
}

export interface SessionCreatePayload {
  codigo: string
  tipo_participante: TipoParticipante
  ficha: Ficha
  contexto: Contexto
  consentimiento: Consentimiento
  grabacion_consentimiento: GrabacionConsentimiento
}

export interface GrabacionConsentimientoRecord {
  archivo: string | null
  almacenada: boolean
  content_type: string
  tamano_bytes: number
  sha256: string
  duracion_s: number | null
}

export interface Escalas {
  claridad: number | null
  utilidad: number | null
  suficiencia: number | null
  naturalidad_voz: number | null
  carga_percibida: number | null
  redundancia: number | null
}

export interface Sesion {
  schema_version: number
  session_id: string
  codigo: string
  es_prueba_tecnica: boolean
  tipo_participante: TipoParticipante
  creado: string
  estado: 'en_curso' | 'finalizada'
  ficha: Ficha
  /** v3: cuatro afirmaciones + grabación. Las sesiones v2 tenían modalidad y tres afirmaciones. */
  consentimiento: Partial<Consentimiento> & {
    otorgado: boolean
    registrado_en: string
    documento?: TipoParticipante
    modalidad?: string
    formato_referencia?: string | null
    grabacion?: GrabacionConsentimientoRecord | null
  }
  grabacion: { autoriza_grabacion_audio: boolean; registrado_en: string }
  contexto: Contexto
  investigador?: string | null
  notas?: string | null
  almacenamiento: string
  backend_commit: string | null
  cierre: null | {
    motivo: string
    finalizada_en: string
    cuestionario_posterior: { escalas: Escalas; comentarios: string | null } | null
    entrevista: string | null
    incidencias_tecnicas: string | null
    observaciones_generales: string | null
  }
}

export interface SessionListItem {
  session_id: string
  codigo: string
  tipo_participante: TipoParticipante
  es_prueba_tecnica: boolean
  creado: string
  estado: 'en_curso' | 'finalizada'
  num_respuestas: number
  num_formales: number
}

export interface ObjetoCodificado {
  objeto: string
  identificado: boolean
  ubicacion_reportada: string | null
  ubicacion_correcta: SiNoReportada
  /** OBJ-02: distancia que dijo el participante frente a la de la narrativa. */
  distancia_reportada?: string | null
  distancia_correcta?: SiNoReportada
}

export interface RelacionCodificada {
  relacion: string
  respuesta: string | null
  comprendida: Comprendida
}

export interface Comprension {
  objetos: ObjetoCodificado[]
  objetos_inventados: string[]
  relaciones: RelacionCodificada[]
}

export interface ErrorRegistrado {
  tipo: 'tecnico' | 'procedimiento' | 'otro'
  descripcion: string
}

export interface PlayEvent {
  instante: string
  tipo: 'inicial' | 'repeticion'
}

/** Solicitud de aclaración del participante (indicador de claridad del guion). */
export interface Aclaracion {
  instante: string
  tipo: TipoAclaracion
}

export interface Ejecucion {
  request_id: string | null
  narrativa_final: string
  escenario: string | null
  degradaciones: string[]
  umbral_confianza: number | null
  /** Voz TTS que generó el audio (id del modelo o voz). */
  tts_modelo?: string | null
  audio: { disponible: boolean; content_type: string | null; sha256: string | null; tamano_bytes: number | null }
}

/**
 * Tarea de decisión (tipo C): decisión HIPOTÉTICA basada en información espacial
 * auditiva; el participante no se desplaza (doc. 27, §H).
 */
export interface DecisionPayload {
  /** id de una alternativa del catálogo, o 'no_responde'. */
  seleccionada: string
  /** Codificación del investigador: ¿la elección sigue lo que dijo la narrativa? */
  coincide_con_narrativa: boolean | null
}

/**
 * Decisión guardada. El servidor registra tres capas por separado:
 *  - coincide_con_narrativa: el participante eligió lo que indicó la narrativa (comprensión);
 *  - correcto: la elección coincide con la dirección libre del diseño de la escena;
 *  - narrativa_coincide_con_diseno: la narrativa indicó la dirección del diseño (sistema).
 */
export interface DecisionRecord extends DecisionPayload {
  pregunta: string
  alternativas: { id: string; texto: string }[]
  direccion_narrativa?: string | null
  narrativa_coincide_con_diseno?: boolean | null
  juicio_investigador?: boolean | null
  esperada: string | null
  correcto: boolean | null
  fuente_esperada: 'definicion' | 'fixture_tecnico' | 'no_definida'
  fixture_tecnico: string | null
  definicion_sha256: string
}

export interface ResponsePayload {
  prueba_id: string
  modo: ModoRegistro
  estimulo?: { origen: 'catalogo' | 'archivo_local'; stimulus_id?: string; nombre_archivo?: string }
  ejecucion?: Ejecucion
  audio_narrativa_base64?: string
  reproducciones: PlayEvent[]
  tiempo_respuesta_ms?: number
  respuesta_transcrita?: string
  comprension?: Comprension
  /** Tarea de decisión (tipo C). La esperada NO se envía: la aplica el servidor. */
  decision?: DecisionPayload
  percepcion_cambio?: PercepcionCambio
  aclaraciones?: Aclaracion[]
  escalas?: Partial<Escalas>
  criterios?: Record<string, number>
  errores: ErrorRegistrado[]
  aspectos_confusos?: string
  comentarios?: string
  observaciones?: string
}

export interface Metricas {
  objetos_referencia: number
  objetos_identificados: number
  pct_objetos_identificados: number | null
  objetos_omitidos: string[]
  objetos_inventados: string[]
  ubicaciones_evaluadas: number
  ubicaciones_correctas: number
  pct_ubicaciones_correctas?: number | null
  distancias_evaluadas?: number
  distancias_correctas?: number
  relaciones_evaluadas: number
  relaciones_comprendidas: number
  pct_relaciones_comprendidas: number | null
  repeticiones_audio: number
  aclaraciones?: number
  tiempo_respuesta_ms: number | null
  decision_sigue_narrativa?: boolean | null
  decision_coincide_diseno?: boolean | null
}

export interface StudyResponseRecord {
  response_id: string
  indice: number
  registrado_en: string
  modo: ModoRegistro
  prueba: { id: string; nombre: string; tipo: string; pista: TipoParticipante; estado_estimulos: string; codificacion?: Codificacion[] }
  estimulo: null | { origen: string; stimulus_id?: string; sha256?: string; nombre_archivo?: string }
  ejecucion: null | (Ejecucion & { origen_audio?: 'congelado' | 'generado_en_sesion'; audio: Ejecucion['audio'] & { archivo: string | null } })
  reproducciones: PlayEvent[]
  respuesta_transcrita: string | null
  comprension: Comprension | null
  decision?: DecisionRecord | null
  percepcion_cambio?: PercepcionCambio | null
  aclaraciones?: Aclaracion[]
  escalas: Escalas | null
  criterios: Record<string, number> | null
  errores: ErrorRegistrado[]
  errores_derivados: { tipo: string; elemento: string }[]
  aspectos_confusos: string | null
  comentarios: string | null
  observaciones: string | null
  metricas: Metricas
  grabacion_participante: null | { archivo: string; sha256: string; tamano_bytes: number }
}

/** Conteos descriptivos de un grupo de respuestas formales (sesión o prueba). */
export interface SummaryGroup {
  objetos_referencia: number
  objetos_identificados: number
  pct_objetos_identificados: number | null
  objetos_omitidos: number
  objetos_inventados: number
  ubicaciones_evaluadas: number
  ubicaciones_correctas: number
  pct_ubicaciones_correctas: number | null
  distancias_evaluadas: number
  distancias_correctas: number
  relaciones_evaluadas: number
  relaciones_comprendidas: number
  pct_relaciones_comprendidas: number | null
  repeticiones_audio: number
  aclaraciones: number
  tiempo_respuesta_mediana_ms: number | null
  decisiones_registradas: number
  decisiones_sin_respuesta: number
  decisiones_siguen_narrativa: number
  decisiones_no_siguen_narrativa: number
  decisiones_coinciden_diseno: number
  decisiones_no_coinciden_diseno: number
  percepcion_cambio: Partial<Record<PercepcionCambio, number>>
  criterios: Record<string, { n: number; mediana: number; min: number; max: number }>
}

export interface SessionSummary extends Partial<SummaryGroup> {
  respuestas_formales: number
  respuestas_ensayo: number
  pruebas_formales_registradas: string[]
  por_prueba?: Record<string, SummaryGroup & { respuestas: number }>
  duracion_sesion_min?: number | null
  objetos_referencia: number
  objetos_identificados: number
  pct_objetos_identificados: number | null
  objetos_omitidos: number
  objetos_inventados: number
  relaciones_evaluadas: number
  relaciones_comprendidas: number
  pct_relaciones_comprendidas: number | null
  repeticiones_audio: number
  tiempo_respuesta_mediana_ms: number | null
  decisiones_registradas?: number
  decisiones_correctas?: number
  decisiones_incorrectas?: number
  decisiones_sin_respuesta?: number
  nota: string
}

// ─────────────────────────────────────────────
// Opciones (etiquetas en español)
// ─────────────────────────────────────────────

export const TRACK_LABEL: Record<TipoParticipante, string> = {
  objetivo: 'Participante objetivo (ceguera)',
  piloto: 'Piloto (sin discapacidad visual)',
}

export const CEGUERA_OPTS: [TipoCeguera, string][] = [
  ['congenita', 'Congénita'],
  ['adquirida', 'Adquirida'],
  ['no_aplica', 'No aplica (participante piloto)'],
]
export const ETAPA_OPTS: [EtapaAdquisicion, string][] = [
  ['infancia', 'Infancia'],
  ['adolescencia', 'Adolescencia'],
  ['adultez', 'Adultez'],
  ['no_informa', 'Prefiere no informar'],
]
export const SINO_OPTS: [SiNoNoInforma, string][] = [
  ['si', 'Sí'],
  ['no', 'No'],
  ['no_informa', 'No informa'],
]
export const TECNOLOGIA_OPTS: [Tecnologia, string][] = [
  ['lector_pantalla', 'Lector de pantalla'],
  ['smartphone', 'Smartphone'],
  ['computador', 'Computador'],
  ['tableta', 'Tableta'],
  ['linea_braille', 'Línea Braille'],
  ['otra', 'Otra tecnología'],
  ['ninguna', 'Ninguna'],
]
export const LECTOR_OPTS: [Lector, string][] = [
  ['nvda', 'NVDA'],
  ['jaws', 'JAWS'],
  ['voiceover', 'VoiceOver'],
  ['talkback', 'TalkBack'],
  ['otro', 'Otro'],
]
export const FRECUENCIA_OPTS: [Frecuencia, string][] = [
  ['diaria', 'Diaria'],
  ['varias_por_semana', 'Varias veces por semana'],
  ['ocasional', 'Ocasional'],
  ['no_utiliza_actualmente', 'No utiliza actualmente'],
]
export const DISPOSITIVO_OPTS: [Dispositivo, string][] = [
  ['computador', 'Computador'],
  ['telefono', 'Teléfono'],
  ['tableta', 'Tableta'],
  ['otro', 'Otro'],
]
export const REPRODUCCION_OPTS: [Reproduccion, string][] = [
  ['audifonos', 'Audífonos'],
  ['parlantes', 'Parlantes del dispositivo'],
  ['otro', 'Otro'],
]
export const RANGO_EDAD_OPTS: [RangoEdad, string][] = [
  ['18_29', '18 a 29 años'],
  ['30_44', '30 a 44 años'],
  ['45_59', '45 a 59 años'],
  ['60_mas', '60 años o más'],
  ['no_informa', 'Prefiere no informar'],
]
export const AUDICION_OPTS: [Audicion, string][] = [
  ['sin_dificultad', 'Sin dificultad para escuchar'],
  ['con_dificultad', 'Con alguna dificultad para escuchar'],
  ['no_informa', 'Prefiere no informar'],
]
export const PERCEPCION_CAMBIO_OPTS: [PercepcionCambio, string][] = [
  ['menciona_cambio_real', 'Menciona el cambio real'],
  ['no_menciona_cambio', 'No menciona ningún cambio'],
  ['menciona_cambio_inexistente', 'Menciona un cambio que no ocurrió'],
  ['no_responde', 'No responde'],
]
export const ACLARACION_OPTS: [TipoAclaracion, string][] = [
  ['pregunta', 'Sobre la pregunta'],
  ['escala', 'Sobre la escala'],
  ['otra', 'Otra'],
]

/**
 * Anclas verbales de las escalas 1–5: las mismas para todas las preguntas y leídas en voz
 * alta completas (definidas el 2026-10-01, docs/EVALUACION_USUARIOS.md §0).
 */
export const ANCLAS: [number, string][] = [[1, 'nada'], [2, 'poco'], [3, 'moderadamente'], [4, 'bastante'], [5, 'muy']]
export const ANCLAS_TEXTO = '1 nada · 2 poco · 3 moderadamente · 4 bastante · 5 muy'

/**
 * Escalas del cuestionario posterior (cierre). Solo lo que no preguntan OBJ-05/06/07, para
 * no repetir preguntas (naturalidad, suficiencia, redundancia y utilidad ya se preguntan allí).
 */
export const ESCALAS: { key: keyof Escalas; label: string; ayuda: string }[] = [
  { key: 'claridad', label: 'Claridad de las descripciones', ayuda: `${ANCLAS_TEXTO} (clara)` },
  { key: 'carga_percibida', label: 'Esfuerzo para seguir las descripciones (métrica débil)', ayuda: `${ANCLAS_TEXTO} (esfuerzo; más alto = más esfuerzo)` },
]

export const EMPTY_ESCALAS: Escalas = {
  claridad: null, utilidad: null, suficiencia: null, naturalidad_voz: null, carga_percibida: null, redundancia: null,
}

// ─────────────────────────────────────────────
// Código anonimizado
// ─────────────────────────────────────────────

export const CODE_RE = /^P(TEST)?\d{2,3}$/
export const TEST_CODE_RE = /^PTEST\d{2,3}$/

/** Siguiente código libre (P01, P02… o PTEST01…), a partir de los ya usados (piloto y objetivo comparten la serie). */
export function suggestNextCode(existing: string[], test = false): string {
  const prefix = test ? 'PTEST' : 'P'
  const re = test ? /^PTEST(\d{2,3})$/ : /^P(\d{2,3})$/
  const used = existing.map((c) => re.exec(c)?.[1]).filter(Boolean).map(Number)
  const next = (used.length ? Math.max(...used) : 0) + 1
  return `${prefix}${String(next).padStart(2, '0')}`
}

// ─────────────────────────────────────────────
// Validación de formularios (mismas reglas que el backend)
// ─────────────────────────────────────────────

export type FieldErrors = Record<string, string>

export function validateParticipant(codigo: string, tipo: TipoParticipante, ficha: Ficha): FieldErrors {
  const e: FieldErrors = {}
  if (!CODE_RE.test(codigo)) e.codigo = 'Use un código anonimizado: P01, P02… (PTEST01… para pruebas técnicas). Nunca el nombre.'
  if (!ficha.rango_edad) e.rango_edad = 'Indique el rango de edad (o "Prefiere no informar").'
  if (!ficha.audicion_autodeclarada) e.audicion_autodeclarada = 'Indique cómo escucha (o "Prefiere no informar").'
  const cv = ficha.condicion_visual
  if (tipo === 'objetivo' && cv.tipo_ceguera === 'no_aplica')
    e.tipo_ceguera = 'Un participante objetivo debe tener ceguera congénita o adquirida.'
  if (cv.tipo_ceguera === 'adquirida' && !cv.etapa_adquisicion)
    e.etapa_adquisicion = 'Indique la etapa aproximada (o "Prefiere no informar").'
  if (tipo === 'objetivo' && !cv.experiencia_visual_previa)
    e.experiencia_visual_previa = 'Indique si tuvo experiencia visual previa (o "No informa").'
  const t = ficha.tecnologias
  if (t.utiliza.length === 0) e.utiliza = 'Seleccione al menos una opción (o "Ninguna").'
  if (t.utiliza.includes('ninguna') && t.utiliza.length > 1) e.utiliza = '"Ninguna" no se combina con otras opciones.'
  if (t.utiliza.includes('otra') && !t.otra_descripcion?.trim()) e.otra_descripcion = 'Describa la otra tecnología.'
  if (t.utiliza.includes('lector_pantalla') && t.lectores_pantalla.filter((l) => l !== 'no_utiliza').length === 0)
    e.lectores_pantalla = 'Indique qué lector de pantalla utiliza.'
  if (t.lectores_pantalla.includes('otro') && !t.lector_otro?.trim()) e.lector_otro = 'Indique cuál es el otro lector.'
  if (!t.utiliza.includes('ninguna') && t.utiliza.length > 0 && !t.frecuencia_uso)
    e.frecuencia_uso = 'Indique la frecuencia de uso.'
  return e
}

export function consentComplete(c: Consentimiento): boolean {
  return c.acepta_participar && c.puede_detenerse && c.autoriza_grabacion && c.autoriza_uso_academico
}

export function validateContext(c: Contexto): FieldErrors {
  const e: FieldErrors = {}
  if (c.dispositivo === 'otro' && !c.dispositivo_otro?.trim()) e.dispositivo_otro = 'Indique el dispositivo.'
  if (c.reproduccion_audio === 'otro' && !c.reproduccion_otro?.trim()) e.reproduccion_otro = 'Indique el método de reproducción.'
  return e
}

/** Normaliza la ficha antes de enviarla (sin lector → ['no_utiliza']; campos vacíos → null). */
export function normalizeFicha(f: Ficha): Ficha {
  const t = f.tecnologias
  const usaLector = t.utiliza.includes('lector_pantalla')
  return {
    condicion_visual: {
      ...f.condicion_visual,
      etapa_adquisicion: f.condicion_visual.tipo_ceguera === 'adquirida' ? f.condicion_visual.etapa_adquisicion : null,
    },
    tecnologias: {
      utiliza: t.utiliza,
      otra_descripcion: t.utiliza.includes('otra') ? t.otra_descripcion?.trim() || null : null,
      lectores_pantalla: usaLector ? t.lectores_pantalla.filter((l) => l !== 'no_utiliza') : ['no_utiliza'],
      lector_otro: usaLector && t.lectores_pantalla.includes('otro') ? t.lector_otro?.trim() || null : null,
      frecuencia_uso: t.utiliza.includes('ninguna') ? null : t.frecuencia_uso,
    },
    experiencia_descripcion_audio: f.experiencia_descripcion_audio,
    rango_edad: f.rango_edad ?? null,
    audicion_autodeclarada: f.audicion_autodeclarada ?? null,
  }
}

// ─────────────────────────────────────────────
// Entorno técnico (automático, no se pregunta)
// ─────────────────────────────────────────────

export function parseUserAgent(ua: string, maxTouchPoints = 0): EntornoTecnico {
  const pick = (pairs: [RegExp, string][]) => {
    for (const [re, name] of pairs) {
      const m = re.exec(ua)
      if (m) return m[1] ? `${name} ${m[1].split('.')[0]}` : name
    }
    return null
  }
  const navegador = pick([
    [/Edg\/([\d.]+)/, 'Edge'],
    [/OPR\/([\d.]+)/, 'Opera'],
    [/Firefox\/([\d.]+)/, 'Firefox'],
    [/Chrome\/([\d.]+)/, 'Chrome'],
    [/Version\/([\d.]+).*Safari/, 'Safari'],
  ])
  const sistema_operativo = pick([
    [/Windows NT/, 'Windows'],
    [/Android ([\d.]+)/, 'Android'],
    [/(?:iPhone|iPad|iPod).*OS (\d+)/, 'iOS'],
    [/Mac OS X/, 'macOS'],
    [/CrOS/, 'ChromeOS'],
    [/Linux/, 'Linux'],
  ])
  const ipadDesktop = /Macintosh/.test(ua) && maxTouchPoints > 1
  const tipo_dispositivo = /iPad|Tablet/.test(ua) || ipadDesktop || (/Android/.test(ua) && !/Mobile/.test(ua))
    ? 'tableta'
    : /Mobi|iPhone|Android/.test(ua) ? 'telefono' : 'escritorio'
  return { navegador, sistema_operativo, tipo_dispositivo, user_agent: ua.slice(0, 500) }
}

// ─────────────────────────────────────────────
// Reglas de ejecución (catálogo del backend)
// ─────────────────────────────────────────────

export interface CatalogTestLike {
  id: string
  pista: TipoParticipante
  tipo: 'imagen' | 'escala' | 'ruta' | 'texto'
  estado_estimulos: 'por_definir' | 'no_requiere' | 'definido'
  ejecutable_formal: boolean
  requiere_estimulo: boolean
}

export interface ExecutionRule {
  formal: boolean
  ensayo: boolean
  motivo: string | null
}

/**
 * Qué modos admite una prueba en una sesión (mismas reglas que el backend):
 *  - formal: la prueba es de la pista de la sesión y su estímulo está definido (o no lo
 *    necesita). El piloto también registra como formales las actividades objetivo: se
 *    consolidan aparte y validan el instrumento. Una prueba POR_DEFINIR nunca es formal.
 *  - ensayo: en sesiones piloto o de prueba técnica. En el objetivo, solo la práctica.
 */
export function executionRule(test: CatalogTestLike, tipo: TipoParticipante, esPrueba: boolean): ExecutionRule {
  const ensayo = tipo === 'piloto' || esPrueba
  if (tipo === 'piloto' && test.pista === 'objetivo')
    return test.ejecutable_formal
      ? { formal: true, ensayo: true, motivo: null }
      : { formal: false, ensayo: true, motivo: 'Estímulos POR DEFINIR en el catálogo: en el piloto solo como ensayo.' }
  if (test.pista !== tipo)
    return {
      formal: false,
      ensayo,
      motivo:
        `Pertenece a la pista "${test.pista}".` +
        (test.estado_estimulos === 'por_definir' ? ' Además, sus estímulos están POR DEFINIR en el catálogo.' : ''),
    }
  if (!test.ejecutable_formal)
    return {
      formal: false,
      ensayo,
      motivo: test.estado_estimulos === 'por_definir'
        ? 'Estímulos POR DEFINIR en el catálogo: no puede ejecutarse como prueba formal.'
        : 'La prueba no tiene estímulo asignado.',
    }
  return { formal: true, ensayo, motivo: null }
}

// ─────────────────────────────────────────────
// Audio y respuesta
// ─────────────────────────────────────────────

export function countRepetitions(plays: PlayEvent[]): number {
  return plays.filter((p) => p.tipo === 'repeticion').length
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

const blank = (s: string | null | undefined) => !s || !s.trim()

/** Quita filas vacías de la codificación; null si no queda nada. */
export function cleanComprension(c: Comprension): Comprension | undefined {
  const objetos = c.objetos
    .filter((o) => !blank(o.objeto))
    .map((o) => ({
      ...o,
      objeto: o.objeto.trim(),
      ubicacion_reportada: blank(o.ubicacion_reportada) ? null : o.ubicacion_reportada!.trim(),
      distancia_reportada: blank(o.distancia_reportada) ? null : o.distancia_reportada!.trim(),
      distancia_correcta: o.distancia_correcta ?? 'no_reportada',
    }))
  const objetos_inventados = c.objetos_inventados.map((s) => s.trim()).filter(Boolean)
  const relaciones = c.relaciones
    .filter((r) => !blank(r.relacion))
    .map((r) => ({ ...r, relacion: r.relacion.trim(), respuesta: blank(r.respuesta) ? null : r.respuesta!.trim() }))
  if (!objetos.length && !objetos_inventados.length && !relaciones.length) return undefined
  return { objetos, objetos_inventados, relaciones }
}

export function cleanEscalas(e: Escalas): Partial<Escalas> | undefined {
  const out = Object.fromEntries(Object.entries(e).filter(([, v]) => v !== null)) as Partial<Escalas>
  return Object.keys(out).length ? out : undefined
}

const opt = (s: string) => (s.trim() ? s.trim() : undefined)

export interface ResponseDraft {
  pruebaId: string
  modo: ModoRegistro
  estimulo?: ResponsePayload['estimulo']
  ejecucion?: Ejecucion
  audioBase64?: string | null
  plays: PlayEvent[]
  tiempoRespuestaMs: number | null
  transcripcion: string
  comprension: Comprension
  decision?: DecisionPayload
  percepcionCambio?: PercepcionCambio | null
  aclaraciones?: Aclaracion[]
  /** Qué codifica la prueba (catálogo): sin codificación no se envía la comprensión. */
  codificacion?: Codificacion[]
  escalas: Escalas
  criterios: Record<string, number>
  errores: ErrorRegistrado[]
  aspectosConfusos: string
  comentarios: string
  observaciones: string
}

export function buildResponsePayload(d: ResponseDraft): ResponsePayload {
  const payload: ResponsePayload = {
    prueba_id: d.pruebaId,
    modo: d.modo,
    reproducciones: d.plays,
    errores: d.errores.filter((e) => !blank(e.descripcion)).map((e) => ({ ...e, descripcion: e.descripcion.trim() })),
  }
  if (d.estimulo) payload.estimulo = d.estimulo
  if (d.ejecucion) payload.ejecucion = d.ejecucion
  if (d.audioBase64) payload.audio_narrativa_base64 = d.audioBase64
  if (d.tiempoRespuestaMs !== null) payload.tiempo_respuesta_ms = Math.round(d.tiempoRespuestaMs)
  if (opt(d.transcripcion)) payload.respuesta_transcrita = opt(d.transcripcion)
  const codifica = d.codificacion === undefined || d.codificacion.some((c) => c !== 'cambio')
  const comp = codifica ? cleanComprension(d.comprension) : undefined
  if (comp) payload.comprension = comp
  if (d.decision) payload.decision = d.decision
  if (d.percepcionCambio) payload.percepcion_cambio = d.percepcionCambio
  if (d.aclaraciones?.length) payload.aclaraciones = d.aclaraciones
  const esc = cleanEscalas(d.escalas)
  if (esc) payload.escalas = esc
  if (Object.keys(d.criterios).length) payload.criterios = d.criterios
  if (opt(d.aspectosConfusos)) payload.aspectos_confusos = opt(d.aspectosConfusos)
  if (opt(d.comentarios)) payload.comentarios = opt(d.comentarios)
  if (opt(d.observaciones)) payload.observaciones = opt(d.observaciones)
  return payload
}

/** Motivos por los que todavía no se puede guardar (lista vacía = se puede). */
export function saveBlockers(opts: {
  requiereEstimulo: boolean
  modo: ModoRegistro
  hasExecution: boolean
  audioAvailable: boolean
  plays: number
}): string[] {
  const out: string[] = []
  if (opts.requiereEstimulo) {
    if (!opts.hasExecution) out.push('Cargue el audio del estímulo.')
    else if (opts.modo === 'formal' && !opts.audioAvailable) out.push('Sin audio del sistema no hay prueba formal.')
    if (opts.hasExecution && opts.audioAvailable && opts.plays === 0) out.push('Reproduzca el audio al participante.')
  }
  return out
}
