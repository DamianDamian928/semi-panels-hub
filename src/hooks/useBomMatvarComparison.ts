import { useEffect, useState } from 'react'
import { fetchBomMatvarComparison } from '../apiClient'
import type { BomMatvarComparisonPayload } from '../apiClient'

const isBomMatvarComparisonPayload = (value: unknown): value is BomMatvarComparisonPayload =>
  Boolean(
    value &&
    typeof value === 'object' &&
    (value as Partial<BomMatvarComparisonPayload>).targetId === 'bom-matvar' &&
    (value as Partial<BomMatvarComparisonPayload>).review &&
    Array.isArray((value as Partial<BomMatvarComparisonPayload>).rules),
  )

const loadBomMatvarComparison = async (reviewId: string) => {
  const payload = await fetchBomMatvarComparison(reviewId)

  if (!isBomMatvarComparisonPayload(payload)) {
    throw new Error('BOM Matvar comparison endpoint returned an unexpected payload. Restart the API server and refresh.')
  }

  return payload
}

export const useBomMatvarComparison = (
  reviewId: string,
  enabled: boolean,
  refreshKey = 0,
  inputSignature = '',
) => {
  const [comparison, setComparison] = useState<BomMatvarComparisonPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true)
    setError(null)

    try {
      setComparison(await loadBomMatvarComparison(reviewId))
    } catch (requestError: unknown) {
      setComparison(null)
      setError(requestError instanceof Error ? requestError.message : 'BOM Matvar comparison could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    setLoading(true)
    setError(null)

    loadBomMatvarComparison(reviewId)
      .then((payload) => {
        if (!cancelled) setComparison(payload)
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setComparison(null)
          setError(requestError instanceof Error ? requestError.message : 'BOM Matvar comparison could not be loaded.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [enabled, inputSignature, refreshKey, reviewId])

  return {
    bomMatvarComparison: comparison,
    bomMatvarComparisonLoading: loading,
    bomMatvarComparisonError: error,
    refreshBomMatvarComparison: refresh,
  }
}
