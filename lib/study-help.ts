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

/** Escalas 1–5 (valoraciones subjetivas y criterios de las pruebas de escala). */
export const SCALE_HELP: Record<string, HelpText> = {
  claridad: {
    titulo: 'Claridad',
    texto: 'Si la descripción se entendió sin esfuerzo: palabras comprensibles, frases ordenadas, sin ambigüedad.',
    pregunta: '¿Qué tan clara le pareció la descripción? 1 es nada clara y 5 muy clara.',
  },
  utilidad: {
    titulo: 'Utilidad',
    texto: 'Si la información le serviría para hacerse una idea del lugar y orientarse.',
    pregunta: '¿Qué tan útil le resultó esta descripción para saber qué hay a su alrededor? 1 es nada útil y 5 muy útil.',
  },
  suficiencia: {
    titulo: 'Suficiencia de la información',
    texto: 'Si la descripción dio la información necesaria, sin que faltara algo importante.',
    pregunta: '¿La descripción le dio la información que necesitaba? 1 es muy insuficiente y 5 suficiente.',
  },
  naturalidad_voz: {
    titulo: 'Naturalidad de la voz',
    texto: 'Cómo suena la voz sintética (entonación, ritmo, pronunciación), no el contenido de lo que dice.',
    pregunta: 'Sin pensar en lo que dijo, ¿qué tan natural le sonó la voz? 1 es nada natural y 5 muy natural.',
  },
  carga_percibida: {
    titulo: 'Carga percibida',
    texto: 'Esfuerzo mental que le exigió escuchar y recordar la descripción. Métrica débil: es una percepción.',
    pregunta: '¿Cuánto esfuerzo le costó seguir la descripción? 1 es ningún esfuerzo y 5 mucho esfuerzo.',
  },
  redundancia: {
    titulo: 'Redundancia',
    texto: 'Si la descripción repitió información o fue más larga de lo necesario.',
    pregunta: '¿Sintió que la descripción repetía cosas? 1 es nada repetitiva y 5 muy repetitiva.',
  },
  velocidad: {
    titulo: 'Velocidad',
    texto: 'Si el ritmo del habla fue adecuado para entender.',
    pregunta: '¿La voz habló a una velocidad adecuada? 1 es nada adecuada (muy lenta o muy rápida) y 5 muy adecuada.',
  },
  naturalidad: {
    titulo: 'Naturalidad',
    texto: 'Cómo suena la voz sintética, no el contenido.',
    pregunta: '¿Qué tan natural le sonó la voz? 1 es nada natural y 5 muy natural.',
  },
  volumen: {
    titulo: 'Volumen',
    texto: 'Si el volumen fue cómodo con el dispositivo de la sesión.',
    pregunta: '¿El volumen fue cómodo? 1 es nada cómodo y 5 muy cómodo.',
  },
  utilidad_general: {
    titulo: 'Utilidad general',
    texto: 'Valoración global del sistema para orientarse en un lugar desconocido.',
    pregunta: 'En general, ¿qué tan útil le parece este sistema para orientarse en un espacio que no conoce? 1 es nada útil y 5 muy útil.',
  },
  claridad_instrucciones: {
    titulo: 'Claridad de las instrucciones',
    texto: 'Si las instrucciones de la sesión se entendieron sin ambigüedad (solo piloto).',
    pregunta: '¿Qué tan claro le quedó lo que se le iba a pedir en esta sesión? 1 es nada claro y 5 muy claro.',
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
      'Graba la voz del participante durante esta prueba (autorizada en la afirmación 3 del consentimiento). Púlsela al hacer la pregunta; puede pausarla. Se sube al guardar la respuesta y sirve para revisar después lo que dijo.',
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
      'Decisión hipotética a partir del audio: el participante no se mueve. Registre la dirección que eligió. El servidor la compara con la esperada según el diseño de la escena.',
  },
  coincide: {
    titulo: '¿La elección sigue a la narrativa?',
    texto:
      'Su juicio como investigador: la elección es coherente con lo que dijo el audio, aunque no coincida con la esperada (por ejemplo, si la narrativa omitió un objeto).',
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
