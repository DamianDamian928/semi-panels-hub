export type ReviewStatus = 'Draft' | 'In progress' | 'Completed'
export type MainStage = 'BOM' | 'Documentation' | 'Costing'
export type ProcessStep = 'Sources' | 'Comparison' | 'Validation' | 'Decisions' | 'Output' | 'AI Assistant'
export type AppView =
  | 'dashboard'
  | 'settings'
  | 'settings-sources'
  | 'settings-diagnostics'
  | 'settings-design-template'
  | 'review-editor'
export type ApiConnectionState = 'loading' | 'ready' | 'offline' | 'error'

export type SidebarIconName =
  | 'sources'
  | 'connections'
  | 'validation'
  | 'comparison'
  | 'decisions'
  | 'output'
  | 'aiAssistant'

export type SidebarStepDefinition = {
  step: ProcessStep
  label: string
  icon: SidebarIconName
}

export type DashboardRow = {
  id: string
  intelModel: string
  status: ReviewStatus
  owner: string
  lastUpdated: string
  forecastStatus?: string
  poDocuments?: {
    poNumber: string
    name: string
    path: string
  }[]
  dashboardColumns?: string[]
  dashboardCells?: Record<string, string>
}

export type SourceReadStatus = {
  status: string
  sourceReadAt: string | null
  sourceReadAtLabel: string | null
  sourceModifiedAt: string | null
  sourceFileName: string | null
  message: string
}

export type MatvarForecastValidationIssue = {
  id: string
  rowNumber: number
  intelModelNumberItem: string
  forecastMvar: string
  expectedMvar: string | null
  issue: string
}

export type MatvarForecastValidationStatus = {
  status: 'Valid' | 'Error' | 'Unavailable'
  checkedRows: number
  issueCount: number
  issues: MatvarForecastValidationIssue[]
  message: string
  refreshedAt: string
}

export type StepPurposeContent = {
  eyebrow: string
  title: string
  summary: string
  goal: string
  function: string
  yourRole: string
  example: string
  output: string
}

export type SourceDefinition = {
  id: string
  name: string
  type: SourceType
  location: string
  scope: string
  status: 'Ready' | 'Needs location' | 'Needs check' | 'Error'
  usedFor: SourceUsage[]
  expectedFormat: string
  lastChecked: string
  owner: string
  description: string
  accessMode: 'Read-only'
  sourceFile?: SourceFileMetadata
  accessCheck?: SourceAccessCheck
}

export type SourceType = 'File' | 'Folder' | 'SQL' | 'SharePoint' | 'Manual export'
export type SourceUsage = 'BOM' | 'Documentation' | 'Costing'

export type SourceCreateInput = {
  name: string
  type: SourceType
  usedFor: SourceUsage[]
  expectedFormat: string
  owner: string
  description: string
}

export type SourceConfigurationInput = {
  name: string
  description: string
}

export type SourceFileMetadata = {
  name: string
  path: string
  directory: string
  extension: string
  sizeBytes: number
  modifiedAt: string
  registeredAt?: string
  folderSummary?: SourceFolderSummary
}

export type SourceFolderSummary = {
  fileCount: number
  folderCount: number
  totalSizeBytes: number
  typeCounts: Record<string, number>
}

export type SourceAccessCheck = {
  checkedAt: string
  status: SourceDefinition['status']
  message: string
  exists: boolean
  readable: boolean
  sizeBytes?: number
  modifiedAt?: string
}

export type ConnectionTreeSection = {
  id: string
  label: string
  items?: { id: string; label: string }[]
}

export type ConnectionTargetId =
  | 'dashboard'
  | 'bom-matvar'
  | 'bom-l1'
  | 'bom-l2'
  | 'bom-l3'
  | 'documentation'
  | 'costing'

export type ConnectionTarget = {
  id: ConnectionTargetId
  label: string
  group: MainStage | 'Dashboard'
  description: string
}

export type SourceConnectionsByTarget = Record<ConnectionTargetId, string[]>
export type SourceConnectionRolesByTarget = Record<ConnectionTargetId, Record<string, string>>

export type ConnectionCard = {
  id: string
  title: string
  subtitle: string
  line1Label: string
  line1Value: string
  line2Label: string
  line2Value: string
  status: 'Connected' | 'Connecting' | 'Not connected' | 'Selected'
}

export type ValidationState = 'Valid' | 'Warning' | 'Error' | 'Not checked'
export type ReviewIssueSeverity = 'High' | 'Medium' | 'Low'
export type ReviewIssueStatus = 'Open' | 'In review' | 'Resolved'
export type DecisionState = 'None' | 'Required' | 'Drafted' | 'Accepted' | 'Deferred'
export type DecisionStatus = Exclude<DecisionState, 'None'>
export type DecisionFilter = 'All' | DecisionStatus
export type OutputStatus = 'Ready' | 'Blocked' | 'Needs decision' | 'Not persisted'
export type OutputFilter = 'All' | OutputStatus
export type AuditEventType = 'Issue' | 'Decision' | 'Output'
export type AuditEventState = 'Not persisted' | 'Preview only'
export type PersistenceState = 'Source snapshot' | 'Pending save' | 'Saved' | 'Save failed' | 'Audit recorded'

export type ReviewIssue = {
  id: string
  title: string
  area: string
  severity: ReviewIssueSeverity
  status: ReviewIssueStatus
  source: string
  comparedWith: string
  decision: DecisionState
  owner: string
  updated: string
  description: string
  suggestedAction: string
}

export type DecisionRecord = {
  issueId: string
  issueTitle: string
  area: string
  status: DecisionStatus
  proposedDecision: string
  rationale: string
  outputImpact: string
  auditState: string
  owner: string
  updated: string
  source: string
  comparedWith: string
}

export type OutputItem = {
  id: string
  title: string
  area: string
  linkedIssueId?: string
  description: string
  sourceBasis: string
  outputImpact: string
  artifactRole: string
  auditState: string
  owner: string
  updated: string
}

export type AuditEvent = {
  id: string
  type: AuditEventType
  title: string
  actor: string
  timestamp: string
  relatedTo: string
  state: AuditEventState
  persistence: PersistenceState
  summary: string
  detail: string
}
