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

  const saveMappingConfigs = async (next: Record<string, SourceMappingConfig>) => {
    setMappingConfigs(next)
    await saveSourceMappings(next)
  }

  useEffect(() => {
    if (currentProcessStep !== 'Mapping') return

    const sourceIds = new Set(sourceDefinitions.map((source) => source.id))
    const activeAvailableMappingIds = (connectionsByTarget[activeConnectionTargetId] ?? [])
      .filter((sourceId) => sourceIds.has(sourceId))
      .map((sourceId) => createMappingId(activeConnectionTargetId, sourceId))
    const activeAvailableMappingIdSet = new Set(activeAvailableMappingIds)

    if (!activeAvailableMappingIdSet.has(activeMappingId)) {
      setActiveMappingId(activeAvailableMappingIds[0] ?? '')
    }
  }, [activeConnectionTargetId, activeMappingId, connectionsByTarget, currentProcessStep, sourceDefinitions])

  return {
    activeMappingId,
    setActiveMappingId,
    mappingConfigs,
    updateMappingConfig,
    saveMappingConfigs,
  }
}
