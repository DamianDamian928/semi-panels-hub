import { useState } from 'react'
import type { FormEvent } from 'react'
import { localFileOpenLocationEndpoint } from '../../localFileHelper'
import type { SourceCreateInput, SourceDefinition, SourceType } from '../../types'
import { formatFileModifiedAt, formatFileSize, SourceTypeGlyph } from '../sharedReviewUi'

type SourcesStepProps = {
  sourceDefinitions: SourceDefinition[]
  activeSourceId: string
  onSelectSource: (sourceId: string) => void
  sourceSelectionPendingId: string | null
  sourceAccessPendingId: string | null
  sourceMutationPending: boolean
  sourcesAutoChecking: boolean
  sourceSelectionError: string | null
  onAddSource: (source: SourceCreateInput) => Promise<void>
  onRemoveSource: (sourceId: string) => void
  onChooseSourceFile: (sourceId: string) => void
  onTestSourceAccess: (sourceId: string) => void
}

const localFileSourceTypes = new Set<SourceDefinition['type']>(['File', 'Manual export'])
const sourceTypeOptions: SourceType[] = ['File', 'Folder', 'SQL', 'SharePoint', 'Manual export']

const defaultExpectedFormatByType: Record<SourceType, string> = {
  File: 'Excel workbook or CSV export',
  Folder: 'Folder with PDF and drawing references',
  SQL: 'SQL connection profile',
  SharePoint: 'SharePoint folder or document library',
  'Manual export': 'Manual export file',
}

const createEmptySourceDraft = (): SourceCreateInput => ({
  name: '',
  type: 'File',
  usedFor: ['BOM'],
  expectedFormat: defaultExpectedFormatByType.File,
  owner: 'Damian',
  description: '',
})

const fileTypeLabelByExtension: Record<string, string> = {
  xlsm: 'Excel macro workbook',
  xlsx: 'Excel workbook',
  xls: 'Excel workbook',
  csv: 'CSV file',
  tsv: 'TSV file',
  pdf: 'PDF document',
  txt: 'Text file',
}

const sourceTypeFallbackLabel: Record<SourceType, string> = {
  File: 'Local file',
  Folder: 'Folder',
  SQL: 'SQL connection',
  SharePoint: 'SharePoint location',
  'Manual export': 'Manual export',
}

const getSourceApplicationTypeLabel = (source: SourceDefinition) => {
  if (!source.sourceFile) return sourceTypeFallbackLabel[source.type]

  return fileTypeLabelByExtension[source.sourceFile.extension.toLowerCase()] ?? 'Local file'
}

export function SourcesStep({
  sourceDefinitions,
  activeSourceId,
  onSelectSource,
  sourceSelectionPendingId,
  sourceAccessPendingId,
  sourceMutationPending,
  sourcesAutoChecking,
  sourceSelectionError,
  onAddSource,
  onRemoveSource,
  onChooseSourceFile,
  onTestSourceAccess,
}: SourcesStepProps) {
  const [isAddingSource, setIsAddingSource] = useState(false)
  const [sourceDraft, setSourceDraft] = useState<SourceCreateInput>(() => createEmptySourceDraft())
  const [sourceFormError, setSourceFormError] = useState<string | null>(null)
  const [sourceOpenLocationError, setSourceOpenLocationError] = useState<string | null>(null)
  const selectedSource = sourceDefinitions.find((source) => source.id === activeSourceId) ?? sourceDefinitions[0]
  const readyCount = sourceDefinitions.filter((source) => source.status === 'Ready').length
  const needsLocationCount = sourceDefinitions.filter((source) => source.status === 'Needs location').length
  const typeCount = new Set(sourceDefinitions.map((source) => source.type)).size
  const statusToneClass = selectedSource?.status.toLowerCase().replace(/\s+/g, '-') ?? 'needs-location'
  const selectedSourceFile = selectedSource?.sourceFile
  const canChooseLocalFile = selectedSource ? localFileSourceTypes.has(selectedSource.type) : false
  const isSelectingSource = selectedSource ? sourceSelectionPendingId === selectedSource.id : false
  const isCheckingSelectedSource = selectedSource ? sourceAccessPendingId === selectedSource.id : false
  const selectedAccessCheck = selectedSource?.accessCheck

  const submitNewSource = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!sourceDraft.name.trim()) {
      setSourceFormError('Source name is required.')
      return
    }

    setSourceFormError(null)
    await onAddSource({
      ...sourceDraft,
      name: sourceDraft.name.trim(),
      expectedFormat: sourceDraft.expectedFormat.trim() || defaultExpectedFormatByType[sourceDraft.type],
      owner: sourceDraft.owner.trim() || 'Unassigned',
      description: sourceDraft.description.trim(),
    })
    setSourceDraft(createEmptySourceDraft())
    setIsAddingSource(false)
  }

  const openSelectedSourceLocation = async () => {
    if (!selectedSourceFile) return

    setSourceOpenLocationError(null)

    try {
      const response = await fetch(localFileOpenLocationEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: selectedSourceFile.path }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null
        throw new Error(payload?.error ?? 'Could not open this local location.')
      }
    } catch (error) {
      setSourceOpenLocationError(
        error instanceof Error
          ? error.message === 'Failed to fetch'
            ? 'Local file helper is offline. Start npm run helper or npm run start:local, then try again.'
            : error.message
          : 'Local file helper is offline. Start npm run helper or npm run start:local, then try again.',
      )
    }
  }

  return (
    <section className="sources-registry-grid sources-registry-grid-with-detail">
      <section className="workspace-main card sources-registry-main">
        <div className="sources-registry-header">
          <div>
            <p className="section-label">Sources</p>
            <h3>Source registry</h3>
          </div>
          <div className="sources-registry-actions" aria-label="Source actions">
            <button
              type="button"
              className="secondary-button source-action-button"
              disabled={sourceMutationPending}
              onClick={() => {
                setSourceFormError(null)
                setIsAddingSource(true)
              }}
            >
              Add source
            </button>
            <button
              type="button"
              className="secondary-button source-action-button"
              disabled={!selectedSource || Boolean(sourceAccessPendingId) || Boolean(sourceSelectionPendingId)}
              onClick={() => {
                if (selectedSource) onTestSourceAccess(selectedSource.id)
              }}
            >
              {sourcesAutoChecking || isCheckingSelectedSource ? 'Checking...' : 'Test access'}
            </button>
          </div>
        </div>

        <div className="source-summary-grid" aria-label="Source registry summary">
          <article className="source-summary-card">
            <span>Total sources</span>
            <strong>{sourceDefinitions.length}</strong>
          </article>
          <article className="source-summary-card">
            <span>Ready</span>
            <strong>{readyCount}</strong>
          </article>
          <article className="source-summary-card">
            <span>Needs location</span>
            <strong>{needsLocationCount}</strong>
          </article>
          <article className="source-summary-card">
            <span>Connection types</span>
            <strong>{typeCount}</strong>
          </article>
        </div>

        <div className="source-registry-list" aria-label="Registered sources">
          <div className="source-registry-list-head" aria-hidden="true">
            <span className="source-registry-icon-head" />
            <span>Source</span>
            <span>Type</span>
            <span>File size</span>
            <span>Status</span>
          </div>
          {sourceDefinitions.map((source) => {
            const isActive = source.id === selectedSource.id
            const sourceStatusClass = source.status.toLowerCase().replace(/\s+/g, '-')
            const sourceDisplayName = source.sourceFile?.name ?? source.name
            const sourceApplicationTypeLabel = getSourceApplicationTypeLabel(source)

            return (
              <button
                key={source.id}
                type="button"
                className={`source-registry-row ${isActive ? 'source-registry-row-active' : ''}`}
                onClick={() => {
                  onSelectSource(source.id)
                  setIsAddingSource(false)
                }}
              >
                <span className="source-registry-type" role="img" aria-label={source.type} title={source.type}>
                  <span className={`source-type-icon source-type-icon-compact source-type-icon-${source.type.toLowerCase().replace(/\s+/g, '-')}`}>
                    <SourceTypeGlyph type={source.type} className="source-type-glyph" />
                  </span>
                </span>
                <span className="source-registry-name">
                  <span>
                    <strong>{sourceDisplayName}</strong>
                  </span>
                </span>
                <span className="source-application-type" title={sourceApplicationTypeLabel}>
                  {sourceApplicationTypeLabel}
                </span>
                <span className="source-file-size">
                  {source.sourceFile ? formatFileSize(source.sourceFile.sizeBytes) : '-'}
                </span>
                <span className={`source-status source-status-${sourceStatusClass}`}>
                  <span className="source-status-dot" />
                  {source.status}
                </span>
              </button>
            )
          })}
          {sourceDefinitions.length === 0 ? (
            <div className="source-registry-empty">
              <strong>No sources registered</strong>
              <p>Add the first read-only source to start building the registry.</p>
            </div>
          ) : null}
        </div>
      </section>

      <aside className="workspace-side-panel card source-detail-panel" aria-label="Selected source details">
            {isAddingSource || !selectedSource ? (
              <form className="source-form" onSubmit={(event) => {
                void submitNewSource(event).catch(() => undefined)
              }}>
                <div className="source-connector-header">
                  <div>
                    <p className="section-label">New source</p>
                    <h2>Add source</h2>
                    <p>Create a read-only source registry entry. File selection and access checks happen after the source is added.</p>
                  </div>
                  <button
                    type="button"
                    className="source-detail-close-button"
                    aria-label="Close source panel"
                    onClick={() => {
                      setSourceFormError(null)
                      setIsAddingSource(false)
                    }}
                  >
                    Close
                  </button>
                </div>

                <label className="source-form-field">
                  <span>Name</span>
                  <input
                    type="text"
                    value={sourceDraft.name}
                    onChange={(event) => setSourceDraft((current) => ({ ...current, name: event.target.value }))}
                    placeholder="e.g. Parts&BOM"
                  />
                </label>

                <label className="source-form-field">
                  <span>Type</span>
                  <select
                    value={sourceDraft.type}
                    onChange={(event) => {
                      const nextType = event.target.value as SourceType
                      setSourceDraft((current) => ({
                        ...current,
                        type: nextType,
                        expectedFormat: defaultExpectedFormatByType[nextType],
                      }))
                    }}
                  >
                    {sourceTypeOptions.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>

                {sourceFormError ? <p className="source-selection-error">{sourceFormError}</p> : null}
                {sourceSelectionError ? <p className="source-selection-error">{sourceSelectionError}</p> : null}

                <div className="source-detail-actions">
                  <button type="submit" className="secondary-button" disabled={sourceMutationPending}>
                    {sourceMutationPending ? 'Adding...' : 'Save source'}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={sourceMutationPending}
                    onClick={() => {
                      setSourceFormError(null)
                      setIsAddingSource(false)
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="source-connector-header">
                  <div>
                    <p className="section-label">Source configuration</p>
                    <h2>{selectedSource.name}</h2>
                  </div>
                </div>

                <p className="source-detail-section-title">Details</p>
                <dl className="source-property-list">
                  <div className="source-property-row">
                    <dt>Status</dt>
                    <dd>
                      <span className={`source-status source-status-${statusToneClass}`}>
                        <span className="source-status-dot" />
                        {selectedSource.status}
                      </span>
                    </dd>
                  </div>
                  <div className="source-property-row source-property-row-stacked source-property-row-location">
                    <dt>
                      <span>Location</span>
                      {selectedSourceFile ? (
                        <button
                          type="button"
                          className="source-location-icon-button"
                          onClick={() => {
                            void openSelectedSourceLocation()
                          }}
                          aria-label="Open local location"
                          title="Open local location"
                        >
                          <SourceTypeGlyph type="Folder" className="source-location-icon-glyph" />
                        </button>
                      ) : null}
                    </dt>
                    <dd>
                      {selectedSourceFile ? (
                        <span className="source-location-path">
                          {selectedSource.location}
                        </span>
                      ) : (
                        selectedSource.location
                      )}
                    </dd>
                  </div>
                  {selectedSourceFile ? (
                    <>
                      <div className="source-property-row">
                        <dt>File name</dt>
                        <dd>{selectedSourceFile.name}</dd>
                      </div>
                      <div className="source-property-row">
                        <dt>Modified</dt>
                        <dd>{formatFileModifiedAt(selectedSourceFile.modifiedAt)}</dd>
                      </div>
                    </>
                  ) : null}
                  <div className="source-property-row">
                    <dt>Last access check</dt>
                    <dd>{selectedAccessCheck ? formatFileModifiedAt(selectedAccessCheck.checkedAt) : 'Never checked'}</dd>
                  </div>
                  <div className="source-property-row">
                    <dt>Check result</dt>
                    <dd>{selectedAccessCheck?.message ?? 'Access has not been checked yet.'}</dd>
                  </div>
                  <div className="source-property-row">
                    <dt>Readable</dt>
                    <dd>{selectedAccessCheck ? (selectedAccessCheck.readable ? 'Yes' : 'No') : 'Unknown'}</dd>
                  </div>
                </dl>

                {sourceSelectionError ? <p className="source-selection-error">{sourceSelectionError}</p> : null}
                {sourceOpenLocationError ? <p className="source-selection-error">{sourceOpenLocationError}</p> : null}

                <div className="source-detail-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={!canChooseLocalFile || Boolean(sourceSelectionPendingId) || Boolean(sourceAccessPendingId) || sourceMutationPending}
                    onClick={() => onChooseSourceFile(selectedSource.id)}
                  >
                    {isSelectingSource ? 'Opening...' : selectedSourceFile ? 'Change local file' : 'Choose local file'}
                  </button>
                  <button
                    type="button"
                    className="source-remove-button"
                    disabled={sourceMutationPending || Boolean(sourceSelectionPendingId) || Boolean(sourceAccessPendingId)}
                    onClick={() => onRemoveSource(selectedSource.id)}
                  >
                    {sourceMutationPending ? 'Removing...' : 'Remove source'}
                  </button>
                </div>
              </>
            )}
      </aside>
    </section>
  )
}
