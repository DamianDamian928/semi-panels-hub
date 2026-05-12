import { useMemo, useState } from 'react'
import type { ReactNode, SVGProps } from 'react'

type ReviewStatus = 'Draft' | 'In progress' | 'Completed'
type MainStage = 'BOM' | 'Documentation' | 'Costing'
type BomStage = 'MATVAR' | 'L1' | 'L2' | 'L3'
type ProcessStep = 'Main' | 'Connections' | 'Validation' | 'Normalization' | 'Comparison' | 'Review' | 'Decisions' | 'Output'
type AppView = 'dashboard' | 'settings-sources' | 'review-editor'


type SidebarIconName =
  | 'main'
  | 'connections'
  | 'validation'
  | 'normalization'
  | 'comparison'
  | 'review'
  | 'decisions'
  | 'output'

type SidebarStepDefinition = {
  step: ProcessStep
  label: string
  icon: SidebarIconName
}

type DashboardRow = {
  id: string
  intelModel: string
  status: ReviewStatus
  owner: string
  lastUpdated: string
}

type StepPurposeContent = {
  eyebrow: string
  title: string
  summary: string
  goal: string
  function: string
  yourRole: string
  example: string
  output: string
}

type SourceDefinition = {
  id: string
  name: string
  type: string
  location: string
  scope: string
}

type ConnectionTreeSection = {
  id: string
  label: string
  items?: { id: string; label: string }[]
}

type ConnectionCard = {
  id: string
  title: string
  subtitle: string
  line1Label: string
  line1Value: string
  line2Label: string
  line2Value: string
  status: 'Connected' | 'Connecting' | 'Not connected'
}

type ValidationState = 'Valid' | 'Warning' | 'Error' | 'Not checked'
type ReviewIssueSeverity = 'High' | 'Medium' | 'Low'
type ReviewIssueStatus = 'Open' | 'In review' | 'Resolved'
type DecisionState = 'None' | 'Required' | 'Drafted' | 'Accepted' | 'Deferred'
type ReviewIssueFilter = 'All' | 'Open' | 'Needs decision' | 'Resolved'
type DecisionStatus = Exclude<DecisionState, 'None'>
type DecisionFilter = 'All' | DecisionStatus
type OutputStatus = 'Ready' | 'Blocked' | 'Needs decision' | 'Not persisted'
type OutputFilter = 'All' | OutputStatus
type AuditEventType = 'Issue' | 'Decision' | 'Output'
type AuditEventState = 'Not persisted' | 'Preview only'

type ReviewIssue = {
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

type DecisionRecord = {
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

type OutputItem = {
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

type AuditEvent = {
  id: string
  type: AuditEventType
  title: string
  actor: string
  timestamp: string
  relatedTo: string
  state: AuditEventState
  summary: string
  detail: string
}

const dashboardRows: DashboardRow[] = [
  {
    id: '1',
    intelModel: 'SEMI-0001',
    status: 'Draft',
    owner: 'Damian',
    lastUpdated: 'Today, 08:30',
  },
  {
    id: '2',
    intelModel: 'SEMI-0002',
    status: 'In progress',
    owner: 'Damian',
    lastUpdated: 'Yesterday, 15:20',
  },
  {
    id: '3',
    intelModel: 'SEMI-0003',
    status: 'Completed',
    owner: 'Damian',
    lastUpdated: 'Apr 24, 11:05',
  },
]

const sourceDefinitions: SourceDefinition[] = [
  {
    id: '1',
    name: 'Fishbowl',
    type: 'Excel',
    location: 'Local file / Fishbowl export',
    scope: 'Global',
  },
  {
    id: '2',
    name: 'Mass Production',
    type: 'Excel',
    location: 'SharePoint / Production / Forecast',
    scope: 'Global',
  },
  {
    id: '3',
    name: 'Parts&BOM',
    type: 'Excel',
    location: 'SharePoint / Production / Parts',
    scope: 'Global',
  },
  {
    id: '4',
    name: 'BOX documentation',
    type: 'PDF / Folder',
    location: 'Local folder / BOX documentation',
    scope: 'Global',
  },
  {
    id: '5',
    name: 'Sharepoint documentation',
    type: 'PDF / SharePoint',
    location: 'SharePoint / Documentation',
    scope: 'Global',
  },
  {
    id: '6',
    name: 'PLM SQL connection',
    type: 'SQL',
    location: 'Configured connection',
    scope: 'Global',
  },
]

const validationStatesBySource: Record<string, { state: ValidationState; message: string }> = {
  'Fishbowl': { state: 'Valid', message: 'Source checked and ready.' },
  'Mass Production': { state: 'Warning', message: 'Imported with minor gaps to review.' },
  'Parts&BOM': { state: 'Valid', message: 'Structure looks correct.' },
  'BOX documentation': { state: 'Error', message: 'Missing required file mapping.' },
  'Sharepoint documentation': { state: 'Not checked', message: 'Validation has not been run yet.' },
  'PLM SQL connection': { state: 'Valid', message: 'Connection test passed.' },
}

const reviewIssues: ReviewIssue[] = [
  {
    id: 'issue-001',
    title: 'Missing component in L1 BOM',
    area: 'BOM / L1',
    severity: 'High',
    status: 'Open',
    source: 'Parts&BOM',
    comparedWith: 'Fishbowl',
    decision: 'Required',
    owner: 'Damian',
    updated: 'Today, 09:12',
    description: 'Parts&BOM contains a component that is not present in the Fishbowl baseline for the selected L1 structure.',
    suggestedAction: 'Review the L1 structure and decide whether the component should be added to the output or rejected as source noise.',
  },
  {
    id: 'issue-002',
    title: 'Quantity mismatch on MATVAR row',
    area: 'BOM / MATVAR',
    severity: 'Medium',
    status: 'In review',
    source: 'Fishbowl',
    comparedWith: 'Parts&BOM',
    decision: 'None',
    owner: 'Damian',
    updated: 'Today, 08:44',
    description: 'The same material appears in both sources, but the quantity does not match the expected MATVAR setup.',
    suggestedAction: 'Check which source should drive the quantity before creating a decision record.',
  },
  {
    id: 'issue-003',
    title: 'Documentation link missing for BOX package',
    area: 'Documentation',
    severity: 'High',
    status: 'Open',
    source: 'BOX documentation',
    comparedWith: 'Sharepoint documentation',
    decision: 'Required',
    owner: 'Damian',
    updated: 'Yesterday, 16:20',
    description: 'BOX documentation has no matching SharePoint document reference for this package.',
    suggestedAction: 'Confirm whether the missing link blocks review output or should be recorded as a documentation exception.',
  },
  {
    id: 'issue-004',
    title: 'Costing source ready but not reviewed',
    area: 'Costing',
    severity: 'Low',
    status: 'Open',
    source: 'Mass Production',
    comparedWith: 'PLM SQL connection',
    decision: 'None',
    owner: 'Damian',
    updated: 'May 5, 13:05',
    description: 'Costing inputs are connected and available, but no review action has been taken yet.',
    suggestedAction: 'Review costing inputs after BOM issues are triaged.',
  },
  {
    id: 'issue-005',
    title: 'Parent-child structure confirmed',
    area: 'BOM / L2',
    severity: 'Low',
    status: 'Resolved',
    source: 'Parts&BOM',
    comparedWith: 'PLM SQL connection',
    decision: 'Accepted',
    owner: 'Damian',
    updated: 'May 2, 10:30',
    description: 'The parent-child structure was checked and marked as acceptable for this review pass.',
    suggestedAction: 'Keep the accepted decision linked to the final output history.',
  },
]

const decisionRecords: DecisionRecord[] = [
  {
    issueId: 'issue-001',
    issueTitle: 'Missing component in L1 BOM',
    area: 'BOM / L1',
    status: 'Required',
    proposedDecision: 'Decide whether the missing L1 component should be included in the final output.',
    rationale: 'The difference affects the BOM structure and should not be resolved implicitly by the system.',
    outputImpact: 'Blocks output',
    auditState: 'Not persisted',
    owner: 'Damian',
    updated: 'Today, 09:12',
    source: 'Parts&BOM',
    comparedWith: 'Fishbowl',
  },
  {
    issueId: 'issue-002',
    issueTitle: 'Quantity mismatch on MATVAR row',
    area: 'BOM / MATVAR',
    status: 'Drafted',
    proposedDecision: 'Use Parts&BOM quantity as the review baseline for this MATVAR row.',
    rationale: 'Parts&BOM is the intended source for this setup, but the final decision still needs confirmation.',
    outputImpact: 'Affects output',
    auditState: 'Not persisted',
    owner: 'Damian',
    updated: 'Today, 08:44',
    source: 'Fishbowl',
    comparedWith: 'Parts&BOM',
  },
  {
    issueId: 'issue-003',
    issueTitle: 'Documentation link missing for BOX package',
    area: 'Documentation',
    status: 'Required',
    proposedDecision: 'Confirm whether documentation gap can be carried as an exception.',
    rationale: 'The issue belongs to documentation readiness and should be visible before output is generated.',
    outputImpact: 'Documentation only',
    auditState: 'Not persisted',
    owner: 'Damian',
    updated: 'Yesterday, 16:20',
    source: 'BOX documentation',
    comparedWith: 'Sharepoint documentation',
  },
  {
    issueId: 'issue-004',
    issueTitle: 'Costing source ready but not reviewed',
    area: 'Costing',
    status: 'Deferred',
    proposedDecision: 'Defer costing review until BOM issue triage is complete.',
    rationale: 'Costing is available, but BOM structure decisions should be settled first.',
    outputImpact: 'No output impact yet',
    auditState: 'Not persisted',
    owner: 'Damian',
    updated: 'May 5, 13:05',
    source: 'Mass Production',
    comparedWith: 'PLM SQL connection',
  },
  {
    issueId: 'issue-005',
    issueTitle: 'Parent-child structure confirmed',
    area: 'BOM / L2',
    status: 'Accepted',
    proposedDecision: 'Keep the reviewed parent-child structure in the output baseline.',
    rationale: 'The structure was checked and accepted for this review pass.',
    outputImpact: 'Affects output',
    auditState: 'Not persisted',
    owner: 'Damian',
    updated: 'May 2, 10:30',
    source: 'Parts&BOM',
    comparedWith: 'PLM SQL connection',
  },
]

const outputItems: OutputItem[] = [
  {
    id: 'output-l1-bom',
    title: 'L1 BOM update package',
    area: 'BOM / L1',
    linkedIssueId: 'issue-001',
    description: 'Prepared output candidate for the L1 BOM structure after the missing component issue is resolved.',
    sourceBasis: 'Parts&BOM vs Fishbowl',
    outputImpact: 'Blocks output',
    artifactRole: 'BOM package',
    auditState: 'Not persisted',
    owner: 'Damian',
    updated: 'Today, 09:18',
  },
  {
    id: 'output-matvar-quantity',
    title: 'MATVAR quantity review output',
    area: 'BOM / MATVAR',
    linkedIssueId: 'issue-002',
    description: 'Output candidate for MATVAR quantity alignment, waiting for the decision to be accepted.',
    sourceBasis: 'Fishbowl vs Parts&BOM',
    outputImpact: 'Affects output',
    artifactRole: 'Quantity update',
    auditState: 'Not persisted',
    owner: 'Damian',
    updated: 'Today, 08:50',
  },
  {
    id: 'output-documentation-exception',
    title: 'Documentation exception note',
    area: 'Documentation',
    linkedIssueId: 'issue-003',
    description: 'Documentation output note that can only be included after the missing link decision is settled.',
    sourceBasis: 'BOX documentation vs Sharepoint documentation',
    outputImpact: 'Documentation only',
    artifactRole: 'Exception note',
    auditState: 'Not persisted',
    owner: 'Damian',
    updated: 'Yesterday, 16:28',
  },
  {
    id: 'output-costing-hold',
    title: 'Costing readiness hold',
    area: 'Costing',
    linkedIssueId: 'issue-004',
    description: 'Costing output remains on hold until BOM decisions are clear enough to support final output.',
    sourceBasis: 'Mass Production vs PLM SQL connection',
    outputImpact: 'No output impact yet',
    artifactRole: 'Readiness note',
    auditState: 'Not persisted',
    owner: 'Damian',
    updated: 'May 5, 13:10',
  },
  {
    id: 'output-l2-structure',
    title: 'L2 structure baseline',
    area: 'BOM / L2',
    linkedIssueId: 'issue-005',
    description: 'Accepted parent-child structure that is ready to be represented in the final output baseline.',
    sourceBasis: 'Parts&BOM vs PLM SQL connection',
    outputImpact: 'Affects output',
    artifactRole: 'BOM baseline',
    auditState: 'Not persisted',
    owner: 'Damian',
    updated: 'May 2, 10:34',
  },
]

const auditEvents: AuditEvent[] = [
  {
    id: 'audit-001',
    type: 'Issue',
    title: 'Issue marked for decision',
    actor: 'Damian',
    timestamp: 'Today, 09:15',
    relatedTo: 'Missing component in L1 BOM',
    state: 'Preview only',
    summary: 'The L1 BOM issue was marked as requiring a decision.',
    detail: 'This preview event represents the future audit trail for moving an issue from review triage into the decision workflow.',
  },
  {
    id: 'audit-002',
    type: 'Decision',
    title: 'Decision drafted',
    actor: 'Damian',
    timestamp: 'Today, 09:20',
    relatedTo: 'Quantity mismatch on MATVAR row',
    state: 'Preview only',
    summary: 'A draft decision was prepared for the MATVAR quantity mismatch.',
    detail: 'This will later become a persisted decision-history event with author, timestamp and before/after state.',
  },
  {
    id: 'audit-003',
    type: 'Decision',
    title: 'Decision accepted',
    actor: 'Damian',
    timestamp: 'May 2, 10:32',
    relatedTo: 'Parent-child structure confirmed',
    state: 'Preview only',
    summary: 'The parent-child structure decision was accepted for output readiness.',
    detail: 'Accepted decisions should later explain why an output item is considered ready.',
  },
  {
    id: 'audit-004',
    type: 'Output',
    title: 'Output prepared',
    actor: 'Damian',
    timestamp: 'Today, 09:25',
    relatedTo: 'L2 structure baseline',
    state: 'Not persisted',
    summary: 'An output candidate was prepared from an accepted decision.',
    detail: 'This preview keeps output as a separate artifact while signaling that no durable audit record exists yet.',
  },
]

const validationStateClassName: Record<ValidationState, string> = {
  Valid: 'status status-completed',
  Warning: 'status status-progress',
  Error: 'status status-draft',
  'Not checked': 'status',
}

const statusClassName: Record<ReviewStatus, string> = {
  Draft: 'status status-draft',
  'In progress': 'status status-progress',
  Completed: 'status status-completed',
}

const mainStages: MainStage[] = ['BOM', 'Documentation', 'Costing']
const bomStages: BomStage[] = ['MATVAR', 'L1', 'L2', 'L3']

const sidebarSteps: SidebarStepDefinition[] = [
  { step: 'Main', label: 'Main', icon: 'main' },
  { step: 'Connections', label: 'Connections', icon: 'connections' },
  { step: 'Validation', label: 'Validation', icon: 'validation' },
  { step: 'Normalization', label: 'Normalization', icon: 'normalization' },
  { step: 'Comparison', label: 'Comparison', icon: 'comparison' },
  { step: 'Review', label: 'Review', icon: 'review' },
  { step: 'Decisions', label: 'Decisions', icon: 'decisions' },
  { step: 'Output', label: 'Output', icon: 'output' },
]


const connectionTree: Record<MainStage, ConnectionTreeSection[]> = {
  BOM: [
    {
      id: 'bom',
      label: 'BOM',
      items: [
        { id: 'matvar', label: 'Matvar' },
        { id: 'l1', label: 'Level L1' },
        { id: 'l2', label: 'Level L2' },
        { id: 'l3', label: 'Level L3' },
      ],
    },
  ],
  Documentation: [
    {
      id: 'documentation',
      label: 'Documentation',
    },
  ],
  Costing: [
    {
      id: 'costing',
      label: 'Costing',
    },
  ],
}


function SidebarGlyph({ name, className, ...props }: { name: SidebarIconName; className?: string } & SVGProps<SVGSVGElement>) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  const glyphs: Record<SidebarIconName, ReactNode> = {
    main: (
      <>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
      </>
    ),
    connections: (
      <>
        <path d="M8 7.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
        <path d="M16.5 12.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
        <path d="M9.9 6.95l4.7 3.1" />
        <path d="M8 21.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
        <path d="M9.95 17.05l4.6-3.05" />
      </>
    ),
    validation: (
      <>
        <path d="M12 3l7 2.8v5.1c0 4.5-2.7 8.2-7 10.1-4.3-1.9-7-5.6-7-10.1V5.8L12 3Z" />
        <path d="m9.1 11.9 2 2.1 4-4.4" />
      </>
    ),
    normalization: (
      <>
        <path d="M4 7h10" />
        <path d="M4 17h16" />
        <path d="M10 7 7 4 4 7" />
        <path d="m14 17 3 3 3-3" />
        <path d="M17 7h3" />
      </>
    ),
    comparison: (
      <>
        <path d="M9 5 4 10l5 5" />
        <path d="m15 5 5 5-5 5" />
        <path d="M20 10H8" />
        <path d="M16 14H4" />
      </>
    ),
    review: (
      <>
        <path d="M6 4.5h12A1.5 1.5 0 0 1 19.5 6v12A1.5 1.5 0 0 1 18 19.5H6A1.5 1.5 0 0 1 4.5 18V6A1.5 1.5 0 0 1 6 4.5Z" />
        <path d="M8 9h8" />
        <path d="M8 13h5" />
        <circle cx="16.5" cy="15.5" r="2.5" />
        <path d="m18.3 17.3 2.2 2.2" />
      </>
    ),
    decisions: (
      <>
        <path d="M7 12.5 10 15.5 17 8.5" />
        <path d="M4.5 12.5 7.5 15.5" />
        <path d="M10.5 15.5 13.5 18.5 20 11" />
      </>
    ),
    output: (
      <>
        <path d="M12 4v10" />
        <path d="m8 10 4 4 4-4" />
        <path d="M5 18.5h14" />
        <path d="M6.5 21h11" />
      </>
    ),
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} {...props}>
      <g {...common}>{glyphs[name]}</g>
    </svg>
  )
}

function BrandGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.96" />
          <stop offset="100%" stopColor="#d9e8ff" stopOpacity="0.78" />
        </linearGradient>
      </defs>
      <path d="M4 10 16 4l12 6-12 6L4 10Z" fill="url(#brandGradient)" />
      <path d="M6.5 16 16 11.2 25.5 16 16 20.8 6.5 16Z" fill="url(#brandGradient)" opacity="0.82" />
      <path d="M9 21.5 16 18l7 3.5-7 3.5-7-3.5Z" fill="url(#brandGradient)" opacity="0.68" />
    </svg>
  )
}

const sourceCardTemplates: Record<string, ConnectionCard[]> = {
  matvar: [
    {
      id: 'fishbowl',
      title: 'Fishbowl',
      subtitle: 'Selected source',
      line1Label: 'Source',
      line1Value: 'Fishbowl',
      line2Label: 'Mode',
      line2Value: 'Connected',
      status: 'Connected',
    },
    {
      id: 'parts-bom',
      title: 'Parts&BOM',
      subtitle: 'Selected source',
      line1Label: 'Source',
      line1Value: 'Parts&BOM',
      line2Label: 'Mode',
      line2Value: 'Connected',
      status: 'Connected',
    },
    {
      id: 'empty-a',
      title: 'Choose source',
      subtitle: 'Empty slot',
      line1Label: 'Source',
      line1Value: 'Not selected',
      line2Label: 'Mode',
      line2Value: 'Waiting',
      status: 'Not connected',
    },
  ],
  l1: [
    {
      id: 'fishbowl-l1',
      title: 'Fishbowl',
      subtitle: 'Selected source',
      line1Label: 'Source',
      line1Value: 'Fishbowl',
      line2Label: 'Mode',
      line2Value: 'Connected',
      status: 'Connected',
    },
    {
      id: 'plm-sql-l1',
      title: 'PLM SQL connection',
      subtitle: 'Selected source',
      line1Label: 'Source',
      line1Value: 'PLM SQL connection',
      line2Label: 'Mode',
      line2Value: 'Connecting',
      status: 'Connecting',
    },
    {
      id: 'empty-b',
      title: 'Choose source',
      subtitle: 'Empty slot',
      line1Label: 'Source',
      line1Value: 'Not selected',
      line2Label: 'Mode',
      line2Value: 'Waiting',
      status: 'Not connected',
    },
  ],
  l2: [
    {
      id: 'mass-production-l2',
      title: 'Mass Production',
      subtitle: 'Selected source',
      line1Label: 'Source',
      line1Value: 'Mass Production',
      line2Label: 'Mode',
      line2Value: 'Connected',
      status: 'Connected',
    },
    {
      id: 'parts-bom-l2',
      title: 'Parts&BOM',
      subtitle: 'Selected source',
      line1Label: 'Source',
      line1Value: 'Parts&BOM',
      line2Label: 'Mode',
      line2Value: 'Connected',
      status: 'Connected',
    },
  ],
  l3: [
    {
      id: 'plm-sql-l3',
      title: 'PLM SQL connection',
      subtitle: 'Selected source',
      line1Label: 'Source',
      line1Value: 'PLM SQL connection',
      line2Label: 'Mode',
      line2Value: 'Connected',
      status: 'Connected',
    },
    {
      id: 'empty-c',
      title: 'Choose source',
      subtitle: 'Empty slot',
      line1Label: 'Source',
      line1Value: 'Not selected',
      line2Label: 'Mode',
      line2Value: 'Waiting',
      status: 'Not connected',
    },
  ],
  'box-docs': [
    {
      id: 'box-doc-card',
      title: 'BOX documentation',
      subtitle: 'Selected source',
      line1Label: 'Source',
      line1Value: 'BOX documentation',
      line2Label: 'Mode',
      line2Value: 'Connected',
      status: 'Connected',
    },
    {
      id: 'empty-doc-a',
      title: 'Choose source',
      subtitle: 'Empty slot',
      line1Label: 'Source',
      line1Value: 'Not selected',
      line2Label: 'Mode',
      line2Value: 'Waiting',
      status: 'Not connected',
    },
  ],
  'sharepoint-docs': [
    {
      id: 'sp-doc-card',
      title: 'Sharepoint documentation',
      subtitle: 'Selected source',
      line1Label: 'Source',
      line1Value: 'Sharepoint documentation',
      line2Label: 'Mode',
      line2Value: 'Connected',
      status: 'Connected',
    },
    {
      id: 'plm-doc-card',
      title: 'PLM SQL connection',
      subtitle: 'Selected source',
      line1Label: 'Source',
      line1Value: 'PLM SQL connection',
      line2Label: 'Mode',
      line2Value: 'Connecting',
      status: 'Connecting',
    },
  ],
  'cost-rollup': [
    {
      id: 'mass-cost',
      title: 'Mass Production',
      subtitle: 'Selected source',
      line1Label: 'Source',
      line1Value: 'Mass Production',
      line2Label: 'Mode',
      line2Value: 'Connected',
      status: 'Connected',
    },
  ],
  'cost-review': [
    {
      id: 'parts-cost',
      title: 'Parts&BOM',
      subtitle: 'Selected source',
      line1Label: 'Source',
      line1Value: 'Parts&BOM',
      line2Label: 'Mode',
      line2Value: 'Connected',
      status: 'Connected',
    },
    {
      id: 'empty-cost',
      title: 'Choose source',
      subtitle: 'Empty slot',
      line1Label: 'Source',
      line1Value: 'Not selected',
      line2Label: 'Mode',
      line2Value: 'Waiting',
      status: 'Not connected',
    },
  ],
}

const stepPurposeContent: Record<ProcessStep, StepPurposeContent> = {
  Main: {
    eyebrow: 'Main',
    title: 'Punkt startowy review i szybki obraz stanu projektu',
    summary: 'To jest główny ekran review. Tutaj widzisz ogólny stan projektu, najważniejsze sygnały z całego procesu i to, od czego warto zacząć. Ten ekran ma pomóc Ci szybko zorientować się, czy review jest dopiero na starcie, czy są już problemy do sprawdzenia, czy można iść dalej.',
    goal: 'Dać jedno proste miejsce do zrozumienia projektu przed wejściem głębiej w źródła, sprawdzenia i decyzje.',
    function: 'Pokazuje aktywny kontekst pracy dla BOM, Documentation i Costing oraz status review potrzebny do wybrania kolejnego kroku.',
    yourRole: 'Na tym etapie nie pracujesz jeszcze na szczegółowych danych. Twoim zadaniem jest ocenić, w jakim miejscu procesu jesteś i zdecydować, do którego kroku wejść dalej.',
    example: 'Przykład: wchodzisz na review i od razu widzisz, że źródła są już podłączone, walidacja ma warningi, a Comparison jeszcze nie było uruchomione. Dzięki temu wiesz, że najpierw powinieneś sprawdzić Validation, a nie przechodzić od razu do decyzji.',
    output: 'Masz szybki, czytelny obraz sytuacji i wiesz, gdzie wkroczyć w kolejnym kroku.',
  },
  Connections: {
    eyebrow: 'Connections',
    title: 'Wybór i podłączenie źródeł danych do review',
    summary: 'Tutaj aplikacja pracuje na źródłach, z których będzie budowany cały proces review. Ten etap służy do wskazania, które dane mają wejść do systemu, skąd pochodzą i czy są gotowe do użycia dalej.',
    goal: 'Podłączyć właściwy zestaw źródeł do właściwej części review.',
    function: 'Pozwala przypisać globalne źródła do obszarów BOM, Documentation i Costing, aby dalsze kroki pracowały na jednym uzgodnionym zestawie wejściowym.',
    yourRole: 'Tutaj wchodzisz wtedy, gdy trzeba wskazać lub podłączyć właściwe źródła do review. Twoją rolą jest zadbać, żeby system pracował na poprawnych wejściach, ale nie edytujesz samych danych źródłowych.',
    example: 'Przykład: dla części BOM wybierasz Parts&BOM i Fishbowl, dla dokumentacji wskazujesz BOX documentation i Sharepoint documentation, a dla danych referencyjnych zostawiasz PLM SQL connection. Dzięki temu kolejne etapy wiedzą, na czym mają pracować.',
    output: 'System wie, z jakich źródeł ma korzystać w dalszych etapach i może przejść do walidacji oraz przetwarzania.',
  },
  Validation: {
    eyebrow: 'Validation',
    title: 'Sprawdzenie, czy dane wejściowe nadają się do dalszego procesu',
    summary: 'Ten etap pokazuje, czy źródła zostały poprawnie użyte i czy dane są wystarczająco poprawne, żeby system mógł przejść dalej. Tutaj oddzielamy błędy blokujące od warningów i od zwykłych informacji technicznych.',
    goal: 'Wychwycić problemy wejściowe wcześnie, zanim stworzą fałszywe różnice albo złe decyzje review.',
    function: 'Pokazuje gotowość źródeł, błędy blokujące, warningi i luki, które trzeba jeszcze zamknąć, zanim dane pójdą dalej.',
    yourRole: 'Wkraczasz tutaj wtedy, gdy system pokazuje problem z wejściem. Twoim zadaniem jest ocenić, czy trzeba poprawić źródło, podmienić plik, czy można iść dalej mimo warningu.',
    example: 'Przykład: jeśli Parts&BOM ma poprawny plik, ale BOX documentation ma brak wymaganego mapowania albo Sharepoint documentation nie zostało jeszcze sprawdzone, to tutaj decydujesz, czy najpierw naprawiasz wejście, czy świadomie zostawiasz warning i idziesz dalej.',
    output: 'Wiesz, czy dane są gotowe do dalszego przetwarzania, czy trzeba zatrzymać proces i poprawić wejście.',
  },
  Normalization: {
    eyebrow: 'Normalization',
    title: 'Ujednolicanie danych do jednego wspólnego modelu',
    summary: 'Tutaj system bierze dane z różnych źródeł i zamienia je na jeden wspólny układ, żeby w kolejnym kroku można je było porównywać w spójny sposób. To jest moment przejścia ze świata różnych plików, różnych kolumn, różnych nazw i różnych układów danych do jednego centralnego modelu review.',
    goal: 'Usunąć chaos formatów bez zmieniania oryginalnych danych źródłowych.',
    function: 'Mapuje dane read-only ze źródeł do jednego wspólnego modelu wewnętrznego, cały czas zachowując informację o pochodzeniu każdego rekordu.',
    yourRole: 'Tutaj wchodzisz wtedy, gdy chcesz sprawdzić, czy system dobrze przygotował dane do dalszych porównań. Nie ustawiasz tu jeszcze reguł porównania i nie rozstrzygasz różnic, ale kontrolujesz, czy dane zostały poprawnie ujednolicone.',
    example: 'Przykład: w jednym źródle część ma inną nazwę kolumny, w drugim inaczej zapisane ilości, a w trzecim inny układ poziomów BOM. Na tym ekranie nie pytasz jeszcze, które źródło ma rację, tylko sprawdzasz, czy system poprawnie sprowadził te dane do jednego wspólnego modelu gotowego do Comparison.',
    output: 'System przygotowuje jeden wspólny model danych gotowy do uruchomienia porównań.',
  },
  Comparison: {
    eyebrow: 'Comparison',
    title: 'Wykrywanie istotnych różnic między źródłami',
    summary: 'Tutaj system porównuje znormalizowane dane i wykrywa rozbieżności, które mają znaczenie dla review BOM. To tutaj uruchamiane są reguły porównań, a różnice są zamieniane w konkretne wyniki gotowe do dalszej analizy.',
    goal: 'Wykryć różnice, które naprawdę mają znaczenie dla review BOM.',
    function: 'Uruchamia reguły porównań dla brakujących części, różnic ilościowych, konfliktów struktury, duplikatów i innych rozbieżności między źródłami.',
    yourRole: 'To jest jeden z ważniejszych momentów Twojego wejścia. Tutaj ustalasz i rozwijasz logikę porównań, czyli reguły, według których system ma wykrywać różnice między plikami i źródłami. Twoją rolą jest zdecydować, jakie porównania mają mieć znaczenie biznesowe i jak system ma interpretować rozbieżności.',
    example: 'Przykład: możesz zdecydować, że dla BOM najważniejsze są braki części, różnice ilości, konflikty parent-child i duplikaty, a mniej istotne są niektóre różnice opisowe. To właśnie tutaj definiujesz, które reguły mają tworzyć issue i co ma być później pokazane użytkownikowi w Review.',
    output: 'Aplikacja tworzy listę różnic, braków, konfliktów i innych issue, które przejdą dalej do Review.',
  },
  Review: {
    eyebrow: 'Review',
    title: 'Główne miejsce analizy wykrytych problemów',
    summary: 'To jest centralny workspace review. Tutaj widzisz wszystkie issue wykryte przez system, ich źródła, szczegóły rekordu i kontekst potrzebny do zrozumienia problemu. To ma być główne miejsce pracy analitycznej.',
    goal: 'Pozwolić użytkownikowi zrozumieć każde issue, porównać kontekst źródeł i zdecydować, co naprawdę wymaga działania.',
    function: 'Grupuje wyniki, pokazuje szczegóły issue, źródła danych i pomaga skupić się najpierw na tym, co najważniejsze.',
    yourRole: 'Tutaj wchodzisz najmocniej. Twoim zadaniem jest przejrzeć wykryte problemy, filtrować je, porównywać źródła, analizować szczegóły i zdecydować, które sprawy wymagają decyzji, a które są już jasne.',
    example: 'Przykład: system wykrył brak części w jednym źródle, różnicę ilości w drugim i konflikt struktury w trzecim. Na ekranie Review sprawdzasz szczegóły tych issue, patrzysz z jakich źródeł pochodzą, oceniasz ich wagę i decydujesz, które trzeba rozstrzygnąć od razu.',
    output: 'Masz jedno centrum pracy na wszystkich problemach i nie musisz szukać ich po wielu ekranach.',
  },
  Decisions: {
    eyebrow: 'Decisions',
    title: 'Świadome rozstrzyganie problemów wykrytych w review',
    summary: 'Tutaj zapisują się decyzje dotyczące issue wykrytych wcześniej przez system. To ważny etap, bo problem i decyzja to nie jest to samo: system wykrywa problem, ale to użytkownik rozstrzyga, co z nim zrobić.',
    goal: 'Zachować czysty podział między tym, co system wykrył, a tym, co użytkownik zdecydował.',
    function: 'Zapisuje zaakceptowane rozwiązania, pominięte issue, uzasadnienia i inne dane decyzyjne bez nadpisywania prawdy źródłowej.',
    yourRole: 'To jest Twój etap decyzyjny. Tutaj wybierasz właściwy wariant, oznaczasz issue jako rozwiązane, zignorowane albo wymagające dalszej pracy i zapisujesz uzasadnienie. Tu formalnie wkraczasz jako osoba odpowiedzialna za rozstrzygnięcie.',
    example: 'Przykład: po analizie w Review decydujesz, że jedna różnica ilościowa jest prawidłowa i powinna zostać zaakceptowana, druga wymaga dalszego sprawdzenia, a trzecia może zostać świadomie zignorowana. Każda z tych decyzji zapisuje się oddzielnie od samego issue i nie zmienia danych źródłowych.',
    output: 'Powstaje audytowalna warstwa decyzji review, oddzielona od danych wejściowych.',
  },
  Output: {
    eyebrow: 'Output',
    title: 'Generowanie końcowego wyniku review',
    summary: 'To jest etap tworzenia finalnego rezultatu procesu. Tutaj system generuje wynik, który ma być użyteczny biznesowo: finalny BOM, raport różnic, raport braków, eksport Excel albo inny artefakt końcowy.',
    goal: 'Wygenerować wynik końcowy, do którego można wrócić i którego można użyć dalej.',
    function: 'Buduje finalny BOM, raporty różnic, raporty braków, eksporty i inne artefakty końcowe wynikające z review oraz zapisanych decyzji.',
    yourRole: 'Tutaj wchodzisz wtedy, gdy review jest już wystarczająco przeanalizowane i rozstrzygnięte. Twoim zadaniem jest zdecydować, kiedy wynik jest gotowy do wygenerowania i który rezultat ma być finalnym wyjściem procesu.',
    example: 'Przykład: po zamknięciu najważniejszych issue generujesz finalny BOM do dalszej pracy, raport różnic dla engineeringu i eksport Excel dla produkcji. Jeśli później review się zmieni, system może zapisać kolejną wersję outputu bez utraty historii.',
    output: 'Powstaje trwały, zapisany wynik review, do którego można wrócić razem z historią decyzji i audytem.',
  },
}

const nextStepByProcess: Record<ProcessStep, { title: string; description: string }> = {
  Main: {
    title: 'Main project workspace',
    description: 'This opens the current BOM, Documentation and Costing view without changes.',
  },
  Connections: {
    title: 'Connections',
    description: 'Global sources are linked to this review here.',
  },
  Validation: {
    title: 'Validation',
    description: 'This step will check if source inputs are ready.',
  },
  Normalization: {
    title: 'Normalization',
    description: 'This step will prepare one common model from all sources.',
  },
  Comparison: {
    title: 'Comparison',
    description: 'This step will compare sources and find differences.',
  },
  Review: {
    title: 'Review',
    description: 'This step will become the main workspace for issue analysis.',
  },
  Decisions: {
    title: 'Decisions',
    description: 'This step will store user decisions separately from issues.',
  },
  Output: {
    title: 'Output',
    description: 'This step will show exports, results and history.',
  },
}

const stageDescriptions: Record<MainStage, { title: string; description: string; connectionTitle: string }> = {
  BOM: {
    title: 'BOM workspace',
    description: 'Main work area for BOM-related setup. This is where MATVAR, L1, L2 and L3 will live.',
    connectionTitle: 'BOM connections',
  },
  Documentation: {
    title: 'Documentation workspace',
    description: 'Reserved for documentation inputs, checks and future review logic.',
    connectionTitle: 'Documentation connections',
  },
  Costing: {
    title: 'Costing workspace',
    description: 'Reserved for costing inputs and later business comparison logic.',
    connectionTitle: 'Costing connections',
  },
}

const activeStepByStatus: Record<ReviewStatus, ProcessStep> = {
  Draft: 'Main',
  'In progress': 'Review',
  Completed: 'Output',
}

const resolveDecisionStatus = (
  record: DecisionRecord,
  issueDecisionStates: Record<string, DecisionState>,
  decisionStatuses: Record<string, DecisionStatus>,
): DecisionStatus => {
  const issueDecisionState = issueDecisionStates[record.issueId]
  const issueDrivenStatus = issueDecisionState && issueDecisionState !== 'None' ? issueDecisionState : record.status

  return decisionStatuses[record.issueId] ?? issueDrivenStatus
}

const getOutputStatusFromDecision = (decisionStatus?: DecisionStatus): OutputStatus => {
  if (decisionStatus === 'Accepted') return 'Ready'
  if (decisionStatus === 'Deferred') return 'Blocked'
  if (decisionStatus) return 'Needs decision'
  return 'Not persisted'
}

export default function App() {
  const [isAdmin] = useState(true)
  const [appView, setAppView] = useState<AppView>('dashboard')
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null)
  const [activeMainStage, setActiveMainStage] = useState<MainStage>('BOM')
  const [activeBomStage, setActiveBomStage] = useState<BomStage>('MATVAR')
  const [activeProcessStep, setActiveProcessStep] = useState<ProcessStep>('Main')
  const [activeConnectionNodeId, setActiveConnectionNodeId] = useState<string>('matvar')
  const [activeReviewIssueId, setActiveReviewIssueId] = useState<string>(reviewIssues[0].id)
  const [reviewIssueFilter, setReviewIssueFilter] = useState<ReviewIssueFilter>('All')
  const [issueDecisionStates, setIssueDecisionStates] = useState<Record<string, DecisionState>>({})
  const [activeDecisionIssueId, setActiveDecisionIssueId] = useState<string>(decisionRecords[0].issueId)
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>('All')
  const [decisionStatuses, setDecisionStatuses] = useState<Record<string, DecisionStatus>>({})
  const [activeOutputItemId, setActiveOutputItemId] = useState<string>(outputItems[0].id)
  const [outputFilter, setOutputFilter] = useState<OutputFilter>('All')
  const [outputStatuses, setOutputStatuses] = useState<Record<string, OutputStatus>>({})
  const [activeAuditEventId, setActiveAuditEventId] = useState<string>(auditEvents[0].id)

  const selectedReview = useMemo(
    () => dashboardRows.find((row) => row.id === selectedReviewId) ?? null,
    [selectedReviewId],
  )


  const connectionsCustomStyles = `
    .connections-stage { padding: 0; }
    .connections-layout { display: grid; grid-template-columns: 280px minmax(0, 1fr); min-height: 560px; }
    .connections-tree { padding: 24px 18px; border-right: 1px solid rgba(98,132,173,0.16); background: linear-gradient(180deg, rgba(11, 24, 40, 0.98), rgba(7, 18, 31, 0.98)); }
    .connection-group + .connection-group { margin-top: 18px; }
    .connection-group-header { width: 100%; display: flex; align-items: center; gap: 10px; padding: 8px 4px; border: none; background: transparent; color: #dbe8f8; text-align: left; }
    .connection-group-arrow { color: #b8cae3; font-size: 14px; }
    .connection-group-ring { width: 18px; height: 18px; border-radius: 999px; border: 2px solid #3d87de; box-shadow: inset 0 0 0 3px rgba(13,22,36,0.9); }
    .connection-group-title { font-weight: 700; }
    .connection-group-dot { margin-left: auto; width: 14px; height: 14px; border-radius: 999px; border: 2px solid rgba(153, 176, 206, 0.45); }
    .connection-group-dot-active { border-color: #4bc5ff; box-shadow: 0 0 12px rgba(75, 197, 255, 0.85); }
    .connection-group-items { margin: 6px 0 0 31px; padding-left: 14px; border-left: 1px solid rgba(88, 126, 174, 0.35); }
    .connection-item { width: 100%; display: flex; align-items: center; gap: 10px; margin: 6px 0; padding: 11px 12px; border-radius: 14px; border: 1px solid transparent; background: transparent; color: #9bc2ee; text-align: left; }
    .connection-item:hover { border-color: rgba(97,155,244,0.28); background: rgba(13,36,65,0.45); }
    .connection-item-active { border-color: rgba(82, 176, 255, 0.65); background: rgba(10, 48, 88, 0.62); box-shadow: inset 0 0 0 1px rgba(82,176,255,0.18), 0 0 18px rgba(45, 144, 255, 0.15); color: #dff1ff; }
    .connection-item-branch { width: 12px; height: 1px; background: rgba(123, 154, 194, 0.55); }
    .connection-item-label { font-weight: 600; }
    .connection-item-state { margin-left: auto; width: 13px; height: 13px; border-radius: 999px; border: 2px solid rgba(153,176,206,0.45); }
    .connection-item-state-active { border-color: #64d8ff; box-shadow: 0 0 12px rgba(100, 216, 255, 0.9); }
    .connections-content { padding: 28px; }
    .connections-header { margin-bottom: 24px; }
    .connections-card-wrap { display: grid; gap: 16px; }
    .connections-card-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    .connection-source-card { padding: 20px; border-radius: 22px; border: 1px solid rgba(98,132,173,0.2); background: linear-gradient(180deg, rgba(17,31,50,0.95), rgba(11,24,40,0.98)); box-shadow: inset 0 1px 0 rgba(255,255,255,0.03); }
    .connection-source-top { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
    .connection-source-brand { display: flex; gap: 14px; align-items: flex-start; }
    .connection-source-brand h4 { margin: 0 0 4px; font-size: 17px; color: #f8fbff; }
    .connection-source-brand p { margin: 0; color: #97acc8; font-size: 14px; }
    .connection-source-icon { width: 42px; height: 42px; border-radius: 14px; background: radial-gradient(circle at top, rgba(89,160,255,0.8), rgba(24,70,138,0.9)); box-shadow: 0 0 18px rgba(70, 134, 226, 0.35); }
    .connection-source-icon-connecting { background: radial-gradient(circle at top, rgba(255,212,87,0.92), rgba(160,120,20,0.95)); box-shadow: 0 0 18px rgba(255, 206, 84, 0.28); }
    .connection-source-icon-not-connected { background: radial-gradient(circle at top, rgba(124,143,168,0.75), rgba(52,68,92,0.95)); box-shadow: none; }
    .connection-source-menu { border: none; background: transparent; color: #8ea9c7; font-size: 22px; padding: 0; line-height: 1; }
    .connection-source-meta { display: grid; gap: 10px; margin: 0 0 18px; }
    .connection-source-meta div { display: grid; grid-template-columns: 72px 1fr; gap: 12px; }
    .connection-source-meta dt { color: #8ca5c2; }
    .connection-source-meta dd { margin: 0; color: #f4f8fd; }
    .connection-source-status { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; }
    .connection-source-status-dot { width: 10px; height: 10px; border-radius: 999px; background: currentColor; box-shadow: 0 0 10px currentColor; }
    .connection-source-status-connected { color: #68d391; }
    .connection-source-status-connecting { color: #ffd15b; }
    .connection-source-status-not-connected { color: #94a9c5; }
    .connection-source-actions { display: grid; gap: 12px; }
    .connection-source-select { width: 100%; border-radius: 12px; border: 1px solid rgba(97,155,244,0.22); background: rgba(8, 29, 56, 0.92); color: #dce9fb; padding: 12px 14px; }
    .connection-source-buttons { display: flex; gap: 10px; }
    @media (max-width: 1200px) { .connections-layout { grid-template-columns: 1fr; } .connections-tree { border-right: none; border-bottom: 1px solid rgba(98,132,173,0.16); } }
    @media (max-width: 900px) { .connections-card-grid { grid-template-columns: 1fr; } }
  `

  const openReview = (reviewId: string) => {
    setSelectedReviewId(reviewId)
    setAppView('review-editor')
  }

  const renderSourceNamesStep = (
    stepName: Exclude<ProcessStep, 'Main' | 'Connections'>,
    title: string,
    description: string,
    statusLabel: string,
  ) => {
    return (
      <section className="workspace-main-grid">
        <section className="workspace-main card">
          <div className="workspace-card workspace-card-single">
            <div className="workspace-copy">
              <p className="section-label">{stepName}</p>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sourceDefinitions.map((source) => (
                    <tr key={source.id}>
                      <td>{source.name}</td>
                      <td>{statusLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <aside className="workspace-side-panel card" aria-label="Context panel">
          <div className="sidebar-header">
            <p className="section-label">Step</p>
            <h2>{stepName}</h2>
            <p>For now this screen uses only source names from global Sources.</p>
          </div>

          <dl className="source-meta-list">
            <div>
              <dt>Review step</dt>
              <dd>{stepName}</dd>
            </div>
            <div>
              <dt>Project</dt>
              <dd>{selectedReview?.intelModel}</dd>
            </div>
            <div>
              <dt>Rows shown</dt>
              <dd>{sourceDefinitions.length}</dd>
            </div>
          </dl>
        </aside>
      </section>
    )
  }


  const renderComparisonStep = () => {
    const comparisonRows = sourceDefinitions.map((source) => {
      if (source.name === 'Fishbowl') {
        return { id: source.id, name: source.name, status: 'Matched', comparedWith: 'Parts&BOM', message: 'No key BOM differences detected in this placeholder view.' }
      }
      if (source.name === 'Mass Production') {
        return { id: source.id, name: source.name, status: 'Needs review', comparedWith: 'PLM SQL connection', message: 'A few values would need comparison review here later.' }
      }
      if (source.name === 'Parts&BOM') {
        return { id: source.id, name: source.name, status: 'Matched', comparedWith: 'Fishbowl', message: 'Ready for comparison baseline in this placeholder view.' }
      }
      if (source.name === 'BOX documentation') {
        return { id: source.id, name: source.name, status: 'Missing link', comparedWith: 'Sharepoint documentation', message: 'Comparison cannot be completed until documentation is connected.' }
      }
      if (source.name === 'Sharepoint documentation') {
        return { id: source.id, name: source.name, status: 'Pending', comparedWith: 'BOX documentation', message: 'Waiting for full comparison setup.' }
      }
      return { id: source.id, name: source.name, status: 'Ready', comparedWith: 'Mass Production', message: 'Connection is ready to support future comparison rules.' }
    })

    const summary = comparisonRows.reduce(
      (acc, row) => {
        acc[row.status] = (acc[row.status] ?? 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return (
      <section className="workspace-main-grid">
        <section className="workspace-main card">
          <div className="workspace-card workspace-card-single">
            <div className="workspace-copy">
              <p className="section-label">Comparison</p>
              <h3>Comparison overview</h3>
              <p>This screen will be used for BOM comparison rules, detected differences and review-ready problems.</p>
            </div>

            <div className="stats-grid" style={{ marginBottom: 20 }}>
              <article className="stat-card">
                <span>Matched</span>
                <strong>{summary['Matched'] ?? 0}</strong>
              </article>
              <article className="stat-card">
                <span>Needs review</span>
                <strong>{summary['Needs review'] ?? 0}</strong>
              </article>
              <article className="stat-card">
                <span>Missing link</span>
                <strong>{summary['Missing link'] ?? 0}</strong>
              </article>
              <article className="stat-card">
                <span>Pending</span>
                <strong>{summary['Pending'] ?? 0}</strong>
              </article>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Compared with</th>
                    <th>Status</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      <td>{row.comparedWith}</td>
                      <td>{row.status}</td>
                      <td>{row.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <aside className="workspace-side-panel card" aria-label="Comparison summary">
          <div className="sidebar-header">
            <p className="section-label">Step</p>
            <h2>Comparison</h2>
            <p>Here we will define what is compared, what differs and what becomes an issue for review.</p>
          </div>

          <dl className="source-meta-list">
            <div>
              <dt>Project</dt>
              <dd>{selectedReview?.intelModel}</dd>
            </div>
            <div>
              <dt>Total sources</dt>
              <dd>{comparisonRows.length}</dd>
            </div>
            <div>
              <dt>Main purpose</dt>
              <dd>Rules and differences</dd>
            </div>
          </dl>

          <div className="activity-feed" style={{ marginTop: 20 }}>
            <article className="activity-item">
              <strong>What comes later here</strong>
              <p>Real BOM comparison rules, quantity differences, missing parts, parent-child issues and review issues.</p>
            </article>
          </div>
        </aside>
      </section>
    )
  }

  const renderReviewStep = () => {
    const issueRows = reviewIssues.map((issue) => ({
      ...issue,
      decision: issueDecisionStates[issue.id] ?? issue.decision,
    }))

    const filteredIssues = issueRows.filter((issue) => {
      if (reviewIssueFilter === 'Open') return issue.status !== 'Resolved'
      if (reviewIssueFilter === 'Needs decision') return issue.decision === 'Required'
      if (reviewIssueFilter === 'Resolved') return issue.status === 'Resolved'
      return true
    })

    const selectedIssue =
      filteredIssues.find((issue) => issue.id === activeReviewIssueId) ??
      filteredIssues[0] ??
      issueRows.find((issue) => issue.id === activeReviewIssueId) ??
      issueRows[0]

    const summary = issueRows.reduce(
      (acc, issue) => {
        if (issue.status !== 'Resolved') acc.open += 1
        if (issue.decision === 'Required') acc.needsDecision += 1
        if (issue.severity === 'High' && issue.status !== 'Resolved') acc.highSeverity += 1
        if (issue.status === 'Resolved') acc.resolved += 1
        return acc
      },
      { open: 0, needsDecision: 0, highSeverity: 0, resolved: 0 },
    )

    const filterOptions: ReviewIssueFilter[] = ['All', 'Open', 'Needs decision', 'Resolved']
    const selectedDecision = selectedIssue.decision

    const markForDecision = () => {
      setIssueDecisionStates((current) => ({
        ...current,
        [selectedIssue.id]: 'Required',
      }))
    }

    return (
      <section className="review-workspace-grid">
        <section className="workspace-main card review-workspace-main">
          <div className="review-workspace-header">
            <div>
              <p className="section-label">Review</p>
              <h3>Review workspace</h3>
              <p>Central place for issue triage before decisions are created as separate records.</p>
            </div>
            <div className="review-workspace-context">
              <span className="meta-chip">Review: {selectedReview?.intelModel}</span>
              <span className="meta-chip">Issues: {issueRows.length}</span>
            </div>
          </div>

          <div className="review-stat-grid" aria-label="Review issue summary">
            <article className="review-stat-card">
              <span>Open issues</span>
              <strong>{summary.open}</strong>
            </article>
            <article className="review-stat-card">
              <span>Needs decision</span>
              <strong>{summary.needsDecision}</strong>
            </article>
            <article className="review-stat-card">
              <span>High severity</span>
              <strong>{summary.highSeverity}</strong>
            </article>
            <article className="review-stat-card">
              <span>Resolved</span>
              <strong>{summary.resolved}</strong>
            </article>
          </div>

          <div className="review-filter-row" aria-label="Issue filters">
            {filterOptions.map((filter) => {
              const isActive = filter === reviewIssueFilter
              return (
                <button
                  key={filter}
                  type="button"
                  className={`review-filter-button ${isActive ? 'review-filter-button-active' : ''}`}
                  onClick={() => setReviewIssueFilter(filter)}
                  aria-pressed={isActive}
                >
                  {filter}
                </button>
              )
            })}
          </div>

          <div className="review-issue-list" aria-label="Review issues">
            {filteredIssues.map((issue) => {
              const isActive = issue.id === selectedIssue.id
              return (
                <button
                  key={issue.id}
                  type="button"
                  className={`review-issue-row ${isActive ? 'review-issue-row-active' : ''}`}
                  onClick={() => setActiveReviewIssueId(issue.id)}
                >
                  <span className={`review-severity review-severity-${issue.severity.toLowerCase()}`}>{issue.severity}</span>
                  <span className="review-issue-main">
                    <strong>{issue.title}</strong>
                    <span>{issue.area} | {issue.source} vs {issue.comparedWith}</span>
                  </span>
                  <span className="review-issue-meta">
                    <span>{issue.status}</span>
                    <span>Decision: {issue.decision}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <aside className="workspace-side-panel card review-detail-panel" aria-label="Selected issue details">
          <div className="sidebar-header">
            <p className="section-label">Selected issue</p>
            <h2>{selectedIssue.title}</h2>
            <p>{selectedIssue.description}</p>
          </div>

          <dl className="source-meta-list">
            <div>
              <dt>Area</dt>
              <dd>{selectedIssue.area}</dd>
            </div>
            <div>
              <dt>Severity</dt>
              <dd>{selectedIssue.severity}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{selectedIssue.status}</dd>
            </div>
            <div>
              <dt>Sources</dt>
              <dd>{selectedIssue.source} vs {selectedIssue.comparedWith}</dd>
            </div>
            <div>
              <dt>Decision</dt>
              <dd>{selectedDecision}</dd>
            </div>
          </dl>

          <section className="decision-readiness" aria-label="Decision readiness">
            <p className="section-label">Decision readiness</p>
            <h3>{selectedDecision === 'Required' ? 'Ready for decision' : 'Not marked yet'}</h3>
            <p>{selectedIssue.suggestedAction}</p>
          </section>

          <div className="review-detail-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={markForDecision}
              disabled={selectedDecision === 'Required'}
            >
              Mark for decision
            </button>
            <button type="button" className="secondary-button" onClick={() => setActiveProcessStep('Decisions')}>
              Go to Decisions
            </button>
          </div>
        </aside>
      </section>
    )
  }

  const renderDecisionsStep = () => {
    const decisionRows = decisionRecords.map((record) => ({
      ...record,
      status: resolveDecisionStatus(record, issueDecisionStates, decisionStatuses),
    }))

    const filteredDecisions = decisionRows.filter((record) => {
      if (decisionFilter === 'All') return true
      return record.status === decisionFilter
    })

    const selectedDecision =
      filteredDecisions.find((record) => record.issueId === activeDecisionIssueId) ??
      filteredDecisions[0] ??
      decisionRows.find((record) => record.issueId === activeDecisionIssueId) ??
      decisionRows[0]

    const summary = decisionRows.reduce(
      (acc, record) => {
        acc[record.status] += 1
        return acc
      },
      { Required: 0, Drafted: 0, Accepted: 0, Deferred: 0 } as Record<DecisionStatus, number>,
    )

    const filterOptions: DecisionFilter[] = ['All', 'Required', 'Drafted', 'Accepted', 'Deferred']

    const setDecisionStatus = (status: DecisionStatus) => {
      setDecisionStatuses((current) => ({
        ...current,
        [selectedDecision.issueId]: status,
      }))
      setIssueDecisionStates((current) => ({
        ...current,
        [selectedDecision.issueId]: status,
      }))
    }

    return (
      <section className="decision-workspace-grid">
        <section className="workspace-main card decision-workspace-main">
          <div className="decision-workspace-header">
            <div>
              <p className="section-label">Decisions</p>
              <h3>Decision workspace</h3>
              <p>Separate decision records linked to review issues, kept apart from source data and issue detection.</p>
            </div>
            <div className="decision-workspace-context">
              <span className="meta-chip">Review: {selectedReview?.intelModel}</span>
              <span className="meta-chip">Decisions: {decisionRows.length}</span>
            </div>
          </div>

          <div className="decision-stat-grid" aria-label="Decision summary">
            <article className="decision-stat-card">
              <span>Required</span>
              <strong>{summary.Required}</strong>
            </article>
            <article className="decision-stat-card">
              <span>Drafted</span>
              <strong>{summary.Drafted}</strong>
            </article>
            <article className="decision-stat-card">
              <span>Accepted</span>
              <strong>{summary.Accepted}</strong>
            </article>
            <article className="decision-stat-card">
              <span>Deferred</span>
              <strong>{summary.Deferred}</strong>
            </article>
          </div>

          <div className="decision-filter-row" aria-label="Decision filters">
            {filterOptions.map((filter) => {
              const isActive = filter === decisionFilter
              return (
                <button
                  key={filter}
                  type="button"
                  className={`decision-filter-button ${isActive ? 'decision-filter-button-active' : ''}`}
                  onClick={() => setDecisionFilter(filter)}
                  aria-pressed={isActive}
                >
                  {filter}
                </button>
              )
            })}
          </div>

          <div className="decision-list" aria-label="Decision records">
            {filteredDecisions.map((record) => {
              const isActive = record.issueId === selectedDecision.issueId
              return (
                <button
                  key={record.issueId}
                  type="button"
                  className={`decision-row ${isActive ? 'decision-row-active' : ''}`}
                  onClick={() => setActiveDecisionIssueId(record.issueId)}
                >
                  <span className={`decision-status decision-status-${record.status.toLowerCase()}`}>{record.status}</span>
                  <span className="decision-row-main">
                    <strong>{record.issueTitle}</strong>
                    <span>{record.area} | {record.source} vs {record.comparedWith}</span>
                  </span>
                  <span className="decision-row-meta">
                    <span>{record.owner}</span>
                    <span>{record.updated}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <aside className="workspace-side-panel card decision-detail-panel" aria-label="Selected decision details">
          <div className="sidebar-header">
            <p className="section-label">Selected decision</p>
            <h2>{selectedDecision.issueTitle}</h2>
            <p>{selectedDecision.proposedDecision}</p>
          </div>

          <section className="decision-detail-block">
            <p className="section-label">Decision rationale</p>
            <p>{selectedDecision.rationale}</p>
          </section>

          <dl className="source-meta-list">
            <div>
              <dt>Linked issue</dt>
              <dd>{selectedDecision.issueTitle}</dd>
            </div>
            <div>
              <dt>Decision status</dt>
              <dd>{selectedDecision.status}</dd>
            </div>
            <div>
              <dt>Output impact</dt>
              <dd>{selectedDecision.outputImpact}</dd>
            </div>
            <div>
              <dt>Audit state</dt>
              <dd>{selectedDecision.auditState}</dd>
            </div>
          </dl>

          <div className="decision-detail-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setDecisionStatus('Drafted')}
              disabled={selectedDecision.status === 'Drafted' || selectedDecision.status === 'Accepted'}
            >
              Set as drafted
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setDecisionStatus('Accepted')}
              disabled={selectedDecision.status === 'Accepted'}
            >
              Accept decision
            </button>
            <button type="button" className="secondary-button" onClick={() => setActiveProcessStep('Review')}>
              Back to Review
            </button>
          </div>
        </aside>
      </section>
    )
  }

  const renderOutputStep = () => {
    const decisionRows = decisionRecords.map((record) => ({
      ...record,
      status: resolveDecisionStatus(record, issueDecisionStates, decisionStatuses),
    }))

    const outputRows = outputItems.map((item) => {
      const linkedDecision = item.linkedIssueId
        ? decisionRows.find((record) => record.issueId === item.linkedIssueId)
        : undefined

      const derivedStatus = getOutputStatusFromDecision(linkedDecision?.status)

      return {
        ...item,
        linkedDecision,
        status: outputStatuses[item.id] ?? derivedStatus,
      }
    })

    const filteredOutputItems = outputRows.filter((item) => {
      if (outputFilter === 'All') return true
      if (outputFilter === 'Not persisted') return item.auditState === 'Not persisted'
      return item.status === outputFilter
    })

    const selectedOutputItem =
      filteredOutputItems.find((item) => item.id === activeOutputItemId) ??
      filteredOutputItems[0] ??
      outputRows.find((item) => item.id === activeOutputItemId) ??
      outputRows[0]

    const summary = outputRows.reduce(
      (acc, item) => {
        if (item.status === 'Ready') acc.ready += 1
        if (item.status === 'Blocked') acc.blocked += 1
        if (item.linkedDecision) acc.decisionLinked += 1
        if (item.auditState === 'Not persisted') acc.notPersisted += 1
        return acc
      },
      { ready: 0, blocked: 0, decisionLinked: 0, notPersisted: 0 },
    )

    const filterOptions: OutputFilter[] = ['All', 'Ready', 'Blocked', 'Needs decision', 'Not persisted']
    const linkedDecisionLabel = selectedOutputItem.linkedDecision
      ? `${selectedOutputItem.linkedDecision.issueTitle} (${selectedOutputItem.linkedDecision.status})`
      : 'No accepted decision'
    const canPrepareOutput = selectedOutputItem.linkedDecision?.status === 'Accepted'
    const readinessText =
      selectedOutputItem.status === 'Ready'
        ? 'Ready to include in the output artifact.'
        : selectedOutputItem.status === 'Blocked'
          ? 'Blocked from output until the decision changes.'
          : selectedOutputItem.status === 'Needs decision'
            ? 'Waiting for an accepted decision before output can be prepared.'
            : 'Output item is not persisted and has no settled decision basis yet.'
    const selectedAuditEvent =
      auditEvents.find((event) => event.id === activeAuditEventId) ??
      auditEvents[0]
    const auditSummary = auditEvents.reduce(
      (acc, event) => {
        acc.events += 1
        if (event.state === 'Not persisted') acc.notPersisted += 1
        if (event.type === 'Decision') acc.decisionChanges += 1
        if (event.type === 'Output') acc.outputChanges += 1
        return acc
      },
      { events: 0, notPersisted: 0, decisionChanges: 0, outputChanges: 0 },
    )

    const prepareOutput = () => {
      if (!canPrepareOutput) return

      setOutputStatuses((current) => ({
        ...current,
        [selectedOutputItem.id]: 'Ready',
      }))
    }

    return (
      <>
        <section className="output-workspace-grid">
          <section className="workspace-main card output-workspace-main">
            <div className="output-workspace-header">
              <div>
                <p className="section-label">Output</p>
                <h3>Output workspace</h3>
                <p>Readiness view for artifacts that can be produced from the current review and decision state.</p>
              </div>
            <div className="output-workspace-context">
              <span className="meta-chip">Review: {selectedReview?.intelModel}</span>
              <span className="meta-chip">Output items: {outputRows.length}</span>
            </div>
          </div>

          <div className="output-stat-grid" aria-label="Output readiness summary">
            <article className="output-stat-card">
              <span>Ready items</span>
              <strong>{summary.ready}</strong>
              </article>
              <article className="output-stat-card">
                <span>Blocked</span>
                <strong>{summary.blocked}</strong>
              </article>
              <article className="output-stat-card">
                <span>Decision-linked</span>
                <strong>{summary.decisionLinked}</strong>
              </article>
              <article className="output-stat-card">
                <span>Not persisted</span>
                <strong>{summary.notPersisted}</strong>
              </article>
            </div>

            <div className="output-filter-row" aria-label="Output filters">
              {filterOptions.map((filter) => {
                const isActive = filter === outputFilter
                return (
                  <button
                    key={filter}
                    type="button"
                    className={`output-filter-button ${isActive ? 'output-filter-button-active' : ''}`}
                    onClick={() => setOutputFilter(filter)}
                    aria-pressed={isActive}
                  >
                    {filter}
                  </button>
                )
              })}
            </div>

            <div className="output-list" aria-label="Output items">
              {filteredOutputItems.map((item) => {
                const isActive = item.id === selectedOutputItem.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`output-row ${isActive ? 'output-row-active' : ''}`}
                    onClick={() => setActiveOutputItemId(item.id)}
                  >
                    <span className={`output-status output-status-${item.status.toLowerCase().replace(/\s+/g, '-')}`}>{item.status}</span>
                    <span className="output-row-main">
                      <strong>{item.title}</strong>
                      <span>{item.area} | {item.artifactRole}</span>
                    </span>
                    <span className="output-row-meta">
                      <span>{item.outputImpact}</span>
                      <span>{item.owner}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          <aside className="workspace-side-panel card output-detail-panel" aria-label="Selected output item details">
            <div className="sidebar-header">
              <p className="section-label">Selected output</p>
              <h2>{selectedOutputItem.title}</h2>
              <p>{selectedOutputItem.description}</p>
            </div>

            <section className="output-readiness" aria-label="Output readiness">
              <p className="section-label">Output readiness</p>
              <h3>{selectedOutputItem.status}</h3>
              <p>{readinessText}</p>
            </section>

            <dl className="source-meta-list">
              <div>
                <dt>Linked decision</dt>
                <dd>{linkedDecisionLabel}</dd>
              </div>
              <div>
                <dt>Output status</dt>
                <dd>{selectedOutputItem.status}</dd>
              </div>
              <div>
                <dt>Source basis</dt>
                <dd>{selectedOutputItem.sourceBasis}</dd>
              </div>
              <div>
                <dt>Readiness</dt>
                <dd>{readinessText}</dd>
              </div>
              <div>
                <dt>Audit state</dt>
                <dd>{selectedOutputItem.auditState}</dd>
              </div>
            </dl>

            <div className="output-detail-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={prepareOutput}
                disabled={selectedOutputItem.status === 'Ready' || !canPrepareOutput}
              >
                Prepare output
              </button>
              <button type="button" className="secondary-button" onClick={() => setActiveProcessStep('Decisions')}>
                Back to Decisions
              </button>
            </div>
          </aside>
        </section>

        <section className="card audit-preview" aria-label="History and audit preview">
          <div className="audit-preview-header">
            <div>
              <p className="section-label">History / Audit</p>
              <h3>Audit preview</h3>
              <p>This preview shows the kind of trace the workflow will need once persistence is added.</p>
            </div>
            <div className="audit-preview-context">
              <span className="meta-chip">Events: {auditSummary.events}</span>
              <span className="meta-chip">Mode: Preview only</span>
            </div>
          </div>

          <div className="audit-stat-grid" aria-label="Audit preview summary">
            <article className="audit-stat-card">
              <span>Events</span>
              <strong>{auditSummary.events}</strong>
            </article>
            <article className="audit-stat-card">
              <span>Not persisted</span>
              <strong>{auditSummary.notPersisted}</strong>
            </article>
            <article className="audit-stat-card">
              <span>Decision changes</span>
              <strong>{auditSummary.decisionChanges}</strong>
            </article>
            <article className="audit-stat-card">
              <span>Output changes</span>
              <strong>{auditSummary.outputChanges}</strong>
            </article>
          </div>

          <div className="audit-preview-grid">
            <div className="audit-event-list" aria-label="Audit events">
              {auditEvents.map((event) => {
                const isActive = event.id === selectedAuditEvent.id
                return (
                  <button
                    key={event.id}
                    type="button"
                    className={`audit-event-row ${isActive ? 'audit-event-row-active' : ''}`}
                    onClick={() => setActiveAuditEventId(event.id)}
                  >
                    <span className={`audit-event-type audit-event-type-${event.type.toLowerCase()}`}>{event.type}</span>
                    <span className="audit-event-main">
                      <strong>{event.title}</strong>
                      <span>{event.relatedTo}</span>
                    </span>
                    <span className="audit-event-meta">
                      <span>{event.actor}</span>
                      <span>{event.timestamp}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            <aside className="audit-event-detail" aria-label="Selected audit event detail">
              <p className="section-label">Selected event</p>
              <h3>{selectedAuditEvent.title}</h3>
              <p>{selectedAuditEvent.summary}</p>
              <dl className="source-meta-list">
                <div>
                  <dt>Related to</dt>
                  <dd>{selectedAuditEvent.relatedTo}</dd>
                </div>
                <div>
                  <dt>Actor</dt>
                  <dd>{selectedAuditEvent.actor}</dd>
                </div>
                <div>
                  <dt>State</dt>
                  <dd>{selectedAuditEvent.state}</dd>
                </div>
                <div>
                  <dt>Detail</dt>
                  <dd>{selectedAuditEvent.detail}</dd>
                </div>
              </dl>
            </aside>
          </div>
        </section>
      </>
    )
  }

  const renderValidationStep = () => {
    const validationRows = sourceDefinitions.map((source) => ({
      id: source.id,
      name: source.name,
      ...(validationStatesBySource[source.name] ?? { state: 'Not checked' as ValidationState, message: 'Validation has not been run yet.' }),
    }))

    const summary = validationRows.reduce(
      (acc, row) => {
        acc[row.state] += 1
        return acc
      },
      { Valid: 0, Warning: 0, Error: 0, 'Not checked': 0 } as Record<ValidationState, number>,
    )

    return (
      <section className="workspace-main-grid">
        <section className="workspace-main card">
          <div className="workspace-card workspace-card-single">
            <div className="workspace-copy">
              <p className="section-label">Validation</p>
              <h3>Validation status</h3>
              <p>This screen checks whether connected sources are ready for the next steps.</p>
            </div>

            <div className="stats-grid" style={{ marginBottom: 20 }}>
              <article className="stat-card">
                <span>Valid</span>
                <strong>{summary['Valid']}</strong>
              </article>
              <article className="stat-card">
                <span>Warning</span>
                <strong>{summary['Warning']}</strong>
              </article>
              <article className="stat-card">
                <span>Error</span>
                <strong>{summary['Error']}</strong>
              </article>
              <article className="stat-card">
                <span>Not checked</span>
                <strong>{summary['Not checked']}</strong>
              </article>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {validationRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      <td>
                        <span className={validationStateClassName[row.state]}>{row.state}</span>
                      </td>
                      <td>{row.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <aside className="workspace-side-panel card" aria-label="Validation summary">
          <div className="sidebar-header">
            <p className="section-label">Step</p>
            <h2>Validation</h2>
            <p>Quick summary of source readiness for this review.</p>
          </div>

          <dl className="source-meta-list">
            <div>
              <dt>Project</dt>
              <dd>{selectedReview?.intelModel}</dd>
            </div>
            <div>
              <dt>Total sources</dt>
              <dd>{validationRows.length}</dd>
            </div>
            <div>
              <dt>Ready to continue</dt>
              <dd>{summary.Error === 0 ? 'Yes' : 'No'}</dd>
            </div>
          </dl>

          <div className="activity-feed" style={{ marginTop: 20 }}>
            <article className="activity-item">
              <strong>Next action</strong>
              <p>{summary.Error > 0 ? 'Fix source errors before moving forward.' : 'Validation can move forward.'}</p>
            </article>
          </div>
        </aside>
      </section>
    )
  }

  if (appView === 'settings-sources') {
    return (
      <div className="app-shell">
        <header className="page-header page-header-row">
          <div>
            <p className="eyebrow">Semi Panels Hub</p>
            <h1>Settings / Sources</h1>
            <p className="page-subtitle">One global source library for the whole app. Define once, reuse in all projects.</p>
          </div>
          <div className="header-actions">
            <button type="button" className="header-button" onClick={() => setAppView('dashboard')}>
              ← Dashboard
            </button>
          </div>
        </header>

        <main className="page-content settings-layout">
          <section className="card settings-intro-card">
            <div className="settings-intro-grid">
              <div>
                <p className="section-label">Global library</p>
                <h3>Sources are configured here only once</h3>
                <p className="helper-text">
                  Excel, PDF, SQL and other sources will live here. Projects will only create connections to these global items.
                </p>
              </div>
              <div className="settings-note-box">
                <strong>Important</strong>
                <span>Connections in projects use this shared source library. No repeated local file picking per project.</span>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Type</th>
                    <th>Location</th>
                    <th>Scope</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sourceDefinitions.map((source) => (
                    <tr key={source.id}>
                      <td>{source.name}</td>
                      <td>{source.type}</td>
                      <td>{source.location}</td>
                      <td>{source.scope}</td>
                      <td>
                        <button type="button" className="table-action">
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    )
  }

  if (appView === 'review-editor' && selectedReview) {
    const statusDefaultStep = activeStepByStatus[selectedReview.status]
    const currentProcessStep = activeProcessStep ?? statusDefaultStep
    const nextStep = nextStepByProcess[currentProcessStep]
    const purposeContent = stepPurposeContent[currentProcessStep]
    const activeStageInfo = stageDescriptions[activeMainStage]
    const currentScope = activeMainStage === 'BOM' ? `BOM / ${activeBomStage}` : activeMainStage
    const isMainStep = currentProcessStep === 'Main'

    const allConnectionSections = [
      ...connectionTree.BOM,
      ...connectionTree.Documentation,
      ...connectionTree.Costing,
    ]
    const activeConnectionSections = allConnectionSections
    const activeConnectionCards = sourceCardTemplates[activeConnectionNodeId] ?? []
    const activeConnectionSection = allConnectionSections.find(
      (section) => section.items?.some((item) => item.id === activeConnectionNodeId) || section.id === activeConnectionNodeId,
    )
    const activeConnectionLabel = activeConnectionSection?.items?.find((item) => item.id === activeConnectionNodeId)?.label ?? activeConnectionSection?.label ?? 'Stage'
    const activeConnectionMainLabel = activeConnectionSection?.label ?? 'BOM'

    return (
      <div className="editor-shell">
        <aside className="review-sidebar">
          <div className="review-sidebar-top">
            <div className="review-brand">
              <BrandGlyph className="review-brand-icon" />
              <div>
                <p className="review-brand-name">Semi Panels Hub v2</p>
                <p className="review-brand-subtitle">Review workspace</p>
              </div>
            </div>

            <div className="review-project-chip">
              <span className="review-project-label">Current review</span>
              <strong>{selectedReview.intelModel}</strong>
            </div>

            <button type="button" className="sidebar-dashboard-link" onClick={() => setAppView('dashboard')}>
              ← Dashboard
            </button>
          </div>

          <nav className="review-nav" aria-label="Review process">
            {sidebarSteps.map(({ step, label, icon }) => {
              const isActive = step === currentProcessStep
              return (
                <button
                  key={step}
                  type="button"
                  className={`review-nav-item ${isActive ? 'review-nav-item-active' : ''}`}
                  onClick={() => setActiveProcessStep(step)}
                >
                  <span className="review-nav-icon-wrap" aria-hidden="true">
                    <SidebarGlyph name={icon} className="review-nav-icon" />
                  </span>
                  <span className="review-nav-label">{label}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        <main className="editor-workspace">
          <style>{connectionsCustomStyles}</style>
          <header className="workspace-header card">
            <div>
              <p className="eyebrow">Admin project edit</p>
              <h1>{selectedReview.intelModel}</h1>
              <p className="page-subtitle">Left side = review flow. Right side = current selected screen.</p>
            </div>
            <div className="header-meta">
              <span className={statusClassName[selectedReview.status]}>{selectedReview.status}</span>
              <span className="meta-chip">Owner: {selectedReview.owner}</span>
              <span className="meta-chip">Updated: {selectedReview.lastUpdated}</span>
            </div>
          </header>

          {isMainStep ? (
            <section className="workspace-main-grid">
              <section className="workspace-main card">
                <div className="stage-tabs" role="tablist" aria-label="Main project stages">
                  {mainStages.map((stage, index) => {
                    const isActive = activeMainStage === stage
                    return (
                      <button
                        key={stage}
                        type="button"
                        className={`stage-tab ${isActive ? 'stage-tab-active' : ''}`}
                        onClick={() => {
                          setActiveMainStage(stage)
                          const nextSection = connectionTree[stage][0]
                          const nextItemId = nextSection.items?.[0]?.id ?? nextSection.id
                          setActiveConnectionNodeId(nextItemId)
                        }}
                        aria-pressed={isActive}
                      >
                        <span className="stage-tab-index">[{index + 1}. {stage}]</span>
                        {isActive ? <span className="stage-tab-badge">Active</span> : null}
                      </button>
                    )
                  })}
                </div>

                {activeMainStage === 'BOM' ? (
                  <div className="substage-tabs" role="tablist" aria-label="BOM sections">
                    {bomStages.map((stage) => {
                      const isActive = activeBomStage === stage
                      return (
                        <button
                          key={stage}
                          type="button"
                          className={`substage-tab ${isActive ? 'substage-tab-active' : ''}`}
                          onClick={() => {
                          setActiveBomStage(stage)
                          setActiveConnectionNodeId(stage.toLowerCase() === 'matvar' ? 'matvar' : stage.toLowerCase())
                        }}
                          aria-pressed={isActive}
                        >
                          [{stage}]
                          {isActive ? <span className="substage-tab-badge">Active</span> : null}
                        </button>
                      )
                    })}
                  </div>
                ) : null}

                <div className="workspace-card">
                  <div className="workspace-copy">
                    <p className="section-label">{currentScope}</p>
                    <h3>{activeStageInfo.title}</h3>
                    <p>{activeStageInfo.description}</p>
                  </div>

                  <div className="workspace-placeholder">
                    <div className="placeholder-box">
                      <span className="placeholder-title">Main edit area</span>
                      <span className="placeholder-text">This right-side heart of the screen will grow from this skeleton.</span>
                    </div>
                  </div>
                </div>
              </section>

              <aside className="workspace-side-panel card" aria-label="Context panel">
                <div className="sidebar-header">
                  <p className="section-label">Connection</p>
                  <h2>{activeStageInfo.connectionTitle}</h2>
                  <p>Projects do not create new sources here. They only connect to global sources from Settings.</p>
                </div>

                <div className="source-panel-placeholder">
                  <div className="source-icon">CN</div>
                  <div>
                    <h3>Connection panel placeholder</h3>
                    <p>Later we will map global sources to BOM, Documentation and Costing areas from this panel.</p>
                  </div>
                </div>

                <dl className="source-meta-list">
                  <div>
                    <dt>Review step</dt>
                    <dd>{currentProcessStep}</dd>
                  </div>
                  <div>
                    <dt>Scope</dt>
                    <dd>{currentScope}</dd>
                  </div>
                  <div>
                    <dt>Project</dt>
                    <dd>{selectedReview.intelModel}</dd>
                  </div>
                  <div>
                    <dt>Source mode</dt>
                    <dd>Global shared library</dd>
                  </div>
                </dl>
              </aside>
            </section>
          ) : currentProcessStep === 'Connections' ? (
            <section className="workspace-main-grid">
              <section className="workspace-main card connections-stage">
                <div className="connections-layout">
                  <aside className="connections-tree" aria-label="Connection groups">
                    {activeConnectionSections.map((section) => {
                      const sectionActive = section.items?.some((item) => item.id === activeConnectionNodeId) ?? section.id === activeConnectionNodeId
                      return (
                        <div key={section.id} className={`connection-group ${sectionActive ? 'connection-group-active' : ''}`}>
                          <button type="button" className="connection-group-header">
                            <span className="connection-group-arrow">⌄</span>
                            <span className="connection-group-ring" aria-hidden="true" />
                            <span className="connection-group-title">[{section.label}]</span>
                            <span className={`connection-group-dot ${sectionActive ? 'connection-group-dot-active' : ''}`} aria-hidden="true" />
                          </button>

                          {section.items?.length ? (
                            <div className="connection-group-items">
                              {section.items.map((item) => {
                                const itemActive = item.id === activeConnectionNodeId
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    className={`connection-item ${itemActive ? 'connection-item-active' : ''}`}
                                    onClick={() => {
                                      setActiveConnectionNodeId(item.id)
                                      if (activeMainStage === 'BOM') {
                                        if (item.id === 'matvar') setActiveBomStage('MATVAR')
                                        if (item.id === 'l1') setActiveBomStage('L1')
                                        if (item.id === 'l2') setActiveBomStage('L2')
                                        if (item.id === 'l3') setActiveBomStage('L3')
                                      }
                                    }}
                                  >
                                    <span className="connection-item-branch" aria-hidden="true" />
                                    <span className="connection-item-label">[{item.label}]</span>
                                    <span className={`connection-item-state ${itemActive ? 'connection-item-state-active' : ''}`} aria-hidden="true" />
                                  </button>
                                )
                              })}
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </aside>

                  <section className="connections-content">
                    <div className="connections-header">
                      <div>
                        <p className="section-label">Connections</p>
                        <h3>Connection configuration for: {activeConnectionMainLabel} &gt; {activeConnectionLabel}</h3>
                        <p>Left side shows the heart of the app. Right side lets you choose which sources belong to the selected stage.</p>
                      </div>
                    </div>

                    <div className="connections-card-wrap">
                      <p className="section-label">Active data connections</p>
                      <div className="connections-card-grid">
                        {activeConnectionCards.map((card) => (
                          <article key={card.id} className="connection-source-card">
                            <div className="connection-source-top">
                              <div className="connection-source-brand">
                                <div className={`connection-source-icon connection-source-icon-${card.status.toLowerCase().replace(/\s+/g, '-')}`} />
                                <div>
                                  <h4>{card.title}</h4>
                                  <p>{card.subtitle}</p>
                                </div>
                              </div>
                              <button type="button" className="connection-source-menu">⋮</button>
                            </div>

                            <dl className="connection-source-meta">
                              <div>
                                <dt>{card.line1Label}:</dt>
                                <dd>{card.line1Value}</dd>
                              </div>
                              <div>
                                <dt>{card.line2Label}:</dt>
                                <dd>{card.line2Value}</dd>
                              </div>
                              <div>
                                <dt>Status:</dt>
                                <dd className={`connection-source-status connection-source-status-${card.status.toLowerCase().replace(/\s+/g, '-')}`}>
                                  <span className="connection-source-status-dot" />
                                  {card.status}
                                </dd>
                              </div>
                            </dl>

                            <div className="connection-source-actions">
                              <select className="connection-source-select" defaultValue={card.line1Value === 'Not selected' ? '' : card.line1Value}>
                                <option value="">Choose source</option>
                                {sourceDefinitions.map((source) => (
                                  <option key={source.id} value={source.name}>
                                    {source.name}
                                  </option>
                                ))}
                              </select>
                              <div className="connection-source-buttons">
                                <button type="button" className="table-action">Edit</button>
                                <button type="button" className="table-action">Disconnect</button>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  </section>
                </div>
              </section>

              <aside className="workspace-side-panel card" aria-label="Context panel">
                <div className="sidebar-header">
                  <p className="section-label">Step</p>
                  <h2>Connections</h2>
                  <p>Use the left side to choose the real stage. Use the right side to decide which sources belong there.</p>
                </div>

                <dl className="source-meta-list">
                  <div>
                    <dt>Selected area</dt>
                    <dd>{activeMainStage}</dd>
                  </div>
                  <div>
                    <dt>Selected stage</dt>
                    <dd>{activeConnectionLabel}</dd>
                  </div>
                  <div>
                    <dt>Available sources</dt>
                    <dd>{sourceDefinitions.length}</dd>
                  </div>
                  <div>
                    <dt>Mode</dt>
                    <dd>Manual source assignment</dd>
                  </div>
                </dl>
              </aside>
            </section>
          ) : currentProcessStep === 'Validation' ? (
            renderValidationStep()
          ) : currentProcessStep === 'Normalization' ? (
            renderSourceNamesStep('Normalization', 'Ekran normalizacji', 'Ten etap będzie przygotowywać jeden wspólny model danych ze wszystkich źródeł.', 'Oczekuje')
          ) : currentProcessStep === 'Comparison' ? (
            renderComparisonStep()
          ) : currentProcessStep === 'Review' ? (
            renderReviewStep()
          ) : currentProcessStep === 'Decisions' ? (
            renderDecisionsStep()
          ) : (
            renderOutputStep()
          )}

          <section className="stage-purpose-card card" aria-label="Step purpose">
            <div className="stage-purpose-header">
              <div>
                <p className="section-label">{purposeContent.eyebrow}</p>
                <h3>{purposeContent.title}</h3>
              </div>
            </div>

            <p className="stage-purpose-summary">{purposeContent.summary}</p>

            <div className="stage-purpose-grid">
              <article className="stage-purpose-item">
                <span>Cel etapu</span>
                <p>{purposeContent.goal}</p>
              </article>
              <article className="stage-purpose-item">
                <span>Rola etapu w aplikacji</span>
                <p>{purposeContent.function}</p>
              </article>
              <article className="stage-purpose-item">
                <span>Twoja rola</span>
                <p>{purposeContent.yourRole}</p>
              </article>
              <article className="stage-purpose-item">
                <span>Przykład w praktyce</span>
                <p>{purposeContent.example}</p>
              </article>
              <article className="stage-purpose-item">
                <span>Efekt etapu</span>
                <p>{purposeContent.output}</p>
              </article>
              <article className="stage-purpose-item stage-purpose-item-next">
                <span>Co dalej</span>
                <p>{nextStep.description}</p>
              </article>
            </div>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="page-header page-header-row">
        <div>
          <p className="eyebrow">Semi Panels Hub</p>
          <h1>Dashboard</h1>
          <p className="page-subtitle">Review list with admin entry point to project edit mode.</p>
        </div>

        <div className="header-actions">
          <button type="button" className="header-button" onClick={() => setAppView('settings-sources')}>
            Settings
          </button>
        </div>
      </header>

      <main className="page-content">
        <section className="card" aria-label="Review list">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Intel Model</th>
                  <th>Status</th>
                  <th>Owner</th>
                  <th>Last updated</th>
                  {isAdmin ? <th>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {dashboardRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.intelModel}</td>
                    <td>
                      <span className={statusClassName[row.status]}>{row.status}</span>
                    </td>
                    <td>{row.owner}</td>
                    <td>{row.lastUpdated}</td>
                    {isAdmin ? (
                      <td>
                        <button type="button" className="table-action" onClick={() => openReview(row.id)}>
                          Edit
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
