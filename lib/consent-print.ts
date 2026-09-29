/**
 * Consentimiento y acta (§13) para imprimir o guardar en PDF desde el navegador, con la
 * MISMA estructura que los documentos del investigador (Consentimiento_informado_VisionNav_
 * Personas_{Piloto,Objetivo}): carta, márgenes 4 cm arriba y 2,5 cm en los lados, Times New
 * Roman 12 con interlineado doble y sangría de 1,27 cm, encabezado con el logo de la
 * Universidad del Valle y pie en todas las páginas, portada, secciones 1–12 y §13 en página
 * aparte. El nombre del participante se escribe SOLO en esta hoja: no se envía al servidor.
 */

import type { ActaData, ConsentBlock, ConsentDocument } from '@/lib/consent'
import { TRABAJO_TITULO } from '@/lib/consent'

export const LOGO_PATH = '/consentimientos/logo-univalle.png'
const FOOTER = 'Consentimiento informado – VisionNav – Trabajo de Grado II'

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const box = (v: boolean | null | undefined, yes: boolean) => (v === yes ? '☒' : '☐')
const sino = (v: boolean | null | undefined) => `Sí ${box(v, true)}&nbsp;&nbsp;&nbsp; No ${box(v, false)}`

function blockHtml(b: ConsentBlock): string {
  if (b.kind === 'list') return `<ul>${b.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`
  // Como en el documento original, el §12 (consentimiento verbal) empieza en página nueva.
  if (b.kind === 'heading' || b.kind === 'title')
    return `<h2${b.text.startsWith('12.') ? ' class="brk"' : ''}>${esc(b.text)}</h2>`
  return `<p>${esc(b.text)}</p>`
}

/** HTML del documento completo con el acta (en blanco si `acta` es null). */
export function consentHtml(doc: ConsentDocument, acta: ActaData | null, logoUrl: string = LOGO_PATH): string {
  // Portada aparte; §13 se arma con la tabla del documento original.
  const cuerpo: ConsentBlock[] = []
  for (const b of doc.bloques) {
    if ((b.kind === 'heading' || b.kind === 'title') && b.text.startsWith('13.')) break
    if (b.kind === 'paragraph' && /^(Trabajo de Grado:|Investigador responsable:)/.test(b.text)) continue
    cuerpo.push(b)
  }
  const v = (s: string | undefined) => (acta && s ? esc(s) : '')
  const lugarFecha = acta ? esc([acta.lugar, acta.fecha].filter(Boolean).join(', ')) : ''
  const header = `
    <div class="hdr">
      <img class="logo" src="${esc(logoUrl)}" alt="Universidad del Valle">
      <div class="hdr-text"><strong>TRABAJO DE GRADO II</strong><br>Evaluación de accesibilidad de VisionNav<br>Consentimiento informado</div>
    </div>`
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>${esc(doc.titulo)} — ${esc(acta?.codigo ?? 'en blanco')}</title>
<style>
  @page { size: letter; margin: 1.27cm 2.5cm 1.27cm 2.5cm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #000; }
  /* Encabezado y pie repetidos en cada página (thead/tfoot se repiten al imprimir). */
  table.page { width: 100%; border-collapse: collapse; }
  table.page > thead td, table.page > tfoot td { padding: 0; }
  .hdr { display: flex; align-items: flex-start; height: 2.73cm; }
  .logo { flex: none; width: 1.75cm; height: 2.51cm; object-fit: contain; }
  .hdr-text { flex: 1; text-align: center; line-height: 1.15; margin-right: 1.75cm; }
  /* Pie: fijo al final de CADA página (Chrome repite los elementos fijos al imprimir);
     el tfoot solo reserva su espacio para que el texto no lo tape. */
  .ftr-space { height: 1.2cm; }
  .ftr { position: fixed; left: 0; right: 0; bottom: 0; text-align: center; font-size: 9pt; }
  .content { line-height: 2; }
  .cover { text-align: center; page-break-after: always; }
  .cover p { text-indent: 0; margin: 0; text-align: center; }
  .cover .bold { font-weight: bold; }
  .cover .gap { height: 2em; }
  .cover .gap-lg { height: 7em; }
  .cover a { color: #1155CC; }
  h2 { font-size: 12pt; font-weight: bold; margin: 0.4em 0 0; line-height: 2; }
  p { margin: 0; text-indent: 1.27cm; text-align: left; }
  ul { margin: 0; padding-left: 0.63cm; list-style: none; }
  ul li { position: relative; padding-left: 0.63cm; }
  ul li::before { content: '●'; position: absolute; left: -0.1cm; font-size: 10pt; }
  .s13, h2.brk { page-break-before: always; break-before: page; }
  ul { break-inside: avoid; }
  table.acta { width: 100%; border-collapse: collapse; margin: 0.6em 0 1em; line-height: 2; page-break-inside: avoid; }
  table.acta td { border: 1px solid #000; padding: 0 0.19cm; vertical-align: top; }
  table.acta td:first-child { width: 43%; font-weight: bold; }
  .firma { margin-top: 5em; margin-left: 1.27cm; width: 11cm; border-top: 1px solid #000; }
  .firma-label { margin-left: 1.27cm; text-indent: 0; }
</style></head><body>
<table class="page">
  <thead><tr><td>${header}</td></tr></thead>
  <tfoot><tr><td><div class="ftr-space"></div></td></tr></tfoot>
  <tbody><tr><td><div class="content">
    <div class="cover">
      <div class="gap"></div>
      <p class="bold">Trabajo de Grado</p>
      <p class="bold">${esc(TRABAJO_TITULO)}</p>
      <div class="gap"></div>
      <p class="bold">Investigador responsable:</p>
      <p>Brayan Julio Gomez Muñoz</p>
      <p>202310016-3743</p>
      <p><a href="mailto:brayan.julio.gomez2646@correounivalle.edu.co">brayan.julio.gomez2646@correounivalle.edu.co</a></p>
      <div class="gap-lg"></div>
      <p>Institución: Universidad del Valle</p>
      <p>Facultad de Ingeniería</p>
      <p>Escuela de Ingeniería de Sistemas y Computación</p>
      <p>Programa de Ingeniería de Sistemas</p>
    </div>
    ${cuerpo.map(blockHtml).join('\n')}
    <div class="s13">
      <h2>13. Registro del consentimiento</h2>
      <table class="acta">
        <tr><td>Nombre completo del participante</td><td>${v(acta?.nombre)}</td></tr>
        <tr><td>Código de participante</td><td>${v(acta?.codigo)}</td></tr>
        <tr><td>Lugar y fecha</td><td>${lugarFecha}</td></tr>
        <tr><td>Consentimiento para participar</td><td>${sino(acta?.participar)}</td></tr>
        <tr><td>Autorización de grabación de audio</td><td>${sino(acta?.grabacion)}</td></tr>
        <tr><td>Autorización para uso académico de respuestas y observaciones</td><td>${sino(acta?.usoAcademico)}</td></tr>
      </table>
      <p>Si el consentimiento se obtiene verbalmente, el investigador registrará la respuesta del participante y dejará constancia de que el documento fue leído en voz alta y de que el participante manifestó su decisión.</p>
      <div class="firma"></div>
      <p class="firma-label">Firma del investigador responsable:</p>
    </div>
  </div></td></tr></tbody>
</table>
<div class="ftr">${esc(FOOTER)}</div>
</body></html>`
}

/**
 * Imprime el documento (el diálogo del navegador permite «Guardar como PDF»). Usa un iframe
 * oculto en vez de una ventana nueva: no lo bloquean los bloqueadores de ventanas emergentes.
 * Espera a que cargue el logo antes de imprimir.
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
    w.document.write(consentHtml(doc, acta, `${window.location.origin}${LOGO_PATH}`))
    w.document.close()
    const remove = () => frame.remove()
    w.addEventListener('afterprint', remove)
    setTimeout(remove, 120_000)
    let printed = false
    const go = () => {
      if (printed) return
      printed = true
      w.focus()
      w.print()
    }
    const img = w.document.querySelector('img')
    if (img && !img.complete) {
      img.addEventListener('load', go)
      img.addEventListener('error', go)
      setTimeout(go, 3000) // respaldo si el evento no llega
    } else setTimeout(go, 250)
    return true
  } catch {
    return false
  }
}
