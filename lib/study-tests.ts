/**
 * Catálogo de pruebas del módulo de Evaluación con usuarios.
 *
 * Dos pistas independientes, con pruebas y métricas distintas:
 *   - 'objetivo' → personas con discapacidad visual (población objetivo real).
 *                  Sus resultados sí pueden usarse como evidencia de accesibilidad.
 *   - 'piloto'   → personas sin discapacidad visual (validación del instrumento:
 *                  instrucciones, flujo, duración, formularios). NO debe
 *                  presentarse como evidencia de accesibilidad.
 *
 * Este catálogo es contenido estático de la interfaz (no viene del backend);
 * lo que sí se persiste en el backend es cada respuesta registrada, referenciando
 * el `id` de la prueba correspondiente.
 */

export type StudyTrack = 'objetivo' | 'piloto'

export type TestKind = 'imagen' | 'escala' | 'ruta' | 'texto'

export interface StudyTest {
  id: string
  nombre: string
  objetivo: string
  /** Instrucción exacta que el investigador debe leer/seguir, para no improvisar entre participantes. */
  guionInvestigador: string
  tipo: TestKind
  /** Para tipo 'escala': criterios individuales a calificar 1-5. */
  criterios?: string[]
  /** Métrica(s) que esta prueba alimenta, para trazabilidad con el Capítulo 5. */
  metricas: string[]
}

// ─────────────────────────────────────────────
// PISTA: Usuarios objetivo (discapacidad visual)
// ─────────────────────────────────────────────
export const TESTS_OBJETIVO: StudyTest[] = [
  {
    id: 'OBJ-01',
    nombre: 'Identificación de objetos',
    objetivo: 'Medir qué porcentaje de los objetos relevantes de la escena el participante logra identificar a partir del audio.',
    guionInvestigador:
      'Reproduce el audio generado para la imagen seleccionada. Cuando termine, pregunta: "¿Qué objetos identificaste en la descripción?". Anota la respuesta tal cual la diga, sin corregirlo ni darle pistas.',
    tipo: 'imagen',
    metricas: ['% identificación correcta', '% omisión', '% objetos inventados'],
  },
  {
    id: 'OBJ-02',
    nombre: 'Relación espacial simple',
    objetivo: 'Medir si el participante ubica correctamente un objeto respecto a sí mismo (izquierda/derecha/frente/detrás) a partir del audio.',
    guionInvestigador:
      'Tras reproducir el audio, pregunta: "¿Dónde se encuentra [objeto] respecto a usted?". No repitas el audio salvo que el participante lo pida explícitamente; si lo repite, anótalo.',
    tipo: 'imagen',
    metricas: ['% relaciones espaciales correctas', 'repeticiones de audio'],
  },
  {
    id: 'OBJ-03',
    nombre: 'Elección de ruta libre',
    objetivo:
      'Evaluar si, a partir de la narrativa, el participante identifica correctamente la dirección despejada para avanzar en una escena con obstáculos al centro y a un lado.',
    guionInvestigador:
      'Reproduce el audio de una escena diseñada con objetos al centro y a un lado, y el paso libre hacia el lado contrario. Pregunta: "Según lo que escuchó, ¿hacia dónde avanzaría?". Registra la dirección que indique (izquierda/derecha/frente) y compárala con la dirección real que reportó el sistema.',
    tipo: 'ruta',
    metricas: ['precisión de elección de ruta', 'tiempo de respuesta', 'comprensión de la instrucción de movimiento'],
  },
  {
    id: 'OBJ-04',
    nombre: 'Actualización de contexto (secuencia)',
    objetivo: 'Evaluar si el participante nota un cambio en la disposición de los objetos entre dos imágenes de la misma escena y ajusta su respuesta.',
    guionInvestigador:
      'Reproduce el audio de la segunda imagen de una secuencia (misma escena, objetos reubicados) inmediatamente después de OBJ-03. Pregunta: "¿Cambió algo respecto a lo anterior? ¿Hacia dónde avanzaría ahora?". No indiques que hubo un cambio si no lo menciona primero.',
    tipo: 'ruta',
    metricas: ['sensibilidad a la actualización de contexto', 'consistencia narrativa'],
  },
  {
    id: 'OBJ-05',
    nombre: 'Calidad de la voz (independiente del contenido)',
    objetivo: 'Medir la calidad percibida del audio en sí (Gemini TTS, voz Sulafat), separada de la comprensión del contenido.',
    guionInvestigador:
      'Reproduce un audio de referencia neutro (no una narrativa de navegación). Pregunta, para cada criterio: "¿Qué tan clara/rápida/natural/cómoda en volumen te pareció la voz?" en escala de 1 a 5.',
    tipo: 'escala',
    criterios: ['claridad', 'velocidad', 'naturalidad', 'volumen'],
    metricas: ['inteligibilidad', 'velocidad percibida', 'naturalidad', 'volumen'],
  },
  {
    id: 'OBJ-06',
    nombre: 'Suficiencia de la información',
    objetivo: 'Determinar si el participante percibe la cantidad de información narrada como adecuada, insuficiente o excesiva.',
    guionInvestigador:
      'Pregunta: "¿Sentiste que la descripción te dio la información que necesitabas? ¿Faltó algo? ¿Sobró algo?". Registra la respuesta abierta y, si es posible, una calificación de suficiencia de 1 a 5.',
    tipo: 'escala',
    criterios: ['suficiencia', 'redundancia'],
    metricas: ['suficiencia de información', 'redundancia percibida'],
  },
  {
    id: 'OBJ-07',
    nombre: 'Utilidad percibida (cierre)',
    objetivo: 'Cerrar la sesión con una valoración global de utilidad y comentarios espontáneos.',
    guionInvestigador:
      'Pregunta: "En general, ¿qué tan útil te parece este sistema para orientarte en un espacio que no conoces?" (escala 1-5) y deja espacio para comentarios libres.',
    tipo: 'escala',
    criterios: ['utilidad_general'],
    metricas: ['utilidad percibida', 'satisfacción'],
  },
]

// ─────────────────────────────────────────────
// PISTA: Usuarios piloto (sin discapacidad — validación del instrumento)
// ─────────────────────────────────────────────
export const TESTS_PILOTO: StudyTest[] = [
  {
    id: 'PIL-01',
    nombre: 'Comprensión de las instrucciones',
    objetivo: 'Verificar que las instrucciones del estudio se entienden sin ambigüedad antes de iniciar con la población objetivo.',
    guionInvestigador: 'Antes de comenzar las pruebas, pregunta: "¿Quedó claro lo que se te va a pedir en esta sesión?".',
    tipo: 'escala',
    criterios: ['claridad_instrucciones'],
    metricas: ['validación de instrucciones (no es evidencia de accesibilidad)'],
  },
  {
    id: 'PIL-02',
    nombre: 'Duración percibida de la sesión',
    objetivo: 'Estimar si la duración total de la sesión es razonable antes de aplicarla a la población objetivo.',
    guionInvestigador: 'Al finalizar, pregunta: "¿Te pareció larga, corta o adecuada la duración de la sesión?".',
    tipo: 'texto',
    metricas: ['validación de duración'],
  },
  {
    id: 'PIL-03',
    nombre: 'Funcionamiento técnico',
    objetivo: 'Detectar fallas técnicas (audio que no carga, demoras excesivas, errores visibles) antes de la sesión real.',
    guionInvestigador: 'Registra cualquier falla técnica observada durante la sesión, aunque el participante no la mencione explícitamente.',
    tipo: 'texto',
    metricas: ['validación técnica del instrumento'],
  },
  {
    id: 'PIL-04',
    nombre: 'Claridad del formulario y el consentimiento',
    objetivo: 'Confirmar que el formulario de registro y el texto de consentimiento se entienden sin apoyo adicional.',
    guionInvestigador: 'Pregunta: "¿Hubo alguna parte del formulario o del consentimiento que no te quedara clara?".',
    tipo: 'texto',
    metricas: ['validación de instrumentos de consentimiento'],
  },
  {
    id: 'PIL-05',
    nombre: 'Comentario general',
    objetivo: 'Recoger observaciones libres sobre la logística de la sesión.',
    guionInvestigador: 'Pregunta abierta de cierre: "¿Algo que deberíamos ajustar antes de hacer esto con los usuarios reales?".',
    tipo: 'texto',
    metricas: ['mejora del instrumento'],
  },
]

export function getTestsForTrack(track: StudyTrack): StudyTest[] {
  return track === 'objetivo' ? TESTS_OBJETIVO : TESTS_PILOTO
}
