import { useSourceRegistry } from '../hooks/useSourceRegistry'
import type { SourceConfigurationInput, SourceCreateInput, SourceDefinition, SourceFileMetadata } from '../types'
import { SourcesStep } from './steps/SourcesStep'

type SettingsSourcesPanelProps = {
  sourceDefinitions: SourceDefinition[]
  createSource: (source: SourceCreateInput) => Promise<SourceDefinition[]>
  deleteSource: (sourceId: string) => Promise<SourceDefinition[]>
  updateSourceConfiguration: (sourceId: string, configuration: SourceConfigurationInput) => Promise<SourceDefinition[]>
  registerSourceLocalFile: (sourceId: string, file: SourceFileMetadata) => Promise<void>
  checkSourcesAccess: () => Promise<void>
  checkSourceAccess: (sourceId: string) => Promise<void>
  onBackToSettings: () => void
  onBackToDashboard: () => void
}

export function SettingsSourcesPanel({
  sourceDefinitions,
  createSource,
  deleteSource,
  updateSourceConfiguration,
  registerSourceLocalFile,
  checkSourcesAccess,
  checkSourceAccess,
  onBackToSettings,
  onBackToDashboard,
}: SettingsSourcesPanelProps) {
  const {
    activeSourceId,
    setActiveSourceId,
    sourceSelectionPendingId,
    sourceAccessPendingId,
    sourceMutationPending,
    sourcesAutoChecking,
    sourceSelectionError,
    handleCreateSource,
    handleDeleteSource,
    handleUpdateSourceConfiguration,
    handleSourceFileSelection,
    handleSourceAccessCheck,
  } = useSourceRegistry({
    currentProcessStep: 'Sources',
    sourceDefinitions,
    createSource,
    deleteSource,
    updateSourceConfiguration,
    registerSourceLocalFile,
    checkSourcesAccess,
    checkSourceAccess,
  })

  return (
    <div className="app-shell">
      <header className="page-header page-header-row">
        <div>
          <p className="eyebrow">Semi Panels Hub</p>
          <h1>Sources</h1>
          <p className="page-subtitle">Global source registry and local path maintenance.</p>
        </div>
        <div className="header-actions">
          <button type="button" className="header-button" onClick={onBackToSettings}>
            Back to Settings
          </button>
          <button type="button" className="header-button" onClick={onBackToDashboard}>
            Back to Dashboard
          </button>
        </div>
      </header>

      <main className="page-content">
        <SourcesStep
          sourceDefinitions={sourceDefinitions}
          activeSourceId={activeSourceId}
          onSelectSource={setActiveSourceId}
          sourceSelectionPendingId={sourceSelectionPendingId}
          sourceAccessPendingId={sourceAccessPendingId}
          sourceMutationPending={sourceMutationPending}
          sourcesAutoChecking={sourcesAutoChecking}
          sourceSelectionError={sourceSelectionError}
          onAddSource={handleCreateSource}
          onUpdateSourceConfiguration={handleUpdateSourceConfiguration}
          onRemoveSource={(sourceId) => {
            void handleDeleteSource(sourceId)
          }}
          onChooseSourceFile={(sourceId) => {
            void handleSourceFileSelection(sourceId)
          }}
          onTestSourceAccess={(sourceId) => {
            void handleSourceAccessCheck(sourceId)
          }}
        />
      </main>
    </div>
  )
}
