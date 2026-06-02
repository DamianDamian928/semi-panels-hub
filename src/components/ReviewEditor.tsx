import { Fragment, useMemo, useRef, useState } from 'react'
import type { WorkflowViewPayload } from '../apiClient'
import type { OutputRow } from '../domain/workflowSelectors'
import { useBomMatvarComparison } from '../hooks/useBomMatvarComparison'
import { useBomMatvarReviewIssues } from '../hooks/useBomMatvarReviewIssues'
import { useBomMatvarValidation } from '../hooks/useBomMatvarValidation'
import { useSourceConnections } from '../hooks/useSourceConnections'
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
  SourceCreateInput,
  SourceConnectionRolesByTarget,
  SourceConnectionsByTarget,
  SourceDefinition,
  SourceFileMetadata,
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
import { OutputStep } from './steps/OutputStep'
import { SourcesStep } from './steps/SourcesStep'

const activeStepByStatus: Record<DashboardRow['status'], ProcessStep> = {
  Draft: 'Sources',
  'In progress': 'Comparison',
  Completed: 'Decisions',
}

const createDecisionRecordFromComparisonIssue = (issue: ReviewIssue): DecisionRecord => ({
  issueId: issue.id,
  issueTitle: issue.title,
  area: issue.area,
  status: 'Required',
  proposedDecision: issue.suggestedAction,
  rationale: issue.description,
  outputImpact: issue.severity === 'High'
    ? 'Blocks output'
    : issue.severity === 'Medium'
      ? 'Affects output'
      : 'No output impact yet',
  auditState: 'Not persisted',
  owner: issue.owner,
  updated: 'Just now',
  source: issue.source,
  comparedWith: issue.comparedWith,
})

const nextStepByProcess: Record<ProcessStep, { title: string; description: string }> = {
  Sources: { title: 'Connections', description: 'Review source relationships as workflow context.' },
  Connections: { title: 'Validation', description: 'Review source readiness before comparison.' },
  Validation: { title: 'Comparison', description: 'Compare validated data and detect decision findings.' },
  Comparison: { title: 'Decisions', description: 'Create auditable decision records from comparison findings.' },
  Decisions: { title: 'Dashboard review', description: 'Decision data will feed the future Dashboard Open review.' },
  Output: { title: 'AI Assistant', description: 'This area stays planned while Decision and Open review are defined.' },
  'AI Assistant': { title: 'Sources', description: 'This area stays planned while workflow data is stabilized.' },
}

const stepPurposeContent: Record<ProcessStep, StepPurposeContent> = {
  Sources: {
    eyebrow: 'Sources',
    title: 'Global read-only source registry',
    summary: 'This global screen lists the data sources available to all reviews without changing source data.',
    goal: 'Confirm all expected inputs exist.',
    function: 'Keeps source registration reusable across dashboard projects.',
    yourRole: 'Check whether the input list is complete.',
    example: 'Fishbowl, Parts&BOM and documentation sources are visible before validation.',
    output: 'A global source catalog ready for connection.',
  },
  Connections: {
    eyebrow: 'Connections',
    title: 'Generated source usage map',
    summary: 'This screen shows source-to-target relationships generated from active workflow comparison contracts.',
    goal: 'Understand which real sources are used by each workflow target.',
    function: 'Displays the current source usage detected by validation and comparison rules.',
    yourRole: 'Review whether the generated usage map matches the expected workflow context.',
    example: 'BOM Matvar shows the BOM L0 and Mass Production sources selected by the comparison contract.',
    output: 'Read-only source usage context for validation, comparison and decisions.',
  },
  Validation: {
    eyebrow: 'Validation',
    title: 'Current review input readiness',
    summary: 'This screen shows source readiness and validation status for the selected review.',
    goal: 'Show the status of available source data.',
    function: 'Separates errors, warnings and unchecked source conditions.',
    yourRole: 'Review status before reading Comparison results.',
    example: 'Source files can be ready while individual data contracts still warn.',
    output: 'Informational validation status for Comparison.',
  },
  Comparison: {
    eyebrow: 'Comparison',
    title: 'Current review difference detection',
    summary: 'This screen previews how source differences become decision-ready findings for the selected review.',
    goal: 'Detect meaningful differences.',
    function: 'Groups comparison results and source context.',
    yourRole: 'Look for differences that should become decisions.',
    example: 'A missing expected match becomes a decision candidate.',
    output: 'Findings ready for Decisions.',
  },
  Decisions: {
    eyebrow: 'Decisions',
    title: 'Current review decisions',
    summary: 'This screen manages decision records linked to comparison findings from the selected review.',
    goal: 'Keep decisions separate from source data.',
    function: 'Records accepted, drafted, required and deferred decisions.',
    yourRole: 'Accept or draft decisions based on review context.',
    example: 'Accepting a decision confirms what should happen with comparison data.',
    output: 'Decision records ready for the future Dashboard Open review.',
  },
  Output: {
    eyebrow: 'Output',
    title: 'Current review artifact readiness',
    summary: 'This screen shows which output items can be prepared from accepted decisions in the selected review.',
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
  decisionRecords: DecisionRecord[]
  outputItems: OutputItem[]
  auditEvents: AuditEvent[]
  issueDecisionStates: Record<string, DecisionState>
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
  sourceConnectionRolesByTarget: SourceConnectionRolesByTarget | null
  createSource: (source: SourceCreateInput) => Promise<SourceDefinition[]>
  deleteSource: (sourceId: string) => Promise<SourceDefinition[]>
  registerSourceLocalFile: (sourceId: string, file: SourceFileMetadata) => Promise<void>
  checkSourcesAccess: () => Promise<void>
  checkSourceAccess: (sourceId: string) => Promise<void>
  refreshBootstrapData: () => Promise<void>
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
  decisionRecords,
  outputItems,
  issueDecisionStates,
  decisionStatuses,
  decisionPersistenceStates,
  outputStatuses,
  outputPersistenceStates,
  apiConnectionState,
  apiConnectionError,
  sourceConnectionsByTarget,
  sourceConnectionRolesByTarget,
  createSource,
  deleteSource,
  registerSourceLocalFile,
  checkSourcesAccess,
  checkSourceAccess,
  refreshBootstrapData,
  saveDecisionStatus,
  savePreparedOutput,
  onBackToDashboard,
}: ReviewEditorProps) {
  const [activeProcessStep, setActiveProcessStep] = useState<ProcessStep>(activeStepByStatus[selectedReview.status])
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>('All')
  const [activeDecisionTargetId, setActiveDecisionTargetId] = useState<ConnectionTargetId>('bom-matvar')
  const [activeOutputItemId, setActiveOutputItemId] = useState<string>(outputItems[0]?.id ?? '')
  const [outputFilter, setOutputFilter] = useState<OutputFilter>('All')
  const [activeOutputTargetId, setActiveOutputTargetId] = useState<ConnectionTargetId>('bom-matvar')
  const [stepInfoExpanded, setStepInfoExpanded] = useState(true)
  const [activeValidationTargetId, setActiveValidationTargetId] = useState<ConnectionTargetId>('bom-matvar')
  const [validationRefreshKey, setValidationRefreshKey] = useState(0)
  const [activeComparisonTargetId, setActiveComparisonTargetId] = useState<ConnectionTargetId>('bom-matvar')
  const [comparisonRefreshKey, setComparisonRefreshKey] = useState(0)
  const [reviewIssuesRefreshKey, setReviewIssuesRefreshKey] = useState(0)
  const [pendingExitNavigation, setPendingExitNavigation] = useState<PendingExitNavigation | null>(null)
  const [exitGuardSaving, setExitGuardSaving] = useState(false)
  const [exitGuardError, setExitGuardError] = useState<string | null>(null)
  const connectionsStepRef = useRef<ConnectionsStepHandle | null>(null)

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
  } = useSourceConnections({
    sourceDefinitions,
    sourceConnectionsByTarget,
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
      sourceConnectionsByTarget,
      sourceConnectionRolesByTarget,
    }),
    [selectedReview.dashboardCells, selectedReview.id, sourceConnectionRolesByTarget, sourceConnectionsByTarget, sourceDefinitions],
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
  const {
    bomMatvarReviewIssues,
  } = useBomMatvarReviewIssues(
    selectedReview.id,
    currentProcessStep === 'Decisions' || currentProcessStep === 'Output',
    reviewIssuesRefreshKey,
    validationInputSignature,
  )
  const comparisonIssues = bomMatvarReviewIssues?.issues ?? []
  const refreshComparisonAndDependencies = async () => {
    try {
      await refreshBomMatvarComparison()
      await refreshBomMatvarValidation()
      await refreshBootstrapData()
    } catch {
      // API status is already surfaced by the shared workflow data hook.
    }
  }
  const decisionRecordsFromComparison = useMemo(() => {
    const existingDecisionIssueIds = new Set(decisionRecords.map((record) => record.issueId))
    const generatedDecisionRecords = comparisonIssues
      .filter((issue) => !existingDecisionIssueIds.has(issue.id))
      .map(createDecisionRecordFromComparisonIssue)

    return [...decisionRecords, ...generatedDecisionRecords]
  }, [comparisonIssues, decisionRecords])
  const nextStep = nextStepByProcess[currentProcessStep]
  const purposeContent = stepPurposeContent[currentProcessStep]
  const guardedStepLabel = currentProcessStep === 'Connections'
    ? currentProcessStep
    : 'current screen'

  const getActiveExitGuard = () => {
    if (currentProcessStep === 'Connections') return connectionsStepRef.current
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
      setValidationRefreshKey((current) => current + 1)
      void refreshBootstrapData().catch(() => undefined)
    }
    if (navigation.step === 'Decisions') {
      setReviewIssuesRefreshKey((current) => current + 1)
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
        setValidationRefreshKey((current) => current + 1)
        void refreshBootstrapData().catch(() => undefined)
      }
      if (navigation.step === 'Decisions') {
        setReviewIssuesRefreshKey((current) => current + 1)
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
    const bomMatvarChecks = checks.filter((check) => check.source !== 'Dashboard')
    const activeValidationTarget = connectionTargets.find((target) => target.id === activeValidationTargetId) ?? connectionTargets[0]
    const activeTargetSourceCount = connectionsByTarget[activeValidationTarget.id]?.length ?? 0
    const summary = validation?.summary ?? {
      connectedSources: 0,
      contractSources: 0,
      matchedRows: 0,
      validPartNumbers: 0,
      invalidPartNumbers: 0,
      matvarRows: 0,
      matvarOk: 0,
      matvarNok: 0,
      matvarSynthetic: 0,
    }
    const validationStatus: ValidationState = validation?.status ?? 'Not checked'
    const dashboardChecks = checks.filter((check) =>
      check.source === 'Dashboard' || check.id === 'bom-matvar-source-context')
    const dashboardValidationStatus: ValidationState = dashboardChecks.some((check) => check.status === 'Error')
      ? 'Error'
      : dashboardChecks.some((check) => check.status === 'Warning')
        ? 'Warning'
        : dashboardChecks.length
          ? 'Valid'
          : 'Not checked'

    const getTargetValidationStatus = (targetId: ConnectionTargetId): ValidationState =>
      targetId === 'bom-matvar'
        ? validationStatus
        : targetId === 'dashboard'
          ? dashboardValidationStatus
          : 'Not checked'

    const renderTargetDetails = () => {
      if (activeValidationTarget.id === 'dashboard') {
        return (
          <>
            <div className="sources-registry-header mapping-header">
              <div>
                <p className="section-label">Validation</p>
                <h3>Dashboard validation</h3>
                <p>Shows the selected review context used by validation before BOM Matvar rules run.</p>
              </div>
              <div className="sources-registry-actions mapping-registry-actions" aria-label="Dashboard validation actions">
                <span className={validationStateClassName[dashboardValidationStatus]}>{dashboardValidationStatus}</span>
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

            <div className="source-summary-grid" aria-label="Dashboard validation summary">
              <article className="source-summary-card">
                <span>Review item</span>
                <strong>{validation?.review.item || selectedReview.intelModel}</strong>
              </article>
              <article className="source-summary-card">
                <span>Intel description</span>
                <strong>{validation?.review.intelDescription || selectedReview.intelModel}</strong>
              </article>
              <article className="source-summary-card">
                <span>BOM Matvar sources</span>
                <strong>{summary.connectedSources}</strong>
              </article>
              <article className="source-summary-card">
                <span>Dashboard checks</span>
                <strong>{dashboardChecks.length}</strong>
              </article>
            </div>

            {bomMatvarValidationError ? <p className="impact-error">{bomMatvarValidationError}</p> : null}

            <p className="source-detail-section-title">Validation checks</p>
            {bomMatvarValidationLoading && !validation ? (
              <div className="source-registry-empty">
                <strong>Loading validation</strong>
                <p>Reading dashboard context and available BOM Matvar source status.</p>
              </div>
            ) : dashboardChecks.length ? (
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
                    {dashboardChecks.map((row) => (
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
                <strong>No dashboard validation data</strong>
                <p>Refresh validation after the review dashboard data is loaded.</p>
              </div>
            )}
          </>
        )
      }

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
                <span>Context links</span>
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
              <p>Shows available BOM Matvar source status and builds the first BOM L0 context for the selected review.</p>
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
              <span>Available sources</span>
              <strong>{summary.connectedSources}</strong>
            </article>
            <article className="source-summary-card">
              <span>Contract sources</span>
              <strong>{summary.contractSources}</strong>
            </article>
            <article className="source-summary-card">
              <span>MATVAR rows</span>
              <strong>{summary.matvarRows}</strong>
            </article>
            <article className="source-summary-card">
              <span>MATVAR NOK</span>
              <strong>{summary.matvarNok}</strong>
            </article>
          </div>

          {bomMatvarValidationError ? <p className="impact-error">{bomMatvarValidationError}</p> : null}

          <p className="source-detail-section-title">Validation checks</p>
          {bomMatvarValidationLoading && !validation ? (
            <div className="source-registry-empty">
              <strong>Loading validation</strong>
              <p>Reading available source contracts for BOM L0 and Mass Production.</p>
            </div>
          ) : bomMatvarChecks.length ? (
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
                  {bomMatvarChecks.map((row) => (
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
              <p>Refresh validation after source files are available.</p>
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
    const matvarRules = comparison?.matvarRules ?? []
    const bomL0RulesSourceLabel = rules[0]?.partNumber
      ? 'BOM L0.xlsx / Arkusz1'
      : ''
    const matvarRulesSourceLabel = matvarRules[0]
      ? [matvarRules[0].sourceName, matvarRules[0].sourceSheet].filter(Boolean).join(' / ')
      : ''
    const oracleComparison = comparison?.oracleComparison
    const oracleBaseRows = oracleComparison?.baseRows ?? []
    const oracleStructureTables = oracleComparison?.structureTables ?? []
    const oracleSourceLabel = oracleComparison?.sourceName || 'Matvar - Oracle'
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
                <span>Context links</span>
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
              <p>Runs the first BOM L0 scope rules for the selected review before decisions are created.</p>
            </div>
            <div className="sources-registry-actions mapping-registry-actions" aria-label="Comparison actions">
              <span className={validationStateClassName[comparisonStatus]}>{comparisonStatus}</span>
              <button
                type="button"
                className="secondary-button source-action-button"
                onClick={() => {
                  void refreshComparisonAndDependencies()
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
              <span>Oracle files</span>
              <strong>{oracleStructureTables.length}</strong>
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

          <p className="source-detail-section-title">
            BOM L0 rules{bomL0RulesSourceLabel ? ` (${bomL0RulesSourceLabel})` : ''}
          </p>
          {bomMatvarComparisonLoading && !comparison ? (
            <div className="source-registry-empty">
              <strong>Loading comparison</strong>
              <p>Reading current BOM Matvar validation context and applying BOM L0 rules.</p>
            </div>
          ) : rules.length ? (
            <div className="table-wrap comparison-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Rule</th>
                    <th>Expected</th>
                    <th>Result</th>
                    <th>Part Number</th>
                    <th>Description</th>
                    <th>Data aktualizacji</th>
                    <th>Rules</th>
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
                      <td title={rule.updatedAtRaw || undefined}>{rule.updatedAt || '-'}</td>
                      <td>
                        <div className="comparison-rule-basis">
                          {(Array.isArray(rule.ruleBasis) ? rule.ruleBasis : [rule.ruleBasis]).map((line) => (
                            <span key={line}>{line}</span>
                          ))}
                        </div>
                      </td>
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

          <p className="source-detail-section-title">
            MATVAR rules{matvarRulesSourceLabel ? ` (${matvarRulesSourceLabel})` : ''}
          </p>
          {matvarRules.length ? (
            <div className="table-wrap comparison-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Rule</th>
                    <th>Expected</th>
                    <th>Result</th>
                    <th>Item</th>
                    <th>ORACLE Item Description</th>
                    <th>INTEL Description</th>
                    <th>Phantom L1</th>
                    <th>Scope</th>
                    <th>Weryfikacja Matvar</th>
                    <th>Rules</th>
                  </tr>
                </thead>
                <tbody>
                  {matvarRules.map((rule) => (
                    <tr key={rule.id}>
                      <td>
                        <span className={getRuleStatusClass(rule.status)}>{rule.status}</span>
                      </td>
                      <td>{rule.rule}</td>
                      <td>{rule.expected}</td>
                      <td>{rule.result}</td>
                      <td>{rule.item || '-'}</td>
                      <td>{rule.oracleItemDescription || '-'}</td>
                      <td>{rule.intelDescription || '-'}</td>
                      <td>{rule.phantomL1 || '-'}</td>
                      <td>{rule.scope || '-'}</td>
                      <td>{rule.verificationText || '-'}</td>
                      <td>
                        <div className="comparison-rule-basis">
                          {(Array.isArray(rule.message) ? rule.message : [rule.message]).map((line) => (
                            <span key={line}>{line}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="source-registry-empty">
              <strong>No MATVAR comparison data</strong>
              <p>Refresh comparison after MATVAR validation has current data.</p>
            </div>
          )}

          <p className="source-detail-section-title">
            Oracle - BOM (folder){oracleSourceLabel ? ` (${oracleSourceLabel})` : ''}
          </p>
          {oracleBaseRows.length ? (
            <div className="table-wrap comparison-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>ORACLE Item Description</th>
                    <th>INTEL Description</th>
                    <th>Phantom L1</th>
                    <th>Scope</th>
                    <th>BOM Oracle</th>
                    <th>Nazwa Oracle</th>
                    <th>Rules</th>
                  </tr>
                </thead>
                <tbody>
                  {oracleBaseRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.item || '-'}</td>
                      <td>{row.oracleItemDescription || '-'}</td>
                      <td>{row.intelDescription || '-'}</td>
                      <td>{row.phantomL1 || '-'}</td>
                      <td>{row.scope || '-'}</td>
                      <td>
                        <span className={getRuleStatusClass(row.oracleBomStatus)}>{row.oracleBomText || '-'}</span>
                      </td>
                      <td>
                        <span className={getRuleStatusClass(row.oracleNameStatus)}>{row.oracleNameText || '-'}</span>
                      </td>
                      <td>
                        <div className="comparison-rule-basis">
                          {(Array.isArray(row.ruleBasis) ? row.ruleBasis : [row.ruleBasis]).map((line) => (
                            <span key={line}>{line}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="source-registry-empty">
              <strong>No Oracle folder data</strong>
              <p>Refresh comparison after the Matvar Oracle folder has been connected and validated.</p>
            </div>
          )}

          <p className="source-detail-section-title">
            Dopasowane pliki Oracle (Level 0 / Level 1)
          </p>
          {oracleStructureTables.length ? (
            <div className="comparison-structure-list">
              {oracleStructureTables.map((table) => (
                <article className="comparison-structure-card" key={table.item}>
                  <div className="comparison-structure-card-header">
                    <div>
                      <h4>{table.item}</h4>
                      <p>{table.fileName}</p>
                    </div>
                    <span className={validationStateClassName.Valid}>read-only</span>
                  </div>
                  <p className="comparison-structure-description">
                    Description (Level 0): <strong>{table.descriptionText || '-'}</strong>
                  </p>
                  <div className="table-wrap comparison-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          {table.columns.map((column) => (
                            <th key={column}>{column}</th>
                          ))}
                          <th>Rules</th>
                        </tr>
                      </thead>
                      <tbody>
                        {table.rows.map((row) => (
                          <tr key={row.id}>
                            {row.values.map((value, index) => (
                              <td key={`${row.id}-${table.columns[index]}`}>{value || '-'}</td>
                            ))}
                            <td>
                              <div className="comparison-rule-basis">
                                {row.ruleBasis.map((line) => (
                                  <span key={line}>{line}</span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="source-registry-empty">
              <strong>No matched Oracle files</strong>
              <p>Refresh comparison after the Matvar Oracle folder source is ready.</p>
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
          connectionRolesByTarget={sourceConnectionRolesByTarget}
          sourceDefinitions={sourceDefinitions}
          onSelectConnectionTarget={setActiveConnectionTargetId}
        />
      )
    }
    if (currentProcessStep === 'Validation') return renderValidationStep()
    if (currentProcessStep === 'Comparison') return renderComparisonStep()
    if (currentProcessStep === 'Decisions') {
      return (
        <DecisionsStep
          selectedReview={selectedReview}
          reviewIssues={comparisonIssues}
          comparison={bomMatvarComparison}
          decisionRecords={decisionRecordsFromComparison}
          issueDecisionStates={issueDecisionStates}
          decisionStatuses={decisionStatuses}
          decisionPersistenceStates={decisionPersistenceStates}
          decisionFilter={decisionFilter}
          activeDecisionTargetId={activeDecisionTargetId}
          connectionTargets={connectionTargets}
          connectionsByTarget={connectionsByTarget}
          onSelectDecisionTarget={setActiveDecisionTargetId}
          onSetDecisionFilter={setDecisionFilter}
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
        decisionRecords={decisionRecordsFromComparison}
        issueDecisionStates={issueDecisionStates}
        decisionStatuses={decisionStatuses}
        outputStatuses={outputStatuses}
        outputPersistenceStates={outputPersistenceStates}
        activeOutputItemId={activeOutputItemId}
        outputFilter={outputFilter}
        activeOutputTargetId={activeOutputTargetId}
        connectionTargets={connectionTargets}
        connectionsByTarget={connectionsByTarget}
        onSelectOutputItem={setActiveOutputItemId}
        onSetOutputFilter={setOutputFilter}
        onSelectOutputTarget={setActiveOutputTargetId}
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
              <Fragment key={step}>
                <button
                  type="button"
                  className={`review-nav-item ${isActive ? 'review-nav-item-active' : ''}`}
                  onClick={() => requestProcessStepChange(step)}
                >
                  <span className="review-nav-icon-wrap" aria-hidden="true">
                    <SidebarGlyph name={icon} className="review-nav-icon" />
                  </span>
                  <span className="review-nav-label">{label}</span>
                </button>
              </Fragment>
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
            <p className="page-subtitle">
              Sources and Connections provide context. Validation to Decisions are scoped to this review.
            </p>
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
