import { useEffect, useState } from 'react'
import {
  ApiRequestError,
  apiCheckSourceAccess,
  apiCheckSourcesAccess,
  apiCreateSource,
  apiDeleteSource,
  apiMarkIssueForDecision,
  apiPrepareOutput,
  apiRegisterSourceLocalFile,
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
  ApiConnectionState,
  AuditEvent,
  DecisionRecord,
  DecisionState,
  DecisionStatus,
  OutputStatus,
  PersistenceState,
  ReviewIssue,
  SourceCreateInput,
  SourceDefinition,
  SourceFileMetadata,
} from '../types'

const getApiFailureState = (error: unknown): ApiConnectionState =>
  error instanceof ApiRequestError ? 'error' : 'offline'

const getApiFailureMessage = (error: unknown, fallbackMessage: string) => {
  if (error instanceof ApiRequestError) {
    return `${fallbackMessage} API responded with status ${error.status ?? 'unknown'}.`
  }

  return `${fallbackMessage} Backend API is not available.`
}

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
  const [apiConnectionState, setApiConnectionState] = useState<ApiConnectionState>('loading')
  const [apiConnectionError, setApiConnectionError] = useState<string | null>(null)

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

  const applyBootstrapPayload = (data: Awaited<ReturnType<typeof fetchBootstrapData>>) => {
    setDashboardRows(data.reviews)
    setSourceDefinitions(data.sources)
    setValidationStatesBySource(data.validationStatesBySource)
    applyWorkflowPayload(data)
  }

  useEffect(() => {
    let isMounted = true

    fetchBootstrapData()
      .then((data) => {
        if (!isMounted) return

        applyBootstrapPayload(data)
        setApiConnectionState('ready')
        setApiConnectionError(null)
      })
      .catch((error: unknown) => {
        if (!isMounted) return

        setDashboardRows(fallbackDashboardRows)
        setSourceDefinitions(fallbackSourceDefinitions)
        setValidationStatesBySource(fallbackValidationStatesBySource)
        setReviewIssues(fallbackReviewIssues)
        setDecisionRecords(fallbackDecisionRecords)
        setOutputItems(fallbackOutputItems)
        setAuditEvents(fallbackAuditEvents)
        setWorkflowView(null)
        setApiConnectionState(getApiFailureState(error))
        setApiConnectionError(getApiFailureMessage(error, 'Using demo data.'))
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

  const registerSourceLocalFile = async (sourceId: string, file: SourceFileMetadata) => {
    try {
      applyBootstrapPayload(await apiRegisterSourceLocalFile(sourceId, file))
      setApiConnectionState('ready')
      setApiConnectionError(null)
    } catch (error: unknown) {
      setApiConnectionState(getApiFailureState(error))
      setApiConnectionError(getApiFailureMessage(error, 'Source location could not be saved.'))
      throw error
    }
  }

  const createSource = async (source: SourceCreateInput): Promise<SourceDefinition[]> => {
    try {
      const data = await apiCreateSource(source)
      applyBootstrapPayload(data)
      setApiConnectionState('ready')
      setApiConnectionError(null)
      return data.sources
    } catch (error: unknown) {
      setApiConnectionState(getApiFailureState(error))
      setApiConnectionError(getApiFailureMessage(error, 'Source could not be added.'))
      throw error
    }
  }

  const deleteSource = async (sourceId: string): Promise<SourceDefinition[]> => {
    try {
      const data = await apiDeleteSource(sourceId)
      applyBootstrapPayload(data)
      setApiConnectionState('ready')
      setApiConnectionError(null)
      return data.sources
    } catch (error: unknown) {
      setApiConnectionState(getApiFailureState(error))
      setApiConnectionError(getApiFailureMessage(error, 'Source could not be removed.'))
      throw error
    }
  }

  const checkSourcesAccess = async () => {
    try {
      applyBootstrapPayload(await apiCheckSourcesAccess())
      setApiConnectionState('ready')
      setApiConnectionError(null)
    } catch (error: unknown) {
      setApiConnectionState(getApiFailureState(error))
      setApiConnectionError(getApiFailureMessage(error, 'Sources access check could not be completed.'))
      throw error
    }
  }

  const checkSourceAccess = async (sourceId: string) => {
    try {
      applyBootstrapPayload(await apiCheckSourceAccess(sourceId))
      setApiConnectionState('ready')
      setApiConnectionError(null)
    } catch (error: unknown) {
      setApiConnectionState(getApiFailureState(error))
      setApiConnectionError(getApiFailureMessage(error, 'Source access check could not be completed.'))
      throw error
    }
  }

  const markIssueForDecision = async (issue: ReviewIssue) => {
    try {
      applyWorkflowPayload(await apiMarkIssueForDecision(issue.id))
      setApiConnectionState('ready')
      setApiConnectionError(null)
    } catch (error: unknown) {
      const nextWorkflowState = markIssueForDecisionLocally(issue, {
        issueDecisionStates,
        issuePersistenceStates,
      })

      setIssueDecisionStates(nextWorkflowState.issueDecisionStates)
      setIssuePersistenceStates(nextWorkflowState.issuePersistenceStates)
      setWorkflowView(null)
      setApiConnectionState(getApiFailureState(error))
      setApiConnectionError(getApiFailureMessage(error, 'Action was kept as a local pending change.'))
      addLocalAuditEvent(nextWorkflowState.auditEvent)
    }
  }

  const setDecisionStatus = async (decision: DecisionRecord, status: DecisionStatus) => {
    try {
      applyWorkflowPayload(await apiSetDecisionStatus(decision.issueId, status))
      setApiConnectionState('ready')
      setApiConnectionError(null)
    } catch (error: unknown) {
      const nextWorkflowState = setWorkflowDecisionStatus(decision, status, {
        issueDecisionStates,
        decisionStatuses,
        decisionPersistenceStates,
      })

      setDecisionStatuses(nextWorkflowState.decisionStatuses)
      setIssueDecisionStates(nextWorkflowState.issueDecisionStates)
      setDecisionPersistenceStates(nextWorkflowState.decisionPersistenceStates)
      setWorkflowView(null)
      setApiConnectionState(getApiFailureState(error))
      setApiConnectionError(getApiFailureMessage(error, 'Decision was kept as a local pending change.'))
      addLocalAuditEvent(nextWorkflowState.auditEvent)
    }
  }

  const prepareOutput = async (outputItem: OutputRow) => {
    try {
      applyWorkflowPayload(await apiPrepareOutput(outputItem.id))
      setApiConnectionState('ready')
      setApiConnectionError(null)
    } catch (error: unknown) {
      const nextWorkflowState = prepareWorkflowOutput(outputItem, {
        outputStatuses,
        outputPersistenceStates,
      })

      setApiConnectionState(getApiFailureState(error))
      setApiConnectionError(getApiFailureMessage(error, 'Output preparation could not be confirmed.'))

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
    apiConnectionState,
    apiConnectionError,
    createSource,
    deleteSource,
    registerSourceLocalFile,
    checkSourcesAccess,
    checkSourceAccess,
    markIssueForDecision,
    setDecisionStatus,
    prepareOutput,
  }
}
