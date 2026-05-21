import { useMemo, useRef, useState } from 'react'
import type { WorkflowViewPayload } from '../apiClient'
import type { OutputRow } from '../domain/workflowSelectors'
import { useBomMatvarComparison } from '../hooks/useBomMatvarComparison'
import { useReviewImportPreview } from '../hooks/useReviewImportPreview'
import { useBomMatvarValidation } from '../hooks/useBomMatvarValidation'
import { useSourceConnections } from '../hooks/useSourceConnections'
import { useSourceMappings } from '../hooks/useSourceMappings'
import { useSourceRegistry } from '../hooks/useSourceRegistry'
import { useStorageStatus } from '../hooks/useStorageStatus'
import type {
  AuditEvent,
  ApiConnectionState,
  ConnectionTargetId,
  DashboardRow,
  DecisionFilter,
  DecisionRecord,
  DecisionState,
  DecisionStatus,
  OutputFilter,
  OutputItem,
  OutputStatus,
  PersistenceState,
  ProcessStep,
  ReviewIssue,
  ReviewIssueFilter,
  SourceCreateInput,
  SourceConnectionsByTarget,
  SourceDefinition,
  SourceFileMetadata,
  SourceMappingConfig,
  StepPurposeContent,
  ValidationState,
} from '../types'
import { ApiStatusBanner } from './ApiStatusBanner'
import { LocalFileHelperStatus } from './LocalFileHelperStatus'
import { StorageStatusPanel } from './StorageStatusPanel'
import {
  connectionsCustomStyles,
  BrandGlyph,
  connectionTargets,
  sidebarSteps,
  SidebarGlyph,
  statusClassName,
  validationStateClassName,
} from './sharedReviewUi'
import { ConnectionsStep, type ConnectionsStepHandle } from './steps/ConnectionsStep'
import { DecisionsStep } from './steps/DecisionsStep'
import { MappingStep, type MappingStepHandle } from './steps/MappingStep'
import { OutputStep } from './steps/OutputStep'
import { ReviewStep } from './steps/ReviewStep'
import { SourcesStep } from './steps/SourcesStep'

const activeStepByStatus: Record<DashboardRow['status'], ProcessStep> = {
  Draft: 'Sources',
  'In progress': 'Review',
  Completed: 'Output',
}

const nextStepByProcess: Record<ProcessStep, { title: string; description: string }> = {
  Sources: { title: 'Connections', description: 'Assign read-only sources to the review stages.' },
  Connections: { title: 'Mapping', description: 'Configure how each connected source should be read.' },
  Mapping: { title: 'Validation', description: 'Check source readiness before normalization.' },
  Validation: { title: 'Normalization', description: 'Prepare a shared review model from connected inputs.' },
  Normalization: { title: 'Comparison', description: 'Compare normalized data and detect review issues.' },
  Comparison: { title: 'Review', description: 'Triage differences and mark items that need decisions.' },
  Review: { title: 'Decisions', description: 'Create auditable decision records for selected issues.' },
  Decisions: { title: 'Output', description: 'Prepare final artifacts from accepted decisions.' },
  Output: { title: 'AI Assistant', description: 'Use assistant context once the workflow data is stable.' },
  'AI Assistant': { title: 'Sources', description: 'Return to the source registry.' },
}

const stepPurposeContent: Record<ProcessStep, StepPurposeContent> = {
  Sources: {
    eyebrow: 'Sources',
    title: 'Read-only source registry',
    summary: 'This screen lists the data sources available to the review without changing source data.',
    goal: 'Confirm all expected inputs exist.',
    function: 'Separates source registration from stage mapping.',
    yourRole: 'Check whether the input list is complete.',
    example: 'Fishbowl, Parts&BOM and documentation sources are visible before mapping.',
    output: 'A source catalog ready for connection.',
  },
  Connections: {
    eyebrow: 'Connections',
    title: 'Source assignment',
    summary: 'This screen assigns source cards to review stages.',
    goal: 'Connect the right source set to the right stage.',
    function: 'Maps global sources into BOM, Documentation and Costing areas.',
    yourRole: 'Choose which inputs belong to each stage.',
    example: 'Parts&BOM and Fishbowl can be assigned to BOM stages.',
    output: 'Stages know which sources they should use.',
  },
  Mapping: {
    eyebrow: 'Mapping',
    title: 'Source field mapping',
    summary: 'This screen defines how each connected source should be read before validation.',
    goal: 'Map source structure without cluttering the visual connection map.',
    function: 'Stores role, sheet/table and key column settings per source connection.',
    yourRole: 'Confirm the minimum mapping required for validation.',
    example: 'BOM L1 -> Parts&BOM can use Part Number as the key column.',
    output: 'Connected sources have readable mapping rules.',
  },
  Validation: {
    eyebrow: 'Validation',
    title: 'Input readiness',
    summary: 'This screen checks whether connected inputs are ready for downstream workflow steps.',
    goal: 'Find blocking input problems early.',
    function: 'Separates errors, warnings and unchecked sources.',
    yourRole: 'Decide whether the process can continue.',
    example: 'Fix source errors before running comparisons.',
    output: 'A readiness signal for the next step.',
  },
  Normalization: {
    eyebrow: 'Normalization',
    title: 'Shared review model',
    summary: 'This planned screen will shape different source formats into one comparison model.',
    goal: 'Reduce format chaos before comparison.',
    function: 'Maps read-only input data into a shared model.',
    yourRole: 'Review mapping assumptions when they exist.',
    example: 'Different column names can become one standard field.',
    output: 'Data ready for comparison rules.',
  },
  Comparison: {
    eyebrow: 'Comparison',
    title: 'Difference detection',
    summary: 'This screen previews how source differences become review-ready issues.',
    goal: 'Detect meaningful differences.',
    function: 'Groups comparison results and source context.',
    yourRole: 'Look for differences that should become review issues.',
    example: 'A missing documentation link becomes a high severity issue.',
    output: 'Issues ready for review triage.',
  },
  Review: {
    eyebrow: 'Review',
    title: 'Issue triage',
    summary: 'This is the main issue triage workspace before decisions are created.',
    goal: 'Decide which issues need a formal decision.',
    function: 'Keeps issue detection separate from decisions.',
    yourRole: 'Mark issues for decision or continue reviewing.',
    example: 'A mismatch can be marked as requiring a decision.',
    output: 'A curated list of issues needing decisions.',
  },
  Decisions: {
    eyebrow: 'Decisions',
    title: 'Auditable decisions',
    summary: 'This screen manages decision records linked to review issues.',
    goal: 'Keep decisions separate from source data.',
    function: 'Records accepted, drafted, required and deferred decisions.',
    yourRole: 'Accept or draft decisions based on review context.',
    example: 'Accepting a decision can unblock output readiness.',
    output: 'Decision records that drive output artifacts.',
  },
  Output: {
    eyebrow: 'Output',
    title: 'Artifact readiness',
    summary: 'This screen shows which output items can be prepared from accepted decisions.',
    goal: 'Produce controlled review output.',
    function: 'Links final artifacts to decision and audit state.',
    yourRole: 'Prepare ready output items.',
    example: 'A ready BOM package can be prepared after accepted decisions.',
    output: 'Prepared output candidates and audit trace.',
  },
  'AI Assistant': {
    eyebrow: 'AI Assistant',
    title: 'Contextual assistance',
    summary: 'This planned screen will help summarize issues, decisions and outputs.',
    goal: 'Support review work without changing source data.',
    function: 'Adds an assistance layer over the workflow.',
    yourRole: 'Ask workflow questions when the data model is stable.',
    example: 'Ask for high severity issues that still need decision.',
    output: 'Faster navigation and review understanding.',
  },
}

type ReviewEditorProps = {
  selectedReview: DashboardRow
  sourceDefinitions: SourceDefinition[]
  validationStatesBySource: Record<string, { state: ValidationState; message: string }>
  reviewIssues: ReviewIssue[]
  decisionRecords: DecisionRecord[]
  outputItems: OutputItem[]
  auditEvents: AuditEvent[]
  issueDecisionStates: Record<string, DecisionState>
  issuePersistenceStates: Record<string, PersistenceState>
  decisionStatuses: Record<string, DecisionStatus>
  decisionPersistenceStates: Record<string, PersistenceState>
  outputStatuses: Record<string, OutputStatus>
  outputPersistenceStates: Record<string, PersistenceState>
  activeAuditEventId: string
  setActiveAuditEventId: (auditEventId: string) => void
  workflowView: WorkflowViewPayload | null
  localAuditEvents: AuditEvent[]
  apiConnectionState: ApiConnectionState
  apiConnectionError: string | null
  sourceConnectionsByTarget: SourceConnectionsByTarget | null
  sourceMappingConfigs: Record<string, SourceMappingConfig>
  createSource: (source: SourceCreateInput) => Promise<SourceDefinition[]>
  deleteSource: (sourceId: string) => Promise<SourceDefinition[]>
  registerSourceLocalFile: (sourceId: string, file: SourceFileMetadata) => Promise<void>
  checkSourcesAccess: () => Promise<void>
  checkSourceAccess: (sourceId: string) => Promise<void>
  saveSourceConnections: (connectionsByTarget: SourceConnectionsByTarget) => Promise<void>
  saveSourceMappings: (mappingConfigs: Record<string, SourceMappingConfig>) => Promise<void>
  applyMapping: (mappingId: string, mappingConfig: SourceMappingConfig) => Promise<void>
  markIssueForDecision: (issue: ReviewIssue) => Promise<void>
  saveDecisionStatus: (decision: DecisionRecord, status: DecisionStatus) => Promise<void>
  savePreparedOutput: (outputItem: OutputRow) => Promise<void>
  onBackToDashboard: () => void
}

type PendingExitNavigation =
  | { type: 'dashboard' }
  | { type: 'step'; step: ProcessStep }

export function ReviewEditor({
  selectedReview,
  sourceDefinitions,
  reviewIssues,
  decisionRecords,
  outputItems,
  auditEvents,
  issueDecisionStates,
  issuePersistenceStates,
  decisionStatuses,
  decisionPersistenceStates,
  outputStatuses,
  outputPersistenceStates,
  activeAuditEventId,
  setActiveAuditEventId,
  workflowView,
  localAuditEvents,
  apiConnectionState,
  apiConnectionError,
  sourceConnectionsByTarget,
  sourceMappingConfigs,
  createSource,
  deleteSource,
  registerSourceLocalFile,
  checkSourcesAccess,
  checkSourceAccess,
  saveSourceConnections,
  saveSourceMappings,
  applyMapping,
  markIssueForDecision,
  saveDecisionStatus,
  savePreparedOutput,
  onBackToDashboard,
}: ReviewEditorProps) {
  const [activeProcessStep, setActiveProcessStep] = useState<ProcessStep>(activeStepByStatus[selectedReview.status])
  const [activeReviewIssueId, setActiveReviewIssueId] = useState<string>(reviewIssues[0]?.id ?? '')
  const [reviewIssueFilter, setReviewIssueFilter] = useState<ReviewIssueFilter>('All')
  const [activeDecisionIssueId, setActiveDecisionIssueId] = useState<string>(decisionRecords[0]?.issueId ?? '')
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>('All')
  const [activeOutputItemId, setActiveOutputItemId] = useState<string>(outputItems[0]?.id ?? '')
  const [outputFilter, setOutputFilter] = useState<OutputFilter>('All')
  const [stepInfoExpanded, setStepInfoExpanded] = useState(true)
  const [activeValidationTargetId, setActiveValidationTargetId] = useState<ConnectionTargetId>('bom-matvar')
  const [validationRefreshKey, setValidationRefreshKey] = useState(0)
  const [activeComparisonTargetId, setActiveComparisonTargetId] = useState<ConnectionTargetId>('bom-matvar')
  const [comparisonRefreshKey, setComparisonRefreshKey] = useState(0)
  const [pendingExitNavigation, setPendingExitNavigation] = useState<PendingExitNavigation | null>(null)
  const [exitGuardSaving, setExitGuardSaving] = useState(false)
  const [exitGuardError, setExitGuardError] = useState<string | null>(null)
  const connectionsStepRef = useRef<ConnectionsStepHandle | null>(null)
  const mappingStepRef = useRef<MappingStepHandle | null>(null)

  const currentProcessStep = activeProcessStep
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
    handleSourceFileSelection,
    handleSourceAccessCheck,
  } = useSourceRegistry({
    currentProcessStep,
    sourceDefinitions,
    createSource,
    deleteSource,
    registerSourceLocalFile,
    checkSourcesAccess,
    checkSourceAccess,
  })
  const {
    activeConnectionTargetId,
    setActiveConnectionTargetId,
    connectionsByTarget,
    saveConnectionsByTarget,
  } = useSourceConnections({
    sourceDefinitions,
    sourceConnectionsByTarget,
    saveSourceConnections,
  })
  const {
    activeMappingId,
    setActiveMappingId,
    mappingConfigs,
    saveMappingConfigs,
  } = useSourceMappings({
    activeConnectionTargetId,
    connectionsByTarget,
    currentProcessStep,
    sourceDefinitions,
    sourceMappingConfigs,
    saveSourceMappings,
  })
  const {
    reviewImportPreview,
    reviewImportError,
    setReviewImportPreview,
    setReviewImportError,
    handleReviewImportFile,
  } = useReviewImportPreview({
    setActiveReviewIssueId,
    setReviewIssueFilter,
  })
  const {
    storageStatus,
    storageStatusLoading,
    storageStatusError,
  } = useStorageStatus(currentProcessStep)
  const validationInputSignature = useMemo(
    () => JSON.stringify({
      reviewId: selectedReview.id,
      reviewCells: selectedReview.dashboardCells ?? null,
      connectionsByTarget,
      mappingConfigs,
      sources: sourceDefinitions.map((source) => ({
        id: source.id,
        name: source.name,
        status: source.status,
        sourceFile: source.sourceFile
          ? {
              path: source.sourceFile.path,
              modifiedAt: source.sourceFile.modifiedAt,
              sizeBytes: source.sourceFile.sizeBytes,
            }
          : null,
      })),
    }),
    [connectionsByTarget, mappingConfigs, selectedReview.dashboardCells, selectedReview.id, sourceDefinitions],
  )
  const {
    bomMatvarValidation,
    bomMatvarValidationLoading,
    bomMatvarValidationError,
    refreshBomMatvarValidation,
  } = useBomMatvarValidation(
    selectedReview.id,
    currentProcessStep === 'Validation',
    validationRefreshKey,
    validationInputSignature,
  )
  const {
    bomMatvarComparison,
    bomMatvarComparisonLoading,
    bomMatvarComparisonError,
    refreshBomMatvarComparison,
  } = useBomMatvarComparison(
    selectedReview.id,
    currentProcessStep === 'Comparison',
    comparisonRefreshKey,
    validationInputSignature,
  )
  const nextStep = nextStepByProcess[currentProcessStep]
  const purposeContent = stepPurposeContent[currentProcessStep]
  const guardedStepLabel = currentProcessStep === 'Connections' || currentProcessStep === 'Mapping'
    ? currentProcessStep
    : 'current screen'

  const getActiveExitGuard = () => {
    if (currentProcessStep === 'Connections') return connectionsStepRef.current
    if (currentProcessStep === 'Mapping') return mappingStepRef.current
    return null
  }

  const runExitNavigation = (navigation: PendingExitNavigation) => {
    setPendingExitNavigation(null)
    setExitGuardError(null)

    if (navigation.type === 'dashboard') {
      onBackToDashboard()
      return
    }

    if (navigation.step === 'Validation') {
      setValidationRefreshKey((current) => current + 1)
    }
    if (navigation.step === 'Comparison') {
      setComparisonRefreshKey((current) => current + 1)
    }

    setActiveProcessStep(navigation.step)
  }

  const requestExitNavigation = (navigation: PendingExitNavigation) => {
    if (navigation.type === 'step' && navigation.step === currentProcessStep) {
      if (navigation.step === 'Validation') {
        setValidationRefreshKey((current) => current + 1)
      }
      if (navigation.step === 'Comparison') {
        setComparisonRefreshKey((current) => current + 1)
      }
      return
    }

    const activeGuard = getActiveExitGuard()
    if (activeGuard?.hasUnsavedChanges()) {
      setPendingExitNavigation(navigation)
      setExitGuardError(null)
      return
    }

    runExitNavigation(navigation)
  }

  const requestProcessStepChange = (step: ProcessStep) => {
    requestExitNavigation({ type: 'step', step })
  }

  const requestBackToDashboard = () => {
    requestExitNavigation({ type: 'dashboard' })
  }

  const stayOnGuardedStep = () => {
    setPendingExitNavigation(null)
    setExitGuardError(null)
  }

  const discardAndContinue = () => {
    if (!pendingExitNavigation) return

    getActiveExitGuard()?.discardChanges()
    runExitNavigation(pendingExitNavigation)
  }

  const saveAndContinue = async () => {
    if (!pendingExitNavigation) return

    const navigation = pendingExitNavigation
    const activeGuard = getActiveExitGuard()
    setExitGuardSaving(true)
    setExitGuardError(null)

    try {
      await activeGuard?.saveChanges()
      runExitNavigation(navigation)
      if (navigation.type === 'step') setExitGuardSaving(false)
    } catch (error: unknown) {
      setExitGuardError(error instanceof Error ? error.message : 'Changes could not be saved.')
      setExitGuardSaving(false)
    }
  }

  const renderSourceNamesStep = (
    stepName: Exclude<ProcessStep, 'Connections'>,
    title: string,
    description: string,
    statusLabel: string,
  ) => (
    <section className="workspace-main-grid">
      <section className="workspace-main card">
        <div className="workspace-card workspace-card-single">
          <div className="workspace-copy">
            <p className="section-label">{stepName}</p>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sourceDefinitions.map((source) => (
                  <tr key={source.id}>
                    <td>{source.name}</td>
                    <td>{statusLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <aside className="workspace-side-panel card" aria-label="Context panel">
        <div className="sidebar-header">
          <p className="section-label">Step</p>
          <h2>{stepName}</h2>
          <p>For now this screen uses only source names from global Sources.</p>
        </div>

        <dl className="source-meta-list">
          <div>
            <dt>Review step</dt>
            <dd>{stepName}</dd>
          </div>
          <div>
            <dt>Project</dt>
            <dd>{selectedReview.intelModel}</dd>
          </div>
          <div>
            <dt>Rows shown</dt>
            <dd>{sourceDefinitions.length}</dd>
          </div>
        </dl>
      </aside>
    </section>
  )

  const renderValidationStep = () => {
    const validation = bomMatvarValidation
    const checks = validation?.checks ?? []
    const bomL0Rows = validation?.bomL0Rows ?? []
    const activeValidationTarget = connectionTargets.find((target) => target.id === activeValidationTargetId) ?? connectionTargets[0]
    const activeTargetSourceCount = connectionsByTarget[activeValidationTarget.id]?.length ?? 0
    const summary = validation?.summary ?? {
      connectedSources: 0,
      mappedSources: 0,
      matchedRows: 0,
      validPartNumbers: 0,
      invalidPartNumbers: 0,
    }
    const validationStatus: ValidationState = validation?.status ?? 'Not checked'

    const getTargetValidationStatus = (targetId: ConnectionTargetId): ValidationState =>
      targetId === 'bom-matvar' ? validationStatus : 'Not checked'

    const renderTargetDetails = () => {
      if (activeValidationTarget.id !== 'bom-matvar') {
        return (
          <>
            <div className="sources-registry-header mapping-header">
              <div>
                <p className="section-label">Validation</p>
                <h3>{activeValidationTarget.label}</h3>
                <p>{activeValidationTarget.description}</p>
              </div>
              <div className="sources-registry-actions mapping-registry-actions" aria-label="Validation actions">
                <span className={validationStateClassName['Not checked']}>Not checked</span>
              </div>
            </div>

            <div className="source-summary-grid" aria-label={`${activeValidationTarget.label} validation summary`}>
              <article className="source-summary-card">
                <span>Connected sources</span>
                <strong>{activeTargetSourceCount}</strong>
              </article>
              <article className="source-summary-card">
                <span>Implemented rules</span>
                <strong>0</strong>
              </article>
              <article className="source-summary-card">
                <span>Checks</span>
                <strong>0</strong>
              </article>
              <article className="source-summary-card">
                <span>Open issues</span>
                <strong>0</strong>
              </article>
            </div>

            <div className="source-registry-empty">
              <strong>Validation rules are not implemented yet</strong>
              <p>This target is ready in the Validation workspace. Rules and result tables will be added here in the next BOM validation passes.</p>
            </div>
          </>
        )
      }

      return (
        <>
          <div className="sources-registry-header mapping-header">
            <div>
              <p className="section-label">Validation</p>
              <h3>BOM Matvar validation</h3>
              <p>Checks connected BOM Matvar sources and builds the first BOM L0 context for the selected review.</p>
            </div>
            <div className="sources-registry-actions mapping-registry-actions" aria-label="Validation actions">
              <span className={validationStateClassName[validationStatus]}>{validationStatus}</span>
              <button
                type="button"
                className="secondary-button source-action-button"
                onClick={() => {
                  void refreshBomMatvarValidation()
                }}
                disabled={bomMatvarValidationLoading}
              >
                {bomMatvarValidationLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          <div className="source-summary-grid" aria-label="BOM Matvar validation summary">
            <article className="source-summary-card">
              <span>Connected sources</span>
              <strong>{summary.connectedSources}</strong>
            </article>
            <article className="source-summary-card">
              <span>Mapped sources</span>
              <strong>{summary.mappedSources}</strong>
            </article>
            <article className="source-summary-card">
              <span>BOM L0 matches</span>
              <strong>{summary.matchedRows}</strong>
            </article>
            <article className="source-summary-card">
              <span>Invalid PN</span>
              <strong>{summary.invalidPartNumbers}</strong>
            </article>
          </div>

          {bomMatvarValidationError ? <p className="impact-error">{bomMatvarValidationError}</p> : null}

          <p className="source-detail-section-title">Validation checks</p>
          {bomMatvarValidationLoading && !validation ? (
            <div className="source-registry-empty">
              <strong>Loading validation</strong>
              <p>Reading saved connections, mappings and BOM L0 source data.</p>
            </div>
          ) : checks.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Check</th>
                    <th>Source</th>
                    <th>Message</th>
                    <th>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {checks.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <span className={validationStateClassName[row.status]}>{row.status}</span>
                      </td>
                      <td>{row.label}</td>
                      <td>{row.source}</td>
                      <td>{row.message}</td>
                      <td>{row.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="source-registry-empty">
              <strong>No validation data</strong>
              <p>Refresh validation after BOM Matvar sources and mappings are saved.</p>
            </div>
          )}

          <p className="source-detail-section-title">BOM L0 matched rows</p>
          {bomL0Rows.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Part Number</th>
                    <th>Description</th>
                    <th>Data aktualizacji</th>
                    <th>PN check</th>
                  </tr>
                </thead>
                <tbody>
                  {bomL0Rows.map((row) => (
                    <tr key={`${row.partNumber}-${row.description}`}>
                      <td>{row.partNumber}</td>
                      <td>{row.description}</td>
                      <td title={row.updatedAtRaw}>{row.updatedAt}</td>
                      <td>
                        <span className={validationStateClassName[row.partNumberValid ? 'Valid' : 'Warning']}>
                          {row.partNumberValid ? 'Valid' : 'Warning'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="source-registry-empty">
              <strong>No BOM L0 matches</strong>
              <p>Matched rows will appear here when BOM L0 Description contains the review Intel Description.</p>
            </div>
          )}
        </>
      )
    }

    return (
      <section className="sources-registry-grid sources-registry-grid-with-detail mapping-registry-grid validation-workspace-grid">
        <section className="workspace-main card sources-registry-main mapping-registry-main">
          {renderTargetDetails()}
        </section>

        <aside className="workspace-side-panel card source-detail-panel mapping-detail-panel" aria-label="Workflow validation targets">
          <div className="sidebar-header">
            <p className="section-label">Workflow targets</p>
            <h2>Validation scope</h2>
            <p>Select a target to review validation readiness and results.</p>
          </div>

          <div className="connection-target-list">
            {connectionTargets.map((target) => {
              const isActive = target.id === activeValidationTarget.id
              const targetStatus = getTargetValidationStatus(target.id)
              const connectedCount = connectionsByTarget[target.id]?.length ?? 0

              return (
                <button
                  key={target.id}
                  type="button"
                  className={`connection-target-node ${isActive ? 'connection-target-node-active' : ''}`}
                  onClick={() => setActiveValidationTargetId(target.id)}
                >
                  <span className="connection-node-main">
                    <strong>{target.label}</strong>
                    <small>{target.group}</small>
                  </span>
                  <span className="connection-node-count">{connectedCount}</span>
                  <span className={validationStateClassName[targetStatus]}>{targetStatus}</span>
                </button>
              )
            })}
          </div>
        </aside>
      </section>
    )
  }

  const renderComparisonStep = () => {
    const comparison = bomMatvarComparison
    const activeComparisonTarget = connectionTargets.find((target) => target.id === activeComparisonTargetId) ?? connectionTargets[0]
    const activeTargetSourceCount = connectionsByTarget[activeComparisonTarget.id]?.length ?? 0
    const comparisonStatus: ValidationState = comparison?.status ?? 'Not checked'
    const rules = comparison?.rules ?? []
    const summary = comparison?.summary ?? {
      rules: 0,
      ok: 0,
      fallback: 0,
      missing: 0,
      context: 0,
      sourceRows: 0,
    }

    const getTargetComparisonStatus = (targetId: ConnectionTargetId): ValidationState =>
      targetId === 'bom-matvar' ? comparisonStatus : 'Not checked'

    const getRuleStatusClass = (status: string) => {
      if (status === 'OK' || status === 'Context') return validationStateClassName.Valid
      if (status === 'Fallback' || status === 'Info') return validationStateClassName.Warning
      return validationStateClassName.Error
    }

    const renderTargetDetails = () => {
      if (activeComparisonTarget.id !== 'bom-matvar') {
        return (
          <>
            <div className="sources-registry-header mapping-header">
              <div>
                <p className="section-label">Comparison</p>
                <h3>{activeComparisonTarget.label}</h3>
                <p>{activeComparisonTarget.description}</p>
              </div>
              <div className="sources-registry-actions mapping-registry-actions" aria-label="Comparison actions">
                <span className={validationStateClassName['Not checked']}>Not checked</span>
              </div>
            </div>

            <div className="source-summary-grid" aria-label={`${activeComparisonTarget.label} comparison summary`}>
              <article className="source-summary-card">
                <span>Connected sources</span>
                <strong>{activeTargetSourceCount}</strong>
              </article>
              <article className="source-summary-card">
                <span>Implemented rules</span>
                <strong>0</strong>
              </article>
              <article className="source-summary-card">
                <span>Matches</span>
                <strong>0</strong>
              </article>
              <article className="source-summary-card">
                <span>Issues</span>
                <strong>0</strong>
              </article>
            </div>

            <div className="source-registry-empty">
              <strong>Comparison rules are not implemented yet</strong>
              <p>This target is ready in the Comparison workspace. Business rules will be added here after its validation data is available.</p>
            </div>
          </>
        )
      }

      return (
        <>
          <div className="sources-registry-header mapping-header">
            <div>
              <p className="section-label">Comparison</p>
              <h3>BOM Matvar comparison</h3>
              <p>Runs the first BOM L0 scope rules for the selected review before issues are created.</p>
            </div>
            <div className="sources-registry-actions mapping-registry-actions" aria-label="Comparison actions">
              <span className={validationStateClassName[comparisonStatus]}>{comparisonStatus}</span>
              <button
                type="button"
                className="secondary-button source-action-button"
                onClick={() => {
                  void refreshBomMatvarComparison()
                }}
                disabled={bomMatvarComparisonLoading}
              >
                {bomMatvarComparisonLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          <div className="source-summary-grid" aria-label="BOM Matvar comparison summary">
            <article className="source-summary-card">
              <span>Rules</span>
              <strong>{summary.rules}</strong>
            </article>
            <article className="source-summary-card">
              <span>OK</span>
              <strong>{summary.ok}</strong>
            </article>
            <article className="source-summary-card">
              <span>Fallback</span>
              <strong>{summary.fallback}</strong>
            </article>
            <article className="source-summary-card">
              <span>Missing</span>
              <strong>{summary.missing}</strong>
            </article>
          </div>

          {bomMatvarComparisonError ? <p className="impact-error">{bomMatvarComparisonError}</p> : null}

          <p className="source-detail-section-title">Comparison rules</p>
          {bomMatvarComparisonLoading && !comparison ? (
            <div className="source-registry-empty">
              <strong>Loading comparison</strong>
              <p>Reading current BOM Matvar validation context and applying BOM L0 rules.</p>
            </div>
          ) : rules.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Rule</th>
                    <th>Expected</th>
                    <th>Result</th>
                    <th>Part Number</th>
                    <th>Description</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr key={rule.id}>
                      <td>
                        <span className={getRuleStatusClass(rule.status)}>{rule.status}</span>
                      </td>
                      <td>{rule.rule}</td>
                      <td>{rule.expected}</td>
                      <td>{rule.result}</td>
                      <td>{rule.partNumber || '-'}</td>
                      <td>{rule.description || '-'}</td>
                      <td>{rule.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="source-registry-empty">
              <strong>No comparison data</strong>
              <p>Refresh comparison after BOM Matvar validation has current data.</p>
            </div>
          )}
        </>
      )
    }

    return (
      <section className="sources-registry-grid sources-registry-grid-with-detail mapping-registry-grid validation-workspace-grid">
        <section className="workspace-main card sources-registry-main mapping-registry-main">
          {renderTargetDetails()}
        </section>

        <aside className="workspace-side-panel card source-detail-panel mapping-detail-panel" aria-label="Workflow comparison targets">
          <div className="sidebar-header">
            <p className="section-label">Workflow targets</p>
            <h2>Comparison scope</h2>
            <p>Select a target to review comparison rules and results.</p>
          </div>

          <div className="connection-target-list">
            {connectionTargets.map((target) => {
              const isActive = target.id === activeComparisonTarget.id
              const targetStatus = getTargetComparisonStatus(target.id)
              const connectedCount = connectionsByTarget[target.id]?.length ?? 0

              return (
                <button
                  key={target.id}
                  type="button"
                  className={`connection-target-node ${isActive ? 'connection-target-node-active' : ''}`}
                  onClick={() => setActiveComparisonTargetId(target.id)}
                >
                  <span className="connection-node-main">
                    <strong>{target.label}</strong>
                    <small>{target.group}</small>
                  </span>
                  <span className="connection-node-count">{connectedCount}</span>
                  <span className={validationStateClassName[targetStatus]}>{targetStatus}</span>
                </button>
              )
            })}
          </div>
        </aside>
      </section>
    )
  }

  const renderCurrentStep = () => {
    if (currentProcessStep === 'Sources') {
      return (
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
      )
    }
    if (currentProcessStep === 'Connections') {
      return (
        <ConnectionsStep
          ref={connectionsStepRef}
          activeConnectionTargetId={activeConnectionTargetId}
          connectionsByTarget={connectionsByTarget}
          mappingConfigs={mappingConfigs}
          sourceDefinitions={sourceDefinitions}
          onSelectConnectionTarget={setActiveConnectionTargetId}
          onSaveConnections={saveConnectionsByTarget}
        />
      )
    }
    if (currentProcessStep === 'Mapping') {
      return (
        <MappingStep
          ref={mappingStepRef}
          activeMappingId={activeMappingId}
          connectionsByTarget={connectionsByTarget}
          mappingConfigs={mappingConfigs}
          sourceDefinitions={sourceDefinitions}
          onSelectMapping={setActiveMappingId}
          onSelectConnectionTarget={setActiveConnectionTargetId}
          onSaveMappings={saveMappingConfigs}
          onApplyMapping={applyMapping}
        />
      )
    }
    if (currentProcessStep === 'Validation') return renderValidationStep()
    if (currentProcessStep === 'Normalization') {
      return renderSourceNamesStep('Normalization', 'Normalization workspace', 'This stage will prepare one shared data model from all sources.', 'Waiting')
    }
    if (currentProcessStep === 'Comparison') return renderComparisonStep()
    if (currentProcessStep === 'Review') {
      return (
        <ReviewStep
          selectedReview={selectedReview}
          reviewIssues={reviewIssues}
          decisionRecords={decisionRecords}
          issueDecisionStates={issueDecisionStates}
          issuePersistenceStates={issuePersistenceStates}
          decisionStatuses={decisionStatuses}
          decisionPersistenceStates={decisionPersistenceStates}
          workflowView={workflowView}
          activeReviewIssueId={activeReviewIssueId}
          reviewIssueFilter={reviewIssueFilter}
          reviewImportPreview={reviewImportPreview}
          reviewImportError={reviewImportError}
          onSelectReviewIssue={setActiveReviewIssueId}
          onSetReviewIssueFilter={setReviewIssueFilter}
          onSetReviewImportPreview={setReviewImportPreview}
          onSetReviewImportError={setReviewImportError}
          onReviewImportFile={(event) => {
            void handleReviewImportFile(event)
          }}
          onMarkIssueForDecision={markIssueForDecision}
          onSetActiveDecisionIssue={setActiveDecisionIssueId}
          onSetDecisionFilterAll={() => setDecisionFilter('All')}
          onSetProcessStep={requestProcessStepChange}
        />
      )
    }
    if (currentProcessStep === 'Decisions') {
      return (
        <DecisionsStep
          selectedReview={selectedReview}
          reviewIssues={reviewIssues}
          decisionRecords={decisionRecords}
          issueDecisionStates={issueDecisionStates}
          decisionStatuses={decisionStatuses}
          decisionPersistenceStates={decisionPersistenceStates}
          workflowView={workflowView}
          activeDecisionIssueId={activeDecisionIssueId}
          decisionFilter={decisionFilter}
          onSelectDecisionIssue={setActiveDecisionIssueId}
          onSelectReviewIssue={setActiveReviewIssueId}
          onSetDecisionFilter={setDecisionFilter}
          onSetReviewIssueFilter={setReviewIssueFilter}
          onSetProcessStep={requestProcessStepChange}
          onSaveDecisionStatus={saveDecisionStatus}
        />
      )
    }
    if (currentProcessStep === 'AI Assistant') {
      return renderSourceNamesStep('AI Assistant', 'AI Assistant workspace', 'This screen is reserved for contextual AI help across sources, issues, decisions and output.', 'Planned')
    }
    return (
      <OutputStep
        selectedReview={selectedReview}
        decisionRecords={decisionRecords}
        outputItems={outputItems}
        auditEvents={auditEvents}
        localAuditEvents={localAuditEvents}
        issueDecisionStates={issueDecisionStates}
        decisionStatuses={decisionStatuses}
        outputStatuses={outputStatuses}
        outputPersistenceStates={outputPersistenceStates}
        workflowView={workflowView}
        activeOutputItemId={activeOutputItemId}
        outputFilter={outputFilter}
        activeAuditEventId={activeAuditEventId}
        onSelectOutputItem={setActiveOutputItemId}
        onSetOutputFilter={setOutputFilter}
        onSetActiveAuditEvent={setActiveAuditEventId}
        onSetProcessStep={requestProcessStepChange}
        onPrepareOutput={savePreparedOutput}
      />
    )
  }

  return (
    <div className="editor-shell">
      <aside className="review-sidebar">
        <div className="review-sidebar-top">
          <div className="review-brand">
            <BrandGlyph className="review-brand-icon" />
            <div>
              <p className="review-brand-name">Semi Panels Hub v2</p>
              <p className="review-brand-subtitle">Review workspace</p>
            </div>
          </div>

          <div className="review-project-chip">
            <span className="review-project-label">Current review</span>
            <strong>{selectedReview.intelModel}</strong>
          </div>

          <button type="button" className="sidebar-dashboard-link" onClick={requestBackToDashboard}>
            Back to Dashboard
          </button>
        </div>

        <nav className="review-nav" aria-label="Review process">
          {sidebarSteps.map(({ step, label, icon }) => {
            const isActive = step === currentProcessStep
            return (
              <button
                key={step}
                type="button"
                className={`review-nav-item ${isActive ? 'review-nav-item-active' : ''}`}
                onClick={() => requestProcessStepChange(step)}
              >
                <span className="review-nav-icon-wrap" aria-hidden="true">
                  <SidebarGlyph name={icon} className="review-nav-icon" />
                </span>
                <span className="review-nav-label">{label}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      <main className="editor-workspace">
        <style>{connectionsCustomStyles}</style>
        <header className="workspace-header card">
          <div>
            <p className="eyebrow">Admin project edit</p>
            <h1>{selectedReview.intelModel}</h1>
            <p className="page-subtitle">Left side = review flow. Right side = current selected screen.</p>
          </div>
          <div className="header-meta">
            <span className={statusClassName[selectedReview.status]}>{selectedReview.status}</span>
            <ApiStatusBanner state={apiConnectionState} error={apiConnectionError} />
            <LocalFileHelperStatus />
            <StorageStatusPanel
              status={storageStatus}
              loading={storageStatusLoading}
              error={storageStatusError}
            />
          </div>
        </header>

        {renderCurrentStep()}

        {stepInfoExpanded ? (
          <section className="stage-purpose-card card" aria-label="Step purpose">
            <div className="stage-purpose-header">
              <div>
                <p className="section-label">{purposeContent.eyebrow}</p>
                <h3>{purposeContent.title}</h3>
              </div>
              <button
                type="button"
                className="stage-purpose-toggle"
                onClick={() => setStepInfoExpanded(false)}
                aria-expanded={true}
              >
                Hide info
              </button>
            </div>

            <p className="stage-purpose-summary">{purposeContent.summary}</p>

            <div className="stage-purpose-grid">
              <article className="stage-purpose-item">
                <span>Cel etapu</span>
                <p>{purposeContent.goal}</p>
              </article>
              <article className="stage-purpose-item">
                <span>Rola etapu w aplikacji</span>
                <p>{purposeContent.function}</p>
              </article>
              <article className="stage-purpose-item">
                <span>Twoja rola</span>
                <p>{purposeContent.yourRole}</p>
              </article>
              <article className="stage-purpose-item">
                <span>Przyklad w praktyce</span>
                <p>{purposeContent.example}</p>
              </article>
              <article className="stage-purpose-item">
                <span>Efekt etapu</span>
                <p>{purposeContent.output}</p>
              </article>
              <article className="stage-purpose-item stage-purpose-item-next">
                <span>Co dalej</span>
                <p>{nextStep.description}</p>
              </article>
            </div>
          </section>
        ) : (
          <div className="stage-purpose-collapsed-control">
            <button
              type="button"
              className="stage-purpose-toggle"
              onClick={() => setStepInfoExpanded(true)}
              aria-expanded={false}
            >
              Show info
            </button>
          </div>
        )}

        {pendingExitNavigation ? (
          <div className="impact-modal-overlay" role="dialog" aria-modal="true" aria-label="Unsaved changes">
            <div className="impact-modal">
              <div className="impact-modal-header">
                <p className="section-label">Unsaved changes</p>
                <h3>Leave {guardedStepLabel}?</h3>
                <p>You have unsaved changes on this screen. Save them before leaving, discard them, or stay here.</p>
              </div>

              {exitGuardError ? <p className="impact-error">{exitGuardError}</p> : null}

              <div className="impact-modal-actions">
                <button type="button" className="secondary-button" onClick={stayOnGuardedStep} disabled={exitGuardSaving}>
                  Stay here
                </button>
                <button type="button" className="secondary-button" onClick={discardAndContinue} disabled={exitGuardSaving}>
                  Discard changes
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    void saveAndContinue()
                  }}
                  disabled={exitGuardSaving}
                >
                  {exitGuardSaving ? 'Saving...' : 'Save and continue'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
