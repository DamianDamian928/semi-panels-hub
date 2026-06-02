import type {
  AuditEvent,
  DashboardRow,
  DecisionRecord,
  DecisionStatus,
  OutputStatus,
  OutputItem,
  PersistenceState,
  ProcessStep,
  ReviewIssue,
  SourceCreateInput,
  SourceConnectionRolesByTarget,
  SourceConnectionsByTarget,
  SourceDefinition,
  SourceFileMetadata,
  SourceReadStatus,
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

export type SourcePreviewPayload = {
  sourceType: 'excel'
  sheets: string[]
  activeSheetName: string
  headerRow: number
  columns: string[]
  rows: string[][]
  rowLimit: number
}

export type StorageStatusPayload = {
  step: string
  storage: string
  subject: string
  persistence: string
  records: number
  lastUpdated: string | null
  detail: string
  refreshedAt: string
  readOnlyInputs: boolean
  database: {
    engine: string
    status: string
  }
}

export type BomMatvarValidationPayload = {
  review: {
    id: string
    item: string
    intelDescription: string
  }
  targetId: 'bom-matvar'
  status: ValidationState
  summary: {
    connectedSources: number
    contractSources: number
    matchedRows: number
    validPartNumbers: number
    invalidPartNumbers: number
    matvarRows: number
    matvarOk: number
    matvarNok: number
    matvarSynthetic: number
  }
  checks: Array<{
    id: string
    label: string
    source: string
    status: ValidationState
    message: string
    detail: string
  }>
  connectedSources: Array<{
    id: string
    name: string
    status: string
    contractRole: string
  }>
  bomL0Rows: Array<{
    sourceName: string
    sourcePath: string
    sourceSheet: string
    partNumber: string
    description: string
    updatedAtRaw: string
    updatedAt: string
    partNumberValid: boolean
  }>
  matvarSourceRows: Array<{
    sourceName: string
    sourcePath: string
    sourceSheet: string
    item: string
    oracleItemDescription: string
    intelDescription: string
    phantomL1: string
    scope: string
    verificationText: string
    verificationStatus?: 'OK' | 'NOK' | 'None'
    expectedPhantomL1?: string
    isSynthetic?: boolean
  }>
  matvarRows: Array<{
    sourceName: string
    sourcePath: string
    sourceSheet: string
    item: string
    oracleItemDescription: string
    intelDescription: string
    phantomL1: string
    scope: string
    verificationText: string
    verificationStatus: 'OK' | 'NOK' | 'None'
    expectedPhantomL1: string
    isSynthetic: boolean
  }>
}

export type BomMatvarComparisonPayload = {
  review: {
    id: string
    item: string
    intelDescription: string
  }
  targetId: 'bom-matvar'
  status: ValidationState
  summary: {
    rules: number
    ok: number
    fallback: number
    missing: number
    context: number
    sourceRows: number
  }
  rules: Array<{
    id: string
    rule: string
    expected: string
    result: string
    partNumber: string
    description: string
    updatedAtRaw: string
    updatedAt: string
    status: 'OK' | 'Fallback' | 'Missing' | 'Context' | 'Info'
    message: string
    ruleBasis: string[]
  }>
  matvarSourceRows: Array<{
    id: string
    sourceName: string
    sourcePath: string
    sourceSheet: string
    item: string
    oracleItemDescription: string
    intelDescription: string
    phantomL1: string
    scope: string
    verificationText: string
    status: 'OK' | 'Missing' | 'Mismatch' | 'Context'
    ruleBasis: string[]
  }>
  matvarRules: Array<{
    id: string
    rule: string
    expected: string
    result: string
    sourceName: string
    sourcePath: string
    sourceSheet: string
    item: string
    oracleItemDescription: string
    intelDescription: string
    phantomL1: string
    scope: string
    verificationText: string
    status: 'OK' | 'Missing' | 'Mismatch' | 'Context'
    message: string[]
  }>
  oracleComparison: {
    sourceName: string
    sourcePath: string
    baseRows: Array<{
      id: string
      item: string
      oracleItemDescription: string
      intelDescription: string
      phantomL1: string
      scope: string
      oracleBomText: string
      oracleBomStatus: 'OK' | 'Mismatch'
      oracleNameText: string
      oracleNameStatus: 'OK' | 'Mismatch'
      fileName: string
      ruleBasis: string[]
    }>
    structureTables: Array<{
      item: string
      fileName: string
      filePath: string
      sourceSheet: string
      columns: string[]
      descriptionText: string
      level1Items: string[]
      rows: Array<{
        id: string
        level: string
        itemName: string
        itemDescription: string
        values: string[]
        ruleBasis: string[]
      }>
      ruleBasis: string[]
    }>
  }
}

export type BomMatvarReviewIssuesPayload = {
  review: {
    id: string
    item: string
    intelDescription: string
  }
  targetId: 'bom-matvar'
  status: ValidationState
  summary: {
    issues: number
    missing: number
    fallback: number
    sourceRules: number
  }
  issues: ReviewIssue[]
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
  sourceConnectionsByTarget: SourceConnectionsByTarget | null
  sourceConnectionRolesByTarget: SourceConnectionRolesByTarget | null
  sourceReadStatus: SourceReadStatus
}

type BootstrapRequestOptions = {
  forceSourceRead?: boolean
}

const fetchJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${apiBaseUrl}${path}`)

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null
    throw new ApiRequestError(payload?.error ?? `API request failed: ${response.status}`, response.status)
  }

  return (await response.json()) as T
}

type RequestOptions = {
  timeoutMs?: number
}

const postJson = async <T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> => {
  const controller = options.timeoutMs ? new AbortController() : undefined
  const timeoutId = options.timeoutMs
    ? setTimeout(() => controller?.abort(), options.timeoutMs)
    : undefined

  let response: Response

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller?.signal,
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiRequestError(`API request timed out after ${options.timeoutMs} ms`, 408)
    }

    throw error
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null
    throw new ApiRequestError(payload?.error ?? `API request failed: ${response.status}`, response.status)
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

export const fetchBootstrapData = (options: BootstrapRequestOptions = {}) => {
  const params = new URLSearchParams()
  if (options.forceSourceRead) params.set('sourceRead', 'force')
  const query = params.toString()

  return fetchJson<BootstrapResponse>(`/api/bootstrap${query ? `?${query}` : ''}`)
}

export const fetchTechnicalStatus = () => fetchJson<TechnicalStatus>('/api/technical-status')

export const fetchStorageStatus = (step: ProcessStep) =>
  fetchJson<StorageStatusPayload>(`/api/storage-status?step=${encodeURIComponent(step)}`)

export const fetchBomMatvarValidation = (reviewId: string) =>
  fetchJson<BomMatvarValidationPayload>(`/api/reviews/${encodeURIComponent(reviewId)}/bom-matvar/validation`)

export const fetchBomMatvarComparison = (reviewId: string) =>
  fetchJson<BomMatvarComparisonPayload>(`/api/reviews/${encodeURIComponent(reviewId)}/bom-matvar/comparison`)

export const fetchBomMatvarReviewIssues = (reviewId: string) =>
  fetchJson<BomMatvarReviewIssuesPayload>(`/api/reviews/${encodeURIComponent(reviewId)}/bom-matvar/review-issues`)

export const apiCreateSource = (source: SourceCreateInput) =>
  postJson<BootstrapResponse>('/api/sources', source)

export const apiDeleteSource = (sourceId: string) =>
  deleteJson<BootstrapResponse>(`/api/sources/${encodeURIComponent(sourceId)}`)

export const apiRegisterSourceLocalFile = (sourceId: string, file: SourceFileMetadata) =>
  postJson<BootstrapResponse>(`/api/sources/${encodeURIComponent(sourceId)}/local-file`, { file })

export const apiCheckSourcesAccess = () => postJson<BootstrapResponse>('/api/sources/check', {})

export const apiCheckSourceAccess = (sourceId: string) =>
  postJson<BootstrapResponse>(`/api/sources/${encodeURIComponent(sourceId)}/check`, {})

export const apiSaveSourceConnections = (connectionsByTarget: SourceConnectionsByTarget) =>
  postJson<BootstrapResponse>('/api/source-connections', { connectionsByTarget })

export const apiFetchSourcePreview = (sourceId: string, sheetName?: string) => {
  const params = new URLSearchParams({ rowLimit: '100' })
  if (sheetName) params.set('sheet', sheetName)

  return fetchJson<SourcePreviewPayload>(`/api/sources/${encodeURIComponent(sourceId)}/preview?${params.toString()}`)
}

export const apiMarkIssueForDecision = (issueId: string) =>
  postJson<WorkflowPayload>('/api/workflow/mark-issue-for-decision', { issueId })

export const apiSetDecisionStatus = (issueId: string, status: DecisionStatus) =>
  postJson<WorkflowPayload>('/api/workflow/set-decision-status', { issueId, status })

export const apiPrepareOutput = (outputId: string) =>
  postJson<WorkflowPayload>('/api/workflow/prepare-output', { outputId })
