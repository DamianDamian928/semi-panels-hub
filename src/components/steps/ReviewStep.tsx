import {
  filterReviewIssues,
  getReviewIssueRows,
  summarizeReviewIssues,
} from '../../domain/workflowSelectors'
import {
  defaultPersistenceState,
  getStateToken,
  persistenceStateDescription,
} from '../../workflowModel'
import type {
  DashboardRow,
  DecisionRecord,
  DecisionState,
  DecisionStatus,
  PersistenceState,
  ConnectionTarget,
  ConnectionTargetId,
  ProcessStep,
  ReviewIssue,
  ReviewIssueFilter,
  ValidationState,
} from '../../types'
import { validationStateClassName } from '../sharedReviewUi'

type ReviewStepProps = {
  selectedReview: DashboardRow
  reviewIssues: ReviewIssue[]
  decisionRecords: DecisionRecord[]
  issueDecisionStates: Record<string, DecisionState>
  issuePersistenceStates: Record<string, PersistenceState>
  decisionStatuses: Record<string, DecisionStatus>
  decisionPersistenceStates: Record<string, PersistenceState>
  activeReviewIssueId: string
  reviewIssueFilter: ReviewIssueFilter
  activeReviewTargetId: ConnectionTargetId
  connectionTargets: ConnectionTarget[]
  connectionsByTarget: Record<ConnectionTargetId, string[]>
  reviewIssueDataLabel: string
  reviewIssueLoading: boolean
  reviewIssueError: string | null
  onSelectReviewIssue: (issueId: string) => void
  onSetReviewIssueFilter: (filter: ReviewIssueFilter) => void
  onSelectReviewTarget: (targetId: ConnectionTargetId) => void
  onRefreshReviewIssues: () => void
  onMarkIssueForDecision: (issue: ReviewIssue) => Promise<void>
  onSetActiveDecisionIssue: (issueId: string) => void
  onSetDecisionFilterAll: () => void
  onSetProcessStep: (step: ProcessStep) => void
}

export function ReviewStep({
  selectedReview,
  reviewIssues,
  decisionRecords,
  issueDecisionStates,
  issuePersistenceStates,
  decisionStatuses,
  decisionPersistenceStates,
  activeReviewIssueId,
  reviewIssueFilter,
  activeReviewTargetId,
  connectionTargets,
  connectionsByTarget,
  reviewIssueDataLabel,
  reviewIssueLoading,
  reviewIssueError,
  onSelectReviewIssue,
  onSetReviewIssueFilter,
  onSelectReviewTarget,
  onRefreshReviewIssues,
  onMarkIssueForDecision,
  onSetActiveDecisionIssue,
  onSetDecisionFilterAll,
  onSetProcessStep,
}: ReviewStepProps) {
  const activeReviewTarget = connectionTargets.find((target) => target.id === activeReviewTargetId) ?? connectionTargets[0]
  const activeTargetSourceCount = connectionsByTarget[activeReviewTarget.id]?.length ?? 0
  const isBomMatvarTarget = activeReviewTarget.id === 'bom-matvar'
  const sourceIssueRows = isBomMatvarTarget ? reviewIssues : []
  const issueRows = getReviewIssueRows(sourceIssueRows, decisionRecords, issueDecisionStates, decisionStatuses)
  const filteredIssues = filterReviewIssues(issueRows, reviewIssueFilter)

  const selectedIssue =
    filteredIssues.find((issue) => issue.id === activeReviewIssueId) ??
    filteredIssues[0]

  const summary = summarizeReviewIssues(issueRows)

  const filterOptions: ReviewIssueFilter[] = ['All', 'Open', 'Needs decision', 'Resolved']
  const reviewStatus: ValidationState = isBomMatvarTarget
    ? reviewIssueError
      ? 'Error'
      : reviewIssueLoading
        ? 'Not checked'
        : issueRows.length
          ? 'Warning'
          : 'Valid'
    : 'Not checked'
  const selectedDecision = selectedIssue?.decision ?? 'None'
  const selectedIssuePersistence = selectedIssue
    ? issuePersistenceStates[selectedIssue.id] ?? decisionPersistenceStates[selectedIssue.id] ?? defaultPersistenceState
    : defaultPersistenceState
  const selectedIssueHasDecisionRecord = selectedIssue
    ? decisionRecords.some((record) => record.issueId === selectedIssue.id)
    : false
  const decisionReadinessTitle =
    selectedDecision === 'Required'
      ? 'Ready for decision'
      : selectedDecision === 'None'
        ? 'Not marked yet'
        : 'Decision already linked'

  const markForDecision = async () => {
    if (!selectedIssue) return

    await onMarkIssueForDecision(selectedIssue)
    onSetActiveDecisionIssue(selectedIssue.id)
    onSetDecisionFilterAll()
  }

  const goToDecisions = () => {
    if (!selectedIssue) return

    onSetActiveDecisionIssue(selectedIssue.id)
    onSetDecisionFilterAll()
    onSetProcessStep('Decisions')
  }

  const getTargetReviewStatus = (targetId: ConnectionTargetId): ValidationState =>
    targetId === 'bom-matvar' ? reviewStatus : 'Not checked'

  return (
    <section className="sources-registry-grid sources-registry-grid-with-detail mapping-registry-grid validation-workspace-grid">
      <section className="workspace-main card sources-registry-main mapping-registry-main review-workspace-main">
        <div className="sources-registry-header mapping-header">
          <div>
            <p className="section-label">Review</p>
            <h3>{isBomMatvarTarget ? 'BOM Matvar review' : `${activeReviewTarget.label} review`}</h3>
            <p>
              {isBomMatvarTarget
                ? 'Turns BOM Matvar comparison findings into review-ready issues before decisions are created.'
                : activeReviewTarget.description}
            </p>
          </div>
          <div className="sources-registry-actions mapping-registry-actions" aria-label="Review actions">
            <span className={validationStateClassName[reviewStatus]}>{reviewStatus}</span>
            {isBomMatvarTarget ? (
              <button
                type="button"
                className="secondary-button source-action-button"
                onClick={onRefreshReviewIssues}
                disabled={reviewIssueLoading}
              >
                {reviewIssueLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            ) : null}
          </div>
        </div>

        <div className="source-summary-grid" aria-label={`${activeReviewTarget.label} review summary`}>
          <article className="source-summary-card">
            <span>Review</span>
            <strong>{selectedReview.intelModel}</strong>
          </article>
          <article className="source-summary-card">
            <span>Connected sources</span>
            <strong>{activeTargetSourceCount}</strong>
          </article>
          <article className="source-summary-card">
            <span>Open issues</span>
            <strong>{summary.open}</strong>
          </article>
          <article className="source-summary-card">
            <span>Needs decision</span>
            <strong>{summary.needsDecision}</strong>
          </article>
          <article className="source-summary-card">
            <span>High severity</span>
            <strong>{summary.highSeverity}</strong>
          </article>
          <article className="source-summary-card">
            <span>Resolved</span>
            <strong>{summary.resolved}</strong>
          </article>
        </div>

        {reviewIssueError ? <p className="impact-error">{reviewIssueError}</p> : null}
        {reviewIssueLoading ? <p className="review-import-status">Loading {reviewIssueDataLabel} review issues.</p> : null}

        {isBomMatvarTarget ? (
          <>
            <div className="review-filter-row" aria-label="Issue filters">
              {filterOptions.map((filter) => {
                const isActive = filter === reviewIssueFilter
                return (
                  <button
                    key={filter}
                    type="button"
                    className={`review-filter-button ${isActive ? 'review-filter-button-active' : ''}`}
                    onClick={() => onSetReviewIssueFilter(filter)}
                    aria-pressed={isActive}
                  >
                    {filter}
                  </button>
                )
              })}
            </div>

            <p className="source-detail-section-title">Review issues</p>
            <div className="review-issue-list" aria-label="Review issues">
              {filteredIssues.length > 0 ? filteredIssues.map((issue) => {
                const isActive = issue.id === selectedIssue?.id
                return (
              <button
                key={issue.id}
                type="button"
                className={`review-issue-row ${isActive ? 'review-issue-row-active' : ''}`}
                onClick={() => onSelectReviewIssue(issue.id)}
              >
                <span className={`review-severity review-severity-${issue.severity.toLowerCase()}`}>{issue.severity}</span>
                <span className="review-issue-main">
                  <strong>{issue.title}</strong>
                  <span>{issue.area} | {issue.source} vs {issue.comparedWith}</span>
                </span>
                <span className="review-issue-meta">
                  <span>{issue.status}</span>
                  <span>Decision: {issue.decision}</span>
                </span>
              </button>
                )
              }) : (
                <div className="source-registry-empty">
                  <strong>{issueRows.length ? 'No issues match this filter' : 'No BOM Matvar review issues'}</strong>
                  <p>
                    {issueRows.length
                      ? 'Try another filter to return to the current review issue list.'
                      : 'The current BOM Matvar comparison did not generate Missing or Fallback issues for this review.'}
                  </p>
                </div>
              )}
            </div>

            {selectedIssue ? (
              <section className="review-selected-detail" aria-label="Selected issue details">
                <div className="sidebar-header">
                  <p className="section-label">Selected issue</p>
                  <h2>{selectedIssue.title}</h2>
                  <p>{selectedIssue.description}</p>
                </div>

                <dl className="source-meta-list">
                  <div>
                    <dt>Area</dt>
                    <dd>{selectedIssue.area}</dd>
                  </div>
                  <div>
                    <dt>Severity</dt>
                    <dd>{selectedIssue.severity}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{selectedIssue.status}</dd>
                  </div>
                  <div>
                    <dt>Sources</dt>
                    <dd>{selectedIssue.source} vs {selectedIssue.comparedWith}</dd>
                  </div>
                  <div>
                    <dt>Decision</dt>
                    <dd>{selectedDecision}</dd>
                  </div>
                  <div>
                    <dt>Save state</dt>
                    <dd>
                      <span className={`persistence-badge persistence-badge-${getStateToken(selectedIssuePersistence)}`}>
                        {selectedIssuePersistence}
                      </span>
                    </dd>
                  </div>
                </dl>

                <section className="decision-readiness" aria-label="Decision readiness">
                  <p className="section-label">Decision readiness</p>
                  <h3>{decisionReadinessTitle}</h3>
                  <p>{selectedIssue.suggestedAction}</p>
                  <p className="persistence-note">{persistenceStateDescription[selectedIssuePersistence]}</p>
                </section>

                <div className="review-detail-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={markForDecision}
                    disabled={selectedDecision !== 'None'}
                  >
                    Mark for decision
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={goToDecisions}
                    disabled={!selectedIssueHasDecisionRecord}
                  >
                    Go to Decisions
                  </button>
                </div>
              </section>
            ) : null}
          </>
        ) : (
          <div className="source-registry-empty">
            <strong>Review issue generation is not implemented yet</strong>
            <p>This target is ready in the Review workspace. It will use the same review issue model once its comparison rules are available.</p>
          </div>
        )}
      </section>

      <aside className="workspace-side-panel card source-detail-panel mapping-detail-panel" aria-label="Workflow review targets">
        <div className="sidebar-header">
          <p className="section-label">Workflow targets</p>
          <h2>Review scope</h2>
          <p>Select a target to review generated issues before decisions are created.</p>
        </div>

        <div className="connection-target-list">
          {connectionTargets.map((target) => {
            const isActive = target.id === activeReviewTarget.id
            const targetStatus = getTargetReviewStatus(target.id)
            const connectedCount = connectionsByTarget[target.id]?.length ?? 0

            return (
              <button
                key={target.id}
                type="button"
                className={`connection-target-node ${isActive ? 'connection-target-node-active' : ''}`}
                onClick={() => onSelectReviewTarget(target.id)}
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
