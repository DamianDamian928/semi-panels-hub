import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import type { ConnectionTargetId, SourceDefinition } from '../../types'
import { connectionTargets, SourceTypeGlyph } from '../sharedReviewUi'

type ConnectionsByTarget = Record<ConnectionTargetId, string[]>

type ConnectionsStepProps = {
  activeConnectionTargetId: ConnectionTargetId
  connectionsByTarget: ConnectionsByTarget
  sourceDefinitions: SourceDefinition[]
  onSelectConnectionTarget: (targetId: ConnectionTargetId) => void
  onConnectSourceToTarget: (targetId: ConnectionTargetId, sourceId: string) => void
  onDisconnectSourceFromTarget: (targetId: ConnectionTargetId, sourceId: string) => void
}

const getStatusToken = (status: SourceDefinition['status']) => status.toLowerCase().replace(/\s+/g, '-')

type ConnectionLinkGeometry = {
  key: string
  sourceY: number
  targetY: number
  isActive: boolean
}

export function ConnectionsStep({
  activeConnectionTargetId,
  connectionsByTarget,
  sourceDefinitions,
  onSelectConnectionTarget,
  onConnectSourceToTarget,
  onDisconnectSourceFromTarget,
}: ConnectionsStepProps) {
  const [draggedSourceId, setDraggedSourceId] = useState<string | null>(null)
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

  const dropSourceOnTarget = (event: DragEvent<HTMLButtonElement>, targetId: ConnectionTargetId) => {
    event.preventDefault()
    const sourceId = event.dataTransfer.getData('text/plain')
    if (sourceId) onConnectSourceToTarget(targetId, sourceId)
    setDraggedSourceId(null)
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

      ;(connectionsByTarget[target.id] ?? []).forEach((sourceId, linkIndex) => {
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
  }, [activeConnectionTargetId, connectionsByTarget, draggedSourceId, sourceDefinitions])

  return (
    <section className="workspace-main-grid connections-workspace-grid">
      <section className="workspace-main card connections-stage">
        <div className="connections-header">
          <div>
            <p className="section-label">Connections</p>
            <h3>Source connection map</h3>
            <p>Connect registered sources to Dashboard, BOM levels, Documentation and Costing. One source can feed many targets.</p>
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
                const connectedIds = (connectionsByTarget[target.id] ?? []).filter((sourceId) => sourceById.has(sourceId))
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
                const connectionCount = connectionTargets.filter((target) => (connectionsByTarget[target.id] ?? []).includes(source.id)).length
                const statusToken = getStatusToken(source.status)

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
                    <div className="connection-source-node-top">
                      <span className={`source-type-icon source-type-icon-compact source-type-icon-${source.type.toLowerCase().replace(/\s+/g, '-')}`}>
                        <SourceTypeGlyph type={source.type} className="source-type-glyph" />
                      </span>
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
                          onDisconnectSourceFromTarget(activeTarget.id, source.id)
                        } else {
                          onConnectSourceToTarget(activeTarget.id, source.id)
                        }
                      }}
                    >
                      {connectedToActive ? 'Disconnect' : `Connect to ${activeTarget.label}`}
                    </button>
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
    </section>
  )
}
