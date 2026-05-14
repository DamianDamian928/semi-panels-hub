import type {
  AuditEvent,
  DecisionRecord,
  DecisionState,
  DecisionStatus,
  OutputStatus,
  PersistenceState,
  ReviewIssue,
} from '../types'
import type { OutputRow } from './workflowSelectors'

export type AuditEventDraft = Omit<AuditEvent, 'id' | 'actor' | 'timestamp' | 'state' | 'persistence'>

export const createLocalAuditEvent = (
  event: AuditEventDraft,
  context: { id: string; actor: string },
): AuditEvent => ({
  ...event,
  id: context.id,
  actor: context.actor,
  timestamp: 'Just now',
  state: 'Not persisted',
  persistence: 'Pending save',
})

export const markIssueForDecision = (
  issue: ReviewIssue,
  current: {
    issueDecisionStates: Record<string, DecisionState>
    issuePersistenceStates: Record<string, PersistenceState>
  },
) => ({
  issueDecisionStates: {
    ...current.issueDecisionStates,
    [issue.id]: 'Required' as DecisionState,
  },
  issuePersistenceStates: {
    ...current.issuePersistenceStates,
    [issue.id]: 'Pending save' as PersistenceState,
  },
  auditEvent: {
    type: 'Issue',
    title: 'Issue marked for decision',
    relatedTo: issue.title,
    summary: `${issue.title} was marked as requiring a decision.`,
    detail: 'Local audit event created from Review. This records the triage action before persistence exists.',
  } satisfies AuditEventDraft,
})

export const setWorkflowDecisionStatus = (
  decision: DecisionRecord,
  status: DecisionStatus,
  current: {
    issueDecisionStates: Record<string, DecisionState>
    decisionStatuses: Record<string, DecisionStatus>
    decisionPersistenceStates: Record<string, PersistenceState>
  },
) => ({
  decisionStatuses: {
    ...current.decisionStatuses,
    [decision.issueId]: status,
  },
  issueDecisionStates: {
    ...current.issueDecisionStates,
    [decision.issueId]: status,
  },
  decisionPersistenceStates: {
    ...current.decisionPersistenceStates,
    [decision.issueId]: 'Pending save' as PersistenceState,
  },
  auditEvent: {
    type: 'Decision',
    title: status === 'Accepted' ? 'Decision accepted' : 'Decision drafted',
    relatedTo: decision.issueTitle,
    summary: `${decision.issueTitle} decision changed from ${decision.status} to ${status}.`,
    detail: 'Local audit event created from Decisions. It captures the decision status change without writing to a backend.',
  } satisfies AuditEventDraft,
})

export const prepareWorkflowOutput = (
  outputItem: OutputRow,
  current: {
    outputStatuses: Record<string, OutputStatus>
    outputPersistenceStates: Record<string, PersistenceState>
  },
) => {
  const canPrepareOutput = outputItem.linkedDecision?.status === 'Accepted'
  if (!canPrepareOutput || current.outputStatuses[outputItem.id] === 'Ready') return null

  return {
    outputStatuses: {
      ...current.outputStatuses,
      [outputItem.id]: 'Ready' as OutputStatus,
    },
    outputPersistenceStates: {
      ...current.outputPersistenceStates,
      [outputItem.id]: 'Pending save' as PersistenceState,
    },
    auditEvent: {
      type: 'Output',
      title: 'Output prepared',
      relatedTo: outputItem.title,
      summary: `${outputItem.title} was prepared as a draft output candidate.`,
      detail: 'Local audit event created from Output readiness. The output artifact is still not persisted.',
    } satisfies AuditEventDraft,
  }
}
