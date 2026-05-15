import type { WorkflowViewPayload } from '../../apiClient'
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
  workflowView: WorkflowViewPayload | null
  activeDecisionIssueId: string
  decisionFilter: DecisionFilter
  onSelectDecisionIssue: (issueId: string) => void
  onSelectReviewIssue: (issueId: string) => void
  onSetDecisionFilter: (filter: DecisionFilter) => void
  onSetReviewIssueFilter: (filter: ReviewIssueFilter) => void
  onSetProcessStep: (step: ProcessStep) => void
  onSaveDecisionStatus: (decision: DecisionRecord, status: DecisionStatus) => Promise<void>
}

export function DecisionsStep({
  selectedReview,
  reviewIssues,
  decisionRecords,
  issueDecisionStates,
  decisionStatuses,
  decisionPersistenceStates,
  workflowView,
  activeDecisionIssueId,
  decisionFilter,
  onSelectDecisionIssue,
  onSelectReviewIssue,
  onSetDecisionFilter,
  onSetReviewIssueFilter,
  onSetProcessStep,
  onSaveDecisionStatus,
}: DecisionsStepProps) {
  const decisionRows = workflowView?.decisions.decisionRows ?? getDecisionRows(decisionRecords, issueDecisionStates, decisionStatuses)
  const filteredDecisions = filterDecisions(decisionRows, decisionFilter)

  const selectedDecision =
    filteredDecisions.find((record) => record.issueId === activeDecisionIssueId) ??
    filteredDecisions[0]
  const selectedDecisionIssue = selectedDecision
    ? reviewIssues.find((issue) => issue.id === selectedDecision.issueId)
    : undefined
  const selectedDecisionPersistence = selectedDecision
    ? decisionPersistenceStates[selectedDecision.issueId] ?? defaultPersistenceState
    : defaultPersistenceState

  const summary = workflowView?.decisions.summary ?? summarizeDecisions(decisionRows)
  const filterOptions: DecisionFilter[] = ['All', 'Required', 'Drafted', 'Accepted', 'Deferred']

  const setDecisionStatus = async (status: DecisionStatus) => {
    if (!selectedDecision) return
    await onSaveDecisionStatus(selectedDecision, status)
  }

  return (
    <section className="decision-workspace-grid">
      <section className="workspace-main card decision-workspace-main">
        <div className="decision-workspace-header">
          <div>
            <p className="section-label">Decisions</p>
            <h3>Decision workspace</h3>
            <p>Separate decision records linked to review issues, kept apart from source data and issue detection.</p>
          </div>
          <div className="decision-workspace-context">
            <span className="meta-chip">Review: {selectedReview.intelModel}</span>
            <span className="meta-chip">Decisions: {decisionRows.length}</span>
          </div>
        </div>

        <div className="decision-stat-grid" aria-label="Decision summary">
          <article className="decision-stat-card">
            <span>Required</span>
            <strong>{summary.Required}</strong>
          </article>
          <article className="decision-stat-card">
            <span>Drafted</span>
            <strong>{summary.Drafted}</strong>
          </article>
          <article className="decision-stat-card">
            <span>Accepted</span>
            <strong>{summary.Accepted}</strong>
          </article>
          <article className="decision-stat-card">
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

        <div className="decision-list" aria-label="Decision records">
          {filteredDecisions.length > 0 ? filteredDecisions.map((record) => {
            const isActive = record.issueId === selectedDecision?.issueId
            return (
              <button
                key={record.issueId}
                type="button"
                className={`decision-row ${isActive ? 'decision-row-active' : ''}`}
                onClick={() => {
                  onSelectDecisionIssue(record.issueId)
                  onSelectReviewIssue(record.issueId)
                }}
              >
                <span className={`decision-status decision-status-${record.status.toLowerCase()}`}>{record.status}</span>
                <span className="decision-row-main">
                  <strong>{record.issueTitle}</strong>
                  <span>{record.area} | {record.source} vs {record.comparedWith}</span>
                </span>
                <span className="decision-row-meta">
                  <span>{record.owner}</span>
                  <span>{record.updated}</span>
                </span>
              </button>
            )
          }) : (
            <div className="workspace-empty-state">
              <strong>No decisions match this filter</strong>
              <p>Try another filter to return to the decision record list.</p>
            </div>
          )}
        </div>
      </section>

      <aside className="workspace-side-panel card decision-detail-panel" aria-label="Selected decision details">
        {selectedDecision ? (
          <>
            <div className="sidebar-header">
              <p className="section-label">Selected decision</p>
              <h2>{selectedDecision.issueTitle}</h2>
              <p>{selectedDecision.proposedDecision}</p>
            </div>

            <section className="decision-detail-block">
              <p className="section-label">Review issue context</p>
              <p>
                {selectedDecisionIssue
                  ? `${selectedDecisionIssue.area} | ${selectedDecisionIssue.severity} severity | ${selectedDecisionIssue.status}`
                  : 'Linked review issue context is not available in the local mock data.'}
              </p>
            </section>

            <section className="decision-detail-block">
              <p className="section-label">Decision rationale</p>
              <p>{selectedDecision.rationale}</p>
            </section>

            <dl className="source-meta-list">
              <div>
                <dt>Linked issue</dt>
                <dd>{selectedDecision.issueTitle}</dd>
              </div>
              <div>
                <dt>Decision status</dt>
                <dd>{selectedDecision.status}</dd>
              </div>
              <div>
                <dt>Output impact</dt>
                <dd>{selectedDecision.outputImpact}</dd>
              </div>
              <div>
                <dt>Audit state</dt>
                <dd>{selectedDecision.auditState}</dd>
              </div>
              <div>
                <dt>Save state</dt>
                <dd>
                  <span className={`persistence-badge persistence-badge-${getStateToken(selectedDecisionPersistence)}`}>
                    {selectedDecisionPersistence}
                  </span>
                </dd>
              </div>
            </dl>

            <section className="decision-detail-block">
              <p className="section-label">Persistence state</p>
              <p>{persistenceStateDescription[selectedDecisionPersistence]}</p>
            </section>

            <div className="decision-detail-actions">
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
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  onSelectReviewIssue(selectedDecision.issueId)
                  onSetReviewIssueFilter('All')
                  onSetProcessStep('Review')
                }}
              >
                Back to Review
              </button>
            </div>
          </>
        ) : (
          <div className="workspace-empty-state workspace-empty-state-panel">
            <strong>No decision selected</strong>
            <p>The current filter has no matching decision records. Choose another filter to see decision details.</p>
          </div>
        )}
      </aside>
    </section>
  )
}
