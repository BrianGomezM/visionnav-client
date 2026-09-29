'use client'

import { Download } from 'lucide-react'
import { CONSENT_DOCUMENTS } from '@/lib/consent'
import type { TipoParticipante } from '@/lib/study-protocol'

const linkClass =
  'inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B45A8]'

const TIPO_LABEL: Record<TipoParticipante, string> = { piloto: 'personas piloto', objetivo: 'personas objetivo' }

/** Descarga el documento real del consentimiento (PDF para imprimir y .docx editable). */
export function ConsentDownloadLinks({ tipo, withLabel = false }: { tipo: TipoParticipante; withLabel?: boolean }) {
  const doc = CONSENT_DOCUMENTS[tipo]
  const suffix = withLabel ? ` (${TIPO_LABEL[tipo]})` : ''
  return (
    <div className="flex flex-wrap gap-2">
      <a href={doc.archivos.pdf} download className={linkClass}>
        <Download className="w-4 h-4" aria-hidden="true" /> Consentimiento{suffix} · PDF
      </a>
      <a href={doc.archivos.docx} download className={linkClass}>
        <Download className="w-4 h-4" aria-hidden="true" /> Consentimiento{suffix} · Word
      </a>
    </div>
  )
}

/** Texto del consentimiento del tipo de participante, para leerlo en voz alta. */
export function ConsentText({ tipo }: { tipo: TipoParticipante }) {
  const doc = CONSENT_DOCUMENTS[tipo]
  return (
    <details className="rounded-lg border border-border p-4 text-sm" open>
      <summary className="cursor-pointer font-medium">
        {doc.titulo} ({doc.version}) — texto para leer en voz alta
      </summary>
      {/* Región desplazable: enfocable para poder recorrerla con el teclado. */}
      <div
        role="region"
        aria-label={`Texto de ${doc.titulo}`}
        tabIndex={0}
        className="mt-3 space-y-2 max-h-[28rem] overflow-y-auto pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B45A8] rounded"
      >
        {doc.bloques.map((b, i) => {
          if (b.kind === 'list')
            return (
              <ul key={i} className="list-disc pl-5 space-y-1">
                {b.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            )
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
