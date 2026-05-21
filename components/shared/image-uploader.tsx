'use client'

import { useCallback, useState } from 'react'
import { Upload, ImageIcon, X, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ImageLightbox } from './image-lightbox'

interface ImageUploaderProps {
  onFileSelect: (file: File | null) => void
  selectedFile: File | null
  previewUrl: string | null
  isDisabled?: boolean
  className?: string
}

export function ImageUploader({
  onFileSelect,
  selectedFile,
  previewUrl,
  isDisabled = false,
  className,
}: ImageUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!isDisabled) setIsDragOver(true)
  }, [isDisabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (isDisabled) return
    const file = e.dataTransfer.files[0]
    if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
      onFileSelect(file)
    }
  }, [isDisabled, onFileSelect])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFileSelect(file)
    e.target.value = ''
  }, [onFileSelect])

  const handleRemove = useCallback(() => {
    onFileSelect(null)
  }, [onFileSelect])

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className={cn('relative', className)}>
      {previewUrl && selectedFile ? (
        <>
          <div className="relative rounded-xl overflow-hidden border border-border bg-muted group">
            <img
              src={previewUrl}
              alt="Imagen de escena cargada para análisis"
              className="w-full h-48 object-cover cursor-zoom-in transition-transform duration-200 group-hover:scale-[1.01]"
              onClick={() => !isDisabled && setIsLightboxOpen(true)}
              title="Clic para ampliar"
            />
            {/* Maximize button — visible on hover */}
            <button
              onClick={() => setIsLightboxOpen(true)}
              disabled={isDisabled}
              className="absolute top-2 left-2 p-1.5 rounded-full bg-black/35 hover:bg-black/60 text-white transition-all duration-150 opacity-0 group-hover:opacity-100 disabled:hidden"
              aria-label="Ver imagen en pantalla completa"
              title="Ampliar imagen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/70 to-transparent p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-white text-sm min-w-0">
                  <ImageIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{selectedFile.name}</span>
                  <span className="px-2 py-0.5 bg-white/20 rounded text-xs shrink-0">
                    {formatFileSize(selectedFile.size)}
                  </span>
                </div>
                <button
                  onClick={handleRemove}
                  disabled={isDisabled}
                  className="p-1.5 rounded-full bg-white/20 hover:bg-red-500/70 text-white transition-colors disabled:opacity-50 shrink-0"
                  aria-label="Eliminar imagen seleccionada"
                  title="Quitar imagen"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          {isLightboxOpen && (
            <ImageLightbox
              src={previewUrl}
              alt="Imagen de escena cargada"
              fileName={selectedFile.name}
              onClose={() => setIsLightboxOpen(false)}
            />
          )}
        </>
      ) : (
        <label
          className={cn(
            'flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer',
            isDragOver
              ? 'border-[#1D9E75] bg-[#E1F5EE] scale-[1.01]'
              : 'border-border hover:border-[#1D9E75] hover:bg-[#E1F5EE]/30',
            isDisabled && 'opacity-50 cursor-not-allowed'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleFileInput}
            disabled={isDisabled}
            className="sr-only"
            aria-label="Seleccionar imagen para análisis"
          />
          <Upload
            className={cn(
              'w-10 h-10 mb-3 transition-colors duration-200',
              isDragOver ? 'text-[#1D9E75]' : 'text-muted-foreground'
            )}
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-foreground mb-1">
            Arrastra una imagen o haz clic para seleccionar
          </p>
          <p className="text-xs text-muted-foreground">
            JPEG o PNG admitidos
          </p>
        </label>
      )}
    </div>
  )
}
