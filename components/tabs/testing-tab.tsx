'use client'

import { useState } from 'react'
import {
  FlaskConical,
  Play,
  RefreshCw,
  Gauge,
  CheckCircle2,
  XCircle,
  History,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ErrorCard } from '@/components/shared/error-card'
import { FunctionalCaseRow } from '@/components/testing/functional-case-row'
import { LoadStatsGrid } from '@/components/testing/load-stats-grid'
import {
  useFunctionalTests,
  useLoadTest,
  useTestResults,
  type FunctionalSuite,
  type LoadTestResult,
} from '@/hooks/use-testing'
import { cn } from '@/lib/utils'

interface TestingTabProps {
  baseUrl: string
  isActive: boolean
}

type Panel = 'functional' | 'load'

/**
 * Pestaña de Pruebas — permite ejecutar la suite de pruebas funcionales
 * automáticas y pruebas de carga parametrizables contra el servidor FastAPI.
 *
 * Endpoints:
 *   POST /api/test/functional — suite de 7 casos automatizados
 *   POST /api/test/load       — prueba de carga configurable
 *   GET  /api/test/results    — historial de resultados
 */
export function TestingTab({ baseUrl, isActive }: TestingTabProps) {
  const [panel, setPanel] = useState<Panel>('functional')

  const functional = useFunctionalTests(baseUrl)
  const loadTest = useLoadTest(baseUrl)
  const history = useTestResults(baseUrl, isActive)

  const [nRequests, setNRequests] = useState(10)
  const [concurrency, setConcurrency] = useState(3)

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-[#7F77DD]" />
            Suite de pruebas
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Pruebas funcionales automáticas y pruebas de carga para validar el
            rendimiento del sistema. El servidor FastAPI debe estar en ejecución.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={history.refresh}
          disabled={history.isLoading}
          className="gap-2 shrink-0"
        >
          <RefreshCw className={cn('w-4 h-4', history.isLoading && 'animate-spin')} />
          Actualizar historial
        </Button>
      </div>

      {/* Selector de tipo de prueba */}
      <div className="flex rounded-lg border border-border bg-muted/30 p-1 gap-1 w-fit">
        {([
          { id: 'functional', label: 'Pruebas funcionales', Icon: CheckCircle2 },
          { id: 'load', label: 'Prueba de carga', Icon: Gauge },
        ] as const).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setPanel(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-150',
              panel === id
                ? 'bg-card text-[#7F77DD] shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Panel principal ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* ── Pruebas funcionales ── */}
          {panel === 'functional' && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
              <div>
                <h3 className="font-medium text-foreground flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-[#7F77DD]" />
                  Suite de pruebas funcionales
                </h3>
                <p className="text-xs text-muted-foreground">
                  Ejecuta 7 casos predefinidos: detección básica, imagen vacía,
                  health check, comparación de umbrales, subida al dataset y más.
                  El servidor debe estar en{' '}
                  <code className="font-mono bg-muted px-1 rounded">{baseUrl}</code>.
                </p>
              </div>

              <Button
                onClick={() => functional.run(baseUrl)}
                disabled={functional.isLoading}
                className="w-full gap-2 bg-[#7F77DD] hover:bg-[#6B63C8] text-white"
              >
                {functional.isLoading ? (
                  <>
                    <Spinner className="w-4 h-4" />
                    Ejecutando suite de pruebas...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Ejecutar pruebas funcionales
                  </>
                )}
              </Button>

              {functional.error && <ErrorCard message={functional.error} />}

              {/* Resumen de resultados */}
              {functional.result && (
                <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-sm font-medium text-foreground">
                      Resultado:{' '}
                      <span
                        style={{
                          color:
                            functional.result.tasa_exito_pct === 100
                              ? '#1D9E75'
                              : functional.result.tasa_exito_pct >= 70
                              ? '#BA7517'
                              : '#E24B4A',
                        }}
                      >
                        {functional.result.tasa_exito_pct.toFixed(0)}% éxito
                      </span>
                    </span>
                    <div className="flex gap-2">
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[#E1F5EE] text-[#0F6E56]">
                        <CheckCircle2 className="w-3 h-3" />
                        {functional.result.passed} PASS
                      </span>
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[#FCEBEB] text-[#E24B4A]">
                        <XCircle className="w-3 h-3" />
                        {functional.result.failed} FAIL
                      </span>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${functional.result.tasa_exito_pct}%`,
                        backgroundColor:
                          functional.result.tasa_exito_pct === 100
                            ? '#1D9E75'
                            : functional.result.tasa_exito_pct >= 70
                            ? '#BA7517'
                            : '#E24B4A',
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tiempo total de la suite:{' '}
                    {(functional.result.tiempo_suite_ms / 1000).toFixed(1)} s
                  </p>
                </div>
              )}

              {/* Lista detallada de casos */}
              {functional.result && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">
                    Casos ejecutados ({functional.result.total})
                  </h4>
                  {functional.result.casos.map((caso) => (
                    <FunctionalCaseRow key={caso.id} caso={caso} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Prueba de carga ── */}
          {panel === 'load' && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
              <div>
                <h3 className="font-medium text-foreground flex items-center gap-2 mb-1">
                  <Gauge className="w-4 h-4 text-[#7F77DD]" />
                  Prueba de carga
                </h3>
                <p className="text-xs text-muted-foreground">
                  Envía N solicitudes simultáneas a{' '}
                  <code className="font-mono bg-muted px-1 rounded">/api/detect</code>{' '}
                  y mide latencia, throughput y tasa de éxito bajo carga concurrente.
                </p>
              </div>

              {/* Parámetros configurables */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">
                    Total de solicitudes
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={nRequests}
                    onChange={(e) => setNRequests(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7F77DD]"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Recomendado: 5–20</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">
                    Concurrencia (solicitudes paralelas)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={concurrency}
                    onChange={(e) =>
                      setConcurrency(Math.max(1, Number(e.target.value)))
                    }
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7F77DD]"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Solicitudes enviadas al mismo tiempo</p>
                </div>
              </div>

              <Button
                onClick={() => loadTest.run(nRequests, concurrency)}
                disabled={loadTest.isLoading}
                className="w-full gap-2 bg-[#7F77DD] hover:bg-[#6B63C8] text-white"
              >
                {loadTest.isLoading ? (
                  <>
                    <Spinner className="w-4 h-4" />
                    Ejecutando prueba de carga...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Iniciar prueba de carga
                  </>
                )}
              </Button>

              {loadTest.error && <ErrorCard message={loadTest.error} />}

              {loadTest.isLoading && (
                <div className="p-4 rounded-lg bg-muted/30 text-sm text-muted-foreground text-center">
                  Enviando {nRequests} solicitudes con concurrencia {concurrency}…
                  Tiempo estimado: ~{Math.ceil((nRequests / concurrency) * 8)} s
                </div>
              )}

              {/* Resultados de la prueba de carga */}
              {loadTest.result && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-foreground">
                      Resultados de la prueba
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      {new Date(loadTest.result.ejecutado).toLocaleString('es-CO')}
                    </span>
                  </div>
                  <LoadStatsGrid result={loadTest.result} />

                  {loadTest.result.errores.length > 0 && (
                    <details className="rounded-lg border border-[#FCEBEB] overflow-hidden">
                      <summary className="px-4 py-3 cursor-pointer text-sm text-[#E24B4A] bg-[#FCEBEB] hover:bg-[#FCEBEB]/80">
                        Ver errores ({loadTest.result.errores.length})
                      </summary>
                      <pre className="px-4 py-3 text-xs font-mono text-muted-foreground overflow-x-auto">
                        {JSON.stringify(loadTest.result.errores, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Historial de pruebas ── */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="font-medium text-foreground flex items-center gap-2 mb-4">
              <History className="w-4 h-4 text-[#7F77DD]" />
              Historial reciente
            </h3>

            {history.isLoading && !history.data && (
              <div className="flex justify-center py-6">
                <Spinner className="w-6 h-6 text-[#7F77DD]" />
              </div>
            )}

            {history.error && <ErrorCard message={history.error} />}

            {history.data?.count === 0 && (
              <p className="text-sm text-muted-foreground">
                Sin resultados guardados aún.
              </p>
            )}

            {history.data && history.data.count > 0 && (
              <div className="space-y-3">
                {history.data.results.slice(0, 8).map((r, idx) => {
                  const isFunctional = 'casos' in r
                  const asFunctional = r as FunctionalSuite
                  const asLoad = r as LoadTestResult

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-border bg-muted/20 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-foreground text-xs truncate">
                          {r.suite}
                        </span>
                        {isFunctional ? (
                          <span
                            className={cn(
                              'text-xs font-medium px-2 py-0.5 rounded-full shrink-0',
                              asFunctional.tasa_exito_pct === 100
                                ? 'bg-[#E1F5EE] text-[#0F6E56]'
                                : 'bg-[#FCEBEB] text-[#E24B4A]'
                            )}
                          >
                            {asFunctional.tasa_exito_pct.toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {asLoad.resultados.exitosas}/{asLoad.configuracion.n_requests}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.ejecutado).toLocaleString('es-CO')}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Nota académica */}
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Tesis:</strong> Los resultados se
              persisten en{' '}
              <code className="font-mono bg-muted px-1 rounded text-[10px]">
                test_results/test_history.jsonl
              </code>{' '}
              para análisis estadístico. Incluye los casos FUN-01 a FUN-07 definidos
              en la metodología de evaluación.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
