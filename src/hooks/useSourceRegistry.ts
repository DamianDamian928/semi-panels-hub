import { useEffect, useState } from 'react'
import type { ProcessStep, SourceCreateInput, SourceDefinition, SourceFileMetadata } from '../types'
import { localFileHelperEndpoint, localFolderHelperEndpoint } from '../localFileHelper'
import type { LocalFileSelection } from '../localFileHelper'

type UseSourceRegistryOptions = {
  currentProcessStep: ProcessStep
  sourceDefinitions: SourceDefinition[]
  createSource: (source: SourceCreateInput) => Promise<SourceDefinition[]>
  deleteSource: (sourceId: string) => Promise<SourceDefinition[]>
  registerSourceLocalFile: (sourceId: string, file: SourceFileMetadata) => Promise<void>
  checkSourcesAccess: () => Promise<void>
  checkSourceAccess: (sourceId: string) => Promise<void>
}

export const useSourceRegistry = ({
  currentProcessStep,
  sourceDefinitions,
  createSource,
  deleteSource,
  registerSourceLocalFile,
  checkSourcesAccess,
  checkSourceAccess,
}: UseSourceRegistryOptions) => {
  const [activeSourceId, setActiveSourceId] = useState<string>(sourceDefinitions[0]?.id ?? '')
  const [sourceSelectionPendingId, setSourceSelectionPendingId] = useState<string | null>(null)
  const [sourceAccessPendingId, setSourceAccessPendingId] = useState<string | null>(null)
  const [sourceMutationPending, setSourceMutationPending] = useState(false)
  const [sourcesAutoChecking, setSourcesAutoChecking] = useState(false)
  const [sourceSelectionError, setSourceSelectionError] = useState<string | null>(null)

  useEffect(() => {
    if (currentProcessStep !== 'Sources') return

    let cancelled = false
    setSourcesAutoChecking(true)
    setSourceSelectionError(null)

    checkSourcesAccess()
      .catch((error: unknown) => {
        if (cancelled) return
        setSourceSelectionError(
          error instanceof Error
            ? error.message
            : 'Could not refresh source access status.',
        )
      })
      .finally(() => {
        if (!cancelled) setSourcesAutoChecking(false)
      })

    return () => {
      cancelled = true
    }
  }, [currentProcessStep])

  const handleSourceFileSelection = async (sourceId: string) => {
    setSourceSelectionPendingId(sourceId)
    setSourceSelectionError(null)

    try {
      const source = sourceDefinitions.find((item) => item.id === sourceId)
      const helperEndpoint = source?.type === 'Folder' ? localFolderHelperEndpoint : localFileHelperEndpoint
      const response = await fetch(helperEndpoint)
      if (!response.ok) throw new Error('Local file helper did not respond correctly.')

      const result = (await response.json()) as {
        cancelled?: boolean
        file?: LocalFileSelection
        error?: string
      }

      if (result.cancelled) return
      if (!result.file) throw new Error(result.error ?? 'No local path was returned by the local helper.')

      await registerSourceLocalFile(sourceId, result.file)
      await checkSourceAccess(sourceId)
    } catch (error) {
      setSourceSelectionError(
        error instanceof Error
          ? error.message
          : 'Could not save this source location.',
      )
    } finally {
      setSourceSelectionPendingId(null)
    }
  }

  const handleSourceAccessCheck = async (sourceId: string) => {
    setSourceAccessPendingId(sourceId)
    setSourceSelectionError(null)

    try {
      await checkSourceAccess(sourceId)
    } catch (error) {
      setSourceSelectionError(
        error instanceof Error
          ? error.message
          : 'Could not check this source access.',
      )
    } finally {
      setSourceAccessPendingId(null)
    }
  }

  const handleCreateSource = async (source: SourceCreateInput) => {
    setSourceMutationPending(true)
    setSourceSelectionError(null)

    try {
      const nextSources = await createSource(source)
      const addedSource = nextSources.find((item) => item.name === source.name) ?? nextSources[nextSources.length - 1]
      if (addedSource) setActiveSourceId(addedSource.id)
    } catch (error) {
      setSourceSelectionError(
        error instanceof Error
          ? error.message
          : 'Could not add this source.',
      )
      throw error
    } finally {
      setSourceMutationPending(false)
    }
  }

  const handleDeleteSource = async (sourceId: string) => {
    const source = sourceDefinitions.find((item) => item.id === sourceId)
    if (!source) return

    const confirmed = window.confirm(`Remove source "${source.name}" from the registry? This will not delete any files.`)
    if (!confirmed) return

    setSourceMutationPending(true)
    setSourceSelectionError(null)

    try {
      const nextSources = await deleteSource(sourceId)
      setActiveSourceId(nextSources[0]?.id ?? '')
    } catch (error) {
      setSourceSelectionError(
        error instanceof Error
          ? error.message
          : 'Could not remove this source.',
      )
    } finally {
      setSourceMutationPending(false)
    }
  }

  return {
    activeSourceId,
    setActiveSourceId,
    sourceSelectionPendingId,
    sourceAccessPendingId,
    sourceMutationPending,
    sourcesAutoChecking,
    sourceSelectionError,
    handleCreateSource,
    handleDeleteSource,
    handleSourceFileSelection,
    handleSourceAccessCheck,
  }
}
