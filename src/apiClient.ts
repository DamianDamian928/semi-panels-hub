import type {
  AuditEvent,
  DashboardRow,
  DecisionRecord,
  DecisionStatus,
  OutputStatus,
  OutputItem,
  PersistenceState,
  ReviewIssue,
  SourceCreateInput,
  SourceDefinition,
  SourceFileMetadata,
  ValidationState,
} from './types'

const apiBaseUrl = 'http://127.0.0.1:8788'

export class ApiRequestError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
  }
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

export type OutputRow = OutputItem & {
  linkedDecision?: DecisionRecord
  status: OutputStatus
}

export type WorkflowViewPayload = {
  review: {
    issueRows: ReviewIssue[]
    summary: ReviewIssueSummary
  }
  decisions: {
    decisionRows: DecisionRecord[]
    summary: DecisionSummary
  }
  output: {
    outputRows: OutputRow[]
    summary: OutputSummary
  }
  audit: {
    auditRows: AuditEvent[]
    summary: AuditSummary
  }
}

export type WorkflowPayload = {
  reviewIssues: ReviewIssue[]
  decisionRecords: DecisionRecord[]
  outputItems: OutputItem[]
  auditEvents: AuditEvent[]
  issuePersistenceStates: Record<string, PersistenceState>
  decisionPersistenceStates: Record<string, PersistenceState>
  outputPersistenceStates: Record<string, PersistenceState>
  outputStatuses: Record<string, OutputStatus>
  workflowView: WorkflowViewPayload
}

export type TechnicalStatus = {
  generatedAt: string
  app: {
    name: string
    version: string
    environment: string
  }
  frontend: {
    framework: string
    frameworkVersion: string
    language: string
    typeScriptVersion: string
    bundler: string
    bundlerVersion: string
  }
  backend: {
    service: string
    runtime: string
    host: string
    port: number
    baseUrl: string
    uptimeSeconds: number
    database: {
      engine: string
      path: string
    }
  }
  data: {
    reviews: number
    sources: number
    validationStates: number
    reviewIssues: number
    decisions: number
    outputItems: number
    auditEvents: number
  }
  workflow: {
    openIssues: number
    needsDecision: number
    highSeverityIssues: number
    resolvedIssues: number
    acceptedDecisions: number
    readyOutputItems: number
    blockedOutputItems: number
    notPersistedAuditEvents: number
  }
  commands: {
    dev: string
    api: string
    build: string
    helper: string
  }
  contract: {
    sourcesReadOnly: boolean
    primaryWorkUnit: string
    issueDecisionSeparation: boolean
    outputAsArtifact: boolean
    auditRequired: boolean
  }
}

type BootstrapResponse = WorkflowPayload & {
  reviews: DashboardRow[]
  sources: SourceDefinition[]
  validationStatesBySource: Record<string, { state: ValidationState; message: string }>
}

const fetchJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${apiBaseUrl}${path}`)

  if (!response.ok) {
    throw new ApiRequestError(`API request failed: ${response.status}`, response.status)
  }

  return (await response.json()) as T
}

const postJson = async <T>(path: string, body: unknown): Promise<T> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new ApiRequestError(`API request failed: ${response.status}`, response.status)
  }

  return (await response.json()) as T
}

const deleteJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new ApiRequestError(`API request failed: ${response.status}`, response.status)
  }

  return (await response.json()) as T
}

export const fetchBootstrapData = () => fetchJson<BootstrapResponse>('/api/bootstrap')

export const fetchTechnicalStatus = () => fetchJson<TechnicalStatus>('/api/technical-status')

export const apiCreateSource = (source: SourceCreateInput) =>
  postJson<BootstrapResponse>('/api/sources', source)

export const apiDeleteSource = (sourceId: string) =>
  deleteJson<BootstrapResponse>(`/api/sources/${encodeURIComponent(sourceId)}`)

export const apiRegisterSourceLocalFile = (sourceId: string, file: SourceFileMetadata) =>
  postJson<BootstrapResponse>(`/api/sources/${encodeURIComponent(sourceId)}/local-file`, { file })

export const apiCheckSourcesAccess = () => postJson<BootstrapResponse>('/api/sources/check', {})

export const apiCheckSourceAccess = (sourceId: string) =>
  postJson<BootstrapResponse>(`/api/sources/${encodeURIComponent(sourceId)}/check`, {})

export const apiMarkIssueForDecision = (issueId: string) =>
  postJson<WorkflowPayload>('/api/workflow/mark-issue-for-decision', { issueId })

export const apiSetDecisionStatus = (issueId: string, status: DecisionStatus) =>
  postJson<WorkflowPayload>('/api/workflow/set-decision-status', { issueId, status })

export const apiPrepareOutput = (outputId: string) =>
  postJson<WorkflowPayload>('/api/workflow/prepare-output', { outputId })
