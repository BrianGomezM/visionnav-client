/**
 * Acta del consentimiento (§13) para imprimir o guardar en PDF desde el navegador.
 * Se genera en el cliente a partir del texto de lib/consent.ts. El nombre del
 * participante se escribe SOLO en esta hoja: no se guarda ni se envía al servidor.
 */

import type { ActaData, ConsentBlock, ConsentDocument } from '@/lib/consent'
import { TRABAJO_TITULO } from '@/lib/consent'

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const box = (v: boolean | null | undefined, yes: boolean) => (v === (yes ? true : false) ? '☒' : '☐')
const sino = (v: boolean | null | undefined) => `Sí ${box(v, true)} &nbsp;&nbsp; No ${box(v, false)}`

function blockHtml(b: ConsentBlock): string {
  if (b.kind === 'list') return `<ul>${b.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`
  if (b.kind === 'heading' || b.kind === 'title') return `<h2>${esc(b.text)}</h2>`
  if (b.kind === 'note') return `<p class="note">${esc(b.text)}</p>`
  return `<p>${esc(b.text)}</p>`
}

/** HTML completo del documento con el acta (en blanco si `acta` es null). */
export function consentHtml(doc: ConsentDocument, acta: ActaData | null): string {
  // El encabezado del documento (trabajo e investigador) va en la portada.
  const cuerpo = doc.bloques.filter((b) => !(b.kind === 'paragraph' && /^(Trabajo de Grado:|Investigador responsable:)/.test(b.text)))
  const v = (s: string | undefined) => (acta && s ? esc(s) : '&nbsp;')
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(doc.titulo)} — ${esc(acta?.codigo ?? 'en blanco')}</title>
<style>
  @page { size: letter; margin: 2.2cm 2.5cm; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; color: #000; }
  header { text-align: center; margin-bottom: 1.2em; }
  header p { margin: 0; }
  h1 { font-size: 13pt; text-align: center; margin: .8em 0 .2em; }
  h2 { font-size: 12pt; margin: 1.1em 0 .3em; }
  p { margin: .35em 0; text-align: justify; }
  ul { margin: .3em 0 .3em 1.2em; padding: 0; }
  .note { font-style: italic; }
  table { width: 100%; border-collapse: collapse; margin: .8em 0; page-break-inside: avoid; }
  td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; }
  td:first-child { width: 45%; font-weight: bold; }
  .firmas { margin-top: 3em; page-break-inside: avoid; }
  .firma { margin-top: 3.2em; width: 60%; border-top: 1px solid #000; padding-top: 4px; }
  footer { margin-top: 2em; font-size: 9pt; text-align: center; color: #333; }
</style></head><body>
<header>
  <p><strong>TRABAJO DE GRADO II</strong></p>
  <p>Evaluación de accesibilidad de VisionNav — Consentimiento informado</p>
  <p>Universidad del Valle · Facultad de Ingeniería · Escuela de Ingeniería de Sistemas y Computación</p>
</header>
<h1>${esc(TRABAJO_TITULO)}</h1>
<p style="text-align:center">Investigador responsable: Brayan Julio Gomez Muñoz (202310016-3743) · brayan.julio.gomez2646@correounivalle.edu.co</p>
<p style="text-align:center"><strong>${esc(doc.titulo)}</strong> · ${esc(doc.version)}</p>
${cuerpo.map(blockHtml).join('\n')}
<table>
  <tr><td>Nombre completo del participante</td><td>${v(acta?.nombre)}</td></tr>
  <tr><td>Código de participante</td><td>${v(acta?.codigo)}</td></tr>
  <tr><td>Lugar y fecha</td><td>${acta ? esc([acta.lugar, acta.fecha].filter(Boolean).join(', ')) || '&nbsp;' : '&nbsp;'}</td></tr>
  <tr><td>Consentimiento para participar</td><td>${sino(acta?.participar)}</td></tr>
  <tr><td>Autorización de grabación de audio</td><td>${sino(acta?.grabacion)}</td></tr>
  <tr><td>Autorización para uso académico de respuestas y observaciones</td><td>${sino(acta?.usoAcademico)}</td></tr>
</table>
${acta ? '<p>Constancia: el documento fue leído en voz alta en su totalidad y el participante manifestó verbalmente su decisión. La lectura quedó grabada en audio.</p>' : ''}
<div class="firmas">
  <div class="firma">Firma del investigador responsable</div>
  ${doc.testigo ? '<div class="firma">Firma de testigo, si corresponde</div>' : ''}
</div>
<footer>Consentimiento informado – VisionNav – Trabajo de Grado II · ${esc(doc.version)}</footer>
</body></html>`
}

/**
 * Imprime el acta (el diálogo del navegador permite «Guardar como PDF»). Usa un iframe
 * oculto en vez de una ventana nueva: no lo bloquean los bloqueadores de ventanas emergentes.
 */
export function printConsent(doc: ConsentDocument, acta: ActaData | null): boolean {
  try {
    const frame = document.createElement('iframe')
    frame.setAttribute('aria-hidden', 'true')
    frame.tabIndex = -1
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
    document.body.appendChild(frame)
    const w = frame.contentWindow
    if (!w) return false
    w.document.open()
    w.document.write(consentHtml(doc, acta))
    w.document.close()
    // Se retira después de imprimir (afterprint) o, como respaldo, al minuto.
    const remove = () => frame.remove()
    w.addEventListener('afterprint', remove)
    setTimeout(remove, 60_000)
    setTimeout(() => {
      w.focus()
      w.print()
    }, 250)
    return true
  } catch {
    return false
  }
}
