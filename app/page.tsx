'use client'

import { useState } from 'react'
import { Header, type Tab } from '@/components/layout/header'
import { SettingsPanel } from '@/components/layout/settings-panel'
import { DetectTab } from '@/components/tabs/detect-tab'
import { DebugTab } from '@/components/tabs/debug-tab'
import { HealthTab } from '@/components/tabs/health-tab'
import { MetricsTab } from '@/components/tabs/metrics-tab'
import { DatasetTab } from '@/components/tabs/dataset-tab'
import { StudyTab } from '@/components/tabs/study-tab'
import { useApiConfig } from '@/hooks/use-api-config'

export default function VisionNavApp() {
  const [activeTab, setActiveTab] = useState<Tab>('detect')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const { config, isLoaded, isEnvUrl, updateConfig, resetConfig } = useApiConfig()

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
        onTabChange={setActiveTab}
        onSettingsClick={() => setIsSettingsOpen(!isSettingsOpen)}
        isSettingsOpen={isSettingsOpen}
      />

      {/* ── Panel de configuración deslizante ── */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        baseUrl={config.baseUrl}
        confidenceThreshold={config.confidenceThreshold}
        ttsModel={config.ttsModel}
        isEnvUrl={isEnvUrl}
        onBaseUrlChange={(url) => updateConfig({ baseUrl: url })}
        onThresholdChange={(threshold) => updateConfig({ confidenceThreshold: threshold })}
        onTtsModelChange={(model) => updateConfig({ ttsModel: model })}
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
          <DetectTab
            baseUrl={config.baseUrl}
            confidenceThreshold={config.confidenceThreshold}
            ttsModel={config.ttsModel}
          />
        </div>

        {/* Pipeline / Debug — POST /api/debug-detect */}
        <div
          id="debug-panel"
          role="tabpanel"
          aria-labelledby="debug-tab"
          hidden={activeTab !== 'debug'}
        >
          <DebugTab
            baseUrl={config.baseUrl}
            confidenceThreshold={config.confidenceThreshold}
          />
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

        {/* Trabajos futuros (Dataset y Fine-tuning) — módulo congelado.
            POST /api/dataset/upload, GET /api/dataset/stats
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

        {/* Evaluación con usuarios — POST/GET /api/study/sessions */}
        <div
          id="study-panel"
          role="tabpanel"
          aria-labelledby="study-tab"
          hidden={activeTab !== 'study'}
        >
          <StudyTab
            baseUrl={config.baseUrl}
            confidenceThreshold={config.confidenceThreshold}
            isActive={activeTab === 'study'}
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
    </div>
  )
}
