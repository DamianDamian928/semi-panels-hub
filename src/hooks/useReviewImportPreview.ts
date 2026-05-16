import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { parseDelimitedReviewSnapshot } from '../adapters/readOnlyReviewAdapter'
import type { ReviewIssueAdapterResult } from '../adapters/readOnlyReviewAdapter'
import type { ReviewIssueFilter } from '../types'

type UseReviewImportPreviewOptions = {
  setActiveReviewIssueId: (issueId: string) => void
  setReviewIssueFilter: (filter: ReviewIssueFilter) => void
}

export const useReviewImportPreview = ({
  setActiveReviewIssueId,
  setReviewIssueFilter,
}: UseReviewImportPreviewOptions) => {
  const [reviewImportPreview, setReviewImportPreview] = useState<ReviewIssueAdapterResult | null>(null)
  const [reviewImportError, setReviewImportError] = useState<string | null>(null)

  const handleReviewImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const importedAt = new Date().toLocaleString()
      const result = parseDelimitedReviewSnapshot(file.name, text, importedAt)

      setReviewImportPreview(result)
      setReviewImportError(null)
      setReviewIssueFilter('All')

      if (result.issues[0]) {
        setActiveReviewIssueId(result.issues[0].id)
      }
    } catch {
      setReviewImportPreview(null)
      setReviewImportError('Could not read this file. Use a CSV or TSV export for the first read-only preview.')
    } finally {
      event.target.value = ''
    }
  }

  return {
    reviewImportPreview,
    reviewImportError,
    setReviewImportPreview,
    setReviewImportError,
    handleReviewImportFile,
  }
}
