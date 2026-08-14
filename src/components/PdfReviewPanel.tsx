import { useMemo, useState } from 'react'
import { apiSearchPdfReview } from '../apiClient'
import type { PdfReviewSearchMode, PdfReviewSearchResult } from '../apiClient'
import {
  localFileHelperEndpoint,
  localFileOpenLocationEndpoint,
  localFolderHelperEndpoint,
} from '../localFileHelper'
import type { LocalFileSelection } from '../localFileHelper'

type PdfReviewPanelProps = {
  onBackToDashboard: () => void
}

type PdfReviewSource = {
  mode: PdfReviewSearchMode
  file: LocalFileSelection
}

type ModelSortDirection = 'asc' | 'desc'

const formatSelectedSourceMeta = (source: PdfReviewSource | null) => {
  if (!source) return 'No source selected'
  if (source.mode === 'folder') {
    const folderSummary = source.file.folderSummary
    if (!folderSummary) return 'Folder'

    return `${folderSummary.fileCount} files, ${folderSummary.folderCount} folders`
  }

  return `${source.file.extension.toUpperCase()} file`
}

const formatPages = (pages: PdfReviewSearchResult['documents'][number]['pages']) => {
  if (!pages.length) return '-'

  return pages
    .map((page) => page.matchCount > 1 ? `${page.pageNumber} (${page.matchCount}x)` : String(page.pageNumber))
    .join(', ')
}

const buildResultSummary = (result: PdfReviewSearchResult | null) => {
  if (!result) return 'No search run'

  return `${result.matchedDocuments} of ${result.scannedDocuments} documents matched, ${result.totalMatches} total matches`
}

export function PdfReviewPanel({ onBackToDashboard }: PdfReviewPanelProps) {
  const [selectedSource, setSelectedSource] = useState<PdfReviewSource | null>(null)
  const [query, setQuery] = useState('')
  const [searchResult, setSearchResult] = useState<PdfReviewSearchResult | null>(null)
  const [selectionPendingMode, setSelectionPendingMode] = useState<PdfReviewSearchMode | null>(null)
  const [searchPending, setSearchPending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [modelSortDirection, setModelSortDirection] = useState<ModelSortDirection | null>(null)

  const matchedDocuments = useMemo(
    () => searchResult?.documents.filter((document) => document.matchCount > 0) ?? [],
    [searchResult],
  )
  const visibleDocuments = useMemo(() => {
    if (!modelSortDirection) return matchedDocuments

    return [...matchedDocuments].sort((left, right) => {
      const comparison = left.modelName.localeCompare(right.modelName, undefined, {
        numeric: true,
        sensitivity: 'base',
      })

      return modelSortDirection === 'asc' ? comparison : -comparison
    })
  }, [matchedDocuments, modelSortDirection])
  const canSearch = Boolean(selectedSource && query.trim() && !searchPending)

  const toggleModelSortDirection = () => {
    setModelSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
  }

  const handleSelectSource = async (mode: PdfReviewSearchMode) => {
    setSelectionPendingMode(mode)
    setActionError(null)

    try {
      const response = await fetch(mode === 'file' ? localFileHelperEndpoint : localFolderHelperEndpoint)
      if (!response.ok) throw new Error('Local file helper did not respond correctly.')

      const result = (await response.json()) as {
        cancelled?: boolean
        file?: LocalFileSelection
        error?: string
      }

      if (result.cancelled) return
      if (!result.file) throw new Error(result.error ?? 'No local path was returned by the local helper.')
      if (mode === 'file' && result.file.extension.toLowerCase() !== 'pdf') {
        throw new Error('Selected file must be a PDF.')
      }

      setSelectedSource({ mode, file: result.file })
      setSearchResult(null)
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Could not select this PDF Review source.',
      )
    } finally {
      setSelectionPendingMode(null)
    }
  }

  const handleSearch = async () => {
    if (!selectedSource || !query.trim()) return

    setSearchPending(true)
    setActionError(null)

    try {
      setSearchResult(await apiSearchPdfReview({
        mode: selectedSource.mode,
        path: selectedSource.file.path,
        query,
      }))
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'PDF search could not be completed.',
      )
    } finally {
      setSearchPending(false)
    }
  }

  const handleOpenLocalLocation = async (path: string, openMode: 'file' | 'location') => {
    setActionError(null)

    try {
      const response = await fetch(localFileOpenLocationEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path, openMode }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error ?? 'Could not open this local path.')
      }
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Could not open this local path.',
      )
    }
  }

  return (
    <div className="app-shell pdf-review-shell">
      <header className="page-header page-header-row">
        <div>
          <p className="eyebrow">Semi Panels Hub</p>
          <h1>PDF Review</h1>
          <p className="page-subtitle">Search editable PDF documentation by text value.</p>
        </div>
        <div className="header-actions">
          <button type="button" className="header-button" onClick={onBackToDashboard}>
            Back to Dashboard
          </button>
        </div>
      </header>

      <main className="page-content pdf-review-content">
        <section className="card pdf-review-search-panel" aria-label="PDF search">
          <div className="pdf-review-controls">
            <div className="pdf-review-source-actions" role="group" aria-label="PDF source">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  void handleSelectSource('file')
                }}
                disabled={selectionPendingMode !== null || searchPending}
              >
                {selectionPendingMode === 'file' ? 'Loading PDF...' : 'Load PDF'}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  void handleSelectSource('folder')
                }}
                disabled={selectionPendingMode !== null || searchPending}
              >
                {selectionPendingMode === 'folder' ? 'Loading folder...' : 'Select folder'}
              </button>
            </div>

            <label className="pdf-review-search-field">
              <span>Search text</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && canSearch) {
                    event.preventDefault()
                    void handleSearch()
                  }
                }}
                placeholder="FSD81-10-D"
              />
            </label>

            <button
              type="button"
              className="header-button pdf-review-search-button"
              onClick={() => {
                void handleSearch()
              }}
              disabled={!canSearch}
            >
              {searchPending ? 'Searching...' : 'Search'}
            </button>
          </div>

          <div className="pdf-review-source-summary">
            <div>
              <span>Source</span>
              <strong>{selectedSource?.file.name ?? 'Not selected'}</strong>
              <small>{selectedSource?.file.path ?? formatSelectedSourceMeta(selectedSource)}</small>
            </div>
            <div>
              <span>Mode</span>
              <strong>{selectedSource?.mode === 'folder' ? 'Folder' : selectedSource?.mode === 'file' ? 'Single PDF' : '-'}</strong>
              <small>{formatSelectedSourceMeta(selectedSource)}</small>
            </div>
            <div>
              <span>Result</span>
              <strong>{searchResult ? `${searchResult.totalMatches} matches` : '-'}</strong>
              <small>{buildResultSummary(searchResult)}</small>
            </div>
          </div>

          {actionError ? (
            <div className="pdf-review-error" role="alert">
              {actionError}
            </div>
          ) : null}
        </section>

        <section className="card pdf-review-results-panel" aria-label="PDF search results">
          <div className="pdf-review-results-header">
            <div>
              <p className="section-label">Search results</p>
              <h2>{searchResult ? `Query: ${searchResult.query}` : 'Waiting for search'}</h2>
            </div>
            <span>{searchResult ? searchResult.searchedAt.replace('T', ' ').slice(0, 19) : '-'}</span>
          </div>

          <div className="table-wrap pdf-review-table-wrap">
            <table className="pdf-review-results-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>
                    <button
                      type="button"
                      className={[
                        'pdf-review-sort-header',
                        modelSortDirection ? 'pdf-review-sort-header-active' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={toggleModelSortDirection}
                      aria-label={`Sort by model ${modelSortDirection === 'asc' ? 'descending' : 'ascending'}`}
                    >
                      Model
                      <span aria-hidden="true">
                        {modelSortDirection === 'asc' ? 'A-Z' : modelSortDirection === 'desc' ? 'Z-A' : '-'}
                      </span>
                    </button>
                  </th>
                  <th>Matches</th>
                  <th>Pages</th>
                  <th>Preview</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleDocuments.length > 0 ? visibleDocuments.map((document) => (
                  <tr key={document.path} className={document.matchCount > 0 ? 'pdf-review-row-match' : ''}>
                    <td>
                      <span className="pdf-review-document-name">{document.documentName}</span>
                      <small>{document.path}</small>
                      {document.error ? <em>{document.error}</em> : null}
                    </td>
                    <td>
                      <span className="pdf-review-model-name">{document.modelName}</span>
                      <small>{document.modelPath}</small>
                    </td>
                    <td>{document.status === 'Error' ? 'Error' : document.matchCount}</td>
                    <td>{formatPages(document.pages)}</td>
                    <td>
                      {document.pages.length > 0 ? (
                        <div className="pdf-review-snippets">
                          {document.pages.slice(0, 3).map((page) => (
                            <div key={`${document.path}-${page.pageNumber}`}>
                              <strong>Page {page.pageNumber}</strong>
                              {page.snippets.map((snippet, index) => (
                                <p key={`${document.path}-${page.pageNumber}-${index}`}>{snippet}</p>
                              ))}
                            </div>
                          ))}
                        </div>
                      ) : (
                        null
                      )}
                    </td>
                    <td>
                      <div className="pdf-review-table-actions">
                        <button
                          type="button"
                          className="table-action"
                          onClick={() => {
                            void handleOpenLocalLocation(document.path, 'file')
                          }}
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          className="table-action table-action-secondary"
                          onClick={() => {
                            void handleOpenLocalLocation(document.path, 'location')
                          }}
                        >
                          Location
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td className="dashboard-empty-cell" colSpan={6}>
                      {searchPending
                        ? 'Searching PDF documents...'
                        : searchResult
                          ? 'No matching PDF documents found.'
                          : 'No PDF search results yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
