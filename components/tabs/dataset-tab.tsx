'use client'

import { useState, useCallback } from 'react'
import {
  Database,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Copy,
  ChevronRight,
  Layers,
  Tag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ErrorCard } from '@/components/shared/error-card'
import { ImageUploader } from '@/components/shared/image-uploader'
import {
  useDatasetStats,
  useFinetuneStatus,
  useDatasetUpload,
  useFinetunePrepare,
} from '@/hooks/use-dataset'

interface DatasetTabProps {
  baseUrl: string
  isActive: boolean
}

/** Lista de tipos de escena disponibles según el backend. */
const SCENE_TYPES = [
  'sala de estar',
  'cocina',
  'dormitorio',
  'baño',
  'oficina',
  'pasillo',
  'exterior',
  'mercado',
  'escaleras',
  'otro',
]

/**
 * Pestaña de Dataset y Fine-tuning — permite subir imágenes al dataset
 * acumulativo, ver estadísticas y preparar el dataset para fine-tuning YOLO.
 *
 * Endpoints:
 *   POST /api/dataset/upload    — subir imagen al dataset
 *   GET  /api/dataset/stats     — estadísticas del dataset
 *   POST /api/finetune/prepare  — preparar dataset en formato YOLO
 *   GET  /api/finetune/status   — estado del fine-tuning
 */
export function DatasetTab({ baseUrl, isActive }: DatasetTabProps) {
  const stats = useDatasetStats(baseUrl, isActive)
  const ftStatus = useFinetuneStatus(baseUrl, isActive)
  const uploadHook = useDatasetUpload(baseUrl)
  const prepareHook = useFinetunePrepare(baseUrl)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [sceneType, setSceneType] = useState('sala de estar')
  const [autoLabel, setAutoLabel] = useState(true)
  const [copiedCmd, setCopiedCmd] = useState(false)

  const handleFileSelect = useCallback(
    (file: File | null) => {
      setSelectedFile(file)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(file ? URL.createObjectURL(file) : null)
      uploadHook.reset()
    },
    [previewUrl, uploadHook]
  )

  const handleUpload = async () => {
    if (!selectedFile) return
    const result = await uploadHook.upload(selectedFile, sceneType, autoLabel)
    if (result) {
      stats.refresh()
      setSelectedFile(null)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }
    }
  }

  const handlePrepare = async () => {
    const result = await prepareHook.prepare(0.8, 10)
    if (result) ftStatus.refresh()
  }

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd).then(() => {
      setCopiedCmd(true)
      setTimeout(() => setCopiedCmd(false), 2000)
    })
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div>
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Database className="w-5 h-5 text-[#0EA5E9]" />
          Dataset y Fine-tuning
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Acumula imágenes etiquetadas automáticamente por YOLO para fine-tuning
          del modelo en el dominio específico del proyecto.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Panel izquierdo: Subir imagen ── */}
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="font-medium text-foreground mb-1 flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#0EA5E9]" />
              Subir imagen al dataset
            </h3>
            <p className="text-xs text-muted-foreground mb-5">
              La imagen se guardará y se etiquetará automáticamente con YOLO26s si
              «Auto-etiquetar» está activado.
            </p>

            <ImageUploader
              selectedFile={selectedFile}
              previewUrl={previewUrl}
              onFileSelect={handleFileSelect}
              isDisabled={uploadHook.isLoading}
              className="mb-4"
            />

            {/* Tipo de escena */}
            <div className="mb-4">
              <label
                htmlFor="scene-type"
                className="text-sm font-medium text-foreground block mb-1.5"
              >
                Tipo de escena
              </label>
              <select
                id="scene-type"
                value={sceneType}
                onChange={(e) => setSceneType(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
              >
                {SCENE_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-etiquetar toggle */}
            <label className="flex items-center gap-3 mb-5 cursor-pointer select-none">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={autoLabel}
                  onChange={(e) => setAutoLabel(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-10 h-5 rounded-full transition-colors ${
                    autoLabel ? 'bg-[#0EA5E9]' : 'bg-muted'
                  }`}
                />
                <div
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    autoLabel ? 'translate-x-5' : ''
                  }`}
                />
              </div>
              <span className="text-sm text-foreground">
                Auto-etiquetar con YOLO26s
              </span>
            </label>

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadHook.isLoading}
              className="w-full gap-2"
              style={{ backgroundColor: '#0EA5E9' }}
            >
              {uploadHook.isLoading ? (
                <>
                  <Spinner className="w-4 h-4" />
                  Subiendo y etiquetando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Subir al dataset
                </>
              )}
            </Button>

            {uploadHook.error && (
              <div className="mt-3">
                <ErrorCard message={uploadHook.error} />
              </div>
            )}

            {/* Resultado de upload */}
            {uploadHook.result && (
              <div
                className={`mt-3 p-4 rounded-lg border ${
                  uploadHook.result.status === 'stored'
                    ? 'border-[#1D9E75] bg-[#E1F5EE]'
                    : 'border-[#BA7517] bg-[#FAEEDA]'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {uploadHook.result.status === 'stored' ? (
                    <CheckCircle2 className="w-4 h-4 text-[#0F6E56]" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-[#BA7517]" />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      uploadHook.result.status === 'stored'
                        ? 'text-[#0F6E56]'
                        : 'text-[#BA7517]'
                    }`}
                  >
                    {uploadHook.result.status === 'stored'
                      ? '¡Imagen guardada exitosamente!'
                      : 'Imagen duplicada — ya existe en el dataset'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  ID: <code className="font-mono">{uploadHook.result.id}</code>
                  {' · '}
                  {uploadHook.result.objects_found} objeto
                  {uploadHook.result.objects_found !== 1 ? 's' : ''} detectado
                  {uploadHook.result.objects_found !== 1 ? 's' : ''}
                </p>
                {uploadHook.result.objects.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {uploadHook.result.objects.map((obj, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded text-xs bg-white/60 text-[#0F6E56]"
                      >
                        {obj.label} ({(obj.confidence * 100).toFixed(0)}%)
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Panel derecho: Estadísticas y Fine-tuning ── */}
        <div className="space-y-5">
          {/* Estadísticas del dataset */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#0EA5E9]" />
                Estadísticas del dataset
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={stats.refresh}
                disabled={stats.isLoading}
                className="gap-1 h-7 px-2 text-xs"
              >
                <RefreshCw className={`w-3 h-3 ${stats.isLoading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>

            {stats.isLoading && !stats.data && (
              <div className="flex justify-center py-8">
                <Spinner className="w-6 h-6 text-[#0EA5E9]" />
              </div>
            )}

            {stats.error && <ErrorCard message={stats.error} />}

            {stats.data && (
              <>
                {stats.data.total_images === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Dataset vacío. Sube imágenes para comenzar a acumular datos.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 rounded-lg bg-muted/40">
                        <p className="text-2xl font-bold text-foreground">
                          {stats.data.total_images}
                        </p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                      <div className="p-3 rounded-lg bg-[#E1F5EE]">
                        <p className="text-2xl font-bold text-[#0F6E56]">
                          {stats.data.labeled_images}
                        </p>
                        <p className="text-xs text-[#0F6E56]">Etiquetadas</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/40">
                        <p className="text-2xl font-bold text-foreground">
                          {stats.data.total_objects ?? 0}
                        </p>
                        <p className="text-xs text-muted-foreground">Objetos</p>
                      </div>
                    </div>

                    {/* Barra de progreso hacia fine-tuning */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">
                          Progreso para fine-tuning
                        </span>
                        <span className="text-foreground font-medium">
                          {stats.data.labeled_images} / {stats.data.finetune_min_images}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min(
                              (stats.data.labeled_images / stats.data.finetune_min_images) * 100,
                              100
                            )}%`,
                            backgroundColor: stats.data.finetune_ready ? '#1D9E75' : '#0EA5E9',
                          }}
                        />
                      </div>
                    </div>

                    {/* Distribución por escena */}
                    {stats.data.by_scene_type &&
                      Object.keys(stats.data.by_scene_type).length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2 font-medium">
                            Por tipo de escena
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(stats.data.by_scene_type)
                              .sort((a, b) => b[1] - a[1])
                              .map(([scene, count]) => (
                                <span
                                  key={scene}
                                  className="px-2 py-0.5 rounded-full text-xs bg-[#E0F2FE] text-[#0369A1]"
                                >
                                  {scene}: {count}
                                </span>
                              ))}
                          </div>
                        </div>
                      )}

                    {/* Clases más frecuentes */}
                    {stats.data.top_classes &&
                      Object.keys(stats.data.top_classes).length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2 font-medium flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            Clases más frecuentes
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(stats.data.top_classes)
                              .slice(0, 10)
                              .map(([cls, count]) => (
                                <span
                                  key={cls}
                                  className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground"
                                >
                                  {cls} ({count})
                                </span>
                              ))}
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Panel de Fine-tuning */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-[#0EA5E9]" />
              Fine-tuning YOLO26s
            </h3>

            {/* Estado actual */}
            {ftStatus.data && (
              <div className="mb-4">
                {ftStatus.data.status === 'ready' ? (
                  <div className="p-3 rounded-lg bg-[#E1F5EE] border border-[#1D9E75]/30 space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0F6E56]" />
                      <span className="text-sm font-medium text-[#0F6E56]">
                        Dataset preparado
                      </span>
                    </div>
                    <div className="text-xs text-[#0F6E56]/80 space-y-1">
                      <p>
                        Entrenamiento: {ftStatus.data.train_images} imgs · Validación:{' '}
                        {ftStatus.data.val_images} imgs
                      </p>
                      {ftStatus.data.comando_yolo && (
                        <div className="mt-2">
                          <p className="font-medium mb-1">Comando para entrenar:</p>
                          <div className="flex items-start gap-2">
                            <code className="flex-1 block bg-white/60 px-2 py-1 rounded text-xs font-mono break-all">
                              {ftStatus.data.comando_yolo}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyCommand(ftStatus.data!.comando_yolo!)}
                              className="shrink-0 h-7 w-7"
                              title="Copiar comando"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          {copiedCmd && (
                            <p className="text-xs text-[#1D9E75] mt-1">¡Comando copiado!</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-muted/40 text-sm text-muted-foreground">
                    {ftStatus.data.message}
                  </div>
                )}
              </div>
            )}

            {/* Botón de preparar */}
            <Button
              onClick={handlePrepare}
              disabled={
                prepareHook.isLoading ||
                !stats.data ||
                stats.data.labeled_images < 10
              }
              variant="outline"
              className="w-full gap-2 border-[#0EA5E9] text-[#0EA5E9] hover:bg-[#E0F2FE]"
            >
              {prepareHook.isLoading ? (
                <>
                  <Spinner className="w-4 h-4" />
                  Preparando dataset...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Preparar para fine-tuning
                </>
              )}
            </Button>

            {stats.data && stats.data.labeled_images < 10 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Se necesitan mínimo 10 imágenes etiquetadas (actualmente{' '}
                {stats.data.labeled_images}).
              </p>
            )}

            {prepareHook.error && (
              <div className="mt-3">
                <ErrorCard message={prepareHook.error} />
              </div>
            )}

            {prepareHook.result?.status === 'ready' && (
              <div className="mt-3 p-3 rounded-lg bg-[#E1F5EE] text-sm text-[#0F6E56]">
                <CheckCircle2 className="inline w-4 h-4 mr-1" />
                Dataset preparado: {prepareHook.result.train_images} train ·{' '}
                {prepareHook.result.val_images} val ·{' '}
                {prepareHook.result.total_classes} clases
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
