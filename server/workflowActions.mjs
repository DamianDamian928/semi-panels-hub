import { workflowRepository } from './workflowRepository.mjs'

const allowedDecisionStatuses = new Set(['Required', 'Drafted', 'Accepted', 'Deferred'])

const createAuditEvent = ({ type, title, relatedTo, summary, detail }) => ({
  id: `audit-api-${Date.now()}`,
  type,
  title,
  actor: 'Damian',
  timestamp: 'Just now',
  relatedTo,
  state: 'Not persisted',
  persistence: 'Pending save',
  summary,
  detail,
})

const markIssueForDecision = ({ issueId }) => {
  const issue = workflowRepository.getIssue(issueId)

  if (!issue) {
    return { statusCode: 404, payload: { error: 'Issue not found' } }
  }

  issue.decision = 'Required'
  workflowRepository.updateIssue(issue)
  workflowRepository.setIssuePersistenceState(issueId, 'Pending save')

  workflowRepository.addAuditEvent(createAuditEvent({
    type: 'Issue',
    title: 'Issue marked for decision',
    relatedTo: issue.title,
    summary: `${issue.title} was marked as requiring a decision.`,
    detail: 'API workflow action recorded this triage event before durable persistence is connected.',
  }))

  return { statusCode: 200, payload: workflowRepository.getWorkflowPayload() }
}

const setDecisionStatus = ({ issueId, status }) => {
  if (!allowedDecisionStatuses.has(status)) {
    return { statusCode: 400, payload: { error: 'Unsupported decision status' } }
  }

  const decision = workflowRepository.getDecision(issueId)

  if (!decision) {
    return { statusCode: 404, payload: { error: 'Decision record not found' } }
  }

  const previousStatus = decision.status
  decision.status = status
  workflowRepository.updateDecision(decision)
  workflowRepository.setDecisionPersistenceState(issueId, 'Pending save')

  const issue = workflowRepository.getIssue(issueId)
  if (issue) {
    issue.decision = status
    workflowRepository.updateIssue(issue)
  }

  workflowRepository.addAuditEvent(createAuditEvent({
    type: 'Decision',
    title: status === 'Accepted' ? 'Decision accepted' : 'Decision updated',
    relatedTo: decision.issueTitle,
    summary: `${decision.issueTitle} decision changed from ${previousStatus} to ${status}.`,
    detail: 'API workflow action recorded this decision status change before durable persistence is connected.',
  }))

  return { statusCode: 200, payload: workflowRepository.getWorkflowPayload() }
}

const prepareOutput = ({ outputId }) => {
  const outputItem = workflowRepository.getOutputItem(outputId)

  if (!outputItem) {
    return { statusCode: 404, payload: { error: 'Output item not found' } }
  }

  const linkedDecision = workflowRepository.getDecision(outputItem.linkedIssueId)

  if (linkedDecision?.status !== 'Accepted') {
    return { statusCode: 409, payload: { error: 'Output requires an accepted decision first' } }
  }

  workflowRepository.setOutputStatus(outputId, 'Ready')
  workflowRepository.setOutputPersistenceState(outputId, 'Pending save')

  workflowRepository.addAuditEvent(createAuditEvent({
    type: 'Output',
    title: 'Output prepared',
    relatedTo: outputItem.title,
    summary: `${outputItem.title} was prepared as a draft output candidate.`,
    detail: 'API workflow action recorded output readiness before durable persistence is connected.',
  }))

  return { statusCode: 200, payload: workflowRepository.getWorkflowPayload() }
}

export const workflowActions = {
  '/api/workflow/mark-issue-for-decision': markIssueForDecision,
  '/api/workflow/set-decision-status': setDecisionStatus,
  '/api/workflow/prepare-output': prepareOutput,
}
