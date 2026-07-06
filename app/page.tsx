'use client'

import { useState, useCallback, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Header, type Tab } from '@/components/layout/header'
import { SettingsPanel } from '@/components/layout/settings-panel'
import { DetectTab } from '@/components/tabs/detect-tab'
import { DebugTab } from '@/components/tabs/debug-tab'
import { HealthTab } from '@/components/tabs/health-tab'
import { MetricsTab } from '@/components/tabs/metrics-tab'
import { DatasetTab } from '@/components/tabs/dataset-tab'
import { TestingTab } from '@/components/tabs/testing-tab'
import { FeedbackTab } from '@/components/tabs/feedback-tab'
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

/** Pestañas que requieren confirmación antes de cambiar si tienen datos activos. */
const TABS_WITH_DATA: Tab[] = ['detect', 'debug']

export default function VisionNavApp() {
  const [activeTab, setActiveTab] = useState<Tab>('detect')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Rastrea si las pestañas con estado mutable tienen datos sin guardar
  const detectHasData = useRef(false)
  const debugHasData = useRef(false)
  const pendingTab = useRef<Tab | null>(null)

  const { config, isLoaded, isEnvUrl, updateConfig, resetConfig } = useApiConfig()

  const handleTabChangeRequest = useCallback(
    (tab: Tab) => {
      if (tab === activeTab) return

      const currentHasData =
        (activeTab === 'detect' && detectHasData.current) ||
        (activeTab === 'debug' && debugHasData.current)

      if (currentHasData && TABS_WITH_DATA.includes(activeTab)) {
        pendingTab.current = tab
        setShowConfirm(true)
      } else {
        setActiveTab(tab)
      }
    },
    [activeTab]
  )

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
      {/* ── Encabezado con navegación por pestañas ── */}
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChangeRequest}
        onSettingsClick={() => setIsSettingsOpen(!isSettingsOpen)}
        isSettingsOpen={isSettingsOpen}
      />

      {/* ── Panel de configuración deslizante ── */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        baseUrl={config.baseUrl}
        confidenceThreshold={config.confidenceThreshold}
        isEnvUrl={isEnvUrl}
        onBaseUrlChange={(url) => updateConfig({ baseUrl: url })}
        onThresholdChange={(threshold) => updateConfig({ confidenceThreshold: threshold })}
        onReset={resetConfig}
      />

      {/* ── Contenido principal ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Detectar — POST /api/detect */}
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

        {/* Pipeline / Debug — POST /api/debug-detect */}
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

        {/* Estado del servicio — GET /api/health */}
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

        {/* Métricas — GET /api/metrics/summary, /api/metrics/latency, /api/metrics */}
        <div
          id="metrics-panel"
          role="tabpanel"
          aria-labelledby="metrics-tab"
          hidden={activeTab !== 'metrics'}
        >
          <MetricsTab
            baseUrl={config.baseUrl}
            isActive={activeTab === 'metrics'}
          />
        </div>

        {/* Dataset y Fine-tuning — POST /api/dataset/upload, GET /api/dataset/stats
            POST /api/finetune/prepare, GET /api/finetune/status */}
        <div
          id="dataset-panel"
          role="tabpanel"
          aria-labelledby="dataset-tab"
          hidden={activeTab !== 'dataset'}
        >
          <DatasetTab
            baseUrl={config.baseUrl}
            isActive={activeTab === 'dataset'}
          />
        </div>

        {/* Pruebas — POST /api/test/functional, POST /api/test/load, GET /api/test/results */}
        <div
          id="testing-panel"
          role="tabpanel"
          aria-labelledby="testing-tab"
          hidden={activeTab !== 'testing'}
        >
          <TestingTab
            baseUrl={config.baseUrl}
            isActive={activeTab === 'testing'}
          />
        </div>

        {/* Feedback — POST /api/feedback, GET /api/feedback */}
        <div
          id="feedback-panel"
          role="tabpanel"
          aria-labelledby="feedback-tab"
          hidden={activeTab !== 'feedback'}
        >
          <FeedbackTab
            baseUrl={config.baseUrl}
            isActive={activeTab === 'feedback'}
          />
        </div>
      </main>

      {/* ── Pie de página ── */}
      <footer className="border-t border-border py-6 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">VisionNav</p>
          <p className="text-xs mt-1">
            Sistema de navegación visual asistida para personas con discapacidad visual ·{' '}
            <span className="text-[#1D9E75]">Trabajo de Grado</span>
          </p>
          <p className="text-xs mt-1 opacity-60">
            API v3.2.0 · YOLO26s + Groq LLM + Google TTS
          </p>
        </div>
      </footer>

      {/* ── Diálogo de confirmación al cambiar de pestaña con datos activos ── */}
      <AlertDialog
        open={showConfirm}
        onOpenChange={(open) => !open && handleCancelSwitch()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <AlertDialogTitle>¿Cambiar de pestaña?</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Tienes una imagen cargada o resultados en esta pestaña. Si cambias,
              se perderá la información actual y deberás comenzar de nuevo.
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
