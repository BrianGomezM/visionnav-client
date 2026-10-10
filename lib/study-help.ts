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

// Anclas verbales únicas, leídas completas en cada pregunta. Estudio v2 (2026-10-10): palabras
// cotidianas que se entienden a la primera, sin términos técnicos.
const OPCIONES = 'Responda con un número: 1 nada, 2 poco, 3 más o menos, 4 bastante o 5 mucho.'

/** Escalas 1–5 (valoraciones subjetivas y criterios de las pruebas de escala). */
export const SCALE_HELP: Record<string, HelpText> = {
  claridad: {
    titulo: 'Facilidad para entender las descripciones',
    texto: 'Si las descripciones se entendieron sin esfuerzo.',
    pregunta: `En general, ¿qué tan fácil fue entender las descripciones? ${OPCIONES}`,
  },
  inteligibilidad: {
    titulo: 'Se entiende lo que dice la voz',
    texto: 'Si se entendían las palabras que pronunciaba la voz (no el contenido).',
    pregunta: `¿Qué tan fácil fue entender lo que decía la voz? ${OPCIONES}`,
  },
  utilidad: {
    titulo: 'Utilidad',
    texto: 'Si la información le serviría para saber qué hay a su alrededor.',
    pregunta: `¿Qué tan útil le resultó esta descripción para saber qué hay a su alrededor? ${OPCIONES}`,
  },
  suficiencia: {
    titulo: 'Información suficiente',
    texto: 'Si las descripciones dieron la información necesaria para imaginar el lugar.',
    pregunta: `¿Las descripciones le dieron suficiente información para imaginarse el lugar? ${OPCIONES}`,
  },
  naturalidad_voz: {
    titulo: 'Parecido a una persona',
    texto: 'Cómo suena la voz, no lo que dice.',
    pregunta: `¿Qué tanto se parece la voz a la de una persona? ${OPCIONES}`,
  },
  carga_percibida: {
    titulo: 'Esfuerzo',
    texto: 'Cuánto esfuerzo le costó escuchar y recordar las descripciones. Más alto = más esfuerzo.',
    pregunta: `¿Cuánto esfuerzo le costó seguir las descripciones? ${OPCIONES}`,
  },
  redundancia: {
    titulo: 'Repetían cosas',
    texto: 'Si las descripciones repetían información. Más alto = más repetitivas.',
    pregunta: `¿Sintió que las descripciones repetían cosas? ${OPCIONES}`,
  },
  velocidad: {
    titulo: 'Ritmo cómodo',
    texto: 'Si la voz habló a un ritmo cómodo para entender.',
    pregunta: `¿La voz habló a un ritmo cómodo para usted? ${OPCIONES} (Si responde 1 o 2: «¿Le pareció lenta o rápida?»)`,
  },
  naturalidad: {
    titulo: 'Parecido a una persona',
    texto: 'Cómo suena la voz, no lo que dice.',
    pregunta: `¿Qué tanto se parece la voz a la de una persona? ${OPCIONES}`,
  },
  volumen: {
    titulo: 'Volumen cómodo',
    texto: 'Si el volumen fue cómodo para escuchar.',
    pregunta: `¿El volumen fue cómodo para escuchar? ${OPCIONES}`,
  },
  utilidad_general: {
    titulo: 'Utilidad',
    texto: 'Qué tan útiles le parecen las descripciones para moverse en un lugar que no conoce.',
    pregunta: `¿Qué tan útil le parecería una descripción así para moverse en un lugar que no conoce? ${OPCIONES}`,
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
