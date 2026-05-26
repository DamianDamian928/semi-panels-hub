import { useEffect, useState } from 'react'
import { fetchBomMatvarValidation } from '../apiClient'
import type { BomMatvarValidationPayload } from '../apiClient'

const isBomMatvarValidationPayload = (value: unknown): value is BomMatvarValidationPayload =>
  Boolean(
    value &&
    typeof value === 'object' &&
    (value as Partial<BomMatvarValidationPayload>).targetId === 'bom-matvar' &&
    (value as Partial<BomMatvarValidationPayload>).review &&
    Array.isArray((value as Partial<BomMatvarValidationPayload>).checks) &&
    Array.isArray((value as Partial<BomMatvarValidationPayload>).bomL0Rows) &&
    Array.isArray((value as Partial<BomMatvarValidationPayload>).matvarRows),
  )

const loadBomMatvarValidation = async (reviewId: string) => {
  const payload = await fetchBomMatvarValidation(reviewId)

  if (!isBomMatvarValidationPayload(payload)) {
    throw new Error('BOM Matvar validation endpoint returned an unexpected payload. Restart the API server and refresh.')
  }

  return payload
}

export const useBomMatvarValidation = (
  reviewId: string,
  enabled: boolean,
  refreshKey = 0,
  inputSignature = '',
) => {
  const [validation, setValidation] = useState<BomMatvarValidationPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true)
    setError(null)

    try {
      setValidation(await loadBomMatvarValidation(reviewId))
    } catch (requestError: unknown) {
      setValidation(null)
      setError(requestError instanceof Error ? requestError.message : 'BOM Matvar validation could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    setLoading(true)
    setError(null)

    loadBomMatvarValidation(reviewId)
      .then((payload) => {
        if (!cancelled) setValidation(payload)
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setValidation(null)
          setError(requestError instanceof Error ? requestError.message : 'BOM Matvar validation could not be loaded.')
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
    bomMatvarValidation: validation,
    bomMatvarValidationLoading: loading,
    bomMatvarValidationError: error,
    refreshBomMatvarValidation: refresh,
  }
}
