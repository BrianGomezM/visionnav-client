'use client'

import { Download, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CONSENT_DOCUMENTS, CONSENT_KEYS } from '@/lib/consent'
import { printConsent } from '@/lib/consent-print'
import type { TipoParticipante } from '@/lib/study-protocol'

const linkClass =
  'inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B45A8]'

const TIPO_LABEL: Record<TipoParticipante, string> = { piloto: 'personas piloto', objetivo: 'personas objetivo' }

/** Consentimiento en blanco (v0.4, para imprimir) y documento original v0.3 del investigador. */
export function ConsentDownloadLinks({ tipo, withLabel = false }: { tipo: TipoParticipante; withLabel?: boolean }) {
  const doc = CONSENT_DOCUMENTS[tipo]
  const suffix = withLabel ? ` (${TIPO_LABEL[tipo]})` : ''
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => printConsent(doc, null)}>
        <Printer className="w-4 h-4" aria-hidden="true" /> Imprimir consentimiento{suffix} en blanco · v0.4
      </Button>
      <a href={doc.original_v03} download className={linkClass}>
        <Download className="w-4 h-4" aria-hidden="true" /> Original v0.3{suffix} · Word
      </a>
    </div>
  )
}

/** Texto completo del consentimiento del tipo de participante, para leerlo en voz alta. */
export function ConsentText({ tipo }: { tipo: TipoParticipante }) {
  const doc = CONSENT_DOCUMENTS[tipo]
  const afirmaciones = new Set(CONSENT_KEYS.map((k, i) => `${i + 1}. ${doc.afirmaciones[k]}`))
  return (
    <section aria-labelledby={`ci-${tipo}`} className="rounded-lg border border-border">
      <div className="border-b border-border bg-muted/30 px-4 py-2">
        <h5 id={`ci-${tipo}`} className="font-semibold text-foreground">
          {doc.titulo}
        </h5>
        <p className="text-xs text-muted-foreground">{doc.version} · texto para leer en voz alta</p>
      </div>
      {/* Región desplazable: enfocable para poder recorrerla con el teclado. */}
      <div
        role="region"
        aria-label={`Texto de ${doc.titulo}`}
        tabIndex={0}
        className="px-4 py-3 space-y-2 max-h-[34rem] overflow-y-auto text-[15px] leading-7 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B45A8] rounded-b-lg"
      >
        {doc.bloques.map((b, i) => {
          if (b.kind === 'list')
            return (
              <ul key={i} className="pl-5 space-y-1 list-disc">
                {b.items.map((it) =>
                  afirmaciones.has(it) ? (
                    <li key={it} className="list-none -ml-5 rounded bg-[#EEEDFE] px-3 py-1 font-medium text-[#2E2A6B]">
                      {it}
                    </li>
                  ) : (
                    <li key={it}>{it}</li>
                  )
                )}
              </ul>
            )
          if (b.kind === 'heading' || b.kind === 'title')
            return (
              <p key={i} className="font-semibold pt-3">
                {b.text}
              </p>
            )
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
    </section>
  )
}
