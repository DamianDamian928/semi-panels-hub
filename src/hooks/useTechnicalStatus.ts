import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchTechnicalStatus } from '../apiClient'
import type { TechnicalStatus } from '../apiClient'

export const useTechnicalStatus = (enabled: boolean) => {
  const mountedRef = useRef(true)
  const [technicalStatus, setTechnicalStatus] = useState<TechnicalStatus | null>(null)
  const [technicalStatusError, setTechnicalStatusError] = useState<string | null>(null)
  const [technicalStatusRefreshing, setTechnicalStatusRefreshing] = useState(false)
  const [technicalStatusFetchedAt, setTechnicalStatusFetchedAt] = useState<string | null>(null)

  const refreshTechnicalStatus = useCallback(async () => {
    setTechnicalStatusRefreshing(true)

    try {
      const nextStatus = await fetchTechnicalStatus()
      if (!mountedRef.current) return

      setTechnicalStatus(nextStatus)
      setTechnicalStatusFetchedAt(new Date().toISOString())
      setTechnicalStatusError(null)
    } catch {
      if (!mountedRef.current) return

      setTechnicalStatusError('Technical status API is not available. Start or restart npm run api.')
    } finally {
      if (mountedRef.current) {
        setTechnicalStatusRefreshing(false)
      }
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    void refreshTechnicalStatus()
  }, [enabled, refreshTechnicalStatus])

  return {
    technicalStatus,
    technicalStatusError,
    technicalStatusRefreshing,
    technicalStatusFetchedAt,
    refreshTechnicalStatus,
  }
}
