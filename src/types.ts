export type ReviewStatus = 'Draft' | 'In progress' | 'Completed'
export type MainStage = 'BOM' | 'Documentation' | 'Costing'
export type BomStage = 'MATVAR' | 'L1' | 'L2' | 'L3'
export type ProcessStep = 'Main' | 'Sources' | 'Connections' | 'Validation' | 'Normalization' | 'Comparison' | 'Review' | 'Decisions' | 'Output' | 'AI Assistant'
export type AppView = 'dashboard' | 'settings-sources' | 'review-editor'

export type SidebarIconName =
  | 'main'
  | 'sources'
  | 'connections'
  | 'validation'
  | 'normalization'
  | 'comparison'
  | 'review'
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
  type: 'File' | 'Folder' | 'SQL' | 'SharePoint' | 'Manual export'
  location: string
  scope: string
  status: 'Ready' | 'Needs location' | 'Needs check' | 'Error'
  usedFor: Array<'BOM' | 'Documentation' | 'Costing'>
  expectedFormat: string
  lastChecked: string
  owner: string
  description: string
  accessMode: 'Read-only'
}

export type ConnectionTreeSection = {
  id: string
  label: string
  items?: { id: string; label: string }[]
}

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
export type ReviewIssueFilter = 'All' | 'Open' | 'Needs decision' | 'Resolved'
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
