import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
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
  connectionsByTarget: Record<ConnectionTargetId, string[]>
  mappingConfigs: Record<string, SourceMappingConfig>
  sourceDefinitions: SourceDefinition[]
  onSelectMapping: (mappingId: string) => void
  onSelectConnectionTarget: (targetId: ConnectionTargetId) => void
  onSaveMappings: (mappingConfigs: Record<string, SourceMappingConfig>) => Promise<void>
  onApplyMapping: (mappingId: string, mappingConfig: SourceMappingConfig) => Promise<void>
}

export type MappingStepHandle = {
  hasUnsavedChanges: () => boolean
  saveChanges: () => Promise<void>
  discardChanges: () => void
}

type MappingRow = {
  config: SourceMappingConfig
  source: SourceDefinition
  targetLabel: string
}

type MappingChangeSummary = {
  mappingId: string
  action: 'added' | 'updated' | 'cleared'
  targetId: ConnectionTargetId
  targetLabel: string
  sourceLabel: string
  isBomTarget: boolean
  changedFields: string[]
}

type PendingMappingSave = {
  action: 'save' | 'apply'
  mappingId?: string
  mappingConfig?: SourceMappingConfig
}

const roleOptions: SourceConnectionRole[] = ['Primary', 'Reference', 'Validation', 'Comparison']
const statusOptions: SourceMappingStatus[] = ['Needs mapping', 'Ready', 'Error']
const transformOptions: SourceMappingTransform[] = ['None', 'Trim', 'Uppercase', 'Distinct']
const createColumnSelectionKey = (sheetName: string, sourceColumn: string) => `${sheetName}:${sourceColumn}`
const targetFieldOptions = [
  'Intel Model Number',
  'Customer',
  'Forecast Qty',
  'Status',
  'Owner',
  'Last Updated',
  'Part Number',
  'Description',
  'Revision',
  'UoM',
  'Item',
  'ORACLE Item Description',
  'INTEL Description',
  'Phantom L1',
  'Scope',
]

export const MappingStep = forwardRef<MappingStepHandle, MappingStepProps>(function MappingStep({
  activeMappingId,
  connectionsByTarget,
  mappingConfigs,
  sourceDefinitions,
  onSelectMapping,
  onSelectConnectionTarget,
  onSaveMappings,
  onApplyMapping,
}, ref) {
  const [studioOpen, setStudioOpen] = useState(false)
  const [activeSheetName, setActiveSheetName] = useState<string | null>(null)
  const [filterText, setFilterText] = useState('')
  const [sourcePreview, setSourcePreview] = useState<SourcePreviewPayload | null>(null)
  const [sourcePreviewLoading, setSourcePreviewLoading] = useState(false)
  const [sourcePreviewError, setSourcePreviewError] = useState<string | null>(null)
  const [mappingApplyPending, setMappingApplyPending] = useState(false)
  const [mappingApplyMessage, setMappingApplyMessage] = useState<string | null>(null)
  const [mappingApplyError, setMappingApplyError] = useState<string | null>(null)
  const [draftMappingConfigs, setDraftMappingConfigs] = useState<Record<string, SourceMappingConfig>>(mappingConfigs)
  const [pendingMappingSave, setPendingMappingSave] = useState<PendingMappingSave | null>(null)
  const isMountedRef = useRef(true)
  const sourceById = useMemo(
    () => new Map(sourceDefinitions.map((source) => [source.id, source])),
    [sourceDefinitions],
  )

  const mappingRows = useMemo<MappingRow[]>(
    () => {
      return connectionTargets.flatMap((target) =>
        (connectionsByTarget[target.id] ?? []).flatMap((sourceId) => {
          const source = sourceById.get(sourceId)
          if (!source) return []

          const mappingId = createMappingId(target.id, sourceId)
          return [{
            config: draftMappingConfigs[mappingId] ?? createDefaultMappingConfig(target.id, sourceId),
            source,
            targetLabel: target.label,
          }]
        }),
      )
    },
    [connectionsByTarget, draftMappingConfigs, sourceById],
  )

  const activeRow = mappingRows.find((row) => row.config.id === activeMappingId) ?? mappingRows[0]
  const activeColumnMappings = activeRow?.config.columnMappings ?? []
  const activeSourceLabel = activeRow?.source.sourceFile?.name ?? activeRow?.source.name ?? ''
  const selectedColumnKeys = new Set(activeColumnMappings.map((mapping) => createColumnSelectionKey(mapping.sheetName, mapping.sourceColumn)))
  const previewColumns = sourcePreview?.columns ?? []
  const previewRows = sourcePreview?.rows ?? []
  const previewSheets = sourcePreview?.sheets ?? []
  const selectedSheetName = activeSheetName ?? sourcePreview?.activeSheetName ?? ''
  const visiblePreviewRows = previewRows.filter((row) =>
    row.some((cell) => cell.toLowerCase().includes(filterText.toLowerCase())),
  )
  const canApplyMapping = Boolean(activeRow && activeColumnMappings.length > 0)
  const mappingChangeSummary = useMemo<MappingChangeSummary[]>(
    () => {
      const mappingIds = new Set([...Object.keys(mappingConfigs), ...Object.keys(draftMappingConfigs)])

      return [...mappingIds].flatMap((mappingId) => {
        const savedConfig = mappingConfigs[mappingId]
        const draftConfig = draftMappingConfigs[mappingId]
        if (JSON.stringify(savedConfig ?? null) === JSON.stringify(draftConfig ?? null)) return []
        if (!draftConfig) return []

        const [targetId, sourceId] = mappingId.split(':') as [ConnectionTargetId, string]
        const target = connectionTargets.find((candidate) => candidate.id === targetId)
        const source = sourceById.get(sourceId)
        const changedFields = [
          'role',
          'status',
          'sheetName',
          'keyColumn',
          'partNumberColumn',
          'quantityColumn',
          'revisionColumn',
          'columnMappings',
        ].filter((fieldName) =>
          JSON.stringify(savedConfig?.[fieldName as keyof SourceMappingConfig] ?? null) !==
          JSON.stringify(draftConfig[fieldName as keyof SourceMappingConfig] ?? null),
        )

        return [{
          mappingId,
          action: !savedConfig
            ? 'added' as const
            : draftConfig.columnMappings.length === 0 && (savedConfig.columnMappings?.length ?? 0) > 0
              ? 'cleared' as const
              : 'updated' as const,
          targetId,
          targetLabel: target?.label ?? targetId,
          sourceLabel: source?.sourceFile?.name ?? source?.name ?? sourceId,
          isBomTarget: targetId.startsWith('bom-'),
          changedFields,
        }]
      })
    },
    [draftMappingConfigs, mappingConfigs, sourceById],
  )
  const hasUnsavedMappingChanges = mappingChangeSummary.length > 0
  const bomMappingChanges = mappingChangeSummary.filter((change) => change.isBomTarget)
  const mappingReadyCount = mappingRows.filter((row) => row.config.status === 'Ready').length
  const needsMappingCount = mappingRows.filter((row) => row.config.status === 'Needs mapping').length
  const totalMappedColumnCount = mappingRows.reduce((count, row) => count + row.config.columnMappings.length, 0)
  const activeMappingStatusClass = activeRow?.config.status.toLowerCase().replace(/\s+/g, '-') ?? 'needs-mapping'

  useEffect(() => {
    setDraftMappingConfigs(mappingConfigs)
    setPendingMappingSave(null)
    setMappingApplyError(null)
  }, [mappingConfigs])

  const updateDraftMappingConfig = (mappingId: string, update: Partial<SourceMappingConfig>) => {
    const [targetId, sourceId] = mappingId.split(':') as [ConnectionTargetId, string]

    setDraftMappingConfigs((current) => ({
      ...current,
      [mappingId]: {
        ...(current[mappingId] ?? createDefaultMappingConfig(targetId, sourceId)),
        ...update,
        id: mappingId,
        targetId,
        sourceId,
      },
    }))
    setMappingApplyMessage(null)
    setMappingApplyError(null)
  }

  const requestMappingUpdate = (update: Partial<SourceMappingConfig>) => {
    if (!activeRow) return
    updateDraftMappingConfig(activeRow.config.id, update)
  }

  const cancelMappingChanges = () => {
    setDraftMappingConfigs(mappingConfigs)
    setPendingMappingSave(null)
    setMappingApplyMessage(null)
    setMappingApplyError(null)
  }

  const requestMappingSave = (action: PendingMappingSave['action']) => {
    if (action === 'apply') {
      if (!activeRow || !canApplyMapping) return
      setPendingMappingSave({
        action,
        mappingId: activeRow.config.id,
        mappingConfig: activeRow.config,
      })
      return
    }

    setPendingMappingSave({ action })
  }

  const saveDraftMappings = async () => {
    await onSaveMappings(draftMappingConfigs)
  }

  const saveMappingChanges = async () => {
    setMappingApplyPending(true)
    setMappingApplyMessage(null)
    setMappingApplyError(null)

    try {
      if (hasUnsavedMappingChanges) await saveDraftMappings()
      if (isMountedRef.current) {
        setPendingMappingSave(null)
        setMappingApplyMessage('Mapping changes were saved.')
      }
    } catch (error: unknown) {
      if (isMountedRef.current) {
        setMappingApplyError(error instanceof Error ? error.message : 'Mapping changes could not be saved.')
      }
      throw error
    } finally {
      if (isMountedRef.current) setMappingApplyPending(false)
    }
  }

  const confirmPendingMappingSave = async () => {
    if (!pendingMappingSave) return

    setMappingApplyPending(true)
    setMappingApplyMessage(null)
    setMappingApplyError(null)

    try {
      if (hasUnsavedMappingChanges) await saveDraftMappings()

      if (pendingMappingSave.action === 'apply' && pendingMappingSave.mappingId && pendingMappingSave.mappingConfig) {
        await onApplyMapping(pendingMappingSave.mappingId, pendingMappingSave.mappingConfig)
        if (!isMountedRef.current) return
        setMappingApplyMessage(
          pendingMappingSave.mappingConfig.targetId === 'dashboard'
            ? 'Dashboard was rebuilt from selected columns.'
            : 'Mapping was saved as ready for this workflow target.',
        )
      } else if (isMountedRef.current) {
        setMappingApplyMessage('Mapping changes were saved.')
      }

      if (isMountedRef.current) setPendingMappingSave(null)
    } catch (error: unknown) {
      if (!isMountedRef.current) return
      setMappingApplyError(error instanceof Error ? error.message : 'Mapping changes could not be saved.')
    } finally {
      if (isMountedRef.current) setMappingApplyPending(false)
    }
  }

  useImperativeHandle(ref, () => ({
    hasUnsavedChanges: () => hasUnsavedMappingChanges,
    saveChanges: saveMappingChanges,
    discardChanges: cancelMappingChanges,
  }), [hasUnsavedMappingChanges, draftMappingConfigs, mappingConfigs])

  const pendingSaveBomImpact = pendingMappingSave?.action === 'apply'
    ? Boolean(pendingMappingSave.mappingConfig?.targetId.startsWith('bom-') || bomMappingChanges.length)
    : bomMappingChanges.length > 0

  const pendingSaveChangeCount = pendingMappingSave?.action === 'apply' && !hasUnsavedMappingChanges
    ? 1
    : mappingChangeSummary.length

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
    }
  }, [])

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

    requestMappingUpdate({ columnMappings: nextMappings })
  }

  const updateColumnMapping = (mappingId: string, update: Partial<SourceColumnMapping>) => {
    if (!activeRow) return

    requestMappingUpdate({
      columnMappings: activeColumnMappings.map((mapping) =>
        mapping.id === mappingId ? { ...mapping, ...update } : mapping,
      ),
    })
  }

  const removeColumnMapping = (mappingId: string) => {
    if (!activeRow) return

    requestMappingUpdate({
      columnMappings: activeColumnMappings.filter((mapping) => mapping.id !== mappingId),
    })
  }

  const deleteActiveMappingConfig = () => {
    if (!activeRow) return

    requestMappingUpdate({
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
      <section className="sources-registry-grid sources-registry-grid-with-detail mapping-registry-grid">
        <section className="workspace-main card sources-registry-main mapping-registry-main">
          <div className="sources-registry-header mapping-header">
            <div>
              <p className="section-label">Mapping</p>
              <h3>Source mapping</h3>
            </div>
            <div className="sources-registry-actions mapping-registry-actions" aria-label="Mapping actions">
              <span className={hasUnsavedMappingChanges ? 'change-review-status change-review-status-dirty' : 'change-review-status'}>
                {hasUnsavedMappingChanges ? `${mappingChangeSummary.length} unsaved changes` : 'No unsaved changes'}
              </span>
              <button
                type="button"
                className="secondary-button source-action-button"
                onClick={cancelMappingChanges}
                disabled={!hasUnsavedMappingChanges || mappingApplyPending}
              >
                Cancel changes
              </button>
              <button
                type="button"
                className="secondary-button source-action-button"
                onClick={() => requestMappingSave('save')}
                disabled={!hasUnsavedMappingChanges || mappingApplyPending}
              >
                Save changes
              </button>
            </div>
          </div>

          <div className="source-summary-grid" aria-label="Mapping summary">
            <article className="source-summary-card">
              <span>Total connections</span>
              <strong>{mappingRows.length}</strong>
            </article>
            <article className="source-summary-card">
              <span>Ready</span>
              <strong>{mappingReadyCount}</strong>
            </article>
            <article className="source-summary-card">
              <span>Needs mapping</span>
              <strong>{needsMappingCount}</strong>
            </article>
            <article className="source-summary-card">
              <span>Mapped columns</span>
              <strong>{totalMappedColumnCount}</strong>
            </article>
          </div>

          <div className="source-registry-list mapping-registry-list" aria-label="Source mappings">
            <div className="source-registry-list-head mapping-registry-list-head" aria-hidden="true">
              <span className="source-registry-icon-head" />
              <span>Workflow target</span>
              <span>Source</span>
              <span>Mapped columns</span>
              <span>Status</span>
            </div>

            {mappingRows.map((row) => {
              const isActive = row.config.id === activeRow?.config.id
              return (
                <button
                  key={row.config.id}
                  type="button"
                  className={`source-registry-row mapping-registry-row ${isActive ? 'source-registry-row-active' : ''}`}
                  onClick={() => {
                    onSelectConnectionTarget(row.config.targetId)
                    onSelectMapping(row.config.id)
                  }}
                >
                  <span className="source-registry-type" role="img" aria-label={row.source.type} title={row.source.type}>
                    <span className={`source-type-icon source-type-icon-compact source-type-icon-${row.source.type.toLowerCase().replace(/\s+/g, '-')}`}>
                      <SourceTypeGlyph type={row.source.type} className="source-type-glyph" />
                    </span>
                  </span>
                  <span className="source-registry-name mapping-target-name">
                    <strong>{row.targetLabel}</strong>
                  </span>
                  <span className="source-application-type" title={row.source.sourceFile?.name ?? row.source.name}>
                    {row.source.sourceFile?.name ?? row.source.name}
                  </span>
                  <span className="source-file-size">
                    {row.config.columnMappings.length}
                  </span>
                  <span className={`source-status source-status-${row.config.status.toLowerCase().replace(/\s+/g, '-')}`}>
                    <span className="source-status-dot" />
                    {row.config.status}
                  </span>
                </button>
              )
            })}

            {mappingRows.length === 0 ? (
              <div className="source-registry-empty">
                <strong>No active connections to map</strong>
                <p>Create connections in the Connections step, then return here to configure column mapping.</p>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="workspace-side-panel card source-detail-panel mapping-detail-panel" aria-label="Mapping details">
          {activeRow ? (
            <>
              <div className="source-connector-header">
                <div>
                  <p className="section-label">Mapping details</p>
                  <h2>{activeRow.targetLabel}</h2>
                  <p>{activeRow.source.sourceFile?.name ?? activeRow.source.name}</p>
                </div>
              </div>

              <p className="source-detail-section-title">Details</p>
              <dl className="source-property-list">
                <div className="source-property-row">
                  <dt>Status</dt>
                  <dd>
                    <span className={`source-status source-status-${activeMappingStatusClass}`}>
                      <span className="source-status-dot" />
                      {activeRow.config.status}
                    </span>
                  </dd>
                </div>
                <div className="source-property-row">
                  <dt>Target</dt>
                  <dd>{activeRow.targetLabel}</dd>
                </div>
                <div className="source-property-row">
                  <dt>Source</dt>
                  <dd>{activeRow.source.sourceFile?.name ?? activeRow.source.name}</dd>
                </div>
                <div className="source-property-row">
                  <dt>Columns</dt>
                  <dd>{activeColumnMappings.length}</dd>
                </div>
              </dl>

              <div className="mapping-detail-controls">
                <label className="source-form-field">
                  <span>Role</span>
                  <select
                    value={activeRow.config.role}
                    onChange={(event) => requestMappingUpdate({ role: event.target.value as SourceConnectionRole })}
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
                    onChange={(event) => requestMappingUpdate({ status: event.target.value as SourceMappingStatus })}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>
              </div>

              <p className="source-detail-section-title">Selected columns</p>
              <div className="mapping-selected-summary mapping-detail-selected-summary">
                {activeColumnMappings.length ? (
                  activeColumnMappings.map((mapping) => (
                    <span key={mapping.id}>{activeSourceLabel} / {mapping.sheetName} / {mapping.sourceColumn}</span>
                  ))
                ) : (
                  <p>No columns selected yet.</p>
                )}
              </div>

              <div className="source-detail-actions mapping-detail-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setStudioOpen(true)}
                >
                  Open Mapping Studio
                </button>
              </div>
            </>
          ) : (
            <div className="source-connector-header">
              <div>
                <p className="section-label">Mapping details</p>
                <h2>No mapping selected</h2>
                <p>Connections created in the previous step will appear here.</p>
              </div>
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

            <div className="mapping-studio-body">
              <section className="mapping-studio-registry" aria-label="Workbook preview">
                <div className="mapping-studio-registry-header">
                  <div>
                    <p className="section-label">Sheets</p>
                    <h3>Workbook preview</h3>
                  </div>
                  <div className="mapping-studio-toolbar" aria-label="Mapping Studio toolbar">
                    <button type="button" onClick={() => requestMappingUpdate({ status: 'Ready' })}>Set Ready</button>
                    <button
                      type="button"
                      onClick={() => requestMappingSave('save')}
                      disabled={!hasUnsavedMappingChanges || mappingApplyPending}
                    >
                      Save changes
                    </button>
                    <button
                      type="button"
                      className="mapping-studio-primary-action"
                      onClick={() => requestMappingSave('apply')}
                      disabled={!canApplyMapping || mappingApplyPending}
                    >
                      {mappingApplyPending ? 'Applying...' : 'Apply mapping'}
                    </button>
                    <button type="button" className="mapping-studio-danger-action" onClick={deleteActiveMappingConfig}>Delete mapping</button>
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
                </div>

                <div className="mapping-studio-registry-content">
                  <aside className="mapping-studio-sheets" aria-label="Workbook sheets">
                    <span>Sheets</span>
                    {previewSheets.map((sheetName) => (
                      <button
                        key={sheetName}
                        type="button"
                        className={sheetName === selectedSheetName ? 'mapping-studio-sheet-active' : ''}
                        onClick={() => setActiveSheetName(sheetName)}
                      >
                        <span>{sheetName}</span>
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
                            className={selectedColumnKeys.has(createColumnSelectionKey(selectedSheetName, column)) ? 'mapping-preview-column-selected' : ''}
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
                          {previewColumns.map((column, cellIndex) => (
                            <span
                              key={`${row[cellIndex] ?? ''}-${cellIndex}`}
                              className={selectedColumnKeys.has(createColumnSelectionKey(selectedSheetName, column)) ? 'mapping-preview-cell-selected' : ''}
                            >
                              {row[cellIndex] ?? ''}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                    ) : (
                      <div className="mapping-preview-message">No preview data available for this source.</div>
                    )}
                  </section>
                </div>
              </section>

              <aside className="mapping-studio-selection" aria-label="Selected columns">
                <div className="mapping-studio-selection-header">
                  <div>
                    <p className="section-label">Column configuration</p>
                    <h3>{activeColumnMappings[0]?.sourceColumn ?? 'No column selected'}</h3>
                  </div>
                  <button type="button" onClick={() => setStudioOpen(false)}>Close</button>
                </div>
                <span>Selected columns</span>
                {activeColumnMappings.map((mapping) => (
                  <div key={mapping.id} className="mapping-selected-column">
                    <span className="mapping-selected-column-context">{activeSourceLabel}</span>
                    <span className="mapping-selected-column-context">{mapping.sheetName}</span>
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
              {hasUnsavedMappingChanges ? <span>{mappingChangeSummary.length} unsaved changes</span> : null}
              {sourcePreview ? <span>Header row {sourcePreview.headerRow}</span> : null}
              {mappingApplyMessage ? <span>{mappingApplyMessage}</span> : null}
              {mappingApplyError ? <span className="mapping-studio-error">{mappingApplyError}</span> : null}
            </div>
          </div>
        </div>
      ) : null}

      {pendingMappingSave ? (
        <div className="impact-modal-overlay" role="dialog" aria-modal="true" aria-label="Mapping impact review">
          <div className="impact-modal">
            <div className="impact-modal-header">
              <p className="section-label">Impact review</p>
              <h3>{pendingMappingSave.action === 'apply' ? 'Confirm save and apply' : 'Confirm mapping changes'}</h3>
              <p>These mapping changes will be saved as one update after confirmation.</p>
            </div>

            <dl className="impact-summary-list">
              <div>
                <dt>Action</dt>
                <dd>{pendingMappingSave.action === 'apply' ? 'Save current mapping setup and apply active mapping' : 'Save mapping setup'}</dd>
              </div>
              <div>
                <dt>Changes</dt>
                <dd>{pendingSaveChangeCount}</dd>
              </div>
              <div>
                <dt>Changed mappings</dt>
                <dd>{mappingChangeSummary.length ? mappingChangeSummary.length : 'No draft changes; active mapping will be applied.'}</dd>
              </div>
              <div>
                <dt>BOM impact</dt>
                <dd>{pendingSaveBomImpact ? 'Yes, this can affect BOM validation and comparison.' : 'No direct BOM target impact.'}</dd>
              </div>
              <div>
                <dt>Analysis impact</dt>
                <dd>
                  {pendingMappingSave.action === 'apply'
                    ? 'The workflow will treat this mapping as the confirmed reading setup for this source.'
                    : 'Validation and downstream analysis will use the confirmed mapping values after save.'}
                </dd>
              </div>
            </dl>

            {mappingChangeSummary.length ? (
              <div className="impact-change-list" aria-label="Mapping changes">
                {mappingChangeSummary.map((change) => (
                  <div key={change.mappingId} className="impact-change-row">
                    <strong>{change.action}</strong>
                    <span>{change.targetLabel}</span>
                    <span>{change.sourceLabel}</span>
                    <small>{change.changedFields.join(', ') || 'Mapping settings'}</small>
                  </div>
                ))}
              </div>
            ) : null}

            {mappingApplyError ? <p className="impact-error">{mappingApplyError}</p> : null}

            <div className="impact-modal-actions">
              <button type="button" className="secondary-button" onClick={() => setPendingMappingSave(null)} disabled={mappingApplyPending}>
                Cancel
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => { void confirmPendingMappingSave() }}
                disabled={mappingApplyPending}
              >
                {mappingApplyPending ? 'Saving...' : 'Confirm and save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
})
