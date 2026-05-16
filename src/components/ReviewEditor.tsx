import { useState } from 'react'
import type { WorkflowViewPayload } from '../apiClient'
import type { OutputRow } from '../domain/workflowSelectors'
import { useReviewImportPreview } from '../hooks/useReviewImportPreview'
import { useSourceConnections } from '../hooks/useSourceConnections'
import { useSourceMappings } from '../hooks/useSourceMappings'
import { useSourceRegistry } from '../hooks/useSourceRegistry'
import { useStorageStatus } from '../hooks/useStorageStatus'
import type {
  AuditEvent,
  ApiConnectionState,
  BomStage,
  ConnectionTargetId,
  DashboardRow,
  DecisionFilter,
  DecisionRecord,
  DecisionState,
  DecisionStatus,
  MainStage,
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
import { StorageStatusPanel } from './StorageStatusPanel'
import {
  connectionsCustomStyles,
  bomStages,
  BrandGlyph,
  mainStages,
  sidebarSteps,
  SidebarGlyph,
  statusClassName,
  validationStateClassName,
} from './sharedReviewUi'
import { ConnectionsStep } from './steps/ConnectionsStep'
import { DecisionsStep } from './steps/DecisionsStep'
import { MappingStep } from './steps/MappingStep'
import { OutputStep } from './steps/OutputStep'
import { ReviewStep } from './steps/ReviewStep'
import { SourcesStep } from './steps/SourcesStep'

const activeStepByStatus: Record<DashboardRow['status'], ProcessStep> = {
  Draft: 'Main',
  'In progress': 'Review',
  Completed: 'Output',
}

const connectionTargetByMainStage: Record<MainStage, ConnectionTargetId> = {
  BOM: 'bom-matvar',
  Documentation: 'documentation',
  Costing: 'costing',
}

const connectionTargetByBomStage: Record<BomStage, ConnectionTargetId> = {
  MATVAR: 'bom-matvar',
  L1: 'bom-l1',
  L2: 'bom-l2',
  L3: 'bom-l3',
}

const nextStepByProcess: Record<ProcessStep, { title: string; description: string }> = {
  Main: { title: 'Sources', description: 'Review the registered sources before connecting them to stages.' },
  Sources: { title: 'Connections', description: 'Assign read-only sources to the review stages.' },
  Connections: { title: 'Mapping', description: 'Configure how each connected source should be read.' },
  Mapping: { title: 'Validation', description: 'Check source readiness before normalization.' },
  Validation: { title: 'Normalization', description: 'Prepare a shared review model from connected inputs.' },
  Normalization: { title: 'Comparison', description: 'Compare normalized data and detect review issues.' },
  Comparison: { title: 'Review', description: 'Triage differences and mark items that need decisions.' },
  Review: { title: 'Decisions', description: 'Create auditable decision records for selected issues.' },
  Decisions: { title: 'Output', description: 'Prepare final artifacts from accepted decisions.' },
  Output: { title: 'AI Assistant', description: 'Use assistant context once the workflow data is stable.' },
  'AI Assistant': { title: 'Main', description: 'Return to the main review context.' },
}

const stageDescriptions: Record<MainStage, { title: string; description: string; connectionTitle: string }> = {
  BOM: {
    title: 'BOM review scope',
    description: 'Work through MATVAR, L1, L2 and L3 review areas.',
    connectionTitle: 'BOM connections',
  },
  Documentation: {
    title: 'Documentation review scope',
    description: 'Review documentation sources and missing links.',
    connectionTitle: 'Documentation connections',
  },
  Costing: {
    title: 'Costing review scope',
    description: 'Review costing inputs and output impact.',
    connectionTitle: 'Costing connections',
  },
}

const stepPurposeContent: Record<ProcessStep, StepPurposeContent> = {
  Main: {
    eyebrow: 'Main',
    title: 'Review starting point',
    summary: 'This screen gives the current project context and lets the reviewer choose the next workflow area.',
    goal: 'Give one clear entry point before working with sources, issues and decisions.',
    function: 'Shows the active BOM, Documentation or Costing scope.',
    yourRole: 'Decide where to continue in the review flow.',
    example: 'If validation has warnings, go there before accepting decisions.',
    output: 'A clear next step for the review.',
  },
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
  markIssueForDecision: (issue: ReviewIssue) => Promise<void>
  saveDecisionStatus: (decision: DecisionRecord, status: DecisionStatus) => Promise<void>
  savePreparedOutput: (outputItem: OutputRow) => Promise<void>
  onBackToDashboard: () => void
}

export function ReviewEditor({
  selectedReview,
  sourceDefinitions,
  validationStatesBySource,
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
  markIssueForDecision,
  saveDecisionStatus,
  savePreparedOutput,
  onBackToDashboard,
}: ReviewEditorProps) {
  const [activeMainStage, setActiveMainStage] = useState<MainStage>('BOM')
  const [activeBomStage, setActiveBomStage] = useState<BomStage>('MATVAR')
  const [activeProcessStep, setActiveProcessStep] = useState<ProcessStep>(activeStepByStatus[selectedReview.status])
  const [activeReviewIssueId, setActiveReviewIssueId] = useState<string>(reviewIssues[0]?.id ?? '')
  const [reviewIssueFilter, setReviewIssueFilter] = useState<ReviewIssueFilter>('All')
  const [activeDecisionIssueId, setActiveDecisionIssueId] = useState<string>(decisionRecords[0]?.issueId ?? '')
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>('All')
  const [activeOutputItemId, setActiveOutputItemId] = useState<string>(outputItems[0]?.id ?? '')
  const [outputFilter, setOutputFilter] = useState<OutputFilter>('All')

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
    connectSourceToTarget,
    disconnectSourceFromTarget,
  } = useSourceConnections({
    sourceDefinitions,
    sourceConnectionsByTarget,
    saveSourceConnections,
  })
  const {
    activeMappingId,
    setActiveMappingId,
    mappingConfigs,
    updateMappingConfig,
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
  const nextStep = nextStepByProcess[currentProcessStep]
  const purposeContent = stepPurposeContent[currentProcessStep]
  const activeStageInfo = stageDescriptions[activeMainStage]
  const currentScope = activeMainStage === 'BOM' ? `BOM / ${activeBomStage}` : activeMainStage
  const isMainStep = currentProcessStep === 'Main'

  const renderSourceNamesStep = (
    stepName: Exclude<ProcessStep, 'Main' | 'Connections'>,
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
    const validationRows = sourceDefinitions.map((source) => ({
      id: source.id,
      name: source.name,
      ...(validationStatesBySource[source.name] ?? { state: 'Not checked' as ValidationState, message: 'Validation has not been run yet.' }),
    }))
    const summary = validationRows.reduce(
      (acc, row) => {
        acc[row.state] += 1
        return acc
      },
      { Valid: 0, Warning: 0, Error: 0, 'Not checked': 0 } as Record<ValidationState, number>,
    )

    return (
      <section className="workspace-main-grid">
        <section className="workspace-main card">
          <div className="workspace-card workspace-card-single">
            <div className="workspace-copy">
              <p className="section-label">Validation</p>
              <h3>Validation status</h3>
              <p>This screen checks whether connected sources are ready for the next steps.</p>
            </div>

            <div className="stats-grid" style={{ marginBottom: 20 }}>
              {(['Valid', 'Warning', 'Error', 'Not checked'] as ValidationState[]).map((state) => (
                <article key={state} className="stat-card">
                  <span>{state}</span>
                  <strong>{summary[state]}</strong>
                </article>
              ))}
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {validationRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      <td>
                        <span className={validationStateClassName[row.state]}>{row.state}</span>
                      </td>
                      <td>{row.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <aside className="workspace-side-panel card" aria-label="Validation summary">
          <div className="sidebar-header">
            <p className="section-label">Step</p>
            <h2>Validation</h2>
            <p>Quick summary of source readiness for this review.</p>
          </div>

          <dl className="source-meta-list">
            <div>
              <dt>Project</dt>
              <dd>{selectedReview.intelModel}</dd>
            </div>
            <div>
              <dt>Total sources</dt>
              <dd>{validationRows.length}</dd>
            </div>
            <div>
              <dt>Ready to continue</dt>
              <dd>{summary.Error === 0 ? 'Yes' : 'No'}</dd>
            </div>
          </dl>
        </aside>
      </section>
    )
  }

  const renderComparisonStep = () => {
    const comparisonRows = sourceDefinitions.map((source) => ({
      id: source.id,
      name: source.name,
      status: source.status === 'Ready' ? 'Ready' : 'Needs review',
      comparedWith: source.usedFor.join(', '),
      message: 'Connection is ready to support future comparison rules.',
    }))
    const readyCount = comparisonRows.filter((row) => row.status === 'Ready').length

    return (
      <section className="workspace-main-grid">
        <section className="workspace-main card">
          <div className="workspace-card workspace-card-single">
            <div className="workspace-copy">
              <p className="section-label">Comparison</p>
              <h3>Comparison overview</h3>
              <p>This screen will be used for BOM comparison rules, detected differences and review-ready problems.</p>
            </div>

            <div className="stats-grid" style={{ marginBottom: 20 }}>
              <article className="stat-card">
                <span>Ready</span>
                <strong>{readyCount}</strong>
              </article>
              <article className="stat-card">
                <span>Needs review</span>
                <strong>{comparisonRows.length - readyCount}</strong>
              </article>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Compared with</th>
                    <th>Status</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      <td>{row.comparedWith}</td>
                      <td>{row.status}</td>
                      <td>{row.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <aside className="workspace-side-panel card" aria-label="Comparison summary">
          <div className="sidebar-header">
            <p className="section-label">Step</p>
            <h2>Comparison</h2>
            <p>Here we will define what is compared, what differs and what becomes an issue for review.</p>
          </div>
        </aside>
      </section>
    )
  }

  const renderMainStep = () => (
    <section className="workspace-main-grid">
      <section className="workspace-main card">
        <div className="stage-tabs" role="tablist" aria-label="Main project stages">
          {mainStages.map((stage, index) => {
            const isActive = activeMainStage === stage
            return (
              <button
                key={stage}
                type="button"
                className={`stage-tab ${isActive ? 'stage-tab-active' : ''}`}
                onClick={() => {
                  setActiveMainStage(stage)
                  setActiveConnectionTargetId(connectionTargetByMainStage[stage])
                }}
                aria-pressed={isActive}
              >
                <span className="stage-tab-index">[{index + 1}. {stage}]</span>
                {isActive ? <span className="stage-tab-badge">Active</span> : null}
              </button>
            )
          })}
        </div>

        {activeMainStage === 'BOM' ? (
          <div className="substage-tabs" role="tablist" aria-label="BOM sections">
            {bomStages.map((stage) => {
              const isActive = activeBomStage === stage
              return (
                <button
                  key={stage}
                  type="button"
                  className={`substage-tab ${isActive ? 'substage-tab-active' : ''}`}
                  onClick={() => {
                    setActiveBomStage(stage)
                    setActiveConnectionTargetId(connectionTargetByBomStage[stage])
                  }}
                  aria-pressed={isActive}
                >
                  [{stage}]
                  {isActive ? <span className="substage-tab-badge">Active</span> : null}
                </button>
              )
            })}
          </div>
        ) : null}

        <div className="workspace-card">
          <div className="workspace-copy">
            <p className="section-label">{currentScope}</p>
            <h3>{activeStageInfo.title}</h3>
            <p>{activeStageInfo.description}</p>
          </div>

          <div className="workspace-placeholder">
            <div className="placeholder-box">
              <span className="placeholder-title">Main edit area</span>
              <span className="placeholder-text">This right-side heart of the screen will grow from this skeleton.</span>
            </div>
          </div>
        </div>
      </section>

      <aside className="workspace-side-panel card" aria-label="Context panel">
        <div className="sidebar-header">
          <p className="section-label">Connection</p>
          <h2>{activeStageInfo.connectionTitle}</h2>
          <p>Projects do not create new sources here. They only connect to global sources from Settings.</p>
        </div>

        <dl className="source-meta-list">
          <div>
            <dt>Review step</dt>
            <dd>{currentProcessStep}</dd>
          </div>
          <div>
            <dt>Scope</dt>
            <dd>{currentScope}</dd>
          </div>
          <div>
            <dt>Project</dt>
            <dd>{selectedReview.intelModel}</dd>
          </div>
          <div>
            <dt>Source mode</dt>
            <dd>Global shared library</dd>
          </div>
        </dl>
      </aside>
    </section>
  )

  const renderCurrentStep = () => {
    if (isMainStep) return renderMainStep()
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
          activeConnectionTargetId={activeConnectionTargetId}
          connectionsByTarget={connectionsByTarget}
          sourceDefinitions={sourceDefinitions}
          onSelectConnectionTarget={setActiveConnectionTargetId}
          onConnectSourceToTarget={connectSourceToTarget}
          onDisconnectSourceFromTarget={disconnectSourceFromTarget}
        />
      )
    }
    if (currentProcessStep === 'Mapping') {
      return (
        <MappingStep
          activeMappingId={activeMappingId}
          activeConnectionTargetId={activeConnectionTargetId}
          connectionsByTarget={connectionsByTarget}
          mappingConfigs={mappingConfigs}
          sourceDefinitions={sourceDefinitions}
          onSelectMapping={setActiveMappingId}
          onUpdateMapping={updateMappingConfig}
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
          onSetProcessStep={setActiveProcessStep}
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
          onSetProcessStep={setActiveProcessStep}
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
        onSetProcessStep={setActiveProcessStep}
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

          <button type="button" className="sidebar-dashboard-link" onClick={onBackToDashboard}>
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
                onClick={() => setActiveProcessStep(step)}
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
            <StorageStatusPanel
              status={storageStatus}
              loading={storageStatusLoading}
              error={storageStatusError}
            />
          </div>
        </header>

        {renderCurrentStep()}

        <section className="stage-purpose-card card" aria-label="Step purpose">
          <div className="stage-purpose-header">
            <div>
              <p className="section-label">{purposeContent.eyebrow}</p>
              <h3>{purposeContent.title}</h3>
            </div>
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
      </main>
    </div>
  )
}
