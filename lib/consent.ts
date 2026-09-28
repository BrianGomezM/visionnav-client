/**
 * Consentimiento informado del estudio con usuarios (Objetivo Específico 3) —
 * BORRADOR adaptado para revisión de los directores. Fuente única: el asistente de
 * sesión muestra este texto y las afirmaciones, y el documento descargable (.docx)
 * se genera a partir de él.
 *
 * Adaptado de Formatos/Consentimiento informado.docx (otro estudio: doctorado, tareas
 * físicas, grabación de audio y video). Se conserva lo aplicable (participación
 * voluntaria, confidencialidad, lectura en voz alta y consentimiento verbal) y se
 * reescribe lo que no corresponde a este protocolo (doc. 27, §F, §H, §K, §L, §W).
 *
 * Nada aquí afirma una aprobación ética. Lo que no tiene respaldo documental queda
 * como [PENDIENTE …] para que lo completen o corrijan los directores.
 */

export const CONSENT_VERSION = 'TG2-OE3-CI v0.1 (borrador del 2026-09-28, pendiente de revisión de los directores)'
export const CONSENT_FILENAME = 'Consentimiento_informado_TG2_OE3_BORRADOR_v0.1.docx'

export type ConsentBlock =
  | { kind: 'title' | 'heading' | 'paragraph' | 'pending' | 'note'; text: string }
  | { kind: 'list'; items: string[] }

/** Afirmaciones leídas en voz alta (respuesta sí/no). 1–3 son obligatorias para participar. */
export const CONSENT_STATEMENTS = {
  comprende_y_acepta: 'Entiendo el propósito del estudio y acepto participar voluntariamente.',
  puede_retirarse: 'Sé que puedo detener mi participación en cualquier momento sin consecuencia alguna.',
  uso_anonimo: 'Autorizo el uso anónimo de mis respuestas y observaciones para análisis y publicación científica.',
} as const

/** Afirmación 4, opcional e independiente: se registra como autorización de grabación. */
export const RECORDING_STATEMENT =
  'Acepto que se grabe el audio de mis respuestas verbales, con fines exclusivamente académicos. (Opcional: puedo participar aunque no lo acepte.)'

export const CONSENT_BLOCKS: ConsentBlock[] = [
  { kind: 'title', text: 'Consentimiento informado — BORRADOR para revisión de los directores' },
  {
    kind: 'note',
    text:
      'Estado: documento NO aprobado. Adaptación, para el Trabajo de Grado II, del formato «Consentimiento informado» de otro ' +
      'estudio (Doctorado en Ingeniería, Universidad del Valle). No debe usarse con participantes hasta que lo aprueben los ' +
      'directores y, si corresponde, el comité de ética institucional. Versión: ' + CONSENT_VERSION + '.',
  },
  { kind: 'pending', text: 'Investigación: [PENDIENTE: título del Trabajo de Grado II].' },
  { kind: 'pending', text: 'Institución y programa: [PENDIENTE].' },
  { kind: 'pending', text: 'Investigador responsable: [PENDIENTE]. Directores: [PENDIENTE].' },
  { kind: 'pending', text: 'Contacto: [PENDIENTE: correo institucional].' },

  { kind: 'heading', text: '1. Propósito del estudio' },
  {
    kind: 'paragraph',
    text:
      'El objetivo de esta evaluación es conocer si la descripción narrativa en audio que genera el sistema VisionNav a partir ' +
      'de imágenes de escenas Web 3D permite comprender de manera clara y suficientemente fiel los objetos presentes y sus ' +
      'relaciones espaciales.',
  },

  { kind: 'heading', text: '2. Participación voluntaria' },
  {
    kind: 'paragraph',
    text:
      'Su participación es completamente voluntaria. Puede retirarse en cualquier momento sin necesidad de dar explicaciones y ' +
      'sin que esto le genere ningún perjuicio. Si decide no participar o retirarse, no habrá ningún tipo de consecuencia.',
  },

  { kind: 'heading', text: '3. Procedimiento' },
  {
    kind: 'list',
    items: [
      'La sesión es individual. El investigador opera el computador; usted solo escucha y responde de forma verbal.',
      'Escuchará descripciones en audio generadas por el sistema. Después de cada una se le preguntará qué objetos escuchó, ' +
        'dónde se encontraban y cómo se relacionan entre sí.',
      'En algunas tareas se le pedirá elegir, entre varias opciones, la que considere adecuada según la información escuchada.',
      'Ninguna tarea implica caminar, desplazarse ni controlar un personaje: las decisiones son hipotéticas y se responden de ' +
        'forma verbal.',
      'Puede pedir que se repita un audio; cada repetición se anota.',
      'Se le pedirá valorar algunos aspectos (por ejemplo, la claridad o la naturalidad de la voz) en una escala de 1 a 5. ' +
        'La sesión termina con una breve entrevista.',
    ],
  },
  { kind: 'pending', text: 'Duración aproximada: [PENDIENTE: estimar con la prueba piloto].' },

  { kind: 'heading', text: '4. Riesgos y molestias' },
  {
    kind: 'paragraph',
    text:
      'La sesión no incluye tareas físicas. Puede sentir cansancio por la escucha: puede pedir una pausa o terminar la sesión ' +
      'en cualquier momento.',
  },
  { kind: 'pending', text: '[PENDIENTE: revisión de los directores de esta sección, redactada para este protocolo].' },

  { kind: 'heading', text: '5. Confidencialidad' },
  {
    kind: 'paragraph',
    text:
      'Toda la información obtenida será confidencial. Los resultados se publicarán de forma anónima, sin incluir nombres ni ' +
      'datos personales. Cada participante será identificado con un código (por ejemplo, P01). Su nombre solo figura en este ' +
      'formato en papel y no se registra en el sistema.',
  },

  { kind: 'heading', text: '6. Tratamiento de la información' },
  {
    kind: 'paragraph',
    text:
      'Se registran sus respuestas, las observaciones del investigador y datos generales sin identificación personal ' +
      '(condición visual, tecnologías de apoyo que utiliza y dispositivo usado en la sesión). No se registran su nombre, edad, ' +
      'género ni historia clínica. Los datos se guardan fuera del repositorio público del proyecto.',
  },
  {
    kind: 'pending',
    text: '[PENDIENTE: lugar de almacenamiento definitivo, personas autorizadas para acceder a la información y tiempo de conservación (doc. 27, §W-7)].',
  },

  { kind: 'heading', text: '7. Grabación de audio (opcional)' },
  {
    kind: 'paragraph',
    text:
      'Con su autorización, se grabará el audio de sus respuestas verbales, solo con fines académicos. No se graba video. Puede ' +
      'participar aunque no autorice la grabación. El audio que usted escucha lo genera el sistema y no contiene datos suyos.',
  },
  {
    kind: 'pending',
    text: '[PENDIENTE: almacenamiento de las grabaciones, quién accede a ellas y por cuánto tiempo se conservan (doc. 27, §L, §W-2, §W-7)].',
  },

  { kind: 'heading', text: '8. Aprobación ética' },
  {
    kind: 'pending',
    text:
      '[PENDIENTE: confirmar con los directores si se requiere la aprobación de un comité de ética institucional (doc. 27, §W-1). ' +
      'Este documento no afirma que exista dicha aprobación].',
  },

  { kind: 'heading', text: '9. Consentimiento' },
  {
    kind: 'paragraph',
    text: 'Antes de iniciar, le leeré las siguientes afirmaciones. Por favor, responda «sí» si está de acuerdo o «no» si no lo está.',
  },
  {
    kind: 'list',
    items: [
      `1. ${CONSENT_STATEMENTS.comprende_y_acepta}`,
      `2. ${CONSENT_STATEMENTS.puede_retirarse}`,
      `3. ${CONSENT_STATEMENTS.uso_anonimo}`,
      `4. ${RECORDING_STATEMENT}`,
    ],
  },
  {
    kind: 'paragraph',
    text:
      'Para participar se requiere «sí» en las afirmaciones 1 a 3. Si responde «sí», registraré su consentimiento verbal y ' +
      'firmaré el formato en su nombre, indicando que ha sido leído en voz alta en su totalidad y que usted dio su aprobación verbal.',
  },
  {
    kind: 'list',
    items: [
      'Lugar y fecha: ___________________________',
      'Código del participante: ___________',
      'Nombre del participante (solo en este formato en papel): ___________________________',
      'Consentimiento verbal otorgado (afirmaciones 1 a 3): Sí ☐ No ☐',
      'Autoriza la grabación de audio (afirmación 4): Sí ☐ No ☐',
      'Firma del investigador responsable: ___________________________',
      'Firma de testigo (si aplica): ___________________________',
    ],
  },

  { kind: 'heading', text: 'Anexo para los directores: cambios respecto al formato original' },
  {
    kind: 'list',
    items: [
      'Propósito y procedimiento reescritos para este protocolo: escuchar audio y responder; sin tareas físicas ni desplazamiento.',
      'Riesgos: se retira la referencia al espacio físico y al asistente; queda pendiente de revisión.',
      'Grabación: solo audio de las respuestas, opcional y separada del consentimiento para participar; sin video.',
      'Identificación: código anonimizado en el sistema; el nombre queda solo en el formato en papel.',
      'Se añaden como pendientes: aprobación ética, almacenamiento, acceso y tiempo de conservación, duración, datos institucionales.',
    ],
  },
]
