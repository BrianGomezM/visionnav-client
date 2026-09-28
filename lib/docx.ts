/**
 * Generador mínimo de documentos Word (.docx) en el navegador, sin dependencias:
 * un ZIP sin compresión (método "store") con las tres partes que Word exige.
 * Se usa para descargar el consentimiento informado (lib/consent.ts) para revisión.
 * Los fragmentos [PENDIENTE …] se resaltan en amarillo.
 */
import type { ConsentBlock } from '@/lib/consent'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function runs(text: string, rPr = ''): string {
  // Separa los [PENDIENTE …] para resaltarlos.
  return text
    .split(/(\[PENDIENTE[^\]]*\])/)
    .filter(Boolean)
    .map((part) => {
      const hl = part.startsWith('[PENDIENTE') ? '<w:highlight w:val="yellow"/>' : ''
      const props = rPr || hl ? `<w:rPr>${rPr}${hl}</w:rPr>` : ''
      return `<w:r>${props}<w:t xml:space="preserve">${esc(part)}</w:t></w:r>`
    })
    .join('')
}

const para = (text: string, rPr = '', pPr = '') => `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ''}${runs(text, rPr)}</w:p>`

export function documentXml(blocks: ConsentBlock[]): string {
  const body = blocks
    .map((b) => {
      switch (b.kind) {
        case 'title':
          return para(b.text, '<w:b/><w:sz w:val="32"/>', '<w:jc w:val="center"/><w:spacing w:after="200"/>')
        case 'heading':
          return para(b.text, '<w:b/><w:sz w:val="26"/>', '<w:spacing w:before="240" w:after="80"/>')
        case 'note':
          return para(b.text, '<w:i/>', '<w:spacing w:after="160"/>')
        case 'list':
          return b.items.map((i) => para(`• ${i}`, '', '<w:ind w:left="360"/>')).join('')
        default:
          return para(b.text)
      }
    })
    .join('')
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
    body +
    '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>' +
    '</w:body></w:document>'
  )
}

const CONTENT_TYPES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
  '</Types>'

const RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
  '</Relationships>'

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(data: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** ZIP sin compresión con los archivos indicados (nombres ASCII). */
export function zipStore(files: [string, string][]): Uint8Array {
  const enc = new TextEncoder()
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  for (const [name, content] of files) {
    const nameBytes = enc.encode(name)
    const data = enc.encode(content)
    const crc = crc32(data)
    const local = new Uint8Array(30 + nameBytes.length + data.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, data.length, true)
    lv.setUint32(22, data.length, true)
    lv.setUint16(26, nameBytes.length, true)
    local.set(nameBytes, 30)
    local.set(data, 30 + nameBytes.length)
    const central = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, data.length, true)
    cv.setUint32(24, data.length, true)
    cv.setUint16(28, nameBytes.length, true)
    cv.setUint32(42, offset, true)
    central.set(nameBytes, 46)
    locals.push(local)
    centrals.push(central)
    offset += local.length
  }
  const centralSize = centrals.reduce((n, c) => n + c.length, 0)
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, files.length, true)
  ev.setUint16(10, files.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)
  const out = new Uint8Array(offset + centralSize + 22)
  let p = 0
  for (const part of [...locals, ...centrals, end]) {
    out.set(part, p)
    p += part.length
  }
  return out
}

export function buildDocx(blocks: ConsentBlock[]): Uint8Array {
  return zipStore([
    ['[Content_Types].xml', CONTENT_TYPES],
    ['_rels/.rels', RELS],
    ['word/document.xml', documentXml(blocks)],
  ])
}

/** Descarga el documento en el navegador. */
export function downloadDocx(blocks: ConsentBlock[], filename: string): void {
  const bytes = buildDocx(blocks)
  const blob = new Blob([bytes as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
