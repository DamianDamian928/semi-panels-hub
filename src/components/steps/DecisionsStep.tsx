import {
  filterDecisions,
  getDecisionRows,
  summarizeDecisions,
} from '../../domain/workflowSelectors'
import {
  defaultPersistenceState,
  getStateToken,
  persistenceStateDescription,
} from '../../workflowModel'
import type {
  ConnectionTarget,
  ConnectionTargetId,
  DashboardRow,
  DecisionFilter,
  DecisionRecord,
  DecisionState,
  DecisionStatus,
  PersistenceState,
  ProcessStep,
  ReviewIssue,
  ReviewIssueFilter,
} from '../../types'

type DecisionsStepProps = {
  selectedReview: DashboardRow
  reviewIssues: ReviewIssue[]
  decisionRecords: DecisionRecord[]
  issueDecisionStates: Record<string, DecisionState>
  decisionStatuses: Record<string, DecisionStatus>
  decisionPersistenceStates: Record<string, PersistenceState>
  activeDecisionIssueId: string
  decisionFilter: DecisionFilter
  activeDecisionTargetId: ConnectionTargetId
  connectionTargets: ConnectionTarget[]
  connectionsByTarget: Record<ConnectionTargetId, string[]>
  onSelectDecisionIssue: (issueId: string) => void
  onSelectReviewIssue: (issueId: string) => void
  onSelectDecisionTarget: (targetId: ConnectionTargetId) => void
  onSetDecisionFilter: (filter: DecisionFilter) => void
  onSetReviewIssueFilter: (filter: ReviewIssueFilter) => void
  onSetProcessStep: (step: ProcessStep) => void
  onSaveDecisionStatus: (decision: DecisionRecord, status: DecisionStatus) => Promise<void>
}

const isDecisionForTarget = (record: DecisionRecord, targetId: ConnectionTargetId, reviewId: string) => {
  if (targetId === 'bom-matvar') return record.issueId.startsWith(`bom-matvar-${reviewId}-`)
  return false
}

const getDecisionStatusClass = (status: DecisionStatus) => {
  if (status === 'Accepted') return 'source-status-ready'
  if (status === 'Deferred') return 'source-status-needs-location'
  return 'source-status-needs-check'
}

const getTargetDecisionState = (decisions: DecisionRecord[]) => {
  if (decisions.length === 0) return { label: 'Ready', className: 'source-status-ready' }
  if (decisions.every((decision) => decision.status === 'Accepted')) return { label: 'Ready', className: 'source-status-ready' }
  return { label: 'Needs decision', className: 'source-status-needs-check' }
}

export function DecisionsStep({
  selectedReview,
  reviewIssues,
  decisionRecords,
  issueDecisionStates,
  decisionStatuses,
  decisionPersistenceStates,
  activeDecisionIssueId,
  decisionFilter,
  activeDecisionTargetId,
  connectionTargets,
  connectionsByTarget,
  onSelectDecisionIssue,
  onSelectReviewIssue,
  onSelectDecisionTarget,
  onSetDecisionFilter,
  onSetReviewIssueFilter,
  onSetProcessStep,
  onSaveDecisionStatus,
}: DecisionsStepProps) {
  const activeDecisionTarget = connectionTargets.find((target) => target.id === activeDecisionTargetId) ?? connectionTargets[0]
  const activeTargetSourceCount = connectionsByTarget[activeDecisionTarget.id]?.length ?? 0
  const decisionRows = getDecisionRows(decisionRecords, issueDecisionStates, decisionStatuses)
  const targetDecisionRows = decisionRows.filter((record) => isDecisionForTarget(record, activeDecisionTarget.id, selectedReview.id))
  const filteredDecisions = filterDecisions(targetDecisionRows, decisionFilter)
  const summary = summarizeDecisions(targetDecisionRows)
  const selectedDecision =
    filteredDecisions.find((record) => record.issueId === activeDecisionIssueId) ??
    filteredDecisions[0]
  const selectedDecisionIssue = selectedDecision
    ? reviewIssues.find((issue) => issue.id === selectedDecision.issueId)
    : undefined
  const selectedDecisionPersistence = selectedDecision
    ? decisionPersistenceStates[selectedDecision.issueId] ?? defaultPersistenceState
    : defaultPersistenceState
  const activeTargetDecisionState = getTargetDecisionState(targetDecisionRows)
  const filterOptions: DecisionFilter[] = ['All', 'Required', 'Drafted', 'Accepted', 'Deferred']

  const setDecisionStatus = async (status: DecisionStatus) => {
    if (!selectedDecision) return
    await onSaveDecisionStatus(selectedDecision, status)
  }

  return (
    <section className="sources-registry-grid sources-registry-grid-with-detail">
      <section className="workspace-main card sources-registry-main">
        <div className="sources-registry-header">
          <div>
            <p className="section-label">Decisions</p>
            <h3>Decision registry</h3>
            <p>Decision records linked to review issues for the current review and selected workflow target.</p>
          </div>
          <div className="sources-registry-actions" aria-label="Decision actions">
            <button
              type="button"
              className="secondary-button source-action-button"
              onClick={() => {
                onSetReviewIssueFilter('All')
                onSetProcessStep('Review')
              }}
            >
              Back to Review
            </button>
          </div>
        </div>

        <div className="source-summary-grid" aria-label="Decision summary">
          <article className="source-summary-card">
            <span>Required</span>
            <strong>{summary.Required}</strong>
          </article>
          <article className="source-summary-card">
            <span>Drafted</span>
            <strong>{summary.Drafted}</strong>
          </article>
          <article className="source-summary-card">
            <span>Accepted</span>
            <strong>{summary.Accepted}</strong>
          </article>
          <article className="source-summary-card">
            <span>Deferred</span>
            <strong>{summary.Deferred}</strong>
          </article>
        </div>

        <div className="decision-filter-row" aria-label="Decision filters">
          {filterOptions.map((filter) => {
            const isActive = filter === decisionFilter
            return (
              <button
                key={filter}
                type="button"
                className={`decision-filter-button ${isActive ? 'decision-filter-button-active' : ''}`}
                onClick={() => onSetDecisionFilter(filter)}
                aria-pressed={isActive}
              >
                {filter}
              </button>
            )
          })}
        </div>

        <div className="source-registry-list" aria-label="Decision records">
          <div className="source-registry-list-head" aria-hidden="true">
            <span />
            <span>Decision</span>
            <span>Impact</span>
            <span>Owner</span>
            <span>Status</span>
          </div>
          {filteredDecisions.length > 0 ? filteredDecisions.map((record) => {
            const isActive = record.issueId === selectedDecision?.issueId
            const decisionStatusClass = getDecisionStatusClass(record.status)

            return (
              <button
                key={record.issueId}
                type="button"
                className={`source-registry-row ${isActive ? 'source-registry-row-active' : ''}`}
                onClick={() => {
                  onSelectDecisionIssue(record.issueId)
                  onSelectReviewIssue(record.issueId)
                }}
              >
                <span className="source-registry-type" aria-hidden="true">
                  <span className="source-type-icon source-type-icon-compact">D</span>
                </span>
                <span className="source-registry-name">
                  <span>
                    <strong>{record.issueTitle}</strong>
                    <small>{record.area} | {record.source} vs {record.comparedWith}</small>
                  </span>
                </span>
                <span className="source-application-type" title={record.outputImpact}>
                  {record.outputImpact}
                </span>
                <span className="source-file-size">{record.owner}</span>
                <span className={`source-status ${decisionStatusClass}`}>
                  <span className="source-status-dot" />
                  {record.status}
                </span>
              </button>
            )
          }) : (
            <div className="source-registry-empty">
              <strong>{targetDecisionRows.length ? 'No decisions match this filter' : 'No decisions for this target'}</strong>
              <p>
                {activeDecisionTarget.id === 'bom-matvar'
                  ? 'Mark BOM Matvar review issues for decision to create records here.'
                  : 'This workflow target is prepared for decisions once its review issues are generated.'}
              </p>
            </div>
          )}
        </div>
      </section>

      <aside className="workspace-side-panel card source-detail-panel" aria-label="Decision scope">
        <div className="source-connector-header">
          <div>
            <p className="section-label">Decision scope</p>
            <h2>{activeDecisionTarget.label}</h2>
            <p>{activeDecisionTarget.description}</p>
          </div>
        </div>

        <p className="source-detail-section-title">Workflow target</p>
        <dl className="source-property-list">
          <div className="source-property-row">
            <dt>Status</dt>
            <dd>
              <span className={`source-status ${activeTargetDecisionState.className}`}>
                <span className="source-status-dot" />
                {activeTargetDecisionState.label}
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
            <dt>Decisions</dt>
            <dd>{targetDecisionRows.length}</dd>
          </div>
        </dl>

        <p className="source-detail-section-title">Targets</p>
        <div className="decision-scope-list" aria-label="Decision targets">
          {connectionTargets.map((target) => {
            const targetDecisions = decisionRows.filter((record) => isDecisionForTarget(record, target.id, selectedReview.id))
            const targetState = target.id === 'bom-matvar'
              ? getTargetDecisionState(targetDecisions)
              : { label: 'Not checked', className: 'source-status-needs-check' }
            const isActive = target.id === activeDecisionTarget.id

            return (
              <button
                key={target.id}
                type="button"
                className={`decision-scope-row ${isActive ? 'decision-scope-row-active' : ''}`}
                onClick={() => onSelectDecisionTarget(target.id)}
              >
                <span>
                  <strong>{target.label}</strong>
                  <small>{target.group}</small>
                </span>
                <span className="decision-scope-count">{targetDecisions.length}</span>
                <span className={`source-status ${targetState.className}`}>
                  <span className="source-status-dot" />
                  {targetState.label}
                </span>
              </button>
            )
          })}
        </div>

        {selectedDecision ? (
          <>
            <p className="source-detail-section-title">Selected decision</p>
            <dl className="source-property-list">
              <div className="source-property-row source-property-row-stacked">
                <dt>Linked issue</dt>
                <dd>{selectedDecision.issueTitle}</dd>
              </div>
              <div className="source-property-row">
                <dt>Issue context</dt>
                <dd>
                  {selectedDecisionIssue
                    ? `${selectedDecisionIssue.area} | ${selectedDecisionIssue.severity} | ${selectedDecisionIssue.status}`
                    : selectedDecision.area}
                </dd>
              </div>
              <div className="source-property-row source-property-row-stacked">
                <dt>Decision</dt>
                <dd>{selectedDecision.proposedDecision}</dd>
              </div>
              <div className="source-property-row source-property-row-stacked">
                <dt>Rationale</dt>
                <dd>{selectedDecision.rationale}</dd>
              </div>
              <div className="source-property-row">
                <dt>Save state</dt>
                <dd>
                  <span className={`persistence-badge persistence-badge-${getStateToken(selectedDecisionPersistence)}`}>
                    {selectedDecisionPersistence}
                  </span>
                </dd>
              </div>
              <div className="source-property-row source-property-row-stacked">
                <dt>Persistence</dt>
                <dd>{persistenceStateDescription[selectedDecisionPersistence]}</dd>
              </div>
            </dl>

            <div className="source-detail-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => { void setDecisionStatus('Drafted') }}
                disabled={selectedDecision.status === 'Drafted' || selectedDecision.status === 'Accepted'}
              >
                Set as drafted
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => { void setDecisionStatus('Accepted') }}
                disabled={selectedDecision.status === 'Accepted'}
              >
                Accept decision
              </button>
            </div>
          </>
        ) : null}
      </aside>
    </section>
  )
}
