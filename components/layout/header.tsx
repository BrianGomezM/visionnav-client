'use client'

import { Eye, Settings, Sun, Moon, Scan, Bug, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

type Tab = 'detect' | 'debug' | 'health'

interface HeaderProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  onSettingsClick: () => void
  isSettingsOpen: boolean
}

const tabs = [
  {
    id: 'detect' as const,
    label: 'Detectar',
    Icon: Scan,
    tooltip: 'Analiza una imagen y genera una descripción auditiva de la escena para navegación asistida',
  },
  {
    id: 'debug' as const,
    label: 'Pipeline',
    Icon: Bug,
    tooltip: 'Inspecciona cada etapa del proceso de análisis con métricas y datos detallados de cada paso',
  },
  {
    id: 'health' as const,
    label: 'Estado',
    Icon: Activity,
    tooltip: 'Verifica el estado de los modelos de IA: detección de objetos, LLM y síntesis de voz',
  },
]

export function Header({ activeTab, onTabChange, onSettingsClick, isSettingsOpen }: HeaderProps) {
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
            <span className="font-semibold text-lg text-foreground">VisionNav</span>
          </div>

          {/* Desktop tab navigation */}
          <nav
            className="hidden sm:flex items-center gap-1"
            role="tablist"
            aria-label="Navegación principal"
          >
            {tabs.map(({ id, label, Icon, tooltip }) => (
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <button
                    role="tab"
                    aria-selected={activeTab === id}
                    aria-controls={`${id}-panel`}
                    onClick={() => onTabChange(id)}
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-150',
                      activeTab === id
                        ? 'bg-[#E1F5EE] text-[#0F6E56]'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                    {label}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[220px] text-center">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            ))}
          </nav>

          {/* Actions */}
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

        {/* Mobile tab navigation */}
        <nav
          className="sm:hidden flex items-center gap-1 pb-3 overflow-x-auto"
          role="tablist"
          aria-label="Navegación principal"
        >
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={activeTab === id}
              aria-controls={`${id}-panel`}
              onClick={() => onTabChange(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors duration-150',
                activeTab === id
                  ? 'bg-[#E1F5EE] text-[#0F6E56]'
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
