'use client'

import { useEffect, useState } from 'react'
import { getResearcherKey, KEY_CHANGE_EVENT } from '@/lib/api-client'

/**
 * Versión de la clave del investigador: cambia (con 600 ms de espera, para no
 * consultar con cada tecla del panel de ajustes) cuando se guarda o se borra la
 * clave. Se incluye en las claves de SWR para que un 401 previo se revalide.
 * Nunca expone la clave en sí: solo si hay una configurada.
 */
export function useResearcherKeyVersion(): { version: number; hasKey: boolean } {
  const [state, setState] = useState({ version: 0, hasKey: false })
  useEffect(() => {
    setState({ version: 0, hasKey: Boolean(getResearcherKey()) })
    let timer: ReturnType<typeof setTimeout> | undefined
    const onChange = () => {
      clearTimeout(timer)
      timer = setTimeout(() => setState((s) => ({ version: s.version + 1, hasKey: Boolean(getResearcherKey()) })), 600)
    }
    window.addEventListener(KEY_CHANGE_EVENT, onChange)
    return () => {
      clearTimeout(timer)
      window.removeEventListener(KEY_CHANGE_EVENT, onChange)
    }
  }, [])
  return state
}
