/**
 * Consentimientos informados del estudio con usuarios (Objetivo Específico 3).
 * Dos documentos distintos, uno por tipo de participante:
 *   - piloto:   Consentimiento_informado_VisionNav_Personas_Piloto_v0.3
 *   - objetivo: Consentimiento_informado_VisionNav_Personas_Objetivo_v0.3
 *
 * Fuente: los documentos del investigador (public/consentimientos/, que es lo que se
 * descarga). Aquí se transcribe el texto que se lee en voz alta, con las erratas
 * gramaticales corregidas. Lo que el documento aún no define queda como [PENDIENTE].
 *
 * La versión se registra en cada sesión y el backend comprueba que corresponda al tipo
 * de participante (vision-api-object-detection: app/routes/study.py, CONSENT_VERSIONS).
 */

import type { TipoParticipante } from '@/lib/study-protocol'

export type ConsentBlock =
  | { kind: 'title' | 'heading' | 'paragraph' | 'pending' | 'note'; text: string }
  | { kind: 'list'; items: string[] }

/** Claves de las cuatro afirmaciones del §12 (todas obligatorias para participar). */
export type ConsentKey = 'acepta_participar' | 'puede_detenerse' | 'autoriza_grabacion' | 'autoriza_uso_academico'
export const CONSENT_KEYS: ConsentKey[] = ['acepta_participar', 'puede_detenerse', 'autoriza_grabacion', 'autoriza_uso_academico']

export interface ConsentDocument {
  version: string
  titulo: string
  archivos: { pdf: string; docx: string }
  afirmaciones: Record<ConsentKey, string>
  bloques: ConsentBlock[]
}

const TRABAJO =
  'Generación de descripciones narrativas egocéntricas accesibles en entornos Web 3D mediante algoritmo de detección de objetos'

const ENCABEZADO: ConsentBlock[] = [
  { kind: 'paragraph', text: `Trabajo de Grado: ${TRABAJO}.` },
  {
    kind: 'paragraph',
    text:
      'Investigador responsable: Brayan Julio Gomez Muñoz (202310016-3743), brayan.julio.gomez2646@correounivalle.edu.co. ' +
      'Universidad del Valle, Facultad de Ingeniería, Escuela de Ingeniería de Sistemas y Computación, Programa de Ingeniería de Sistemas.',
  },
]

const AFIRMACION_2 = 'Entiendo que puedo detener mi participación en cualquier momento sin consecuencias académicas.'
const AFIRMACION_3 =
  'Entiendo que durante la sesión se grabarán mis respuestas verbales en audio y autorizo dicha grabación para fines exclusivamente académicos.'

const PROCEDIMIENTO_COMUN = [
  'Se reproducirán descripciones auditivas generadas por la herramienta VisionNav a partir de escenas.',
  'Se podrán realizar preguntas sobre los objetos mencionados en las descripciones.',
  'Se solicitará identificar objetos y comprender su ubicación o relación espacial a partir de la información auditiva.',
  'En determinadas actividades se solicitará tomar una decisión de orientación con base en la descripción escuchada.',
  'Las respuestas serán proporcionadas verbalmente.',
  'El participante podrá solicitar que una descripción auditiva sea reproducida nuevamente.',
]
const SIN_DESPLAZAMIENTO =
  'La actividad no requiere caminar, desplazarse físicamente ni controlar un personaje dentro de un entorno virtual.'

const RIESGOS: ConsentBlock[] = [
  { kind: 'heading', text: '6. Riesgos y posibles molestias' },
  {
    kind: 'paragraph',
    text:
      'La actividad no contempla desplazamiento físico ni tareas que impliquen esfuerzo corporal. La principal molestia previsible ' +
      'corresponde a cansancio o fatiga por la escucha y respuesta durante la sesión. El participante podrá solicitar una pausa o ' +
      'manifestar cualquier dificultad durante la actividad.',
  },
]

const IDENTIFICACION = (info: string): ConsentBlock[] => [
  { kind: 'heading', text: '8. Identificación y tratamiento de la información' },
  {
    kind: 'paragraph',
    text:
      'Para registrar la participación en el estudio se solicitará el nombre completo. Esta información se utilizará para ' +
      'identificar formalmente a la persona participante y mantener la trazabilidad del consentimiento.',
  },
  {
    kind: 'paragraph',
    text:
      'Para el análisis y presentación de los resultados se utilizará un código de participante (por ejemplo, P01). El nombre no ' +
      'se utilizará como identificador en las tablas, resultados o análisis académicos del Trabajo de Grado.',
  },
  { kind: 'paragraph', text: info },
]

const ALMACENAMIENTO = (actividad: string): ConsentBlock[] => [
  {
    kind: 'paragraph',
    text:
      `La información y las grabaciones obtenidas durante ${actividad} serán tratadas de manera confidencial. Las grabaciones de ` +
      'audio serán almacenadas en el computador del investigador responsable y el acceso estará restringido al investigador ' +
      'para efectos del análisis académico.',
  },
  {
    kind: 'pending',
    text:
      '[PENDIENTE de actualizar en el documento: por decisión del investigador, el sistema guarda las grabaciones en el servidor ' +
      'del proyecto (Azure), con acceso restringido por la clave del investigador, no en su computador.]',
  },
]

const PERIODO: ConsentBlock[] = [
  { kind: 'paragraph', text: 'Periodo de conservación de las grabaciones:' },
  { kind: 'pending', text: '[PENDIENTE: el documento v0.3 no indica el periodo de conservación de las grabaciones.]' },
]

const INFORMACION: ConsentBlock[] = [
  { kind: 'heading', text: '11. Información y preguntas' },
  {
    kind: 'paragraph',
    text:
      'Antes de iniciar la actividad, el investigador leerá este consentimiento en su totalidad y responderá las preguntas que el ' +
      'participante considere necesarias. El participante podrá solicitar que cualquier parte del procedimiento sea explicada ' +
      'nuevamente antes de expresar su decisión.',
  },
]

const REGISTRO: ConsentBlock[] = [
  { kind: 'heading', text: '13. Registro del consentimiento' },
  {
    kind: 'note',
    text:
      'Se completa en el formato impreso: nombre completo del participante, código, lugar y fecha, consentimiento para participar, ' +
      'autorización de grabación de audio, autorización para uso académico y firma del investigador responsable. El nombre no se ' +
      'registra en el sistema.',
  },
]

const afirmacionesLista = (a: Record<ConsentKey, string>): ConsentBlock => ({
  kind: 'list',
  items: CONSENT_KEYS.map((k, i) => `${i + 1}. ${a[k]}`),
})

// ─────────────────────────────────────────────
// Personas piloto
// ─────────────────────────────────────────────

const AFIRMACIONES_PILOTO: Record<ConsentKey, string> = {
  acepta_participar: 'Entiendo el propósito de la prueba piloto y acepto participar voluntariamente.',
  puede_detenerse: AFIRMACION_2,
  autoriza_grabacion: AFIRMACION_3,
  autoriza_uso_academico:
    'Autorizo el uso de mis respuestas, observaciones y grabación de audio para el análisis de la prueba piloto y los ajustes del procedimiento de evaluación.',
}

const PILOTO: ConsentDocument = {
  version: 'CI-VisionNav-Piloto v0.3',
  titulo: 'Consentimiento informado — Personas piloto',
  archivos: {
    pdf: '/consentimientos/Consentimiento_informado_VisionNav_Personas_Piloto_v0.3.pdf',
    docx: '/consentimientos/Consentimiento_informado_VisionNav_Personas_Piloto_v0.3.docx',
  },
  afirmaciones: AFIRMACIONES_PILOTO,
  bloques: [
    ...ENCABEZADO,
    { kind: 'heading', text: '1. Invitación a participar' },
    {
      kind: 'paragraph',
      text:
        'Se le invita a participar en una prueba piloto del sistema VisionNav, desarrollado como parte de un Trabajo de Grado II. ' +
        'La actividad busca verificar el procedimiento de evaluación y detectar posibles dificultades antes de su aplicación a las ' +
        'personas participantes de la evaluación principal.',
    },
    { kind: 'heading', text: '2. Propósito del estudio' },
    {
      kind: 'paragraph',
      text:
        'El propósito de esta prueba piloto es verificar la claridad de las instrucciones, actividades y preguntas utilizadas para ' +
        'evaluar las narrativas auditivas generadas por VisionNav, así como identificar posibles dificultades en el procedimiento, ' +
        'los tiempos y el registro de las respuestas.',
    },
    { kind: 'heading', text: '3. ¿Quién puede participar?' },
    {
      kind: 'paragraph',
      text:
        'La prueba piloto está dirigida a personas seleccionadas para participar en la validación preliminar del procedimiento. ' +
        'La participación es individual y se realizará bajo las condiciones establecidas para la prueba piloto.',
    },
    { kind: 'heading', text: '4. Procedimiento' },
    {
      kind: 'paragraph',
      text:
        'La sesión tendrá una duración aproximada de 30 minutos. Durante la actividad, el investigador operará el computador y el ' +
        'participante interactuará principalmente mediante la escucha de información auditiva y la respuesta verbal, con el fin de ' +
        'validar el procedimiento de evaluación.',
    },
    {
      kind: 'list',
      items: [
        ...PROCEDIMIENTO_COMUN,
        'Al finalizar la prueba, se realizará una breve encuesta o entrevista verbal sobre aspectos como la claridad de las ' +
          'instrucciones, comprensión de las actividades, dificultades encontradas y aspectos que puedan mejorarse del procedimiento.',
        SIN_DESPLAZAMIENTO,
      ],
    },
    { kind: 'heading', text: '5. Grabación de audio' },
    {
      kind: 'paragraph',
      text:
        'Durante toda la sesión se realizará una grabación de audio de las respuestas verbales del participante. La grabación es ' +
        'necesaria para realizar el análisis posterior de la prueba piloto y revisar el procedimiento; por esta razón, la ' +
        'participación en la prueba implica autorizar la grabación de las respuestas.',
    },
    {
      kind: 'paragraph',
      text:
        'El audio generado por la herramienta VisionNav que el participante escucha durante la prueba corresponde al funcionamiento ' +
        'del sistema y es diferente de la grabación de las respuestas del participante. La grabación de las respuestas será ' +
        'utilizada exclusivamente para fines académicos relacionados con la prueba piloto y este Trabajo de Grado.',
    },
    { kind: 'paragraph', text: 'No se realizará grabación de video durante la sesión.' },
    ...RIESGOS,
    { kind: 'heading', text: '7. Beneficios' },
    {
      kind: 'paragraph',
      text:
        'No se garantiza un beneficio directo para el participante. Su participación permitirá identificar posibles dificultades y ' +
        'realizar ajustes al procedimiento de evaluación antes de su aplicación principal, contribuyendo al análisis académico del sistema.',
    },
    ...IDENTIFICACION(
      'La información obtenida durante la sesión podrá incluir las respuestas verbales del participante, la grabación de audio, ' +
        'las observaciones realizadas por el investigador y la retroalimentación proporcionada sobre el procedimiento durante la prueba piloto.'
    ),
    { kind: 'heading', text: '9. Confidencialidad y almacenamiento' },
    ...ALMACENAMIENTO('la prueba piloto'),
    {
      kind: 'paragraph',
      text:
        'La información obtenida durante la prueba piloto se utilizará para revisar y ajustar el procedimiento de evaluación. En caso ' +
        'de incorporarse resultados al Trabajo de Grado, se presentarán de manera que la identidad del participante no sea utilizada ' +
        'como parte del análisis o presentación de resultados.',
    },
    ...PERIODO,
    { kind: 'heading', text: '10. Participación voluntaria y retiro' },
    {
      kind: 'paragraph',
      text:
        'La participación en la prueba piloto es voluntaria. El participante puede decidir no participar o detener su participación ' +
        'durante la sesión. No tendrá que proporcionar una explicación para hacerlo y su decisión no generará consecuencias académicas.',
    },
    ...INFORMACION,
    { kind: 'heading', text: '12. Consentimiento verbal' },
    {
      kind: 'paragraph',
      text:
        'Este documento podrá ser leído en voz alta antes de la participación, cuando sea necesario, para facilitar la comprensión ' +
        'de la información y del procedimiento de la prueba piloto. El investigador verificará que el participante haya comprendido ' +
        'el propósito, procedimiento, grabación y tratamiento de la información antes de registrar su consentimiento.',
    },
    {
      kind: 'paragraph',
      text: 'Antes de iniciar, se leerán las siguientes afirmaciones. El participante deberá responder «sí» o «no» a cada una:',
    },
    afirmacionesLista(AFIRMACIONES_PILOTO),
    ...REGISTRO,
  ],
}

// ─────────────────────────────────────────────
// Personas objetivo (ceguera total)
// ─────────────────────────────────────────────

const AFIRMACIONES_OBJETIVO: Record<ConsentKey, string> = {
  acepta_participar: 'Entiendo el propósito de la evaluación y acepto participar voluntariamente.',
  puede_detenerse: AFIRMACION_2,
  autoriza_grabacion: AFIRMACION_3,
  autoriza_uso_academico:
    'Autorizo el uso de mis respuestas, observaciones y grabación de audio para el análisis de los resultados de este Trabajo de Grado.',
}

const OBJETIVO: ConsentDocument = {
  version: 'CI-VisionNav-Objetivo v0.3',
  titulo: 'Consentimiento informado — Personas con ceguera total',
  archivos: {
    pdf: '/consentimientos/Consentimiento_informado_VisionNav_Personas_Objetivo_v0.3.pdf',
    docx: '/consentimientos/Consentimiento_informado_VisionNav_Personas_Objetivo_v0.3.docx',
  },
  afirmaciones: AFIRMACIONES_OBJETIVO,
  bloques: [
    ...ENCABEZADO,
    { kind: 'heading', text: '1. Invitación a participar' },
    {
      kind: 'paragraph',
      text:
        'Se le invita a participar en una evaluación del sistema VisionNav, desarrollado como parte de un Trabajo de Grado II. La ' +
        'actividad está dirigida a personas con ceguera total y busca evaluar la comprensión de las descripciones auditivas que ' +
        'genera el sistema a partir de imágenes de escenas Web 3D.',
    },
    { kind: 'heading', text: '2. Propósito del estudio' },
    {
      kind: 'paragraph',
      text:
        'El propósito de esta evaluación es analizar si las narrativas auditivas generadas por VisionNav permiten comprender de ' +
        'manera clara los objetos presentes en una escena, su ubicación y las relaciones espaciales descritas, así como utilizar ' +
        'esta información para responder situaciones de orientación y toma de decisiones dentro de la actividad de evaluación.',
    },
    { kind: 'heading', text: '3. ¿Quién puede participar?' },
    {
      kind: 'paragraph',
      text:
        'La evaluación está dirigida a personas con ceguera total. La participación es individual y se realizará bajo las ' +
        'condiciones establecidas para la prueba.',
    },
    { kind: 'heading', text: '4. Procedimiento' },
    {
      kind: 'paragraph',
      text:
        'La sesión tendrá una duración aproximada de 30 minutos. Durante la actividad, el investigador operará el computador y el ' +
        'participante interactuará principalmente mediante la escucha de información auditiva y la respuesta verbal.',
    },
    {
      kind: 'list',
      items: [
        ...PROCEDIMIENTO_COMUN,
        'Al finalizar la prueba, se realizará una breve encuesta o entrevista verbal sobre aspectos como claridad, comprensión, ' +
          'naturalidad y utilidad de las descripciones.',
        SIN_DESPLAZAMIENTO,
      ],
    },
    { kind: 'heading', text: '5. Grabación de audio' },
    {
      kind: 'paragraph',
      text:
        'Durante toda la sesión se realizará una grabación de audio de las respuestas verbales del participante. La grabación es ' +
        'necesaria para realizar el análisis posterior de la evaluación; por esta razón, la participación en la prueba implica ' +
        'autorizar la grabación de las respuestas.',
    },
    {
      kind: 'paragraph',
      text:
        'El audio generado por la herramienta VisionNav que el participante escucha durante la prueba corresponde al funcionamiento ' +
        'del sistema y es diferente de la grabación de las respuestas del participante. La grabación de las respuestas será ' +
        'utilizada exclusivamente para fines académicos relacionados con este Trabajo de Grado.',
    },
    { kind: 'paragraph', text: 'No se realizará grabación de video durante la sesión.' },
    ...RIESGOS,
    { kind: 'heading', text: '7. Beneficios' },
    {
      kind: 'paragraph',
      text:
        'No se garantiza un beneficio directo para el participante. Su participación permitirá obtener información para evaluar ' +
        'el funcionamiento de VisionNav desde la perspectiva de las personas con ceguera total y contribuir al análisis académico del sistema.',
    },
    ...IDENTIFICACION(
      'La información obtenida durante la sesión podrá incluir las respuestas verbales del participante, la grabación de audio y ' +
        'las observaciones realizadas por el investigador durante la prueba.'
    ),
    { kind: 'heading', text: '9. Confidencialidad y almacenamiento' },
    ...ALMACENAMIENTO('la evaluación'),
    {
      kind: 'paragraph',
      text:
        'Los resultados que se incorporen al Trabajo de Grado se presentarán de manera que la identidad del participante no sea ' +
        'utilizada como parte del análisis o presentación de resultados.',
    },
    ...PERIODO,
    { kind: 'heading', text: '10. Participación voluntaria y retiro' },
    {
      kind: 'paragraph',
      text:
        'La participación es voluntaria. El participante puede decidir no participar o detener su participación durante la sesión. ' +
        'No tendrá que proporcionar una explicación para hacerlo y su decisión no generará consecuencias académicas.',
    },
    ...INFORMACION,
    { kind: 'heading', text: '12. Consentimiento verbal' },
    {
      kind: 'paragraph',
      text:
        'Debido a que la evaluación está dirigida a personas con ceguera total, este documento podrá ser leído en voz alta antes de ' +
        'la participación. El investigador verificará que el participante haya comprendido el propósito, procedimiento, grabación y ' +
        'tratamiento de la información antes de registrar su consentimiento.',
    },
    {
      kind: 'paragraph',
      text: 'Antes de iniciar, se leerán las siguientes afirmaciones. El participante deberá responder «sí» o «no» a cada una:',
    },
    afirmacionesLista(AFIRMACIONES_OBJETIVO),
    ...REGISTRO,
    { kind: 'note', text: 'El formato impreso incluye además la firma de testigo, si corresponde.' },
  ],
}

export const CONSENT_DOCUMENTS: Record<TipoParticipante, ConsentDocument> = { piloto: PILOTO, objetivo: OBJETIVO }
