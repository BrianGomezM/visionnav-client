'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RatingStarsProps {
  value: number
  onChange: (value: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
}

const LABELS: Record<number, string> = {
  1: 'Muy poco útil',
  2: 'Poco útil',
  3: 'Moderadamente útil',
  4: 'Bastante útil',
  5: 'Muy útil',
}

/**
 * Selector de calificación de 1 a 5 estrellas.
 * Accesible mediante teclado. Muestra etiqueta semántica al pasar el cursor.
 */
export function RatingStars({ value, onChange, readonly = false, size = 'md' }: RatingStarsProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1" role="group" aria-label="Calificación de utilidad">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => !readonly && onChange(star)}
            disabled={readonly}
            aria-label={`${star} estrella${star > 1 ? 's' : ''} — ${LABELS[star]}`}
            className={cn(
              'transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75] rounded',
              !readonly && 'hover:scale-110 cursor-pointer',
              readonly && 'cursor-default'
            )}
          >
            <Star
              className={cn(
                sizeClasses[size],
                'transition-colors duration-150',
                star <= value
                  ? 'fill-[#F59E0B] text-[#F59E0B]'
                  : 'fill-transparent text-muted-foreground'
              )}
            />
          </button>
        ))}
      </div>
      {value > 0 && (
        <p className="text-xs text-muted-foreground">{LABELS[value]}</p>
      )}
    </div>
  )
}
