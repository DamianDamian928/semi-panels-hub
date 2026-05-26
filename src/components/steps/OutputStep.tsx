import type { OutputRow } from '../../domain/workflowSelectors'
import {
  filterOutputItems,
  getDecisionRows,
  getOutputReadinessText,
  summarizeOutputItems,
} from '../../domain/workflowSelectors'
import {
  defaultPersistenceState,
  getOutputStatusFromDecision,
  getStateToken,
  persistenceStateDescription,
} from '../../workflowModel'
import type {
  ConnectionTarget,
  ConnectionTargetId,
  DashboardRow,
  DecisionRecord,
  DecisionState,
  DecisionStatus,
  OutputFilter,
  OutputStatus,
  PersistenceState,
  ProcessStep,
} from '../../types'

type OutputStepProps = {
  selectedReview: DashboardRow
  decisionRecords: DecisionRecord[]
  issueDecisionStates: Record<string, DecisionState>
  decisionStatuses: Record<string, DecisionStatus>
  outputStatuses: Record<string, OutputStatus>
  outputPersistenceStates: Record<string, PersistenceState>
  activeOutputItemId: string
  outputFilter: OutputFilter
  activeOutputTargetId: ConnectionTargetId
  connectionTargets: ConnectionTarget[]
  connectionsByTarget: Record<ConnectionTargetId, string[]>
  onSelectOutputItem: (outputId: string) => void
  onSetOutputFilter: (filter: OutputFilter) => void
  onSelectOutputTarget: (targetId: ConnectionTargetId) => void
  onSetProcessStep: (step: ProcessStep) => void
  onPrepareOutput: (outputItem: OutputRow) => Promise<void>
}

const isDecisionForTarget = (record: DecisionRecord, targetId: ConnectionTargetId, reviewId: string) => {
  if (targetId === 'bom-matvar') return record.issueId.startsWith(`bom-matvar-${reviewId}-`)
  return false
}

const getOutputStatusClass = (status: OutputStatus) => {
  if (status === 'Ready') return 'source-status-ready'
  if (status === 'Blocked') return 'source-status-error'
  return 'source-status-needs-check'
}

const buildGeneratedOutputItem = (decision: DecisionRecord, outputStatuses: Record<string, OutputStatus>): OutputRow => {
  const id = `output-${decision.issueId}`
  const derivedStatus = getOutputStatusFromDecision(decision.status)

  return {
    id,
    title: `${decision.issueTitle} output package`,
    area: decision.area,
    linkedIssueId: decision.issueId,
    description: `Generated output candidate for the ${decision.issueTitle} decision.`,
    sourceBasis: `${decision.source} vs ${decision.comparedWith}`,
    outputImpact: decision.outputImpact,
    artifactRole: 'BOM Matvar decision package',
    auditState: 'Not persisted',
    owner: decision.owner,
    updated: decision.updated,
    linkedDecision: decision,
    status: outputStatuses[id] ?? derivedStatus,
  }
}

const getTargetOutputState = (items: OutputRow[]) => {
  if (items.length === 0) return { label: 'Ready', className: 'source-status-ready' }
  if (items.some((item) => item.status === 'Blocked')) return { label: 'Blocked', className: 'source-status-error' }
  if (items.some((item) => item.status === 'Needs decision')) return { label: 'Needs decision', className: 'source-status-needs-check' }
  return { label: 'Ready', className: 'source-status-ready' }
}

export function OutputStep({
  selectedReview,
  decisionRecords,
  issueDecisionStates,
  decisionStatuses,
  outputStatuses,
  outputPersistenceStates,
  activeOutputItemId,
  outputFilter,
  activeOutputTargetId,
  connectionTargets,
  connectionsByTarget,
  onSelectOutputItem,
  onSetOutputFilter,
  onSelectOutputTarget,
  onSetProcessStep,
  onPrepareOutput,
}: OutputStepProps) {
  const activeOutputTarget = connectionTargets.find((target) => target.id === activeOutputTargetId) ?? connectionTargets[0]
  const activeTargetSourceCount = connectionsByTarget[activeOutputTarget.id]?.length ?? 0
  const decisionRows = getDecisionRows(decisionRecords, issueDecisionStates, decisionStatuses)
  const targetDecisions = decisionRows.filter((decision) => isDecisionForTarget(decision, activeOutputTarget.id, selectedReview.id))
  const targetOutputRows = activeOutputTarget.id === 'bom-matvar'
    ? targetDecisions.map((decision) => buildGeneratedOutputItem(decision, outputStatuses))
    : []
  const filteredOutputItems = filterOutputItems(targetOutputRows, outputFilter)
  const selectedOutputItem =
    filteredOutputItems.find((item) => item.id === activeOutputItemId) ??
    filteredOutputItems[0]
  const selectedOutputPersistence = selectedOutputItem
    ? outputPersistenceStates[selectedOutputItem.id] ?? defaultPersistenceState
    : defaultPersistenceState
  const summary = summarizeOutputItems(targetOutputRows)
  const activeTargetOutputState = getTargetOutputState(targetOutputRows)
  const filterOptions: OutputFilter[] = ['All', 'Ready', 'Blocked', 'Needs decision', 'Not persisted']
  const linkedDecisionLabel = selectedOutputItem?.linkedDecision
    ? `${selectedOutputItem.linkedDecision.issueTitle} (${selectedOutputItem.linkedDecision.status})`
    : 'No linked decision'
  const canPrepareOutput = selectedOutputItem?.linkedDecision?.status === 'Accepted'
  const readinessText = getOutputReadinessText(selectedOutputItem?.status)

  const prepareOutput = async () => {
    if (!selectedOutputItem) return
    await onPrepareOutput(selectedOutputItem)
  }

  return (
    <section className="sources-registry-grid sources-registry-grid-with-detail">
      <section className="workspace-main card sources-registry-main">
        <div className="sources-registry-header">
          <div>
            <p className="section-label">Output</p>
            <h3>Output registry</h3>
            <p>Artifact readiness for the current review and selected workflow target. File generation is prepared but not active yet.</p>
          </div>
          <div className="sources-registry-actions" aria-label="Output actions">
            <button
              type="button"
              className="secondary-button source-action-button"
              onClick={() => onSetProcessStep('Decisions')}
            >
              Back to Decisions
            </button>
          </div>
        </div>

        <div className="source-summary-grid" aria-label="Output readiness summary">
          <article className="source-summary-card">
            <span>Ready items</span>
            <strong>{summary.ready}</strong>
          </article>
          <article className="source-summary-card">
            <span>Blocked</span>
            <strong>{summary.blocked}</strong>
          </article>
          <article className="source-summary-card">
            <span>Decision-linked</span>
            <strong>{summary.decisionLinked}</strong>
          </article>
          <article className="source-summary-card">
            <span>Not persisted</span>
            <strong>{summary.notPersisted}</strong>
          </article>
        </div>

        <div className="output-filter-row" aria-label="Output filters">
          {filterOptions.map((filter) => {
            const isActive = filter === outputFilter
            return (
              <button
                key={filter}
                type="button"
                className={`output-filter-button ${isActive ? 'output-filter-button-active' : ''}`}
                onClick={() => onSetOutputFilter(filter)}
                aria-pressed={isActive}
              >
                {filter}
              </button>
            )
          })}
        </div>

        <div className="source-registry-list" aria-label="Output items">
          <div className="source-registry-list-head" aria-hidden="true">
            <span />
            <span>Artifact</span>
            <span>Role</span>
            <span>Owner</span>
            <span>Status</span>
          </div>
          {filteredOutputItems.length > 0 ? filteredOutputItems.map((item) => {
            const isActive = item.id === selectedOutputItem?.id
            const outputStatusClass = getOutputStatusClass(item.status)

            return (
              <button
                key={item.id}
                type="button"
                className={`source-registry-row ${isActive ? 'source-registry-row-active' : ''}`}
                onClick={() => onSelectOutputItem(item.id)}
              >
                <span className="source-registry-type" aria-hidden="true">
                  <span className="source-type-icon source-type-icon-compact">O</span>
                </span>
                <span className="source-registry-name">
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.area} | {item.sourceBasis}</small>
                  </span>
                </span>
                <span className="source-application-type" title={item.artifactRole}>
                  {item.artifactRole}
                </span>
                <span className="source-file-size">{item.owner}</span>
                <span className={`source-status ${outputStatusClass}`}>
                  <span className="source-status-dot" />
                  {item.status}
                </span>
              </button>
            )
          }) : (
            <div className="source-registry-empty">
              <strong>{targetOutputRows.length ? 'No output items match this filter' : 'No output items for this target'}</strong>
              <p>
                {activeOutputTarget.id === 'bom-matvar'
                  ? 'Accept BOM Matvar decisions to make generated output packages ready.'
                  : 'This workflow target is prepared for output once its decisions are available.'}
              </p>
            </div>
          )}
        </div>
      </section>

      <aside className="workspace-side-panel card source-detail-panel" aria-label="Output scope">
        <div className="source-connector-header">
          <div>
            <p className="section-label">Output scope</p>
            <h2>{activeOutputTarget.label}</h2>
            <p>{activeOutputTarget.description}</p>
          </div>
        </div>

        <p className="source-detail-section-title">Workflow target</p>
        <dl className="source-property-list">
          <div className="source-property-row">
            <dt>Status</dt>
            <dd>
              <span className={`source-status ${activeTargetOutputState.className}`}>
                <span className="source-status-dot" />
                {activeTargetOutputState.label}
              </span>
            </dd>
          </div>
          <div className="source-property-row">
            <dt>Review</dt>
            <dd>{selectedReview.intelModel}</dd>
          </div>
          <div className="source-property-row">
            <dt>Sources</dt>
            <dd>{activeTargetSourceCount}</dd>
          </div>
          <div className="source-property-row">
            <dt>Artifacts</dt>
            <dd>{targetOutputRows.length}</dd>
          </div>
        </dl>

        <p className="source-detail-section-title">Targets</p>
        <div className="decision-scope-list" aria-label="Output targets">
          {connectionTargets.map((target) => {
            const targetDecisions = decisionRows.filter((decision) => isDecisionForTarget(decision, target.id, selectedReview.id))
            const targetOutputs = target.id === 'bom-matvar'
              ? targetDecisions.map((decision) => buildGeneratedOutputItem(decision, outputStatuses))
              : []
            const targetState = target.id === 'bom-matvar'
              ? getTargetOutputState(targetOutputs)
              : { label: 'Not checked', className: 'source-status-needs-check' }
            const isActive = target.id === activeOutputTarget.id

            return (
              <button
                key={target.id}
                type="button"
                className={`decision-scope-row ${isActive ? 'decision-scope-row-active' : ''}`}
                onClick={() => onSelectOutputTarget(target.id)}
              >
                <span>
                  <strong>{target.label}</strong>
                  <small>{target.group}</small>
                </span>
                <span className="decision-scope-count">{targetOutputs.length}</span>
                <span className={`source-status ${targetState.className}`}>
                  <span className="source-status-dot" />
                  {targetState.label}
                </span>
              </button>
            )
          })}
        </div>

        <p className="source-detail-section-title">File generation</p>
        <dl className="source-property-list">
          <div className="source-property-row">
            <dt>Status</dt>
            <dd>Planned</dd>
          </div>
          <div className="source-property-row source-property-row-stacked">
            <dt>Formats</dt>
            <dd>Excel package, review summary and exception register will be generated from prepared output records later.</dd>
          </div>
        </dl>

        {selectedOutputItem ? (
          <>
            <p className="source-detail-section-title">Selected output</p>
            <dl className="source-property-list">
              <div className="source-property-row source-property-row-stacked">
                <dt>Artifact</dt>
                <dd>{selectedOutputItem.title}</dd>
              </div>
              <div className="source-property-row source-property-row-stacked">
                <dt>Linked decision</dt>
                <dd>{linkedDecisionLabel}</dd>
              </div>
              <div className="source-property-row">
                <dt>Readiness</dt>
                <dd>{readinessText}</dd>
              </div>
              <div className="source-property-row">
                <dt>Save state</dt>
                <dd>
                  <span className={`persistence-badge persistence-badge-${getStateToken(selectedOutputPersistence)}`}>
                    {selectedOutputPersistence}
                  </span>
                </dd>
              </div>
              <div className="source-property-row source-property-row-stacked">
                <dt>Persistence</dt>
                <dd>{persistenceStateDescription[selectedOutputPersistence]}</dd>
              </div>
            </dl>

            <div className="source-detail-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => { void prepareOutput() }}
                disabled={outputStatuses[selectedOutputItem.id] === 'Ready' || !canPrepareOutput}
              >
                Prepare output
              </button>
              <button type="button" className="secondary-button" disabled>
                Generate file package
              </button>
            </div>
          </>
        ) : null}
      </aside>
    </section>
  )
}
