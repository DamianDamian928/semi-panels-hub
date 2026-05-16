import { useEffect, useMemo, useState } from 'react'
import { apiFetchSourcePreview } from '../../apiClient'
import type { SourcePreviewPayload } from '../../apiClient'
import { createColumnMapping, createDefaultMappingConfig, createMappingId } from '../../domain/sourceMapping'
import type {
  ConnectionTargetId,
  SourceColumnMapping,
  SourceConnectionRole,
  SourceDefinition,
  SourceMappingConfig,
  SourceMappingStatus,
  SourceMappingTransform,
} from '../../types'
import { connectionTargets, SourceTypeGlyph } from '../sharedReviewUi'

type MappingStepProps = {
  activeMappingId: string
  activeConnectionTargetId: ConnectionTargetId
  connectionsByTarget: Record<ConnectionTargetId, string[]>
  mappingConfigs: Record<string, SourceMappingConfig>
  sourceDefinitions: SourceDefinition[]
  onSelectMapping: (mappingId: string) => void
  onUpdateMapping: (mappingId: string, update: Partial<SourceMappingConfig>) => void
}

type MappingRow = {
  config: SourceMappingConfig
  source: SourceDefinition
  targetLabel: string
}

const roleOptions: SourceConnectionRole[] = ['Primary', 'Reference', 'Validation', 'Comparison']
const statusOptions: SourceMappingStatus[] = ['Needs mapping', 'Ready', 'Error']
const transformOptions: SourceMappingTransform[] = ['None', 'Trim', 'Uppercase', 'Distinct']
const targetFieldOptions = [
  'Intel Model Number',
  'Customer',
  'Forecast Qty',
  'Part Number',
  'Description',
  'Revision',
  'UoM',
]

export function MappingStep({
  activeMappingId,
  activeConnectionTargetId,
  connectionsByTarget,
  mappingConfigs,
  sourceDefinitions,
  onSelectMapping,
  onUpdateMapping,
}: MappingStepProps) {
  const [studioOpen, setStudioOpen] = useState(false)
  const [activeSheetName, setActiveSheetName] = useState<string | null>(null)
  const [filterText, setFilterText] = useState('')
  const [sourcePreview, setSourcePreview] = useState<SourcePreviewPayload | null>(null)
  const [sourcePreviewLoading, setSourcePreviewLoading] = useState(false)
  const [sourcePreviewError, setSourcePreviewError] = useState<string | null>(null)
  const sourceById = useMemo(
    () => new Map(sourceDefinitions.map((source) => [source.id, source])),
    [sourceDefinitions],
  )

  const activeConnectionTarget = connectionTargets.find((target) => target.id === activeConnectionTargetId) ?? connectionTargets[0]
  const mappingRows = useMemo<MappingRow[]>(
    () => {
      const target = activeConnectionTarget

      return (connectionsByTarget[target.id] ?? []).flatMap((sourceId) => {
          const source = sourceById.get(sourceId)
          if (!source) return []

          const mappingId = createMappingId(target.id, sourceId)
          return [{
            config: mappingConfigs[mappingId] ?? createDefaultMappingConfig(target.id, sourceId),
            source,
            targetLabel: target.label,
          }]
        })
    },
    [activeConnectionTarget, connectionsByTarget, mappingConfigs, sourceById],
  )

  const activeRow = mappingRows.find((row) => row.config.id === activeMappingId) ?? mappingRows[0]
  const activeColumnMappings = activeRow?.config.columnMappings ?? []
  const selectedColumnNames = new Set(activeColumnMappings.map((mapping) => mapping.sourceColumn))
  const previewColumns = sourcePreview?.columns ?? []
  const previewRows = sourcePreview?.rows ?? []
  const previewSheets = sourcePreview?.sheets ?? []
  const selectedSheetName = sourcePreview?.activeSheetName ?? activeSheetName ?? ''
  const visiblePreviewRows = previewRows.filter((row) =>
    row.some((cell) => cell.toLowerCase().includes(filterText.toLowerCase())),
  )

  useEffect(() => {
    if (!studioOpen || !activeRow) return

    let cancelled = false
    setSourcePreviewLoading(true)
    setSourcePreviewError(null)

    apiFetchSourcePreview(activeRow.source.id, activeSheetName ?? undefined)
      .then((preview) => {
        if (cancelled) return
        setSourcePreview(preview)
        setActiveSheetName(preview.activeSheetName)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setSourcePreview(null)
        setSourcePreviewError(
          error instanceof Error
            ? error.message
            : 'Source preview could not be loaded.',
        )
      })
      .finally(() => {
        if (!cancelled) setSourcePreviewLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeRow?.source.id, activeSheetName, studioOpen])

  const toggleColumnMapping = (sourceColumn: string) => {
    if (!activeRow) return

    if (!selectedSheetName) return

    const exists = activeColumnMappings.some((mapping) => mapping.sourceColumn === sourceColumn && mapping.sheetName === selectedSheetName)
    const nextMappings = exists
      ? activeColumnMappings.filter((mapping) => !(mapping.sourceColumn === sourceColumn && mapping.sheetName === selectedSheetName))
      : [...activeColumnMappings, createColumnMapping(selectedSheetName, sourceColumn)]

    onUpdateMapping(activeRow.config.id, { columnMappings: nextMappings })
  }

  const updateColumnMapping = (mappingId: string, update: Partial<SourceColumnMapping>) => {
    if (!activeRow) return

    onUpdateMapping(activeRow.config.id, {
      columnMappings: activeColumnMappings.map((mapping) =>
        mapping.id === mappingId ? { ...mapping, ...update } : mapping,
      ),
    })
  }

  const removeColumnMapping = (mappingId: string) => {
    if (!activeRow) return

    onUpdateMapping(activeRow.config.id, {
      columnMappings: activeColumnMappings.filter((mapping) => mapping.id !== mappingId),
    })
  }

  const deleteActiveMappingConfig = () => {
    if (!activeRow) return

    onUpdateMapping(activeRow.config.id, {
      sheetName: '',
      keyColumn: '',
      partNumberColumn: '',
      quantityColumn: '',
      revisionColumn: '',
      status: 'Needs mapping',
      columnMappings: [],
    })
  }

  return (
    <>
      <section className="mapping-workspace-grid">
        <section className="workspace-main card mapping-main">
          <div className="mapping-header">
            <div>
              <p className="section-label">Mapping</p>
              <h3>Source mapping</h3>
              <p>Configure active connections for {activeConnectionTarget.label} before validation.</p>
            </div>
          </div>

          <div className="mapping-table-wrap">
            <div className="mapping-table-head" aria-hidden="true">
              <span>Workflow target</span>
              <span>Sources</span>
              <span>Mapped columns</span>
              <span>Status</span>
            </div>

            {mappingRows.map((row) => {
              const isActive = row.config.id === activeRow?.config.id
              return (
                <button
                  key={row.config.id}
                  type="button"
                  className={`mapping-row ${isActive ? 'mapping-row-active' : ''}`}
                  onClick={() => onSelectMapping(row.config.id)}
                >
                  <span className="mapping-row-connection">
                    <strong>{row.targetLabel}</strong>
                  </span>
                  <span className="mapping-row-source">
                    <span className={`source-type-icon source-type-icon-compact source-type-icon-${row.source.type.toLowerCase().replace(/\s+/g, '-')}`}>
                      <SourceTypeGlyph type={row.source.type} className="source-type-glyph" />
                    </span>
                    <strong>{row.source.sourceFile?.name ?? row.source.name}</strong>
                  </span>
                  <span>{row.config.columnMappings.length}</span>
                  <span>{row.config.status}</span>
                </button>
              )
            })}

            {mappingRows.length === 0 ? (
              <div className="mapping-empty-state">
                <strong>No active connections to map</strong>
                <p>Create connections for {activeConnectionTarget.label}, then return here to configure column mapping.</p>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="workspace-side-panel card mapping-detail-panel" aria-label="Mapping details">
          {activeRow ? (
            <>
              <div className="sidebar-header">
                <p className="section-label">Mapping details</p>
                <h2>{activeRow.targetLabel}</h2>
                <p>{activeRow.source.sourceFile?.name ?? activeRow.source.name}</p>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={() => setStudioOpen(true)}
              >
                Open Mapping Studio
              </button>

              <label className="source-form-field">
                <span>Role</span>
                <select
                  value={activeRow.config.role}
                  onChange={(event) => onUpdateMapping(activeRow.config.id, { role: event.target.value as SourceConnectionRole })}
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </label>

              <label className="source-form-field">
                <span>Status</span>
                <select
                  value={activeRow.config.status}
                  onChange={(event) => onUpdateMapping(activeRow.config.id, { status: event.target.value as SourceMappingStatus })}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>

              <div className="mapping-selected-summary">
                <strong>Selected columns</strong>
                {activeColumnMappings.length ? (
                  activeColumnMappings.map((mapping) => (
                    <span key={mapping.id}>{mapping.sheetName}.{mapping.sourceColumn}</span>
                  ))
                ) : (
                  <p>No columns selected yet.</p>
                )}
              </div>
            </>
          ) : (
            <div className="sidebar-header">
              <p className="section-label">Mapping details</p>
              <h2>No mapping selected</h2>
              <p>Connections created in the previous step will appear here.</p>
            </div>
          )}
        </aside>
      </section>

      {studioOpen && activeRow ? (
        <div className="mapping-studio-overlay" role="dialog" aria-modal="true" aria-label="Mapping Studio">
          <div className="mapping-studio">
            <div className="mapping-studio-titlebar">
              <div>
                <p className="section-label">Mapping Studio</p>
                <h2>{activeRow.targetLabel} / {activeRow.source.sourceFile?.name ?? activeRow.source.name}</h2>
              </div>
              <button type="button" className="mapping-studio-close" onClick={() => setStudioOpen(false)}>
                Close
              </button>
            </div>

            <div className="mapping-studio-toolbar" aria-label="Mapping Studio toolbar">
              <button type="button">Select</button>
              <button type="button" onClick={() => onUpdateMapping(activeRow.config.id, { status: 'Ready' })}>Save mapping</button>
              <button type="button" onClick={deleteActiveMappingConfig}>Delete mapping</button>
              <button type="button" onClick={() => setFilterText('')}>Clear filter</button>
              <label>
                <span>Find</span>
                <input
                  type="search"
                  value={filterText}
                  onChange={(event) => setFilterText(event.target.value)}
                  placeholder="Search preview"
                />
              </label>
            </div>

            <div className="mapping-studio-body">
              <aside className="mapping-studio-sheets" aria-label="Workbook sheets">
                <span>Sheets</span>
                {previewSheets.map((sheetName) => (
                  <button
                    key={sheetName}
                    type="button"
                    className={sheetName === selectedSheetName ? 'mapping-studio-sheet-active' : ''}
                    onClick={() => setActiveSheetName(sheetName)}
                  >
                    {sheetName}
                  </button>
                ))}
                {sourcePreviewLoading ? <p>Loading preview...</p> : null}
                {sourcePreviewError ? <p className="mapping-studio-error">{sourcePreviewError}</p> : null}
              </aside>

              <section className="mapping-studio-grid-wrap" aria-label="Source preview">
                {sourcePreviewLoading ? (
                  <div className="mapping-preview-message">Loading source preview...</div>
                ) : sourcePreviewError ? (
                  <div className="mapping-preview-message">{sourcePreviewError}</div>
                ) : previewColumns.length ? (
                <div className="mapping-studio-grid">
                  <div
                    className="mapping-studio-grid-header"
                    style={{ gridTemplateColumns: `repeat(${previewColumns.length}, minmax(180px, 220px))` }}
                  >
                    {previewColumns.map((column) => (
                      <button
                        key={column}
                        type="button"
                        className={selectedColumnNames.has(column) ? 'mapping-preview-column-selected' : ''}
                        onClick={() => toggleColumnMapping(column)}
                      >
                        {column}
                      </button>
                    ))}
                  </div>
                  {visiblePreviewRows.map((row, rowIndex) => (
                    <div
                      key={`${row[0]}-${rowIndex}`}
                      className="mapping-studio-grid-row"
                      style={{ gridTemplateColumns: `repeat(${previewColumns.length}, minmax(180px, 220px))` }}
                    >
                      {previewColumns.map((_, cellIndex) => (
                        <span key={`${row[cellIndex] ?? ''}-${cellIndex}`}>{row[cellIndex] ?? ''}</span>
                      ))}
                    </div>
                  ))}
                </div>
                ) : (
                  <div className="mapping-preview-message">No preview data available for this source.</div>
                )}
              </section>

              <aside className="mapping-studio-selection" aria-label="Selected columns">
                <span>Selected columns</span>
                {activeColumnMappings.map((mapping) => (
                  <div key={mapping.id} className="mapping-selected-column">
                    <strong>{mapping.sourceColumn}</strong>
                    <label>
                      <span>Map to</span>
                      <select
                        value={mapping.targetField}
                        onChange={(event) => updateColumnMapping(mapping.id, { targetField: event.target.value })}
                      >
                        <option value="">Choose field</option>
                        {targetFieldOptions.map((field) => (
                          <option key={field} value={field}>{field}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Transform</span>
                      <select
                        value={mapping.transform}
                        onChange={(event) => updateColumnMapping(mapping.id, { transform: event.target.value as SourceMappingTransform })}
                      >
                        {transformOptions.map((transform) => (
                          <option key={transform} value={transform}>{transform}</option>
                        ))}
                      </select>
                    </label>
                    <label className="mapping-required-check">
                      <input
                        type="checkbox"
                        checked={mapping.required}
                        onChange={(event) => updateColumnMapping(mapping.id, { required: event.target.checked })}
                      />
                      <span>Required</span>
                    </label>
                    <button type="button" onClick={() => removeColumnMapping(mapping.id)}>Remove</button>
                  </div>
                ))}
                {activeColumnMappings.length === 0 ? (
                  <p>Select one or more preview columns to build this mapping.</p>
                ) : null}
              </aside>
            </div>

            <div className="mapping-studio-status">
              <span>Read-only preview</span>
              <span>{selectedSheetName || 'No sheet selected'}</span>
              <span>{visiblePreviewRows.length} rows shown</span>
              {sourcePreview ? <span>Header row {sourcePreview.headerRow}</span> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
