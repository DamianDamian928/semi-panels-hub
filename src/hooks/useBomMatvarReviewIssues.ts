import { useEffect, useState } from 'react'
import { fetchBomMatvarReviewIssues } from '../apiClient'
import type { BomMatvarReviewIssuesPayload } from '../apiClient'

const isBomMatvarReviewIssuesPayload = (value: unknown): value is BomMatvarReviewIssuesPayload =>
  Boolean(
    value &&
    typeof value === 'object' &&
    (value as Partial<BomMatvarReviewIssuesPayload>).targetId === 'bom-matvar' &&
    (value as Partial<BomMatvarReviewIssuesPayload>).review &&
    Array.isArray((value as Partial<BomMatvarReviewIssuesPayload>).issues),
  )

const loadBomMatvarReviewIssues = async (reviewId: string) => {
  const payload = await fetchBomMatvarReviewIssues(reviewId)

  if (!isBomMatvarReviewIssuesPayload(payload)) {
    throw new Error('BOM Matvar review endpoint returned an unexpected payload. Restart the API server and refresh.')
  }

  return payload
}

export const useBomMatvarReviewIssues = (
  reviewId: string,
  enabled: boolean,
  refreshKey = 0,
  inputSignature = '',
) => {
  const [reviewIssues, setReviewIssues] = useState<BomMatvarReviewIssuesPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true)
    setError(null)

    try {
      setReviewIssues(await loadBomMatvarReviewIssues(reviewId))
    } catch (requestError: unknown) {
      setReviewIssues(null)
      setError(requestError instanceof Error ? requestError.message : 'BOM Matvar review issues could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    setLoading(true)
    setError(null)

    loadBomMatvarReviewIssues(reviewId)
      .then((payload) => {
        if (!cancelled) setReviewIssues(payload)
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setReviewIssues(null)
          setError(requestError instanceof Error ? requestError.message : 'BOM Matvar review issues could not be loaded.')
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
    bomMatvarReviewIssues: reviewIssues,
    bomMatvarReviewIssuesLoading: loading,
    bomMatvarReviewIssuesError: error,
    refreshBomMatvarReviewIssues: refresh,
  }
}
