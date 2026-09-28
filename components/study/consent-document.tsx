'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CONSENT_BLOCKS, CONSENT_FILENAME, CONSENT_VERSION } from '@/lib/consent'
import { downloadDocx } from '@/lib/docx'

/** Descarga el borrador del consentimiento (.docx) para la revisión de los directores. */
export function ConsentDownloadButton({ className }: { className?: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={`gap-2 ${className ?? ''}`}
      onClick={() => downloadDocx(CONSENT_BLOCKS, CONSENT_FILENAME)}
    >
      <Download className="w-4 h-4" aria-hidden="true" /> Descargar consentimiento informado (borrador .docx)
    </Button>
  )
}

/** Texto del consentimiento para leerlo en voz alta (misma fuente que el .docx). */
export function ConsentText() {
  return (
    <details className="rounded-lg border border-border p-4 text-sm">
      <summary className="cursor-pointer font-medium">Texto del consentimiento para leer en voz alta ({CONSENT_VERSION})</summary>
      <div className="mt-3 space-y-2">
        {CONSENT_BLOCKS.map((b, i) => {
          if (b.kind === 'list')
            return (
              <ul key={i} className="list-disc pl-5 space-y-1">
                {b.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            )
          if (b.kind === 'title') return <p key={i} className="font-semibold">{b.text}</p>
          if (b.kind === 'heading') return <p key={i} className="font-medium pt-2">{b.text}</p>
          if (b.kind === 'pending')
            return (
              <p key={i} className="rounded bg-[#FFFAEB] px-2 py-1 text-[#7A2E0E]">
                {b.text}
              </p>
            )
          return (
            <p key={i} className={b.kind === 'note' ? 'italic text-muted-foreground' : undefined}>
              {b.text}
            </p>
          )
        })}
      </div>
    </details>
  )
}
