import type {
  DecisionRecord,
  DecisionState,
  DecisionStatus,
  OutputItem,
  OutputStatus,
  PersistenceState,
} from './types'

export const defaultPersistenceState: PersistenceState = 'Source snapshot'

export const persistenceStateDescription: Record<PersistenceState, string> = {
  'Source snapshot': 'Loaded from the current review snapshot.',
  'Pending save': 'Waiting for future backend save and audit confirmation.',
  Saved: 'Saved by the backend.',
  'Save failed': 'Backend save failed and needs retry.',
  'Audit recorded': 'Saved with a confirmed audit trail event.',
}

export const getStateToken = (value: string) => value.toLowerCase().replace(/\s+/g, '-')

export const resolveDecisionStatus = (
  record: DecisionRecord,
  issueDecisionStates: Record<string, DecisionState>,
  decisionStatuses: Record<string, DecisionStatus>,
): DecisionStatus => {
  const issueDecisionState = issueDecisionStates[record.issueId]
  const issueDrivenStatus = issueDecisionState && issueDecisionState !== 'None' ? issueDecisionState : record.status

  return decisionStatuses[record.issueId] ?? issueDrivenStatus
}

export const getOutputStatusFromDecision = (decisionStatus?: DecisionStatus): OutputStatus => {
  if (decisionStatus === 'Accepted') return 'Ready'
  if (decisionStatus === 'Deferred') return 'Blocked'
  if (decisionStatus) return 'Needs decision'
  return 'Not persisted'
}

export const findDecisionForIssue = (decisions: DecisionRecord[], issueId: string) =>
  decisions.find((record) => record.issueId === issueId)

export const findOutputForDecision = (outputItems: OutputItem[], issueId: string) =>
  outputItems.find((item) => item.linkedIssueId === issueId)
