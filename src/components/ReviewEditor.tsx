import type {
  ApiConnectionState,
  DashboardRow,
  SourceConfigurationInput,
  SourceCreateInput,
  SourceDefinition,
  SourceFileMetadata,
} from '../types'
import { useSourceRegistry } from '../hooks/useSourceRegistry'
import { ApiStatusBanner } from './ApiStatusBanner'
import { LocalFileHelperStatus } from './LocalFileHelperStatus'
import {
  BrandGlyph,
  SidebarGlyph,
  sidebarSteps,
  statusClassName,
} from './sharedReviewUi'
import { SourcesStep } from './steps/SourcesStep'

type ReviewEditorProps = {
  selectedReview: DashboardRow
  sourceDefinitions: SourceDefinition[]
  apiConnectionState: ApiConnectionState
  apiConnectionError: string | null
  createSource: (source: SourceCreateInput) => Promise<SourceDefinition[]>
  updateSourceConfiguration: (sourceId: string, configuration: SourceConfigurationInput) => Promise<SourceDefinition[]>
  registerSourceLocalFile: (sourceId: string, file: SourceFileMetadata) => Promise<void>
  checkSourcesAccess: () => Promise<void>
  checkSourceAccess: (sourceId: string) => Promise<void>
  onBackToDashboard: () => void
}

export function ReviewEditor({
  selectedReview,
  sourceDefinitions,
  apiConnectionState,
  apiConnectionError,
  createSource,
  updateSourceConfiguration,
  registerSourceLocalFile,
  checkSourcesAccess,
  checkSourceAccess,
  onBackToDashboard,
}: ReviewEditorProps) {
  const {
    activeSourceId,
    setActiveSourceId,
    sourceSelectionPendingId,
    sourceAccessPendingId,
    sourceMutationPending,
    sourcesAutoChecking,
    sourceSelectionError,
    handleCreateSource,
    handleUpdateSourceConfiguration,
    handleSourceFileSelection,
    handleSourceAccessCheck,
  } = useSourceRegistry({
    currentProcessStep: 'Sources',
    sourceDefinitions,
    createSource,
    updateSourceConfiguration,
    registerSourceLocalFile,
    checkSourcesAccess,
    checkSourceAccess,
  })

  return (
    <div className="editor-shell">
      <aside className="review-sidebar">
        <div className="review-sidebar-top">
          <div className="review-brand">
            <BrandGlyph className="review-brand-icon" />
            <div>
              <p className="review-brand-name">Semi Panels Hub v2</p>
              <p className="review-brand-subtitle">Source workspace</p>
            </div>
          </div>

          <div className="review-project-chip">
            <span className="review-project-label">Current review</span>
            <strong>{selectedReview.intelModel}</strong>
          </div>

          <button type="button" className="sidebar-dashboard-link" onClick={onBackToDashboard}>
            Back to Dashboard
          </button>
        </div>

        <nav className="review-nav" aria-label="Source workspace">
          {sidebarSteps.map(({ step, label, icon }) => (
            <button
              key={step}
              type="button"
              className="review-nav-item review-nav-item-active"
              aria-current="page"
            >
              <span className="review-nav-icon-wrap" aria-hidden="true">
                <SidebarGlyph name={icon} className="review-nav-icon" />
              </span>
              <span className="review-nav-label">{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="editor-workspace">
        <header className="workspace-header card">
          <div>
            <p className="eyebrow">Admin source registry</p>
            <h1>{selectedReview.intelModel}</h1>
            <p className="page-subtitle">
              Sources are the application workspace. Register, configure and verify available inputs without changing source data.
            </p>
          </div>
          <div className="header-meta">
            <span className={statusClassName[selectedReview.status]}>{selectedReview.status}</span>
            <ApiStatusBanner state={apiConnectionState} error={apiConnectionError} />
            <LocalFileHelperStatus />
          </div>
        </header>

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
