import { useMemo, useState } from 'react'
import type { ConnectionTargetId, SourceConnectionsByTarget, SourceDefinition } from '../types'

const connectionTargetIds: ConnectionTargetId[] = [
  'dashboard',
  'bom-matvar',
  'bom-l1',
  'bom-l2',
  'bom-l3',
  'documentation',
  'costing',
]

const createEmptyConnectionsByTarget = (): SourceConnectionsByTarget =>
  connectionTargetIds.reduce((connectionsByTarget, targetId) => ({
    ...connectionsByTarget,
    [targetId]: [],
  }), {} as SourceConnectionsByTarget)

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

type UseSourceConnectionsOptions = {
  sourceDefinitions: SourceDefinition[]
  sourceConnectionsByTarget: SourceConnectionsByTarget | null
}

export const useSourceConnections = ({
  sourceDefinitions,
  sourceConnectionsByTarget,
}: UseSourceConnectionsOptions) => {
  const [activeConnectionTargetId, setActiveConnectionTargetId] = useState<ConnectionTargetId>('dashboard')
  const connectionsByTarget = useMemo(() => {
    const sourceIds = new Set(sourceDefinitions.map((source) => source.id))
    const normalizedConnections = normalizeConnectionsByTarget(sourceConnectionsByTarget) ?? createEmptyConnectionsByTarget()

    return Object.fromEntries(
      connectionTargetIds.map((targetId) => [
        targetId,
        normalizedConnections[targetId].filter((sourceId) => sourceIds.has(sourceId)),
      ]),
    ) as SourceConnectionsByTarget
  }, [sourceConnectionsByTarget, sourceDefinitions])

  return {
    activeConnectionTargetId,
    setActiveConnectionTargetId,
    connectionsByTarget,
  }
}
