import { useEffect, useState } from 'react'
import { fetchStorageStatus } from '../apiClient'
import type { StorageStatusPayload } from '../apiClient'
import type { ProcessStep } from '../types'

export const useStorageStatus = (step: ProcessStep) => {
  const [storageStatus, setStorageStatus] = useState<StorageStatusPayload | null>(null)
  const [storageStatusLoading, setStorageStatusLoading] = useState(false)
  const [storageStatusError, setStorageStatusError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    setStorageStatusLoading(true)
    setStorageStatusError(null)

    fetchStorageStatus(step)
      .then((status) => {
        if (cancelled) return
        setStorageStatus(status)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setStorageStatus(null)
        setStorageStatusError(
          error instanceof Error
            ? error.message
            : 'Storage status could not be refreshed.',
        )
      })
      .finally(() => {
        if (!cancelled) setStorageStatusLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [step])

  return {
    storageStatus,
    storageStatusLoading,
    storageStatusError,
  }
}
