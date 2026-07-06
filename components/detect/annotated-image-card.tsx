'use client'

import { useState } from 'react'
import { ScanSearch, ZoomIn, Download, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AnnotatedImageCardProps {
  /** Información de la imagen anotada retornada por /api/detect */
  imagenAnotada: {
    disponible: boolean
    archivo: string | null
    url: string | null
    data_base64: string | null
    data_uri: string | null
  }
  /** URL base del servidor (para construir la URL completa de la imagen) */
  baseUrl: string
}

/**
 * Muestra la imagen de la escena con los bounding boxes dibujados por YOLO.
 * Permite hacer zoom (lightbox nativo) y descargar la imagen anotada.
 *
 * La imagen se muestra desde el data URI (base64) incluido en la respuesta,
 * por lo que no requiere una segunda petición al servidor.
 */
export function AnnotatedImageCard({ imagenAnotada, baseUrl }: AnnotatedImageCardProps) {
  const [expanded, setExpanded] = useState(false)

  if (!imagenAnotada.disponible || !imagenAnotada.data_uri) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-5 text-center">
        <ScanSearch className="w-8 h-8 text-muted-foreground mx-auto mb-2" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">
          Sin imagen anotada — no se detectaron objetos en la escena.
        </p>
      </div>
    )
  }

  const fullUrl = imagenAnotada.url
    ? `${baseUrl}${imagenAnotada.url}`
    : null

  const handleDownload = () => {
    if (!imagenAnotada.data_uri || !imagenAnotada.archivo) return
    const a = document.createElement('a')
    a.href = imagenAnotada.data_uri
    a.download = imagenAnotada.archivo.split('/').pop() ?? 'detection.jpg'
    a.click()
  }

  return (
    <div
      className="rounded-xl border border-border bg-card overflow-hidden shadow-sm animate-fade-in-up"
      style={{ animationDelay: '50ms' }}
    >
      {/* Encabezado */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <ScanSearch className="w-4 h-4 text-[#1D9E75]" aria-hidden="true" />
          <span className="text-sm font-medium text-foreground">
            Detecciones YOLO
          </span>
          <span className="text-xs text-muted-foreground">
            (bounding boxes)
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Abrir en nueva pestaña */}
          {fullUrl && (
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="w-7 h-7"
              title="Abrir imagen completa"
            >
              <a href={fullUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </Button>
          )}

          {/* Descargar */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="w-7 h-7"
            title="Descargar imagen anotada"
          >
            <Download className="w-3.5 h-3.5" />
          </Button>

          {/* Expandir/Contraer */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExpanded(!expanded)}
            className="w-7 h-7"
            title={expanded ? 'Contraer' : 'Expandir'}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Imagen */}
      <div
        className={`relative bg-zinc-950 transition-all duration-300 ${
          expanded ? 'max-h-[600px]' : 'max-h-64'
        } overflow-hidden`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imagenAnotada.data_uri}
          alt="Imagen de la escena con bounding boxes de detecciones YOLO"
          className={`w-full object-contain transition-all duration-300 ${
            expanded ? 'max-h-[600px]' : 'max-h-64'
          } cursor-pointer`}
          onClick={() => setExpanded(!expanded)}
          loading="lazy"
        />

        {/* Overlay de indicación cuando está contraída */}
        {!expanded && (
          <div
            className="absolute inset-0 flex items-end justify-center pb-2 pointer-events-none"
            aria-hidden="true"
          >
            <span className="px-2 py-0.5 rounded text-xs bg-black/60 text-white/80">
              Clic para expandir
            </span>
          </div>
        )}
      </div>

      {/* Leyenda de colores */}
      <div className="px-5 py-3 border-t border-border">
        <p className="text-xs text-muted-foreground mb-2 font-medium">
          Color por categoría:
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {[
            { color: '#FF4444', label: 'Peligro' },
            { color: '#44FF44', label: 'Salida / puerta' },
            { color: '#FF8C00', label: 'Obstáculo' },
            { color: '#FFD700', label: 'Superficie' },
            { color: '#00BFFF', label: 'Objeto pequeño' },
            { color: '#CC88FF', label: 'Informativo' },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1 text-xs text-muted-foreground">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
