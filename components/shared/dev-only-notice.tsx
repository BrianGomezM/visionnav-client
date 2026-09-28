import { FlaskConical, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import type { DevEndpointsState, BackendProfile } from '@/hooks/use-backend-profile'

interface DevOnlyNoticeProps {
  /** Nombre del módulo, p. ej. "El diagnóstico detallado del pipeline". */
  feature: string
  /** Endpoints del backend que el módulo necesita (solo se muestran como referencia). */
  endpoints: string[]
  state: Exclude<DevEndpointsState, 'available'>
  profile: BackendProfile | null
  onRetry: () => void
}

/**
 * Aviso para los módulos que dependen de endpoints internos, montados solo con
 * APP_PROFILE=development (app/main.py del backend). En study/production esos
 * endpoints no existen a propósito: el módulo no hace la petición y lo explica.
 */
export function DevOnlyNotice({ feature, endpoints, state, profile, onRetry }: DevOnlyNoticeProps) {
  if (state === 'checking') {
    return (
      <div role="status" className="flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/30 text-sm text-muted-foreground">
        <Spinner className="w-4 h-4" />
        Verificando el perfil del servidor…
      </div>
    )
  }

  return (
    <div role="status" className="flex items-start gap-3 p-4 rounded-xl border border-border bg-muted/30 text-sm">
      <FlaskConical className="w-5 h-5 shrink-0 mt-0.5 text-muted-foreground" aria-hidden="true" />
      <div className="space-y-2 text-muted-foreground">
        {state === 'unavailable' ? (
          <>
            <p className="font-medium text-foreground">
              No disponible en este despliegue (perfil «{profile}»)
            </p>
            <p>
              {feature} solo está disponible en el entorno de desarrollo local
              (<code className="font-mono text-xs">APP_PROFILE=development</code>). Los endpoints{' '}
              {endpoints.map((e, i) => (
                <span key={e}>
                  {i > 0 && ', '}
                  <code className="font-mono text-xs">{e}</code>
                </span>
              ))}{' '}
              no se publican en este servidor, por eso el módulo no los consulta.
            </p>
          </>
        ) : (
          <>
            <p className="font-medium text-foreground">No se pudo verificar la disponibilidad</p>
            <p>
              No se obtuvo respuesta de <code className="font-mono text-xs">/api/health</code>, que indica
              el perfil del servidor. {feature} no se consulta hasta confirmarlo.
            </p>
            <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
              <RefreshCw className="w-4 h-4" aria-hidden="true" /> Reintentar
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
