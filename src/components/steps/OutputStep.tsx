import type { WorkflowViewPayload } from '../../apiClient'
import type { OutputRow } from '../../domain/workflowSelectors'
import {
  filterOutputItems,
  getDecisionRows,
  getOutputReadinessText,
  getOutputRows,
  summarizeAuditEvents,
  summarizeOutputItems,
} from '../../domain/workflowSelectors'
import {
  defaultPersistenceState,
  getStateToken,
  persistenceStateDescription,
} from '../../workflowModel'
import type {
  AuditEvent,
  DashboardRow,
  DecisionRecord,
  DecisionState,
  DecisionStatus,
  OutputFilter,
  OutputItem,
  OutputStatus,
  PersistenceState,
  ProcessStep,
} from '../../types'

type OutputStepProps = {
  selectedReview: DashboardRow
  decisionRecords: DecisionRecord[]
  outputItems: OutputItem[]
  auditEvents: AuditEvent[]
  localAuditEvents: AuditEvent[]
  issueDecisionStates: Record<string, DecisionState>
  decisionStatuses: Record<string, DecisionStatus>
  outputStatuses: Record<string, OutputStatus>
  outputPersistenceStates: Record<string, PersistenceState>
  workflowView: WorkflowViewPayload | null
  activeOutputItemId: string
  outputFilter: OutputFilter
  activeAuditEventId: string
  onSelectOutputItem: (outputId: string) => void
  onSetOutputFilter: (filter: OutputFilter) => void
  onSetActiveAuditEvent: (auditEventId: string) => void
  onSetProcessStep: (step: ProcessStep) => void
  onPrepareOutput: (outputItem: OutputRow) => Promise<void>
}

export function OutputStep({
  selectedReview,
  decisionRecords,
  outputItems,
  auditEvents,
  localAuditEvents,
  issueDecisionStates,
  decisionStatuses,
  outputStatuses,
  outputPersistenceStates,
  workflowView,
  activeOutputItemId,
  outputFilter,
  activeAuditEventId,
  onSelectOutputItem,
  onSetOutputFilter,
  onSetActiveAuditEvent,
  onSetProcessStep,
  onPrepareOutput,
}: OutputStepProps) {
  const decisionRows = workflowView?.decisions.decisionRows ?? getDecisionRows(decisionRecords, issueDecisionStates, decisionStatuses)
  const outputRows = workflowView?.output.outputRows ?? getOutputRows(outputItems, decisionRows, outputStatuses)
  const filteredOutputItems = filterOutputItems(outputRows, outputFilter)

  const selectedOutputItem =
    filteredOutputItems.find((item) => item.id === activeOutputItemId) ??
    filteredOutputItems[0]
  const selectedOutputPersistence = selectedOutputItem
    ? outputPersistenceStates[selectedOutputItem.id] ?? defaultPersistenceState
    : defaultPersistenceState

  const summary = workflowView?.output.summary ?? summarizeOutputItems(outputRows)
  const filterOptions: OutputFilter[] = ['All', 'Ready', 'Blocked', 'Needs decision', 'Not persisted']
  const linkedDecisionLabel = selectedOutputItem?.linkedDecision
    ? `${selectedOutputItem.linkedDecision.issueTitle} (${selectedOutputItem.linkedDecision.status})`
    : 'No accepted decision'
  const canPrepareOutput = selectedOutputItem?.linkedDecision?.status === 'Accepted'
  const readinessText = getOutputReadinessText(selectedOutputItem?.status)
  const auditRows = [...localAuditEvents, ...auditEvents]
  const selectedAuditEvent =
    auditRows.find((event) => event.id === activeAuditEventId) ??
    auditRows[0]
  const auditSummary = summarizeAuditEvents(auditRows)

  const prepareOutput = async () => {
    if (!selectedOutputItem) return
    await onPrepareOutput(selectedOutputItem)
  }

  return (
    <>
      <section className="output-workspace-grid">
        <section className="workspace-main card output-workspace-main">
          <div className="output-workspace-header">
            <div>
              <p className="section-label">Output</p>
              <h3>Output workspace</h3>
              <p>Readiness view for artifacts that can be produced from the current review and decision state.</p>
            </div>
            <div className="output-workspace-context">
              <span className="meta-chip">Review: {selectedReview.intelModel}</span>
              <span className="meta-chip">Output items: {outputRows.length}</span>
            </div>
          </div>

          <div className="output-stat-grid" aria-label="Output readiness summary">
            <article className="output-stat-card">
              <span>Ready items</span>
              <strong>{summary.ready}</strong>
            </article>
            <article className="output-stat-card">
              <span>Blocked</span>
              <strong>{summary.blocked}</strong>
            </article>
            <article className="output-stat-card">
              <span>Decision-linked</span>
              <strong>{summary.decisionLinked}</strong>
            </article>
            <article className="output-stat-card">
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

          <div className="output-list" aria-label="Output items">
            {filteredOutputItems.length > 0 ? filteredOutputItems.map((item) => {
              const isActive = item.id === selectedOutputItem?.id
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`output-row ${isActive ? 'output-row-active' : ''}`}
                  onClick={() => onSelectOutputItem(item.id)}
                >
                  <span className={`output-status output-status-${item.status.toLowerCase().replace(/\s+/g, '-')}`}>{item.status}</span>
                  <span className="output-row-main">
                    <strong>{item.title}</strong>
                    <span>{item.area} | {item.artifactRole}</span>
                  </span>
                  <span className="output-row-meta">
                    <span>{item.outputImpact}</span>
                    <span>{item.owner}</span>
                  </span>
                </button>
              )
            }) : (
              <div className="workspace-empty-state">
                <strong>No output items match this filter</strong>
                <p>Try another filter to return to the output readiness list.</p>
              </div>
            )}
          </div>
        </section>

        <aside className="workspace-side-panel card output-detail-panel" aria-label="Selected output item details">
          {selectedOutputItem ? (
            <>
              <div className="sidebar-header">
                <p className="section-label">Selected output</p>
                <h2>{selectedOutputItem.title}</h2>
                <p>{selectedOutputItem.description}</p>
              </div>

              <section className="output-readiness" aria-label="Output readiness">
                <p className="section-label">Output readiness</p>
                <h3>{selectedOutputItem.status}</h3>
                <p>{readinessText}</p>
              </section>

              <dl className="source-meta-list">
                <div>
                  <dt>Linked decision</dt>
                  <dd>{linkedDecisionLabel}</dd>
                </div>
                <div>
                  <dt>Output status</dt>
                  <dd>{selectedOutputItem.status}</dd>
                </div>
                <div>
                  <dt>Source basis</dt>
                  <dd>{selectedOutputItem.sourceBasis}</dd>
                </div>
                <div>
                  <dt>Readiness</dt>
                  <dd>{readinessText}</dd>
                </div>
                <div>
                  <dt>Audit state</dt>
                  <dd>{selectedOutputItem.auditState}</dd>
                </div>
                <div>
                  <dt>Save state</dt>
                  <dd>
                    <span className={`persistence-badge persistence-badge-${getStateToken(selectedOutputPersistence)}`}>
                      {selectedOutputPersistence}
                    </span>
                  </dd>
                </div>
              </dl>

              <section className="output-readiness" aria-label="Output persistence">
                <p className="section-label">Persistence state</p>
                <h3>{selectedOutputPersistence}</h3>
                <p>{persistenceStateDescription[selectedOutputPersistence]}</p>
              </section>

              <div className="output-detail-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => { void prepareOutput() }}
                  disabled={outputStatuses[selectedOutputItem.id] === 'Ready' || !canPrepareOutput}
                >
                  Prepare output
                </button>
                <button type="button" className="secondary-button" onClick={() => onSetProcessStep('Decisions')}>
                  Back to Decisions
                </button>
              </div>
            </>
          ) : (
            <div className="workspace-empty-state workspace-empty-state-panel">
              <strong>No output selected</strong>
              <p>The current filter has no matching output items. Choose another filter to see output details.</p>
            </div>
          )}
        </aside>
      </section>

      {selectedAuditEvent ? (
        <section className="card audit-preview" aria-label="History and audit preview">
          <div className="audit-preview-header">
            <div>
              <p className="section-label">History / Audit</p>
              <h3>Audit preview</h3>
              <p>This preview shows the kind of trace the workflow will need once persistence is added.</p>
            </div>
            <div className="audit-preview-context">
              <span className="meta-chip">Events: {auditSummary.events}</span>
              <span className="meta-chip">Mode: Preview only</span>
            </div>
          </div>

          <div className="audit-stat-grid" aria-label="Audit preview summary">
            <article className="audit-stat-card">
              <span>Events</span>
              <strong>{auditSummary.events}</strong>
            </article>
            <article className="audit-stat-card">
              <span>Not persisted</span>
              <strong>{auditSummary.notPersisted}</strong>
            </article>
            <article className="audit-stat-card">
              <span>Decision changes</span>
              <strong>{auditSummary.decisionChanges}</strong>
            </article>
            <article className="audit-stat-card">
              <span>Output changes</span>
              <strong>{auditSummary.outputChanges}</strong>
            </article>
          </div>

          <div className="audit-preview-grid">
            <div className="audit-event-list" aria-label="Audit events">
              {auditRows.map((event) => {
                const isActive = event.id === selectedAuditEvent.id
                return (
                  <button
                    key={event.id}
                    type="button"
                    className={`audit-event-row ${isActive ? 'audit-event-row-active' : ''}`}
                    onClick={() => onSetActiveAuditEvent(event.id)}
                  >
                    <span className={`audit-event-type audit-event-type-${event.type.toLowerCase()}`}>{event.type}</span>
                    <span className="audit-event-main">
                      <strong>{event.title}</strong>
                      <span>{event.relatedTo}</span>
                    </span>
                    <span className="audit-event-meta">
                      <span>{event.actor}</span>
                      <span>{event.timestamp}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            <aside className="audit-event-detail" aria-label="Selected audit event detail">
              <p className="section-label">Selected event</p>
              <h3>{selectedAuditEvent.title}</h3>
              <p>{selectedAuditEvent.summary}</p>
              <dl className="source-meta-list">
                <div>
                  <dt>Related to</dt>
                  <dd>{selectedAuditEvent.relatedTo}</dd>
                </div>
                <div>
                  <dt>Actor</dt>
                  <dd>{selectedAuditEvent.actor}</dd>
                </div>
                <div>
                  <dt>State</dt>
                  <dd>{selectedAuditEvent.state}</dd>
                </div>
                <div>
                  <dt>Persistence</dt>
                  <dd>
                    <span className={`persistence-badge persistence-badge-${getStateToken(selectedAuditEvent.persistence)}`}>
                      {selectedAuditEvent.persistence}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Detail</dt>
                  <dd>{selectedAuditEvent.detail}</dd>
                </div>
              </dl>
            </aside>
          </div>
        </section>
      ) : null}
    </>
  )
}
