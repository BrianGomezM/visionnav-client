'use client'

import {
  Eye,
  Settings,
  Sun,
  Moon,
  Scan,
  Bug,
  Activity,
  BarChart2,
  Rocket,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

export type Tab =
  | 'detect'
  | 'debug'
  | 'health'
  | 'metrics'
  | 'dataset'
  | 'study'

interface HeaderProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  onSettingsClick: () => void
  isSettingsOpen: boolean
}

const tabs: {
  id: Tab
  label: string
  Icon: React.ElementType
  tooltip: string
  color?: string
  activeBg?: string
  activeText?: string
}[] = [
  {
    id: 'detect',
    label: 'Detectar',
    Icon: Scan,
    tooltip: 'Analiza una imagen y genera una descripción auditiva egocéntrica para navegación asistida',
    activeBg: 'bg-[#E1F5EE]',
    activeText: 'text-[#0F6E56]',
  },
  {
    id: 'debug',
    label: 'Pipeline',
    Icon: Bug,
    tooltip: 'Inspecciona cada etapa del pipeline de análisis: YOLO, espacial, LLM y narrativa final',
    activeBg: 'bg-[#EEEDFE]',
    activeText: 'text-[#7F77DD]',
  },
  {
    id: 'health',
    label: 'Estado',
    Icon: Activity,
    tooltip: 'Verifica el estado de los modelos de IA: YOLO, LLM (Groq) y síntesis de voz (TTS)',
    activeBg: 'bg-[#E1F5EE]',
    activeText: 'text-[#0F6E56]',
  },
  {
    id: 'metrics',
    label: 'Métricas',
    Icon: BarChart2,
    tooltip: 'Estadísticas de producción: latencia, percentiles p50–p99, distribución de escenarios',
    activeBg: 'bg-[#E1F5EE]',
    activeText: 'text-[#0F6E56]',
  },
  {
    id: 'dataset',
    label: 'Trabajos futuros',
    Icon: Rocket,
    tooltip: 'Módulo de acumulación de dataset y fine-tuning: funcional, congelado como línea de trabajo futuro, no forma parte del alcance evaluado en esta tesis',
    activeBg: 'bg-[#E0F2FE]',
    activeText: 'text-[#0369A1]',
  },
  {
    id: 'study',
    label: 'Evaluación con usuarios',
    Icon: Users,
    tooltip: 'Sesiones de prueba con usuarios objetivo (discapacidad visual) y usuarios piloto (validación del instrumento)',
    activeBg: 'bg-[#EEEDFE]',
    activeText: 'text-[#7F77DD]',
  },
]

export function Header({
  activeTab,
  onTabChange,
  onSettingsClick,
  isSettingsOpen,
}: HeaderProps) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggleDarkMode = () => {
    const newValue = !isDark
    setIsDark(newValue)
    document.documentElement.classList.toggle('dark', newValue)
  }

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#1D9E75] text-white">
              <Eye className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="hidden sm:block">
              <span className="font-semibold text-lg text-foreground leading-none">
                VisionNav
              </span>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                Navegación visual asistida
              </p>
            </div>
          </div>

          {/* Desktop tab navigation */}
          <nav
            className="hidden lg:flex items-center gap-0.5"
            role="tablist"
            aria-label="Navegación principal"
          >
            {tabs.map(({ id, label, Icon, tooltip, activeBg, activeText }) => (
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <button
                    role="tab"
                    aria-selected={activeTab === id}
                    aria-controls={`${id}-panel`}
                    onClick={() => onTabChange(id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-150',
                      activeTab === id
                        ? cn(activeBg ?? 'bg-[#E1F5EE]', activeText ?? 'text-[#0F6E56]')
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                    {label}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[240px] text-center">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            ))}
          </nav>

          {/* Acciones */}
          <div className="flex items-center gap-1 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleDarkMode}
                  aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {isDark ? 'Modo claro' : 'Modo oscuro'}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onSettingsClick}
                  aria-label="Configuración"
                  aria-expanded={isSettingsOpen}
                  className={cn(
                    'text-muted-foreground hover:text-foreground',
                    isSettingsOpen && 'bg-muted text-foreground'
                  )}
                >
                  <Settings className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Configurar URL de la API y umbral de confianza
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Mobile/tablet tab navigation — scroll horizontal */}
        <nav
          className="lg:hidden flex items-center gap-1 pb-3 overflow-x-auto scrollbar-none"
          role="tablist"
          aria-label="Navegación principal"
        >
          {tabs.map(({ id, label, Icon, activeBg, activeText }) => (
            <button
              key={id}
              role="tab"
              aria-selected={activeTab === id}
              aria-controls={`${id}-panel`}
              onClick={() => onTabChange(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors duration-150 shrink-0',
                activeTab === id
                  ? cn(activeBg ?? 'bg-[#E1F5EE]', activeText ?? 'text-[#0F6E56]')
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}
