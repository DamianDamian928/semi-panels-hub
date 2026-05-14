import { useEffect, useState } from 'react'
import {
  apiMarkIssueForDecision,
  apiPrepareOutput,
  apiSetDecisionStatus,
  fetchBootstrapData,
} from '../apiClient'
import type { WorkflowPayload, WorkflowViewPayload } from '../apiClient'
import {
  createLocalAuditEvent,
  markIssueForDecision as markIssueForDecisionLocally,
  prepareWorkflowOutput,
  setWorkflowDecisionStatus,
} from '../domain/workflowActions'
import type { OutputRow } from '../domain/workflowSelectors'
import {
  auditEvents as fallbackAuditEvents,
  dashboardRows as fallbackDashboardRows,
  decisionRecords as fallbackDecisionRecords,
  outputItems as fallbackOutputItems,
  reviewIssues as fallbackReviewIssues,
  sourceDefinitions as fallbackSourceDefinitions,
  validationStatesBySource as fallbackValidationStatesBySource,
} from '../mockData'
import type {
  AuditEvent,
  DecisionRecord,
  DecisionState,
  DecisionStatus,
  OutputStatus,
  PersistenceState,
  ReviewIssue,
} from '../types'

export const useWorkflowData = () => {
  const [dashboardRows, setDashboardRows] = useState(fallbackDashboardRows)
  const [sourceDefinitions, setSourceDefinitions] = useState(fallbackSourceDefinitions)
  const [validationStatesBySource, setValidationStatesBySource] = useState(fallbackValidationStatesBySource)
  const [reviewIssues, setReviewIssues] = useState(fallbackReviewIssues)
  const [decisionRecords, setDecisionRecords] = useState(fallbackDecisionRecords)
  const [outputItems, setOutputItems] = useState(fallbackOutputItems)
  const [auditEvents, setAuditEvents] = useState(fallbackAuditEvents)
  const [issueDecisionStates, setIssueDecisionStates] = useState<Record<string, DecisionState>>({})
  const [issuePersistenceStates, setIssuePersistenceStates] = useState<Record<string, PersistenceState>>({})
  const [decisionStatuses, setDecisionStatuses] = useState<Record<string, DecisionStatus>>({})
  const [decisionPersistenceStates, setDecisionPersistenceStates] = useState<Record<string, PersistenceState>>({})
  const [outputStatuses, setOutputStatuses] = useState<Record<string, OutputStatus>>({})
  const [outputPersistenceStates, setOutputPersistenceStates] = useState<Record<string, PersistenceState>>({})
  const [activeAuditEventId, setActiveAuditEventId] = useState<string>(fallbackAuditEvents[0].id)
  const [workflowView, setWorkflowView] = useState<WorkflowViewPayload | null>(null)
  const [localAuditEvents, setLocalAuditEvents] = useState<AuditEvent[]>([])

  const applyWorkflowPayload = (payload: WorkflowPayload) => {
    setReviewIssues(payload.reviewIssues)
    setDecisionRecords(payload.decisionRecords)
    setOutputItems(payload.outputItems)
    setAuditEvents(payload.auditEvents)
    setIssuePersistenceStates(payload.issuePersistenceStates)
    setDecisionPersistenceStates(payload.decisionPersistenceStates)
    setOutputPersistenceStates(payload.outputPersistenceStates)
    setOutputStatuses(payload.outputStatuses)
    setWorkflowView(payload.workflowView)
    setIssueDecisionStates({})
    setDecisionStatuses({})

    if (payload.auditEvents[0]) {
      setActiveAuditEventId(payload.auditEvents[0].id)
    }
  }

  useEffect(() => {
    let isMounted = true

    fetchBootstrapData()
      .then((data) => {
        if (!isMounted) return

        setDashboardRows(data.reviews)
        setSourceDefinitions(data.sources)
        setValidationStatesBySource(data.validationStatesBySource)
        applyWorkflowPayload(data)
      })
      .catch(() => {
        if (!isMounted) return

        setDashboardRows(fallbackDashboardRows)
        setSourceDefinitions(fallbackSourceDefinitions)
        setValidationStatesBySource(fallbackValidationStatesBySource)
        setReviewIssues(fallbackReviewIssues)
        setDecisionRecords(fallbackDecisionRecords)
        setOutputItems(fallbackOutputItems)
        setAuditEvents(fallbackAuditEvents)
        setWorkflowView(null)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const addLocalAuditEvent = (event: Parameters<typeof createLocalAuditEvent>[0]) => {
    const nextEvent = createLocalAuditEvent(event, {
      id: `audit-local-${Date.now()}`,
      actor: 'Damian',
    })

    setLocalAuditEvents((current) => [nextEvent, ...current])
    setActiveAuditEventId(nextEvent.id)
  }

  const markIssueForDecision = async (issue: ReviewIssue) => {
    try {
      applyWorkflowPayload(await apiMarkIssueForDecision(issue.id))
    } catch {
      const nextWorkflowState = markIssueForDecisionLocally(issue, {
        issueDecisionStates,
        issuePersistenceStates,
      })

      setIssueDecisionStates(nextWorkflowState.issueDecisionStates)
      setIssuePersistenceStates(nextWorkflowState.issuePersistenceStates)
      setWorkflowView(null)
      addLocalAuditEvent(nextWorkflowState.auditEvent)
    }
  }

  const setDecisionStatus = async (decision: DecisionRecord, status: DecisionStatus) => {
    try {
      applyWorkflowPayload(await apiSetDecisionStatus(decision.issueId, status))
    } catch {
      const nextWorkflowState = setWorkflowDecisionStatus(decision, status, {
        issueDecisionStates,
        decisionStatuses,
        decisionPersistenceStates,
      })

      setDecisionStatuses(nextWorkflowState.decisionStatuses)
      setIssueDecisionStates(nextWorkflowState.issueDecisionStates)
      setDecisionPersistenceStates(nextWorkflowState.decisionPersistenceStates)
      setWorkflowView(null)
      addLocalAuditEvent(nextWorkflowState.auditEvent)
    }
  }

  const prepareOutput = async (outputItem: OutputRow) => {
    try {
      applyWorkflowPayload(await apiPrepareOutput(outputItem.id))
    } catch {
      const nextWorkflowState = prepareWorkflowOutput(outputItem, {
        outputStatuses,
        outputPersistenceStates,
      })

      if (!nextWorkflowState) return

      setOutputStatuses(nextWorkflowState.outputStatuses)
      setOutputPersistenceStates(nextWorkflowState.outputPersistenceStates)
      setWorkflowView(null)
      addLocalAuditEvent(nextWorkflowState.auditEvent)
    }
  }

  return {
    dashboardRows,
    sourceDefinitions,
    validationStatesBySource,
    reviewIssues,
    decisionRecords,
    outputItems,
    auditEvents,
    issueDecisionStates,
    issuePersistenceStates,
    decisionStatuses,
    decisionPersistenceStates,
    outputStatuses,
    outputPersistenceStates,
    activeAuditEventId,
    setActiveAuditEventId,
    workflowView,
    localAuditEvents,
    markIssueForDecision,
    setDecisionStatus,
    prepareOutput,
  }
}
