'use client'

import { useState, useEffect, useCallback } from 'react'

interface ApiConfig {
  baseUrl: string
  confidenceThreshold: number
}

// Environment variable takes priority, otherwise use default
const getDefaultBaseUrl = () => {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }
  return 'http://127.0.0.1:8000'
}

const DEFAULT_CONFIG: ApiConfig = {
  baseUrl: getDefaultBaseUrl(),
  confidenceThreshold: 0.35,
}

const STORAGE_KEY = 'visionnav-config'

export function useApiConfig() {
  const [config, setConfig] = useState<ApiConfig>(DEFAULT_CONFIG)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // If env var is set, use it and ignore localStorage for baseUrl
    const envUrl = process.env.NEXT_PUBLIC_API_URL

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setConfig({
          ...DEFAULT_CONFIG,
          ...parsed,
          // Environment variable always takes priority for baseUrl
          baseUrl: envUrl || parsed.baseUrl || DEFAULT_CONFIG.baseUrl,
        })
      } else if (envUrl) {
        setConfig(prev => ({ ...prev, baseUrl: envUrl }))
      }
    } catch {
      // Use defaults on error
    }
    setIsLoaded(true)
  }, [])

  const updateConfig = useCallback((updates: Partial<ApiConfig>) => {
    setConfig(prev => {
      const newConfig = { ...prev, ...updates }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig))
      } catch {
        // Ignore storage errors
      }
      return newConfig
    })
  }, [])

  const resetConfig = useCallback(() => {
    const defaultUrl = getDefaultBaseUrl()
    const resetTo = {
      baseUrl: defaultUrl,
      confidenceThreshold: 0.35,
    }
    setConfig(resetTo)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore storage errors
    }
  }, [])

  // Check if URL is from environment (to disable editing in UI)
  const isEnvUrl = Boolean(process.env.NEXT_PUBLIC_API_URL)

  return {
    config,
    isLoaded,
    isEnvUrl,
    updateConfig,
    resetConfig,
  }
}
