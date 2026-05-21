'use client'

import { useEffect, useCallback } from 'react'
import { X } from 'lucide-react'

interface ImageLightboxProps {
  src: string
  alt: string
  fileName?: string
  onClose: () => void
}

export function ImageLightbox({ src, alt, fileName, onClose }: ImageLightboxProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const handleBackdrop = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={handleBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Vista ampliada de imagen"
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/25 text-white transition-all duration-150 hover:scale-110"
        aria-label="Cerrar imagen ampliada (Escape)"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="relative animate-in zoom-in-95 duration-200">
        <img
          src={src}
          alt={alt}
          className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl ring-1 ring-white/10"
          draggable={false}
        />
        {fileName && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3 rounded-b-xl">
            <p className="text-white/90 text-sm text-center font-medium truncate">{fileName}</p>
            <p className="text-white/40 text-xs text-center mt-0.5">
              Presiona Esc · Clic fuera para cerrar
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
