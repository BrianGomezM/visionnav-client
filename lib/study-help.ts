/**
 * Textos del ícono (i) del instrumento de evaluación: qué es cada campo, qué se le
 * pregunta al participante y cómo se registra. Solo los ve el investigador.
 */

export interface HelpText {
  titulo: string
  /** Qué es o qué mide. */
  texto: string
  /** Pregunta sugerida para leer al participante (si aplica). */
  pregunta?: string
  /** Cómo registrarlo. */
  registro?: string
}

// Anclas verbales únicas (1 nada · 2 poco · 3 moderadamente · 4 bastante · 5 muy), leídas
// completas en cada pregunta (definidas el 2026-10-01, docs/EVALUACION_USUARIOS.md §0).
const OPCIONES = 'Responda con un número: 1 nada, 2 poco, 3 moderadamente, 4 bastante o 5 muy.'

/** Escalas 1–5 (valoraciones subjetivas y criterios de las pruebas de escala). */
export const SCALE_HELP: Record<string, HelpText> = {
  claridad: {
    titulo: 'Claridad de las descripciones',
    texto: 'Si las descripciones se entendieron sin esfuerzo: palabras comprensibles, frases ordenadas, sin ambigüedad.',
    pregunta: `Pensando en todas las descripciones, ¿qué tan claras le parecieron? ${OPCIONES}`,
  },
  inteligibilidad: {
    titulo: 'Inteligibilidad de la voz',
    texto: 'Si se entendían las palabras que pronunciaba la voz (ITU-T P.85), no el contenido.',
    pregunta: `¿Qué tan fácil fue entender las palabras que decía la voz? ${OPCIONES}`,
  },
  utilidad: {
    titulo: 'Utilidad',
    texto: 'Si la información le serviría para hacerse una idea del lugar y orientarse.',
    pregunta: `¿Qué tan útil le resultó esta descripción para saber qué hay a su alrededor? ${OPCIONES}`,
  },
  suficiencia: {
    titulo: 'Suficiencia de la información',
    texto: 'Si la descripción dio la información necesaria, sin que faltara algo importante.',
    pregunta: `Pensando en todas las descripciones, ¿qué tan suficiente fue la información para hacerse una idea del lugar? ${OPCIONES}`,
  },
  naturalidad_voz: {
    titulo: 'Naturalidad de la voz',
    texto: 'Cómo suena la voz sintética (entonación, ritmo, pronunciación), no el contenido de lo que dice.',
    pregunta: `Sin pensar en lo que dijo, ¿qué tan natural le sonó la voz? ${OPCIONES}`,
  },
  carga_percibida: {
    titulo: 'Carga percibida',
    texto: 'Esfuerzo mental que le exigió escuchar y recordar las descripciones (adaptado del ítem de demanda mental del NASA-TLX; un solo ítem, no validado). Más alto = más esfuerzo.',
    pregunta: `¿Qué tanto esfuerzo le costó seguir las descripciones? ${OPCIONES}`,
  },
  redundancia: {
    titulo: 'Redundancia',
    texto: 'Si las descripciones repitieron información o fueron más largas de lo necesario. Más alto = más repetitivas.',
    pregunta: `Pensando en todas las descripciones, ¿qué tan repetitivas le parecieron? ${OPCIONES}`,
  },
  velocidad: {
    titulo: 'Velocidad',
    texto: 'Si el ritmo del habla fue adecuado para entender.',
    pregunta: `¿Qué tan adecuada le pareció la velocidad de la voz? ${OPCIONES} Si no fue adecuada, ¿fue lenta o rápida?`,
  },
  naturalidad: {
    titulo: 'Naturalidad',
    texto: 'Cómo suena la voz sintética, no el contenido.',
    pregunta: `¿Qué tan natural le sonó la voz? ${OPCIONES}`,
  },
  volumen: {
    titulo: 'Volumen',
    texto: 'Si el volumen fue cómodo con el dispositivo de la sesión.',
    pregunta: `¿Qué tan cómodo le pareció el volumen? ${OPCIONES}`,
  },
  utilidad_general: {
    titulo: 'Utilidad general',
    texto: 'Valoración global de las descripciones para orientarse en un lugar desconocido.',
    pregunta: `En general, ¿qué tan útiles le parecen estas descripciones para orientarse en un espacio que no conoce? ${OPCIONES}`,
  },
  claridad_instrucciones: {
    titulo: 'Claridad de las instrucciones',
    texto: 'Si las instrucciones de la sesión se entendieron sin ambigüedad (solo piloto).',
    pregunta: `Desde el inicio, ¿qué tan claro le quedó lo que se le iba a pedir en cada actividad? ${OPCIONES}`,
  },
  comprension_escalas: {
    titulo: 'Comprensión de las escalas',
    texto: 'Si el participante pudo responder con números del 1 al 5 leídos en voz alta (solo piloto).',
    pregunta: `¿Qué tan fácil le resultó responder con números del 1 al 5? ${OPCIONES}`,
  },
}

export const FIELD_HELP = {
  guion: {
    titulo: 'Guion del investigador',
    texto: 'Lo que se dice y se hace en esta prueba. Léalo igual con todos los participantes para que las respuestas sean comparables.',
  },
  estimulo: {
    titulo: 'Estímulo',
    texto:
      'Imagen de la escena que analiza el sistema. El participante no la ve: solo escucha la narrativa. En una prueba formal se usa la escena asignada, igual para todos.',
  },
  audio: {
    titulo: 'Audio de la narrativa (generado por la API)',
    texto:
      'Voz sintética que describe la escena. Es lo que escucha el participante y se guarda con la respuesta. Use «Repetir» solo si el participante lo pide: cada repetición se cuenta.',
  },
  tiempo_respuesta: {
    titulo: 'Tiempo de respuesta del participante',
    texto:
      'Segundos desde que terminó el audio hasta que el participante empezó a responder. Se marca al pulsar «Grabar respuesta» (o «Marcar inicio»). Es una métrica débil: depende también de cuándo se pulsa.',
  },
  tiempo_tts: {
    titulo: 'Tiempo de generación',
    texto:
      'Cuánto tardó el servidor en producir la narrativa y el audio. No es del participante: solo describe el rendimiento del sistema.',
  },
  grabacion: {
    titulo: 'Grabación de la respuesta',
    texto:
      'Graba la voz del participante durante esta prueba (autorizada en la afirmación 3 del consentimiento). Púlsela antes de hacer la pregunta; puede pausarla. Se sube al guardar la respuesta y sirve para revisar después lo que dijo. No marca el tiempo de respuesta.',
  },
  respuesta_iniciada: {
    titulo: 'Respuesta iniciada',
    texto:
      'Púlselo en el momento en que el participante EMPIEZA a responder la pregunta (no al formularla). El tiempo va desde el fin de la última reproducción del audio. Es una métrica débil: incluye la lectura de la pregunta y la reacción del investigador.',
  },
  aclaraciones: {
    titulo: 'Aclaraciones',
    texto:
      'Pulse una vez por cada vez que el participante pida que se le aclare la pregunta o la escala. No cuente aquí las repeticiones del audio: esas se registran solas.',
  },
  practica: {
    titulo: 'Práctica',
    texto:
      'Una escena de familiarización, distinta de las evaluadas, para que el participante conozca la voz y el tipo de pregunta antes de OBJ-01. Se registra como ensayo y no cuenta como evidencia.',
  },
  ubicacion: {
    titulo: 'Objeto preguntado',
    texto:
      'El objeto por el que se pregunta (se carga de la narrativa). Registre el lado que dijo el participante; la coincidencia con la narrativa se propone sola. No se marca si lo nombró: el investigador lo menciona en la pregunta.',
  },
  distancia: {
    titulo: 'Distancia',
    texto:
      'Compare con los pasos que dijo la narrativa. Cuenta como coincidente si el participante da la misma cantidad aproximada o una expresión equivalente («unos cinco pasos», «a cinco pasos»). Una cantidad distinta, o solo «cerca» o «lejos» sin pasos, se marca «No».',
  },
  cambio: {
    titulo: 'Percepción del cambio',
    texto:
      'Respuesta a «¿Notó algo distinto respecto a la descripción anterior?». «Cambio real»: menciona que el sofá ya no está al frente o que pasó a la izquierda. Una respuesta vaga («algo cambió») sin decir qué se registra como «No menciona ningún cambio» y se anota en las observaciones.',
  },
  audio_congelado: {
    titulo: 'Audio congelado',
    texto:
      'Narrativa y audio generados una sola vez para esta escena; todos los participantes escuchan exactamente el mismo archivo (se verifica su sha256). En las pruebas formales nunca se regenera.',
  },
  transcripcion: {
    titulo: 'Transcripción de la respuesta verbal',
    texto: 'Lo que dijo el participante, tal cual, sin corregir. Si hay grabación puede anotar solo lo esencial y completar después.',
  },
  objetos: {
    titulo: 'Objetos mencionados en la narrativa',
    texto:
      'Una fila por cada objeto que dijo la narrativa (se cargan del texto; revíselos). Marque si el participante lo nombró y dónde dijo que estaba. La referencia es la narrativa, no la imagen.',
    registro: 'La ubicación correcta se propone sola al comparar con lo que dijo la narrativa; puede cambiarla.',
  },
  inventados: {
    titulo: 'Objetos que NO estaban en la narrativa',
    texto: 'Objetos que el participante mencionó pero la narrativa no dijo. Cuentan como objetos inventados.',
  },
  relaciones: {
    titulo: 'Relaciones espaciales de la narrativa',
    texto:
      'Frases de la narrativa que relacionan objetos o ubican algo (por ejemplo, «la silla está delante de la mesa»). Marque si el participante la comprendió.',
  },
  decision: {
    titulo: 'Tarea de decisión',
    texto:
      'Decisión hipotética a partir del audio: el participante no se mueve. Registre la dirección que eligió. El servidor la compara por separado con la dirección que indicó la narrativa (comprensión) y con la dirección libre según el diseño de la escena.',
  },
  respuesta_texto: {
    titulo: 'Respuesta del participante',
    texto: 'Respuesta abierta, anotada tal cual.',
  },
  comentarios: {
    titulo: 'Comentarios del participante',
    texto: 'Lo que el participante comentó por iniciativa propia, incluido lo que le resultó confuso.',
    pregunta: '¿Algo de esta descripción le resultó confuso o quiere comentar algo?',
  },
  observaciones: {
    titulo: 'Observaciones del investigador',
    texto: 'Lo que usted observó: dudas, pausas, comportamiento, condiciones de la sesión. Sin nombres.',
  },
  errores: {
    titulo: 'Incidencias',
    texto:
      'Fallos técnicos (audio que no carga, demora), de procedimiento (se leyó mal la pregunta) u otros. Las omisiones y los objetos inventados NO van aquí: se calculan solos a partir de la codificación.',
  },
  criterios: {
    titulo: 'Criterios de la prueba (1–5)',
    texto: 'Lea la pregunta de cada criterio y registre el número que diga el participante. «No preguntado» si se omitió.',
  },
} satisfies Record<string, HelpText>
