'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

interface ImageLightboxProps {
  src: string
  alt: string
  fileName?: string
  onClose: () => void
}

const MIN_SCALE = 1
const MAX_SCALE = 4
const SCALE_STEP = 0.5

export function ImageLightbox({ src, alt, fileName, onClose }: ImageLightboxProps) {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })

  const clamp = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value))

  const resetZoom = useCallback(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }, [])

  const zoomIn = useCallback(() => {
    setScale((s) => clamp(s + SCALE_STEP))
  }, [])

  const zoomOut = useCallback(() => {
    setScale((s) => {
      const next = clamp(s - SCALE_STEP)
      if (next === MIN_SCALE) setPosition({ x: 0, y: 0 })
      return next
    })
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === '+' || e.key === '=') zoomIn()
      else if (e.key === '-' || e.key === '_') zoomOut()
      else if (e.key === '0') resetZoom()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose, zoomIn, zoomOut, resetZoom])

  const handleBackdrop = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    if (e.deltaY < 0) zoomIn()
    else zoomOut()
  }, [zoomIn, zoomOut])

  const handleDoubleClick = useCallback(() => {
    if (scale > 1) resetZoom()
    else setScale(2)
  }, [scale, resetZoom])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLImageElement>) => {
    if (scale <= MIN_SCALE) return
    setIsDragging(true)
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [scale, position])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLImageElement>) => {
    if (!isDragging) return
    setPosition({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y })
  }, [isDragging])

  const stopDragging = useCallback(() => setIsDragging(false), [])

  const isZoomed = scale > MIN_SCALE

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={handleBackdrop}
      onWheel={handleWheel}
      role="dialog"
      aria-modal="true"
      aria-label="Vista ampliada de imagen"
    >
      {/* Barra de herramientas: zoom in/out, reset, cerrar */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10 bg-white/10 backdrop-blur rounded-full p-1.5">
        <button
          onClick={zoomOut}
          disabled={scale <= MIN_SCALE}
          className="p-2 rounded-full text-white hover:bg-white/20 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label="Quitar zoom"
          title="Quitar zoom (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-white/80 text-xs font-mono w-11 text-center tabular-nums select-none">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={zoomIn}
          disabled={scale >= MAX_SCALE}
          className="p-2 rounded-full text-white hover:bg-white/20 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label="Hacer zoom"
          title="Hacer zoom (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        {isZoomed && (
          <button
            onClick={resetZoom}
            className="p-2 rounded-full text-white hover:bg-white/20 transition-colors"
            aria-label="Restablecer zoom"
            title="Restablecer zoom (0)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
        <div className="w-px h-5 bg-white/20 mx-0.5" aria-hidden="true" />
        <button
          onClick={onClose}
          className="p-2 rounded-full text-white hover:bg-white/25 transition-colors"
          aria-label="Cerrar imagen ampliada (Escape)"
          title="Cerrar (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div
        className="relative max-w-[90vw] max-h-[85vh] overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          onDoubleClick={handleDoubleClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDragging}
          onPointerLeave={stopDragging}
          className="max-w-[90vw] max-h-[85vh] object-contain select-none"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 150ms ease-out',
            cursor: isZoomed ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
          }}
        />
        {fileName && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3 pointer-events-none">
            <p className="text-white/90 text-sm text-center font-medium truncate">{fileName}</p>
            <p className="text-white/40 text-xs text-center mt-0.5">
              Rueda del mouse o doble clic para zoom · Arrastra para mover · Esc para cerrar
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
