import { Star } from 'lucide-react'

interface RatingDistributionProps {
  distribucion: Record<string, number>
  total: number
}

/**
 * Visualiza la distribución de calificaciones (1–5 estrellas)
 * con barras proporcionales al total de respuestas.
 */
export function RatingDistribution({ distribucion, total }: RatingDistributionProps) {
  return (
    <div className="space-y-2">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = distribucion[String(star)] ?? 0
        const pct = total > 0 ? (count / total) * 100 : 0

        return (
          <div key={star} className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-0.5 w-16 shrink-0">
              {Array.from({ length: star }).map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]" />
              ))}
            </div>
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-[#F59E0B] transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
          </div>
        )
      })}
    </div>
  )
}
