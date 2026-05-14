import type {
  AuditEvent,
  DecisionFilter,
  DecisionRecord,
  DecisionState,
  DecisionStatus,
  OutputFilter,
  OutputItem,
  OutputStatus,
  ReviewIssue,
  ReviewIssueFilter,
} from '../types'
import {
  findDecisionForIssue,
  getOutputStatusFromDecision,
  resolveDecisionStatus,
} from '../workflowModel'

export type ReviewIssueRow = ReviewIssue

export type DecisionRow = DecisionRecord

export type OutputRow = OutputItem & {
  linkedDecision?: DecisionRow
  status: OutputStatus
}

export type ReviewIssueSummary = {
  open: number
  needsDecision: number
  highSeverity: number
  resolved: number
}

export type DecisionSummary = Record<DecisionStatus, number>

export type OutputSummary = {
  ready: number
  blocked: number
  decisionLinked: number
  notPersisted: number
}

export type AuditSummary = {
  events: number
  notPersisted: number
  decisionChanges: number
  outputChanges: number
}

export const getReviewIssueRows = (
  issues: ReviewIssue[],
  decisions: DecisionRecord[],
  issueDecisionStates: Record<string, DecisionState>,
  decisionStatuses: Record<string, DecisionStatus>,
): ReviewIssueRow[] =>
  issues.map((issue) => ({
    ...issue,
    decision:
      issueDecisionStates[issue.id] ??
      decisionStatuses[issue.id] ??
      (issue.decision !== 'None'
        ? issue.decision
        : findDecisionForIssue(decisions, issue.id)?.status ?? issue.decision),
  }))

export const filterReviewIssues = (
  issues: ReviewIssueRow[],
  filter: ReviewIssueFilter,
): ReviewIssueRow[] =>
  issues.filter((issue) => {
    if (filter === 'Open') return issue.status !== 'Resolved'
    if (filter === 'Needs decision') return issue.decision === 'Required'
    if (filter === 'Resolved') return issue.status === 'Resolved'
    return true
  })

export const summarizeReviewIssues = (issues: ReviewIssueRow[]): ReviewIssueSummary =>
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

export const getDecisionRows = (
  decisions: DecisionRecord[],
  issueDecisionStates: Record<string, DecisionState>,
  decisionStatuses: Record<string, DecisionStatus>,
): DecisionRow[] =>
  decisions.map((record) => ({
    ...record,
    status: resolveDecisionStatus(record, issueDecisionStates, decisionStatuses),
  }))

export const filterDecisions = (
  decisions: DecisionRow[],
  filter: DecisionFilter,
): DecisionRow[] =>
  decisions.filter((record) => {
    if (filter === 'All') return true
    return record.status === filter
  })

export const summarizeDecisions = (decisions: DecisionRow[]): DecisionSummary =>
  decisions.reduce(
    (acc, record) => {
      acc[record.status] += 1
      return acc
    },
    { Required: 0, Drafted: 0, Accepted: 0, Deferred: 0 } as DecisionSummary,
  )

export const getOutputRows = (
  items: OutputItem[],
  decisions: DecisionRow[],
  outputStatuses: Record<string, OutputStatus>,
): OutputRow[] =>
  items.map((item) => {
    const linkedDecision = item.linkedIssueId
      ? findDecisionForIssue(decisions, item.linkedIssueId)
      : undefined
    const derivedStatus = getOutputStatusFromDecision(linkedDecision?.status)

    return {
      ...item,
      linkedDecision,
      status: outputStatuses[item.id] ?? derivedStatus,
    }
  })

export const filterOutputItems = (
  items: OutputRow[],
  filter: OutputFilter,
): OutputRow[] =>
  items.filter((item) => {
    if (filter === 'All') return true
    if (filter === 'Not persisted') return item.auditState === 'Not persisted'
    return item.status === filter
  })

export const summarizeOutputItems = (items: OutputRow[]): OutputSummary =>
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

export const getOutputReadinessText = (status?: OutputStatus) => {
  if (status === 'Ready') return 'Ready to include in the output artifact.'
  if (status === 'Blocked') return 'Blocked from output until the decision changes.'
  if (status === 'Needs decision') return 'Waiting for an accepted decision before output can be prepared.'
  return 'Output item is not persisted and has no settled decision basis yet.'
}

export const summarizeAuditEvents = (events: AuditEvent[]): AuditSummary =>
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
