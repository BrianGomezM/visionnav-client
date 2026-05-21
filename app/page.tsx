'use client'

import { useState, useCallback, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { SettingsPanel } from '@/components/layout/settings-panel'
import { DetectTab } from '@/components/tabs/detect-tab'
import { DebugTab } from '@/components/tabs/debug-tab'
import { HealthTab } from '@/components/tabs/health-tab'
import { useApiConfig } from '@/hooks/use-api-config'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type Tab = 'detect' | 'debug' | 'health'

export default function VisionNavApp() {
  const [activeTab, setActiveTab] = useState<Tab>('detect')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Track whether each tab has unsaved data (image or results)
  const detectHasData = useRef(false)
  const debugHasData = useRef(false)
  // pendingTab is the tab the user wants to switch to, held until confirmed
  const pendingTab = useRef<Tab | null>(null)

  const { config, isLoaded, isEnvUrl, updateConfig, resetConfig } = useApiConfig()

  const handleTabChangeRequest = useCallback((tab: Tab) => {
    if (tab === activeTab) return

    const currentHasData =
      (activeTab === 'detect' && detectHasData.current) ||
      (activeTab === 'debug' && debugHasData.current)

    if (currentHasData) {
      pendingTab.current = tab
      setShowConfirm(true)
    } else {
      setActiveTab(tab)
    }
  }, [activeTab])

  const handleConfirmSwitch = useCallback(() => {
    if (pendingTab.current) {
      setActiveTab(pendingTab.current)
      pendingTab.current = null
    }
    setShowConfirm(false)
  }, [])

  const handleCancelSwitch = useCallback(() => {
    pendingTab.current = null
    setShowConfirm(false)
  }, [])

  const onDetectHasDataChange = useCallback((hasData: boolean) => {
    detectHasData.current = hasData
  }, [])

  const onDebugHasDataChange = useCallback((hasData: boolean) => {
    debugHasData.current = hasData
  }, [])

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChangeRequest}
        onSettingsClick={() => setIsSettingsOpen(!isSettingsOpen)}
        isSettingsOpen={isSettingsOpen}
      />

      <SettingsPanel
        isOpen={isSettingsOpen}
        baseUrl={config.baseUrl}
        confidenceThreshold={config.confidenceThreshold}
        isEnvUrl={isEnvUrl}
        onBaseUrlChange={(url) => updateConfig({ baseUrl: url })}
        onThresholdChange={(threshold) => updateConfig({ confidenceThreshold: threshold })}
        onReset={resetConfig}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div
          id="detect-panel"
          role="tabpanel"
          aria-labelledby="detect-tab"
          hidden={activeTab !== 'detect'}
        >
          {activeTab === 'detect' && (
            <DetectTab
              baseUrl={config.baseUrl}
              confidenceThreshold={config.confidenceThreshold}
              onHasDataChange={onDetectHasDataChange}
            />
          )}
        </div>

        <div
          id="debug-panel"
          role="tabpanel"
          aria-labelledby="debug-tab"
          hidden={activeTab !== 'debug'}
        >
          {activeTab === 'debug' && (
            <DebugTab
              baseUrl={config.baseUrl}
              confidenceThreshold={config.confidenceThreshold}
              onHasDataChange={onDebugHasDataChange}
            />
          )}
        </div>

        <div
          id="health-panel"
          role="tabpanel"
          aria-labelledby="health-tab"
          hidden={activeTab !== 'health'}
        >
          <HealthTab
            baseUrl={config.baseUrl}
            isActive={activeTab === 'health'}
          />
        </div>
      </main>

      <footer className="border-t border-border py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-sm text-muted-foreground">
          <p>VisionNav — Interfaz de navegación visual asistida</p>
          <p className="mt-1 text-xs">Proyecto de tesis universitaria</p>
        </div>
      </footer>

      {/* Tab-switch confirmation dialog */}
      <AlertDialog open={showConfirm} onOpenChange={(open) => !open && handleCancelSwitch()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <AlertDialogTitle>¿Cambiar de pestaña?</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Tienes una imagen cargada o resultados en esta pestaña. Si cambias de
              pestaña, se perderá toda la información actual y deberás comenzar de nuevo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSwitch}>
              Quedarme aquí
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSwitch}
              className="bg-red-500 hover:bg-red-600 text-white border-0"
            >
              Cambiar y borrar datos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
