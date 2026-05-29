import { forwardRef, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ConnectionTargetId, SourceConnectionRolesByTarget, SourceDefinition } from '../../types'
import { connectionTargets } from '../sharedReviewUi'

type ConnectionsByTarget = Record<ConnectionTargetId, string[]>

type ConnectionsStepProps = {
  activeConnectionTargetId: ConnectionTargetId
  connectionsByTarget: ConnectionsByTarget
  connectionRolesByTarget: SourceConnectionRolesByTarget | null
  sourceDefinitions: SourceDefinition[]
  onSelectConnectionTarget: (targetId: ConnectionTargetId) => void
}

export type ConnectionsStepHandle = {
  hasUnsavedChanges: () => boolean
  saveChanges: () => Promise<void>
  discardChanges: () => void
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

export const ConnectionsStep = forwardRef<ConnectionsStepHandle, ConnectionsStepProps>(function ConnectionsStep({
  activeConnectionTargetId,
  connectionsByTarget,
  connectionRolesByTarget,
  sourceDefinitions,
  onSelectConnectionTarget,
}, ref) {
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
  const activeSourceIds = (connectionsByTarget[activeTarget.id] ?? []).filter((sourceId) => sourceById.has(sourceId))
  const connectedSourceIds = new Set(
    connectionTargets.flatMap((target) =>
      (connectionsByTarget[target.id] ?? []).filter((sourceId) => sourceById.has(sourceId)),
    ),
  )
  const totalConnectionCount = connectionTargets.reduce(
    (count, target) => count + (connectionsByTarget[target.id] ?? []).filter((sourceId) => sourceById.has(sourceId)).length,
    0,
  )

  useImperativeHandle(ref, () => ({
    hasUnsavedChanges: () => false,
    saveChanges: async () => undefined,
    discardChanges: () => undefined,
  }), [])

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

      ;(connectionsByTarget[target.id] ?? []).forEach((sourceId, linkIndex) => {
        const sourceElement = sourceRefs.current[sourceId]
        if (!sourceElement) return

        const sourceRect = sourceElement.getBoundingClientRect()
        const sourceY = sourceRect.top + sourceRect.height / 2 - canvasRect.top

        nextGeometry.push({
          key: `${target.id}-${sourceId}-${linkIndex}`,
          targetY,
          sourceY,
          isActive: target.id === activeConnectionTargetId,
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
  }, [activeConnectionTargetId, connectionsByTarget, sourceDefinitions])

  return (
    <section className="workspace-main-grid connections-workspace-grid">
      <section className="workspace-main card connections-stage">
        <div className="sources-registry-header connections-header">
          <div>
            <p className="section-label">Connections</p>
            <h3>Source connection map</h3>
            <p>Generated from workflow comparison contracts. These links show the sources currently used by each target.</p>
          </div>
          <div className="sources-registry-actions connections-registry-actions" aria-label="Connection actions">
            <span className="change-review-status">
              Generated from comparison
            </span>
          </div>
        </div>

        <div className="source-summary-grid connections-summary-grid" aria-label="Connection summary">
          <article className="source-summary-card">
            <span>Workflow targets</span>
            <strong>{connectionTargets.length}</strong>
          </article>
          <article className="source-summary-card">
            <span>Connected sources</span>
            <strong>{connectedSourceIds.size}</strong>
          </article>
          <article className="source-summary-card">
            <span>Available sources</span>
            <strong>{sourceDefinitions.length}</strong>
          </article>
          <article className="source-summary-card">
            <span>Total links</span>
            <strong>{totalConnectionCount}</strong>
          </article>
        </div>

        <div className="connection-map" aria-label="Source connection map">
          <div className="connection-map-column">
            <div className="connection-map-column-head">
              <span>Workflow targets</span>
            </div>
            <div className="connection-target-list">
              {connectionTargets.map((target) => {
                const connectedIds = (connectionsByTarget[target.id] ?? []).filter((sourceId) => sourceById.has(sourceId))
                const isActive = target.id === activeConnectionTargetId

                return (
                  <button
                    key={target.id}
                    ref={(element) => {
                      if (element) targetRefs.current[target.id] = element
                      else delete targetRefs.current[target.id]
                    }}
                    type="button"
                    className={`connection-target-node ${isActive ? 'connection-target-node-active' : ''}`}
                    onClick={() => onSelectConnectionTarget(target.id)}
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
            </div>
            <div className="connection-source-list">
              {sourceDefinitions.map((source) => {
                const connectedToActive = activeSourceIds.includes(source.id)
                const activeConnectionRole = connectionRolesByTarget?.[activeTarget.id]?.[source.id] ?? null
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
                        <h4>{source.sourceFile?.name ?? source.name}</h4>
                      </div>
                      <div className="connection-source-node-meta">
                        <span className={`source-status source-status-${statusToken}`}>
                          <span className="source-status-dot" />
                          {source.status}
                        </span>
                        {activeConnectionRole ? (
                          <span className="connection-source-role">{activeConnectionRole}</span>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`connection-node-action ${connectedToActive ? 'connection-node-action-remove' : ''}`}
                      disabled
                    >
                      {connectedToActive ? 'Linked' : 'Available'}
                    </button>
                  </article>
                )
              })}

              {sourceDefinitions.length === 0 ? (
                <div className="connections-empty-state">
                  <h4>No sources available</h4>
                  <p>Add sources first, then run workflow validation and comparison to generate connections.</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

    </section>
  )
})
