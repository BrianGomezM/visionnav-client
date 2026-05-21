'use client'

import { useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PipelineStepProps {
  stepNumber: number
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  delay?: number
}

export function PipelineStep({
  stepNumber,
  title,
  children,
  defaultOpen = false,
  delay = 0,
}: PipelineStepProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div
      className="rounded-xl border border-border bg-card overflow-hidden animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
        aria-expanded={isOpen}
        aria-controls={`step-${stepNumber}-content`}
      >
        {/* Step number badge */}
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 text-sm font-semibold text-zinc-700 dark:text-zinc-200 shrink-0">
          {stepNumber}
        </span>

        {/* Title */}
        <span className="flex-1 font-medium text-foreground">
          Paso {stepNumber} — {title}
        </span>

        {/* Status badge */}
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#E1F5EE] text-[#0F6E56]">
          <Check className="w-3 h-3" aria-hidden="true" />
          completado
        </span>

        {/* Chevron */}
        <ChevronDown
          className={cn(
            'w-5 h-5 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>

      {/* Content */}
      <div
        id={`step-${stepNumber}-content`}
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-4 pb-4 pt-0 border-t border-border">
          <div className="pt-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
