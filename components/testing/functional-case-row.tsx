import { CheckCircle2, XCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FunctionalCase } from '@/hooks/use-testing'

interface FunctionalCaseRowProps {
  caso: FunctionalCase
}

/**
 * Fila individual de resultado de prueba funcional.
 * Muestra el ID, descripción, resultado PASS/FAIL, tiempo y detalle colapsable.
 */
export function FunctionalCaseRow({ caso }: FunctionalCaseRowProps) {
  const isPassed = caso.resultado === 'PASS'

  return (
    <details className="group rounded-lg border border-border bg-card overflow-hidden">
      <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-muted/40 transition-colors list-none">
        {/* Icono de resultado */}
        {isPassed ? (
          <CheckCircle2 className="w-4 h-4 text-[#1D9E75] shrink-0" />
        ) : (
          <XCircle className="w-4 h-4 text-[#E24B4A] shrink-0" />
        )}

        {/* ID */}
        <span className={cn(
          'text-xs font-mono px-2 py-0.5 rounded font-semibold shrink-0',
          isPassed ? 'bg-[#E1F5EE] text-[#0F6E56]' : 'bg-[#FCEBEB] text-[#E24B4A]'
        )}>
          {caso.id}
        </span>

        {/* Descripción */}
        <span className="text-sm text-foreground flex-1 min-w-0 truncate">
          {caso.descripcion}
        </span>

        {/* Tiempo */}
        <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <Clock className="w-3 h-3" />
          {caso.tiempo_ms.toFixed(0)} ms
        </span>
      </summary>

      {/* Detalle expandible */}
      <div className="px-4 py-3 border-t border-border bg-muted/20 space-y-2 text-sm">
        {caso.error && (
          <div className="p-2 rounded bg-[#FCEBEB] text-[#E24B4A] text-xs">
            <strong>Error:</strong> {caso.error}
          </div>
        )}
        {Object.keys(caso.detalle).length > 0 && (
          <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
            {JSON.stringify(caso.detalle, null, 2)}
          </pre>
        )}
      </div>
    </details>
  )
}
