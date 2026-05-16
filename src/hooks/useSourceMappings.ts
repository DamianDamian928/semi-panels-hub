import { useEffect, useState } from 'react'
import { createDefaultMappingConfig, createMappingId } from '../domain/sourceMapping'
import type { ConnectionTargetId, ProcessStep, SourceConnectionsByTarget, SourceDefinition, SourceMappingConfig } from '../types'

type UseSourceMappingsOptions = {
  activeConnectionTargetId: ConnectionTargetId
  connectionsByTarget: SourceConnectionsByTarget
  currentProcessStep: ProcessStep
  sourceDefinitions: SourceDefinition[]
  sourceMappingConfigs: Record<string, SourceMappingConfig>
  saveSourceMappings: (mappingConfigs: Record<string, SourceMappingConfig>) => Promise<void>
}

export const useSourceMappings = ({
  activeConnectionTargetId,
  connectionsByTarget,
  currentProcessStep,
  sourceDefinitions,
  sourceMappingConfigs,
  saveSourceMappings,
}: UseSourceMappingsOptions) => {
  const [activeMappingId, setActiveMappingId] = useState<string>(() => createMappingId('dashboard', '1'))
  const [mappingConfigs, setMappingConfigs] = useState<Record<string, SourceMappingConfig>>(() => sourceMappingConfigs)

  useEffect(() => {
    setMappingConfigs(sourceMappingConfigs)
  }, [sourceMappingConfigs])

  const updateMappingConfig = (mappingId: string, update: Partial<SourceMappingConfig>) => {
    const [targetId, sourceId] = mappingId.split(':') as [ConnectionTargetId, string]

    setMappingConfigs((current) => {
      const next = {
        ...current,
        [mappingId]: {
          ...(current[mappingId] ?? createDefaultMappingConfig(targetId, sourceId)),
          ...update,
          id: mappingId,
          targetId,
          sourceId,
        },
      }
      void saveSourceMappings(next).catch(() => undefined)
      return next
    })
  }

  useEffect(() => {
    if (currentProcessStep !== 'Mapping') return

    const sourceIds = new Set(sourceDefinitions.map((source) => source.id))
    const activeAvailableMappingIds = (connectionsByTarget[activeConnectionTargetId] ?? [])
      .filter((sourceId) => sourceIds.has(sourceId))
      .map((sourceId) => createMappingId(activeConnectionTargetId, sourceId))
    const activeAvailableMappingIdSet = new Set(activeAvailableMappingIds)
    const allAvailableMappingIdSet = new Set(
      Object.entries(connectionsByTarget).flatMap(([targetId, connectedSourceIds]) =>
        connectedSourceIds
          .filter((sourceId) => sourceIds.has(sourceId))
          .map((sourceId) => createMappingId(targetId as ConnectionTargetId, sourceId)),
      ),
    )

    if (!activeAvailableMappingIdSet.has(activeMappingId)) {
      setActiveMappingId(activeAvailableMappingIds[0] ?? '')
    }

    setMappingConfigs((current) => {
      let changed = false
      const next = Object.fromEntries(
        Object.entries(current).filter(([mappingId]) => {
          const keep = allAvailableMappingIdSet.has(mappingId)
          if (!keep) changed = true
          return keep
        }),
      ) as Record<string, SourceMappingConfig>

      if (changed) void saveSourceMappings(next).catch(() => undefined)
      return changed ? next : current
    })
  }, [activeConnectionTargetId, activeMappingId, connectionsByTarget, currentProcessStep, sourceDefinitions])

  return {
    activeMappingId,
    setActiveMappingId,
    mappingConfigs,
    updateMappingConfig,
  }
}
