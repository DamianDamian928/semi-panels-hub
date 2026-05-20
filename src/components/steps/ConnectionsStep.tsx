import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { createMappingId } from '../../domain/sourceMapping'
import type { ConnectionTargetId, SourceDefinition, SourceMappingConfig } from '../../types'
import { connectionTargets } from '../sharedReviewUi'

type ConnectionsByTarget = Record<ConnectionTargetId, string[]>

type ConnectionsStepProps = {
  activeConnectionTargetId: ConnectionTargetId
  connectionsByTarget: ConnectionsByTarget
  mappingConfigs: Record<string, SourceMappingConfig>
  sourceDefinitions: SourceDefinition[]
  onSelectConnectionTarget: (targetId: ConnectionTargetId) => void
  onSaveConnections: (connectionsByTarget: ConnectionsByTarget) => Promise<void>
}

const getStatusToken = (status: SourceDefinition['status']) => status.toLowerCase().replace(/\s+/g, '-')

const getSourceAppIcon = (source: SourceDefinition) => {
  const extension = source.sourceFile?.extension.toLowerCase()

  if (['xlsx', 'xlsm', 'xls', 'csv', 'tsv'].includes(extension ?? '')) {
    return { label: 'X', tone: 'excel' }
  }

  if (source.type === 'Folder') return { label: '', tone: 'folder' }
  if (source.type === 'SQL') return { label: '', tone: 'sql' }
  if (source.type === 'SharePoint') return { label: 'S', tone: 'sharepoint' }
  if (source.type === 'Manual export') return { label: 'E', tone: 'export' }

  return { label: 'F', tone: 'file' }
}

type ConnectionLinkGeometry = {
  key: string
  sourceY: number
  targetY: number
  isActive: boolean
}

type ConnectionChange = {
  action: 'added' | 'removed'
  targetId: ConnectionTargetId
  targetLabel: string
  isBomTarget: boolean
  sourceId: string
  sourceLabel: string
  mappingColumns: number
}

export function ConnectionsStep({
  activeConnectionTargetId,
  connectionsByTarget,
  mappingConfigs,
  sourceDefinitions,
  onSelectConnectionTarget,
  onSaveConnections,
}: ConnectionsStepProps) {
  const [draggedSourceId, setDraggedSourceId] = useState<string | null>(null)
  const [draftConnectionsByTarget, setDraftConnectionsByTarget] = useState<ConnectionsByTarget>(connectionsByTarget)
  const [impactReviewOpen, setImpactReviewOpen] = useState(false)
  const [connectionSavePending, setConnectionSavePending] = useState(false)
  const [connectionSaveError, setConnectionSaveError] = useState<string | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 1, height: 1 })
  const [linkGeometry, setLinkGeometry] = useState<ConnectionLinkGeometry[]>([])
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const targetRefs = useRef<Partial<Record<ConnectionTargetId, HTMLButtonElement>>>({})
  const sourceRefs = useRef<Record<string, HTMLElement>>({})
  const sourceById = useMemo(
    () => new Map(sourceDefinitions.map((source) => [source.id, source])),
    [sourceDefinitions],
  )
  const activeTarget = connectionTargets.find((target) => target.id === activeConnectionTargetId) ?? connectionTargets[0]
  const activeSourceIds = (draftConnectionsByTarget[activeTarget.id] ?? []).filter((sourceId) => sourceById.has(sourceId))
  const connectionChanges = useMemo<ConnectionChange[]>(
    () =>
      connectionTargets.flatMap((target) => {
        const savedSourceIds = new Set(connectionsByTarget[target.id] ?? [])
        const draftSourceIds = new Set(draftConnectionsByTarget[target.id] ?? [])
        const added = [...draftSourceIds].filter((sourceId) => !savedSourceIds.has(sourceId))
        const removed = [...savedSourceIds].filter((sourceId) => !draftSourceIds.has(sourceId))

        return [
          ...added.map((sourceId) => {
            const source = sourceById.get(sourceId)
            return {
              action: 'added' as const,
              targetId: target.id,
              targetLabel: target.label,
              isBomTarget: target.group === 'BOM',
              sourceId,
              sourceLabel: source?.sourceFile?.name ?? source?.name ?? sourceId,
              mappingColumns: 0,
            }
          }),
          ...removed.map((sourceId) => {
            const source = sourceById.get(sourceId)
            const mapping = mappingConfigs[createMappingId(target.id, sourceId)]
            return {
              action: 'removed' as const,
              targetId: target.id,
              targetLabel: target.label,
              isBomTarget: target.group === 'BOM',
              sourceId,
              sourceLabel: source?.sourceFile?.name ?? source?.name ?? sourceId,
              mappingColumns: mapping?.columnMappings.length ?? 0,
            }
          }),
        ]
      }),
    [connectionsByTarget, draftConnectionsByTarget, mappingConfigs, sourceById],
  )
  const hasUnsavedConnectionChanges = connectionChanges.length > 0
  const bomConnectionChanges = connectionChanges.filter((change) => change.isBomTarget)
  const removedMappingsKept = connectionChanges.filter((change) => change.action === 'removed' && change.mappingColumns > 0)

  useEffect(() => {
    setDraftConnectionsByTarget(connectionsByTarget)
    setImpactReviewOpen(false)
    setConnectionSaveError(null)
  }, [connectionsByTarget])

  const updateDraftConnection = (targetId: ConnectionTargetId, sourceId: string, action: 'connect' | 'disconnect') => {
    setDraftConnectionsByTarget((current) => {
      const currentSourceIds = current[targetId] ?? []
      const nextSourceIds = action === 'connect'
        ? currentSourceIds.includes(sourceId) ? currentSourceIds : [...currentSourceIds, sourceId]
        : currentSourceIds.filter((connectedSourceId) => connectedSourceId !== sourceId)

      return {
        ...current,
        [targetId]: nextSourceIds,
      }
    })
    onSelectConnectionTarget(targetId)
    setConnectionSaveError(null)
  }

  const dropSourceOnTarget = (event: DragEvent<HTMLButtonElement>, targetId: ConnectionTargetId) => {
    event.preventDefault()
    const sourceId = event.dataTransfer.getData('text/plain')
    if (sourceId) updateDraftConnection(targetId, sourceId, 'connect')
    setDraggedSourceId(null)
  }

  const cancelConnectionChanges = () => {
    setDraftConnectionsByTarget(connectionsByTarget)
    setImpactReviewOpen(false)
    setConnectionSaveError(null)
  }

  const confirmConnectionChanges = async () => {
    setConnectionSavePending(true)
    setConnectionSaveError(null)

    try {
      await onSaveConnections(draftConnectionsByTarget)
      setImpactReviewOpen(false)
    } catch (error: unknown) {
      setConnectionSaveError(error instanceof Error ? error.message : 'Connection changes could not be saved.')
    } finally {
      setConnectionSavePending(false)
    }
  }

  const measureConnectionLinks = () => {
    const canvasElement = canvasRef.current
    if (!canvasElement) return

    const canvasRect = canvasElement.getBoundingClientRect()
    const nextGeometry: ConnectionLinkGeometry[] = []

    connectionTargets.forEach((target) => {
      const targetElement = targetRefs.current[target.id]
      if (!targetElement) return

      const targetRect = targetElement.getBoundingClientRect()
      const targetY = targetRect.top + targetRect.height / 2 - canvasRect.top

      ;(draftConnectionsByTarget[target.id] ?? []).forEach((sourceId, linkIndex) => {
        const sourceElement = sourceRefs.current[sourceId]
        if (!sourceElement) return

        const sourceRect = sourceElement.getBoundingClientRect()
        const sourceY = sourceRect.top + sourceRect.height / 2 - canvasRect.top

        nextGeometry.push({
          key: `${target.id}-${sourceId}-${linkIndex}`,
          targetY,
          sourceY,
          isActive: target.id === activeConnectionTargetId || sourceId === draggedSourceId,
        })
      })
    })

    setCanvasSize({
      width: Math.max(canvasRect.width, 1),
      height: Math.max(canvasRect.height, 1),
    })
    setLinkGeometry(nextGeometry)
  }

  useLayoutEffect(() => {
    measureConnectionLinks()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measureConnectionLinks)
      return () => window.removeEventListener('resize', measureConnectionLinks)
    }

    const observedElements = [
      canvasRef.current,
      ...connectionTargets.map((target) => targetRefs.current[target.id]),
      ...sourceDefinitions.map((source) => sourceRefs.current[source.id]),
    ].filter(Boolean) as Element[]

    const observer = new ResizeObserver(measureConnectionLinks)
    observedElements.forEach((element) => observer.observe(element))
    window.addEventListener('resize', measureConnectionLinks)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measureConnectionLinks)
    }
  }, [activeConnectionTargetId, draftConnectionsByTarget, draggedSourceId, sourceDefinitions])

  return (
    <section className="workspace-main-grid connections-workspace-grid">
      <section className="workspace-main card connections-stage">
        <div className="connections-header">
          <div>
            <p className="section-label">Connections</p>
            <h3>Source connection map</h3>
            <p>Connect registered sources to Dashboard, BOM levels, Documentation and Costing. One source can feed many targets.</p>
          </div>
          <div className="change-review-bar">
            <span className={hasUnsavedConnectionChanges ? 'change-review-status change-review-status-dirty' : 'change-review-status'}>
              {hasUnsavedConnectionChanges ? `${connectionChanges.length} unsaved changes` : 'No unsaved changes'}
            </span>
            <button
              type="button"
              className="secondary-button"
              onClick={cancelConnectionChanges}
              disabled={!hasUnsavedConnectionChanges || connectionSavePending}
            >
              Cancel changes
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => setImpactReviewOpen(true)}
              disabled={!hasUnsavedConnectionChanges || connectionSavePending}
            >
              Save changes
            </button>
          </div>
        </div>

        <div className="connection-map" aria-label="Source connection map">
          <div className="connection-map-column">
            <div className="connection-map-column-head">
              <span>Workflow targets</span>
              <strong>{activeTarget.label}</strong>
            </div>
            <div className="connection-target-list">
              {connectionTargets.map((target) => {
                const connectedIds = (draftConnectionsByTarget[target.id] ?? []).filter((sourceId) => sourceById.has(sourceId))
                const isActive = target.id === activeConnectionTargetId
                const isDropTarget = Boolean(draggedSourceId)

                return (
                  <button
                    key={target.id}
                    ref={(element) => {
                      if (element) targetRefs.current[target.id] = element
                      else delete targetRefs.current[target.id]
                    }}
                    type="button"
                    className={`connection-target-node ${isActive ? 'connection-target-node-active' : ''} ${isDropTarget ? 'connection-target-node-drop' : ''}`}
                    onClick={() => onSelectConnectionTarget(target.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => dropSourceOnTarget(event, target.id)}
                  >
                    <span className="connection-node-main">
                      <strong>{target.label}</strong>
                      <small>{target.group}</small>
                    </span>
                    <span className="connection-node-count">{connectedIds.length}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div ref={canvasRef} className="connection-canvas" aria-hidden="true">
            <svg viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`} preserveAspectRatio="none">
              {linkGeometry.map((link) => (
                <path
                  key={link.key}
                  d={`M 8 ${link.targetY} C ${canvasSize.width * 0.34} ${link.targetY}, ${canvasSize.width * 0.66} ${link.sourceY}, ${canvasSize.width - 8} ${link.sourceY}`}
                  className={`connection-link-path ${link.isActive ? 'connection-link-path-active' : ''}`}
                />
              ))}
            </svg>
          </div>

          <div className="connection-map-column">
            <div className="connection-map-column-head">
              <span>Available sources</span>
              <strong>{sourceDefinitions.length}</strong>
            </div>
            <div className="connection-source-list">
              {sourceDefinitions.map((source) => {
                const connectedToActive = activeSourceIds.includes(source.id)
                const connectionCount = connectionTargets.filter((target) => (draftConnectionsByTarget[target.id] ?? []).includes(source.id)).length
                const statusToken = getStatusToken(source.status)
                const appIcon = getSourceAppIcon(source)

                return (
                  <article
                    key={source.id}
                    ref={(element) => {
                      if (element) sourceRefs.current[source.id] = element
                      else delete sourceRefs.current[source.id]
                    }}
                    className={`connection-source-node ${connectedToActive ? 'connection-source-node-active' : ''}`}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData('text/plain', source.id)
                      event.dataTransfer.effectAllowed = 'copy'
                      setDraggedSourceId(source.id)
                    }}
                    onDragEnd={() => setDraggedSourceId(null)}
                  >
                    <span
                      className={`connection-source-app-icon connection-source-app-icon-${appIcon.tone}`}
                      aria-hidden="true"
                    >
                      {appIcon.tone === 'sql' ? (
                        <svg className="connection-source-database-svg" viewBox="0 0 64 64" focusable="false">
                          <ellipse cx="32" cy="12" rx="27" ry="9" />
                          <path d="M5 12v13c0 5 12 9 27 9s27-4 27-9V12c0 5-12 9-27 9S5 17 5 12Z" />
                          <path className="connection-source-database-gap" d="M5 25c0 5 12 9 27 9s27-4 27-9" />
                          <path d="M5 27v13c0 5 12 9 27 9s27-4 27-9V27c0 5-12 9-27 9S5 32 5 27Z" />
                          <path className="connection-source-database-gap" d="M5 40c0 5 12 9 27 9s27-4 27-9" />
                          <path d="M5 42v10c0 5 12 9 27 9s27-4 27-9V42c0 5-12 9-27 9S5 47 5 42Z" />
                        </svg>
                      ) : (
                        <>
                          <span className="connection-source-app-icon-back" />
                          <span className="connection-source-app-icon-front" />
                          <span className="connection-source-app-icon-badge">
                            {appIcon.label}
                          </span>
                        </>
                      )}
                    </span>
                    <div className="connection-source-node-content">
                      <div className="connection-source-node-top">
                      <div>
                        <h4>{source.sourceFile?.name ?? source.name}</h4>
                        <p>{source.type} / {source.owner}</p>
                      </div>
                      </div>
                      <div className="connection-source-node-meta">
                        <span className={`source-status source-status-${statusToken}`}>
                          <span className="source-status-dot" />
                          {source.status}
                        </span>
                        <span>{connectionCount} links</span>
                      </div>
                      <button
                        type="button"
                        className={`connection-node-action ${connectedToActive ? 'connection-node-action-remove' : ''}`}
                        onClick={() => {
                          if (connectedToActive) {
                            updateDraftConnection(activeTarget.id, source.id, 'disconnect')
                          } else {
                            updateDraftConnection(activeTarget.id, source.id, 'connect')
                          }
                        }}
                      >
                        {connectedToActive ? 'Disconnect' : `Connect to ${activeTarget.label}`}
                      </button>
                    </div>
                  </article>
                )
              })}

              {sourceDefinitions.length === 0 ? (
                <div className="connections-empty-state">
                  <h4>No sources available</h4>
                  <p>Add sources first, then return here to create connections.</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {impactReviewOpen ? (
        <div className="impact-modal-overlay" role="dialog" aria-modal="true" aria-label="Connection impact review">
          <div className="impact-modal">
            <div className="impact-modal-header">
              <p className="section-label">Impact review</p>
              <h3>Confirm connection changes</h3>
              <p>These connection changes will be saved as one update after confirmation.</p>
            </div>

            <dl className="impact-summary-list">
              <div>
                <dt>Changes</dt>
                <dd>{connectionChanges.length}</dd>
              </div>
              <div>
                <dt>Added</dt>
                <dd>{connectionChanges.filter((change) => change.action === 'added').length}</dd>
              </div>
              <div>
                <dt>Removed</dt>
                <dd>{connectionChanges.filter((change) => change.action === 'removed').length}</dd>
              </div>
              <div>
                <dt>BOM impact</dt>
                <dd>{bomConnectionChanges.length ? `${bomConnectionChanges.length} BOM changes can affect BOM analysis.` : 'No direct BOM target impact.'}</dd>
              </div>
              <div>
                <dt>Mapping impact</dt>
                <dd>
                  {removedMappingsKept.length
                    ? `${removedMappingsKept.length} mapping setup(s) will be excluded from active analysis, but kept for reuse.`
                    : 'No existing mapping will be removed.'}
                </dd>
              </div>
            </dl>

            <div className="impact-change-list" aria-label="Connection changes">
              {connectionChanges.map((change) => (
                <div key={`${change.action}-${change.targetId}-${change.sourceId}`} className="impact-change-row">
                  <strong>{change.action === 'added' ? 'Add' : 'Remove'}</strong>
                  <span>{change.targetLabel}</span>
                  <span>{change.sourceLabel}</span>
                </div>
              ))}
            </div>

            {connectionSaveError ? <p className="impact-error">{connectionSaveError}</p> : null}

            <div className="impact-modal-actions">
              <button type="button" className="secondary-button" onClick={() => setImpactReviewOpen(false)} disabled={connectionSavePending}>
                Cancel
              </button>
              <button type="button" className="primary-button" onClick={() => { void confirmConnectionChanges() }} disabled={connectionSavePending}>
                {connectionSavePending ? 'Saving...' : 'Confirm and save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
