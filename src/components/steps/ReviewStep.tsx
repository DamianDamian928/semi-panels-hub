import type { ChangeEvent } from 'react'
import type { ReviewIssueAdapterResult } from '../../adapters/readOnlyReviewAdapter'
import type { WorkflowViewPayload } from '../../apiClient'
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
  ProcessStep,
  ReviewIssue,
  ReviewIssueFilter,
} from '../../types'

type ReviewStepProps = {
  selectedReview: DashboardRow
  reviewIssues: ReviewIssue[]
  decisionRecords: DecisionRecord[]
  issueDecisionStates: Record<string, DecisionState>
  issuePersistenceStates: Record<string, PersistenceState>
  decisionStatuses: Record<string, DecisionStatus>
  decisionPersistenceStates: Record<string, PersistenceState>
  workflowView: WorkflowViewPayload | null
  activeReviewIssueId: string
  reviewIssueFilter: ReviewIssueFilter
  reviewImportPreview: ReviewIssueAdapterResult | null
  reviewImportError: string | null
  onSelectReviewIssue: (issueId: string) => void
  onSetReviewIssueFilter: (filter: ReviewIssueFilter) => void
  onSetReviewImportPreview: (preview: ReviewIssueAdapterResult | null) => void
  onSetReviewImportError: (error: string | null) => void
  onReviewImportFile: (event: ChangeEvent<HTMLInputElement>) => void
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
  workflowView,
  activeReviewIssueId,
  reviewIssueFilter,
  reviewImportPreview,
  reviewImportError,
  onSelectReviewIssue,
  onSetReviewIssueFilter,
  onSetReviewImportPreview,
  onSetReviewImportError,
  onReviewImportFile,
  onMarkIssueForDecision,
  onSetActiveDecisionIssue,
  onSetDecisionFilterAll,
  onSetProcessStep,
}: ReviewStepProps) {
  const reviewIssueSource = reviewImportPreview?.issues.length ? reviewImportPreview.issues : reviewIssues
  const usesImportedPreview = Boolean(reviewImportPreview?.issues.length)
  const issueRows = usesImportedPreview
    ? getReviewIssueRows(reviewIssueSource, decisionRecords, issueDecisionStates, decisionStatuses)
    : workflowView?.review.issueRows ?? getReviewIssueRows(reviewIssueSource, decisionRecords, issueDecisionStates, decisionStatuses)
  const filteredIssues = filterReviewIssues(issueRows, reviewIssueFilter)

  const selectedIssue =
    filteredIssues.find((issue) => issue.id === activeReviewIssueId) ??
    filteredIssues[0]

  const summary = usesImportedPreview
    ? summarizeReviewIssues(issueRows)
    : workflowView?.review.summary ?? summarizeReviewIssues(issueRows)

  const filterOptions: ReviewIssueFilter[] = ['All', 'Open', 'Needs decision', 'Resolved']
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

  return (
    <section className="review-workspace-grid">
      <section className="workspace-main card review-workspace-main">
        <div className="review-workspace-header">
          <div>
            <p className="section-label">Review</p>
            <h3>Review workspace</h3>
            <p>Central place for issue triage before decisions are created as separate records.</p>
          </div>
          <div className="review-workspace-context">
            <span className="meta-chip">Review: {selectedReview.intelModel}</span>
            <span className="meta-chip">Issues: {issueRows.length}</span>
            <span className="meta-chip">Data: {reviewImportPreview ? reviewImportPreview.sourceName : 'Mock data'}</span>
          </div>
        </div>

        <section className="review-import-preview" aria-label="Read-only import preview">
          <div>
            <p className="section-label">Read-only data preview</p>
            <h4>CSV / TSV issue preview</h4>
            <p>Select an exported CSV or TSV file to map rows into review issues without saving or changing any source file.</p>
          </div>
          <div className="review-import-actions">
            <label className="secondary-button review-import-file">
              Choose file
              <input type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" onChange={onReviewImportFile} />
            </label>
            {reviewImportPreview ? (
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  onSetReviewImportPreview(null)
                  onSetReviewImportError(null)
                  onSelectReviewIssue(reviewIssues[0].id)
                }}
              >
                Clear preview
              </button>
            ) : null}
          </div>
          {reviewImportPreview ? (
            <p className="review-import-status">
              Loaded {reviewImportPreview.issues.length} rows from {reviewImportPreview.sourceName}. Columns: {reviewImportPreview.columns?.join(', ') || 'none'}.
            </p>
          ) : null}
          {reviewImportError ? <p className="review-import-error">{reviewImportError}</p> : null}
        </section>

        <div className="review-stat-grid" aria-label="Review issue summary">
          <article className="review-stat-card">
            <span>Open issues</span>
            <strong>{summary.open}</strong>
          </article>
          <article className="review-stat-card">
            <span>Needs decision</span>
            <strong>{summary.needsDecision}</strong>
          </article>
          <article className="review-stat-card">
            <span>High severity</span>
            <strong>{summary.highSeverity}</strong>
          </article>
          <article className="review-stat-card">
            <span>Resolved</span>
            <strong>{summary.resolved}</strong>
          </article>
        </div>

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
            <div className="workspace-empty-state">
              <strong>No issues match this filter</strong>
              <p>Try another filter to return to the current review issue list.</p>
            </div>
          )}
        </div>
      </section>

      <aside className="workspace-side-panel card review-detail-panel" aria-label="Selected issue details">
        {selectedIssue ? (
          <>
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
          </>
        ) : (
          <div className="workspace-empty-state workspace-empty-state-panel">
            <strong>No issue selected</strong>
            <p>The current filter has no matching issues. Choose another filter to see issue details.</p>
          </div>
        )}
      </aside>
    </section>
  )
}
