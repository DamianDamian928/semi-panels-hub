import { useEffect, useRef, useState } from 'react'
import type { ConnectionTargetId, SourceConnectionsByTarget, SourceDefinition } from '../types'

const legacyConnectionsStorageKey = 'semi-panels-hub.connections.v1'
const connectionTargetIds: ConnectionTargetId[] = [
  'dashboard',
  'bom-matvar',
  'bom-l1',
  'bom-l2',
  'bom-l3',
  'documentation',
  'costing',
]

const normalizeConnectionsByTarget = (value: unknown): SourceConnectionsByTarget | null => {
  if (!value || typeof value !== 'object') return null

  return Object.fromEntries(
    connectionTargetIds.map((targetId) => {
      const sourceIds = (value as Partial<Record<ConnectionTargetId, unknown>>)[targetId]
      return [
        targetId,
        Array.isArray(sourceIds)
          ? sourceIds.filter((sourceId): sourceId is string => typeof sourceId === 'string')
          : [],
      ]
    }),
  ) as SourceConnectionsByTarget
}

const readLegacyConnectionsByTarget = () => {
  try {
    const storedValue = window.localStorage.getItem(legacyConnectionsStorageKey)
    return storedValue ? normalizeConnectionsByTarget(JSON.parse(storedValue)) : null
  } catch {
    return null
  }
}

const findSourceId = (sources: SourceDefinition[], ...nameParts: string[]) => {
  const normalizedNameParts = nameParts.map((namePart) => namePart.toLowerCase())
  return sources.find((source) => {
    const sourceName = source.name.toLowerCase()
    return normalizedNameParts.some((namePart) => sourceName.includes(namePart))
  })?.id
}

const createInitialConnectionsByTarget = (sources: SourceDefinition[]): SourceConnectionsByTarget => {
  const fishbowl = findSourceId(sources, 'fishbowl')
  const massProduction = findSourceId(sources, 'mass production')
  const partsBom = findSourceId(sources, 'parts&bom', 'parts')
  const matvar = findSourceId(sources, 'matvar')
  const plm = findSourceId(sources, 'plm')
  const boxDocs = findSourceId(sources, 'box documentation')
  const sharepointDocs = findSourceId(sources, 'sharepoint documentation')

  const compact = (sourceIds: Array<string | undefined>) => sourceIds.filter(Boolean) as string[]

  return {
    dashboard: compact([massProduction, partsBom]),
    'bom-matvar': compact([matvar, partsBom]),
    'bom-l1': compact([fishbowl, partsBom, plm]),
    'bom-l2': compact([fishbowl, partsBom]),
    'bom-l3': compact([plm]),
    documentation: compact([boxDocs, sharepointDocs]),
    costing: compact([massProduction]),
  }
}

type UseSourceConnectionsOptions = {
  sourceDefinitions: SourceDefinition[]
  sourceConnectionsByTarget: SourceConnectionsByTarget | null
  saveSourceConnections: (connectionsByTarget: SourceConnectionsByTarget) => Promise<void>
}

export const useSourceConnections = ({
  sourceDefinitions,
  sourceConnectionsByTarget,
  saveSourceConnections,
}: UseSourceConnectionsOptions) => {
  const [activeConnectionTargetId, setActiveConnectionTargetId] = useState<ConnectionTargetId>('dashboard')
  const [connectionsByTarget, setConnectionsByTarget] = useState<SourceConnectionsByTarget>(() =>
    sourceConnectionsByTarget ?? readLegacyConnectionsByTarget() ?? createInitialConnectionsByTarget(sourceDefinitions),
  )
  const initialConnectionsSavedRef = useRef(false)

  useEffect(() => {
    const sourceIds = new Set(sourceDefinitions.map((source) => source.id))
    setConnectionsByTarget((current) => {
      let changed = false
      const next = Object.fromEntries(
        Object.entries(current).map(([targetId, connectedSourceIds]) => {
          const filteredSourceIds = connectedSourceIds.filter((sourceId) => sourceIds.has(sourceId))
          if (filteredSourceIds.length !== connectedSourceIds.length) changed = true
          return [targetId, filteredSourceIds]
        }),
      ) as SourceConnectionsByTarget

      if (changed) void saveSourceConnections(next).catch(() => undefined)
      return changed ? next : current
    })
  }, [sourceDefinitions])

  useEffect(() => {
    if (sourceConnectionsByTarget) setConnectionsByTarget(sourceConnectionsByTarget)
  }, [sourceConnectionsByTarget])

  useEffect(() => {
    if (sourceConnectionsByTarget !== null || initialConnectionsSavedRef.current) return

    initialConnectionsSavedRef.current = true
    void saveSourceConnections(connectionsByTarget)
      .then(() => {
        window.localStorage.removeItem(legacyConnectionsStorageKey)
      })
      .catch(() => undefined)
  }, [connectionsByTarget, sourceConnectionsByTarget])

  const connectSourceToTarget = (targetId: ConnectionTargetId, sourceId: string) => {
    setConnectionsByTarget((current) => {
      const currentSourceIds = current[targetId] ?? []
      if (currentSourceIds.includes(sourceId)) return current

      const next = {
        ...current,
        [targetId]: [...currentSourceIds, sourceId],
      }
      void saveSourceConnections(next).catch(() => undefined)
      return next
    })
    setActiveConnectionTargetId(targetId)
  }

  const disconnectSourceFromTarget = (targetId: ConnectionTargetId, sourceId: string) => {
    setConnectionsByTarget((current) => {
      const next = {
        ...current,
        [targetId]: (current[targetId] ?? []).filter((connectedSourceId) => connectedSourceId !== sourceId),
      }
      void saveSourceConnections(next).catch(() => undefined)
      return next
    })
  }

  const saveConnectionsByTarget = async (next: SourceConnectionsByTarget) => {
    setConnectionsByTarget(next)
    await saveSourceConnections(next)
  }

  return {
    activeConnectionTargetId,
    setActiveConnectionTargetId,
    connectionsByTarget,
    connectSourceToTarget,
    disconnectSourceFromTarget,
    saveConnectionsByTarget,
  }
}
