import {
  filterDecisions,
  getDecisionRows,
  summarizeDecisions,
} from '../../domain/workflowSelectors'
import type { BomMatvarComparisonPayload } from '../../apiClient'
import {
  defaultPersistenceState,
  getStateToken,
  persistenceStateDescription,
} from '../../workflowModel'
import { validationStateClassName } from '../sharedReviewUi'
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
} from '../../types'

type DecisionsStepProps = {
  selectedReview: DashboardRow
  reviewIssues: ReviewIssue[]
  comparison: BomMatvarComparisonPayload | null
  decisionRecords: DecisionRecord[]
  issueDecisionStates: Record<string, DecisionState>
  decisionStatuses: Record<string, DecisionStatus>
  decisionPersistenceStates: Record<string, PersistenceState>
  decisionFilter: DecisionFilter
  activeDecisionTargetId: ConnectionTargetId
  connectionTargets: ConnectionTarget[]
  connectionsByTarget: Record<ConnectionTargetId, string[]>
  onSelectDecisionTarget: (targetId: ConnectionTargetId) => void
  onSetDecisionFilter: (filter: DecisionFilter) => void
  onSetProcessStep: (step: ProcessStep) => void
  onSaveDecisionStatus: (decision: DecisionRecord, status: DecisionStatus) => Promise<void>
}

const isDecisionForTarget = (record: DecisionRecord, targetId: ConnectionTargetId, reviewId: string) => {
  if (targetId === 'bom-matvar') return record.issueId.startsWith(`bom-matvar-${reviewId}-`)
  return false
}

const getTargetDecisionState = (decisions: DecisionRecord[]) => {
  if (decisions.length === 0) return { label: 'Ready', className: 'source-status-ready' }
  if (decisions.every((decision) => decision.status === 'Accepted')) return { label: 'Ready', className: 'source-status-ready' }
  return { label: 'Needs decision', className: 'source-status-needs-check' }
}

const getRuleStatusClass = (status: string) => {
  if (status === 'OK' || status === 'Context') return validationStateClassName.Valid
  if (status === 'Fallback' || status === 'Info' || status === 'Mismatch') return validationStateClassName.Warning
  return validationStateClassName.Error
}

export function DecisionsStep({
  selectedReview,
  reviewIssues,
  comparison,
  decisionRecords,
  issueDecisionStates,
  decisionStatuses,
  decisionPersistenceStates,
  decisionFilter,
  activeDecisionTargetId,
  connectionTargets,
  connectionsByTarget,
  onSelectDecisionTarget,
  onSetDecisionFilter,
  onSetProcessStep,
  onSaveDecisionStatus,
}: DecisionsStepProps) {
  const activeDecisionTarget = connectionTargets.find((target) => target.id === activeDecisionTargetId) ?? connectionTargets[0]
  const activeTargetSourceCount = connectionsByTarget[activeDecisionTarget.id]?.length ?? 0
  const decisionRows = getDecisionRows(decisionRecords, issueDecisionStates, decisionStatuses)
  const targetDecisionRows = decisionRows.filter((record) => isDecisionForTarget(record, activeDecisionTarget.id, selectedReview.id))
  const filteredDecisions = filterDecisions(targetDecisionRows, decisionFilter)
  const summary = summarizeDecisions(targetDecisionRows)
  const selectedDecision = filteredDecisions[0]
  const selectedDecisionIssue = selectedDecision
    ? reviewIssues.find((issue) => issue.id === selectedDecision.issueId)
    : undefined
  const selectedDecisionPersistence = selectedDecision
    ? decisionPersistenceStates[selectedDecision.issueId] ?? defaultPersistenceState
    : defaultPersistenceState
  const activeTargetDecisionState = getTargetDecisionState(targetDecisionRows)
  const filterOptions: DecisionFilter[] = ['All', 'Required', 'Drafted', 'Accepted', 'Deferred']
  const bomL0Rules = comparison?.rules ?? []
  const matvarRules = comparison?.matvarRules ?? []
  const bomL0Contract = comparison?.dataContracts?.find((contract) => contract.id === 'bom-matvar:bom-l0')
  const matvarContract = comparison?.dataContracts?.find((contract) => contract.id === 'bom-matvar:matvar-rules')
  const bomL0RulesSourceLabel = bomL0Contract?.sourceName
    ? [bomL0Contract.sourceName, bomL0Contract.sheetName].filter(Boolean).join(' / ')
    : ''
  const matvarRulesSourceLabel = matvarContract?.sourceName
    ? [matvarContract.sourceName, matvarContract.sheetName].filter(Boolean).join(' / ')
    : ''
  const decisionByIssueId = new Map(targetDecisionRows.map((decision) => [decision.issueId, decision]))

  const getDecisionText = (issueId: string, status: string) => {
    const decision = decisionByIssueId.get(issueId)
    if (decision) return decision.proposedDecision
    if (status === 'Missing' || status === 'Fallback' || status === 'Mismatch') return 'Decision pending'
    return 'No decision required'
  }

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
            <p>Decision records generated from comparison findings. These records will feed the future Dashboard Open review.</p>
          </div>
          <div className="sources-registry-actions" aria-label="Decision actions">
            <button
              type="button"
              className="secondary-button source-action-button"
              onClick={() => onSetProcessStep('Comparison')}
            >
              Back to Comparison
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

        <p className="source-detail-section-title">
          BOM L0 rules{bomL0RulesSourceLabel ? ` (${bomL0RulesSourceLabel})` : ''}
        </p>
        {bomL0Rules.length ? (
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
                  <th>Decision</th>
                </tr>
              </thead>
              <tbody>
                {bomL0Rules.map((rule) => {
                  const issueId = `bom-matvar-${selectedReview.id}-${rule.id}`
                  return (
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
                      <td>{getDecisionText(issueId, rule.status)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="source-registry-empty">
            <strong>No BOM L0 comparison data</strong>
            <p>Run comparison to generate decision candidates.</p>
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
                  <th>INTEL Description</th>
                  <th>Phantom L1</th>
                  <th>Scope</th>
                  <th>Weryfikacja Matvar</th>
                  <th>Decision</th>
                </tr>
              </thead>
              <tbody>
                {matvarRules.map((rule) => {
                  const issueId = `bom-matvar-${selectedReview.id}-${rule.id}`
                  return (
                    <tr key={rule.id}>
                      <td>
                        <span className={getRuleStatusClass(rule.status)}>{rule.status}</span>
                      </td>
                      <td>{rule.rule}</td>
                      <td>{rule.expected}</td>
                      <td>{rule.result}</td>
                      <td>{rule.item || '-'}</td>
                      <td>{rule.intelDescription || '-'}</td>
                      <td>{rule.phantomL1 || '-'}</td>
                      <td>{rule.scope || '-'}</td>
                      <td>{rule.verificationText || '-'}</td>
                      <td>{getDecisionText(issueId, rule.status)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}
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
            <dt>Context links</dt>
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
                <dt>Comparison finding</dt>
                <dd>{selectedDecision.issueTitle}</dd>
              </div>
              <div className="source-property-row">
                <dt>Finding context</dt>
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
