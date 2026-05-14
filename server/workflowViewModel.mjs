const getOutputStatusFromDecision = (decisionStatus) => {
  if (decisionStatus === 'Accepted') return 'Ready'
  if (decisionStatus === 'Deferred') return 'Blocked'
  if (decisionStatus) return 'Needs decision'
  return 'Not persisted'
}

const summarizeReviewIssues = (issues) =>
  issues.reduce(
    (acc, issue) => {
      if (issue.status !== 'Resolved') acc.open += 1
      if (issue.decision === 'Required') acc.needsDecision += 1
      if (issue.severity === 'High' && issue.status !== 'Resolved') acc.highSeverity += 1
      if (issue.status === 'Resolved') acc.resolved += 1
      return acc
    },
    { open: 0, needsDecision: 0, highSeverity: 0, resolved: 0 },
  )

const summarizeDecisions = (decisions) =>
  decisions.reduce(
    (acc, record) => {
      acc[record.status] += 1
      return acc
    },
    { Required: 0, Drafted: 0, Accepted: 0, Deferred: 0 },
  )

const summarizeOutputItems = (items) =>
  items.reduce(
    (acc, item) => {
      if (item.status === 'Ready') acc.ready += 1
      if (item.status === 'Blocked') acc.blocked += 1
      if (item.linkedDecision) acc.decisionLinked += 1
      if (item.auditState === 'Not persisted') acc.notPersisted += 1
      return acc
    },
    { ready: 0, blocked: 0, decisionLinked: 0, notPersisted: 0 },
  )

const summarizeAuditEvents = (events) =>
  events.reduce(
    (acc, event) => {
      acc.events += 1
      if (event.state === 'Not persisted') acc.notPersisted += 1
      if (event.type === 'Decision') acc.decisionChanges += 1
      if (event.type === 'Output') acc.outputChanges += 1
      return acc
    },
    { events: 0, notPersisted: 0, decisionChanges: 0, outputChanges: 0 },
  )

export const buildWorkflowView = ({
  reviewIssues,
  decisionRecords,
  outputItems,
  auditEvents,
  outputStatuses,
}) => {
  const decisionsByIssue = new Map(decisionRecords.map((record) => [record.issueId, record]))

  const issueRows = reviewIssues.map((issue) => ({
    ...issue,
    decision:
      issue.decision !== 'None'
        ? issue.decision
        : decisionsByIssue.get(issue.id)?.status ?? issue.decision,
  }))

  const decisionRows = decisionRecords.map((record) => ({ ...record }))

  const outputRows = outputItems.map((item) => {
    const linkedDecision = item.linkedIssueId
      ? decisionsByIssue.get(item.linkedIssueId)
      : undefined
    const derivedStatus = getOutputStatusFromDecision(linkedDecision?.status)

    return {
      ...item,
      linkedDecision,
      status: outputStatuses[item.id] ?? derivedStatus,
    }
  })

  return {
    review: {
      issueRows,
      summary: summarizeReviewIssues(issueRows),
    },
    decisions: {
      decisionRows,
      summary: summarizeDecisions(decisionRows),
    },
    output: {
      outputRows,
      summary: summarizeOutputItems(outputRows),
    },
    audit: {
      auditRows: auditEvents,
      summary: summarizeAuditEvents(auditEvents),
    },
  }
}
