/**
 * Interpretación del contrato de errores del backend (app/errors.py):
 *   { "error": { code, message, stage, request_id }, "detail": message }
 *
 * - El mensaje mostrado es comprensible para el investigador/usuario y nunca
 *   incluye detalles técnicos del servidor (el backend ya no los envía).
 * - Se muestra el request_id para poder rastrear el problema en los logs.
 * - Degradaciones: cabecera X-Degradacion (el servicio respondió, pero una parte
 *   opcional no se generó con el componente previsto).
 */

export interface ApiErrorInfo {
  status: number
  code: string | null
  stage: string | null
  requestId: string | null
  message: string
}

const STATUS_MESSAGE: Record<number, string> = {
  400: 'La solicitud no es válida.',
  401: 'Se requiere la clave del investigador (ajustes).',
  404: 'El servicio solicitado no existe en este servidor.',
  413: 'La imagen es demasiado grande (máximo 10 MB).',
  415: 'Formato no soportado: use una imagen JPEG o PNG.',
  422: 'La imagen está dañada o no se puede procesar.',
  429: 'Demasiadas solicitudes. Espere un momento e inténtelo de nuevo.',
  500: 'Error interno del servidor.',
  502: 'Un servicio externo (lenguaje o voz) devolvió un error.',
  503: 'Un servicio necesario no está disponible en este momento.',
  504: 'Un servicio externo no respondió a tiempo.',
}

export async function parseApiError(res: Response): Promise<ApiErrorInfo> {
  const body = await res.json().catch(() => ({} as Record<string, unknown>))
  const err = (body as { error?: Record<string, string> }).error
  const requestId = err?.request_id ?? res.headers.get('X-Request-ID')
  const serverMessage = err?.message ?? (typeof body.detail === 'string' ? body.detail : null)
  return {
    status: res.status,
    code: err?.code ?? null,
    stage: err?.stage ?? null,
    requestId,
    message: serverMessage ?? STATUS_MESSAGE[res.status] ?? `Error ${res.status}`,
  }
}

/** Texto para mostrar: mensaje + ID de solicitud (para soporte). */
export function formatApiError(e: ApiErrorInfo): string {
  return e.requestId ? `${e.message} (ID de solicitud: ${e.requestId})` : e.message
}

export class ApiRequestError extends Error {
  info: ApiErrorInfo
  constructor(info: ApiErrorInfo) {
    super(formatApiError(info))
    this.info = info
  }
}

const DEGRADATION_LABEL: Record<string, string> = {
  LLM_UNAVAILABLE: 'Narrativa generada por plantilla: el servicio de lenguaje no está configurado.',
  LLM_PROVIDER_ERROR: 'Narrativa generada por plantilla: el servicio de lenguaje falló.',
  LLM_INVALID_RESPONSE: 'Narrativa generada por plantilla: respuesta inválida del servicio de lenguaje.',
  LLM_TIMEOUT: 'Narrativa generada por plantilla: el servicio de lenguaje no respondió a tiempo.',
  TTS_UNAVAILABLE: 'Sin audio: el servicio de voz no está disponible.',
  TTS_QUOTA_EXCEEDED: 'Sin audio: se agotó temporalmente la cuota del servicio de voz.',
  TTS_PROVIDER_ERROR: 'Sin audio: el servicio de voz falló.',
  TTS_TIMEOUT: 'Sin audio: el servicio de voz no respondió a tiempo.',
  ANNOTATION_UNAVAILABLE: 'La imagen anotada no está disponible.',
}

export function parseDegradations(res: Response): string[] {
  const raw = res.headers.get('X-Degradacion')
  return raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : []
}

export function degradationLabel(code: string): string {
  return DEGRADATION_LABEL[code] ?? code
}
