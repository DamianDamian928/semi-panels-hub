import type { ReactNode, SVGProps } from 'react'
import type {
  BomStage,
  ConnectionCard,
  ConnectionTarget,
  ConnectionTreeSection,
  MainStage,
  ReviewStatus,
  SidebarIconName,
  SidebarStepDefinition,
  ValidationState,
} from '../types'

export const validationStateClassName: Record<ValidationState, string> = {
  Valid: 'status status-completed',
  Warning: 'status status-progress',
  Error: 'status status-draft',
  'Not checked': 'status',
}

export const statusClassName: Record<ReviewStatus, string> = {
  Draft: 'status status-draft',
  'In progress': 'status status-progress',
  Completed: 'status status-completed',
}

export const mainStages: MainStage[] = ['BOM', 'Documentation', 'Costing']
export const bomStages: BomStage[] = ['MATVAR', 'L1', 'L2', 'L3']

export const sidebarSteps: SidebarStepDefinition[] = [
  { step: 'Main', label: 'Main', icon: 'main' },
  { step: 'Sources', label: 'Sources', icon: 'sources' },
  { step: 'Connections', label: 'Connections', icon: 'connections' },
  { step: 'Mapping', label: 'Mapping', icon: 'mapping' },
  { step: 'Validation', label: 'Validation', icon: 'validation' },
  { step: 'Normalization', label: 'Normalization', icon: 'normalization' },
  { step: 'Comparison', label: 'Comparison', icon: 'comparison' },
  { step: 'Review', label: 'Review', icon: 'review' },
  { step: 'Decisions', label: 'Decisions', icon: 'decisions' },
  { step: 'Output', label: 'Output', icon: 'output' },
  { step: 'AI Assistant', label: 'AI Assistant', icon: 'aiAssistant' },
]

export const connectionTree: Record<MainStage, ConnectionTreeSection[]> = {
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

export const connectionTargets: ConnectionTarget[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    group: 'Dashboard',
    description: 'Project-level context and summary inputs.',
  },
  {
    id: 'bom-matvar',
    label: 'BOM Matvar',
    group: 'BOM',
    description: 'MATVAR source set used before BOM level checks.',
  },
  {
    id: 'bom-l1',
    label: 'BOM L1',
    group: 'BOM',
    description: 'Level L1 BOM comparison sources.',
  },
  {
    id: 'bom-l2',
    label: 'BOM L2',
    group: 'BOM',
    description: 'Level L2 BOM comparison sources.',
  },
  {
    id: 'bom-l3',
    label: 'BOM L3',
    group: 'BOM',
    description: 'Level L3 BOM comparison sources.',
  },
  {
    id: 'documentation',
    label: 'Documentation',
    group: 'Documentation',
    description: 'Document repositories and package references.',
  },
  {
    id: 'costing',
    label: 'Costing',
    group: 'Costing',
    description: 'Cost and production data sources.',
  },
]

export function SidebarGlyph({ name, className, ...props }: { name: SidebarIconName; className?: string } & SVGProps<SVGSVGElement>) {
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
    sources: (
      <>
        <path d="M5 6.5c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3Z" />
        <path d="M5 6.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
        <path d="M5 11.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
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
    mapping: (
      <>
        <path d="M5 6h14" />
        <path d="M5 12h14" />
        <path d="M5 18h14" />
        <path d="M8 4v16" />
        <path d="M14 4v16" />
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
    aiAssistant: (
      <>
        <path d="M12 3.5 13.4 8l4.4 1.4-4.4 1.4L12 15.5l-1.4-4.7-4.4-1.4L10.6 8 12 3.5Z" />
        <path d="M18 14.5 18.8 17l2.2.8-2.2.8L18 21l-.8-2.4-2.2-.8 2.2-.8.8-2.5Z" />
        <path d="M6.5 15.5 7 17l1.5.5L7 18l-.5 1.5L6 18l-1.5-.5L6 17l.5-1.5Z" />
      </>
    ),
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} {...props}>
      <g {...common}>{glyphs[name]}</g>
    </svg>
  )
}

export function BrandGlyph(props: SVGProps<SVGSVGElement>) {
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

export function SourceTypeGlyph({ type, className, ...props }: { type: string; className?: string } & SVGProps<SVGSVGElement>) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  const glyph =
    type === 'Folder' ? (
      <>
        <path d="M3.5 7.5h6l1.7 2h9.3v8.2a2.3 2.3 0 0 1-2.3 2.3H5.8a2.3 2.3 0 0 1-2.3-2.3V7.5Z" />
        <path d="M3.5 9.5h17" />
      </>
    ) : type === 'SQL' ? (
      <>
        <path d="M5 6.5c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3Z" />
        <path d="M5 6.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
        <path d="M5 11.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
      </>
    ) : type === 'SharePoint' ? (
      <>
        <path d="M8 7.5a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
        <path d="M17 13a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
        <path d="M8 22.5a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
        <path d="m10.5 6.8 4 2.2" />
        <path d="m14.4 12.1-4 5.2" />
      </>
    ) : type === 'Manual export' ? (
      <>
        <path d="M12 3v10" />
        <path d="m8 9 4 4 4-4" />
        <path d="M5 17h14" />
        <path d="M7 21h10" />
      </>
    ) : (
      <>
        <path d="M6.5 3.5h11a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" />
        <path d="M4.5 8.5h15" />
        <path d="M4.5 13h15" />
        <path d="M9.5 8.5v12" />
        <path d="M14.5 8.5v12" />
        <path d="m8.2 6.1 1.6-1.7" />
        <path d="m8.2 4.4 1.6 1.7" />
      </>
    )

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} {...props}>
      <g {...common}>{glyph}</g>
    </svg>
  )
}

export const sourceCardTemplates: Record<string, ConnectionCard[]> = {
  matvar: [
    { id: 'fishbowl', title: 'Fishbowl', subtitle: 'Selected source', line1Label: 'Source', line1Value: 'Fishbowl', line2Label: 'Mode', line2Value: 'Connected', status: 'Connected' },
    { id: 'parts-bom', title: 'Parts&BOM', subtitle: 'Selected source', line1Label: 'Source', line1Value: 'Parts&BOM', line2Label: 'Mode', line2Value: 'Connected', status: 'Connected' },
    { id: 'empty-a', title: 'Choose source', subtitle: 'Empty slot', line1Label: 'Source', line1Value: 'Not selected', line2Label: 'Mode', line2Value: 'Waiting', status: 'Not connected' },
  ],
  l1: [
    { id: 'fishbowl-l1', title: 'Fishbowl', subtitle: 'Selected source', line1Label: 'Source', line1Value: 'Fishbowl', line2Label: 'Mode', line2Value: 'Connected', status: 'Connected' },
    { id: 'plm-sql-l1', title: 'PLM SQL connection', subtitle: 'Selected source', line1Label: 'Source', line1Value: 'PLM SQL connection', line2Label: 'Mode', line2Value: 'Connecting', status: 'Connecting' },
    { id: 'empty-b', title: 'Choose source', subtitle: 'Empty slot', line1Label: 'Source', line1Value: 'Not selected', line2Label: 'Mode', line2Value: 'Waiting', status: 'Not connected' },
  ],
  l2: [
    { id: 'mass-production-l2', title: 'Mass Production', subtitle: 'Selected source', line1Label: 'Source', line1Value: 'Mass Production', line2Label: 'Mode', line2Value: 'Connected', status: 'Connected' },
    { id: 'parts-bom-l2', title: 'Parts&BOM', subtitle: 'Selected source', line1Label: 'Source', line1Value: 'Parts&BOM', line2Label: 'Mode', line2Value: 'Connected', status: 'Connected' },
  ],
  l3: [
    { id: 'plm-sql-l3', title: 'PLM SQL connection', subtitle: 'Selected source', line1Label: 'Source', line1Value: 'PLM SQL connection', line2Label: 'Mode', line2Value: 'Connected', status: 'Connected' },
    { id: 'empty-c', title: 'Choose source', subtitle: 'Empty slot', line1Label: 'Source', line1Value: 'Not selected', line2Label: 'Mode', line2Value: 'Waiting', status: 'Not connected' },
  ],
  'box-docs': [
    { id: 'box-doc-card', title: 'BOX documentation', subtitle: 'Selected source', line1Label: 'Source', line1Value: 'BOX documentation', line2Label: 'Mode', line2Value: 'Connected', status: 'Connected' },
    { id: 'empty-doc-a', title: 'Choose source', subtitle: 'Empty slot', line1Label: 'Source', line1Value: 'Not selected', line2Label: 'Mode', line2Value: 'Waiting', status: 'Not connected' },
  ],
  'sharepoint-docs': [
    { id: 'sp-doc-card', title: 'Sharepoint documentation', subtitle: 'Selected source', line1Label: 'Source', line1Value: 'Sharepoint documentation', line2Label: 'Mode', line2Value: 'Connected', status: 'Connected' },
    { id: 'plm-doc-card', title: 'PLM SQL connection', subtitle: 'Selected source', line1Label: 'Source', line1Value: 'PLM SQL connection', line2Label: 'Mode', line2Value: 'Connecting', status: 'Connecting' },
  ],
  'cost-rollup': [
    { id: 'mass-cost', title: 'Mass Production', subtitle: 'Selected source', line1Label: 'Source', line1Value: 'Mass Production', line2Label: 'Mode', line2Value: 'Connected', status: 'Connected' },
  ],
  'cost-review': [
    { id: 'parts-cost', title: 'Parts&BOM', subtitle: 'Selected source', line1Label: 'Source', line1Value: 'Parts&BOM', line2Label: 'Mode', line2Value: 'Connected', status: 'Connected' },
    { id: 'empty-cost', title: 'Choose source', subtitle: 'Empty slot', line1Label: 'Source', line1Value: 'Not selected', line2Label: 'Mode', line2Value: 'Waiting', status: 'Not connected' },
  ],
}

export type EditableConnectionCard = ConnectionCard & {
  selectedFileName?: string
  selectedFilePath?: string
  selectedFileDirectory?: string
  selectedFileExtension?: string
  selectedFileSizeBytes?: number
  selectedFileModifiedAt?: string
  fileSelectionError?: string
  fileSelectionPending?: boolean
}

export type LocalFileSelection = {
  name: string
  path: string
  directory: string
  extension: string
  sizeBytes: number
  modifiedAt: string
}

export const localFileHelperEndpoint = 'http://127.0.0.1:8787/api/local-file-dialog'
export const localFileOpenLocationEndpoint = 'http://127.0.0.1:8787/api/open-local-location'

export const formatFileSize = (sizeBytes: number) => {
  if (sizeBytes < 1024) return `${sizeBytes} B`
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}

export const formatFileModifiedAt = (modifiedAt: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(modifiedAt))

export const connectionsCustomStyles = `
  .connections-workspace-grid { grid-template-columns: minmax(0, 1fr); }
  .connections-stage { padding: 28px; overflow: hidden; }
  .connections-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 22px; }
  .connections-header h3 { margin: 0 0 8px; }
  .connections-header p:last-child { max-width: 760px; margin: 0; color: #9fb4cf; line-height: 1.55; }
  .connection-map { display: grid; grid-template-columns: minmax(220px, 0.85fr) minmax(120px, 0.5fr) minmax(280px, 1.05fr); gap: 14px; min-height: 650px; }
  .connection-map-column { min-width: 0; display: grid; grid-template-rows: auto 1fr; gap: 12px; }
  .connection-map-column-head { min-height: 44px; display: flex; align-items: end; justify-content: space-between; gap: 12px; padding: 0 4px; color: #8ea6c4; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0; }
  .connection-map-column-head strong { color: #ecf5ff; font-size: 13px; text-transform: none; }
  .connection-target-list,
  .connection-source-list { display: grid; gap: 10px; align-content: start; }
  .connection-target-node { min-height: 76px; width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px; border-radius: 8px; border: 1px solid rgba(98,132,173,0.18); background: rgba(9, 19, 32, 0.74); color: #eaf3ff; text-align: left; cursor: pointer; }
  .connection-target-node:hover,
  .connection-target-node-active { border-color: rgba(126, 172, 220, 0.38); background: rgba(22, 34, 48, 0.82); box-shadow: none; }
  .connection-target-node-drop { border-style: dashed; }
  .connection-node-main { min-width: 0; display: grid; gap: 4px; }
  .connection-node-main strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 15px; }
  .connection-node-main small { color: #8ea7c7; font-weight: 800; }
  .connection-node-count { min-width: 24px; display: inline-flex; align-items: center; justify-content: flex-end; color: #b7c7db; font-weight: 800; }
  .connection-canvas { position: relative; min-height: 606px; margin-top: 56px; border-radius: 8px; border: 1px solid rgba(98,132,173,0.14); background: linear-gradient(90deg, rgba(8,18,30,0.32), rgba(13,28,44,0.64), rgba(8,18,30,0.32)); overflow: hidden; }
  .connection-canvas::before { content: ''; position: absolute; inset: 0 50%; width: 1px; background: rgba(103, 184, 255, 0.18); }
  .connection-canvas svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .connection-link-path { fill: none; stroke: rgba(126, 172, 220, 0.24); stroke-width: 0.8; vector-effect: non-scaling-stroke; }
  .connection-link-path-active { stroke: rgba(132, 200, 255, 0.72); stroke-width: 1.5; filter: none; }
  .connection-source-node { min-height: 76px; display: grid; gap: 10px; padding: 13px; border-radius: 8px; border: 1px solid rgba(98,132,173,0.18); background: rgba(10, 20, 33, 0.76); cursor: grab; }
  .connection-source-node:active { cursor: grabbing; }
  .connection-source-node-active { border-color: rgba(106, 211, 149, 0.5); background: rgba(16, 41, 37, 0.48); box-shadow: none; }
  .connection-source-node-top { min-width: 0; display: grid; grid-template-columns: 32px minmax(0, 1fr); gap: 10px; align-items: center; }
  .connection-source-node-top h4 { margin: 0 0 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #f4f9ff; font-size: 14px; }
  .connection-source-node-top p { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #8ea7c7; font-size: 12px; }
  .connection-source-node-meta { display: flex; align-items: center; justify-content: space-between; gap: 10px; color: #9fb4cf; font-size: 12px; }
  .connection-node-action { min-height: 34px; width: 100%; border-radius: 8px; border: 1px solid rgba(97,155,244,0.32); background: rgba(8,29,56,0.74); color: #e7f2ff; font-weight: 800; cursor: pointer; }
  .connection-node-action:hover { border-color: rgba(119, 190, 255, 0.68); background: rgba(16, 48, 84, 0.86); }
  .connection-node-action-remove { border-color: rgba(255,138,122,0.28); background: rgba(69, 30, 31, 0.54); color: #ffbfaf; }
  .connections-empty-state { min-height: 160px; display: grid; place-items: center; gap: 10px; padding: 24px; border-radius: 8px; border: 1px dashed rgba(96,154,230,0.35); background: rgba(9, 21, 36, 0.68); text-align: center; }
  .connections-empty-state h4 { margin: 0; font-size: 16px; color: #f7fbff; }
  .connections-empty-state p { margin: 0; color: #9eb6d3; line-height: 1.55; }
  @media (max-width: 1280px) { .connection-map { grid-template-columns: minmax(220px, 0.9fr) minmax(90px, 0.32fr) minmax(250px, 1fr); } }
  .mapping-workspace-grid { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 20px; align-items: start; }
  .mapping-main { padding: 28px; }
  .mapping-header { margin-bottom: 20px; }
  .mapping-header h3 { margin: 0 0 8px; }
  .mapping-header p:last-child { margin: 0; color: #9fb4cf; line-height: 1.55; }
  .mapping-table-wrap { border: 1px solid rgba(98,132,173,0.18); border-radius: 8px; overflow: hidden; background: rgba(8, 17, 29, 0.52); }
  .mapping-table-head,
  .mapping-row { display: grid; grid-template-columns: minmax(180px, 0.8fr) minmax(260px, 1.25fr) minmax(130px, 0.55fr) minmax(120px, 0.55fr); gap: 14px; align-items: center; }
  .mapping-table-head { padding: 12px 14px; border-bottom: 1px solid rgba(98,132,173,0.16); color: #8ea6c4; font-size: 12px; font-weight: 800; text-transform: uppercase; }
  .mapping-row { width: 100%; min-height: 68px; padding: 12px 14px; border: none; border-bottom: 1px solid rgba(98,132,173,0.12); background: transparent; color: #dbe8f8; text-align: left; }
  .mapping-row:last-child { border-bottom: none; }
  .mapping-row:hover,
  .mapping-row-active { background: rgba(23, 35, 50, 0.72); }
  .mapping-row-connection { min-width: 0; display: block; }
  .mapping-row-source { min-width: 0; display: grid; grid-template-columns: 32px minmax(0, 1fr); gap: 10px; align-items: center; }
  .mapping-row-connection strong,
  .mapping-row-source strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #f4f9ff; }
  .mapping-empty-state { min-height: 180px; display: grid; place-items: center; gap: 8px; padding: 28px; color: #9fb4cf; text-align: center; }
  .mapping-empty-state strong { color: #f4f9ff; }
  .mapping-empty-state p { margin: 0; }
  .mapping-detail-panel { display: grid; gap: 14px; }
  .mapping-selected-summary { display: grid; gap: 8px; padding: 14px; border: 1px solid rgba(98,132,173,0.18); border-radius: 8px; background: rgba(7, 16, 27, 0.42); }
  .mapping-selected-summary strong { color: #f4f9ff; }
  .mapping-selected-summary span,
  .mapping-selected-summary p { margin: 0; color: #9fb4cf; font-size: 13px; overflow-wrap: anywhere; }
  .mapping-studio-overlay { position: fixed; inset: 0; z-index: 80; padding: 24px; background: rgba(3, 8, 14, 0.78); }
  .mapping-studio { height: 100%; display: grid; grid-template-rows: auto auto minmax(0, 1fr) auto; border: 1px solid rgba(126, 149, 180, 0.24); border-radius: 8px; background: #0b1522; box-shadow: 0 24px 80px rgba(0, 0, 0, 0.38); overflow: hidden; }
  .mapping-studio-titlebar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 20px; border-bottom: 1px solid rgba(98,132,173,0.16); background: #101b2a; }
  .mapping-studio-titlebar h2 { margin: 0; font-size: 18px; }
  .mapping-studio-close,
  .mapping-studio-toolbar button,
  .mapping-selected-column button { min-height: 34px; border-radius: 8px; border: 1px solid rgba(126, 149, 180, 0.24); background: rgba(18, 29, 44, 0.94); color: #dbe8f8; font-weight: 800; }
  .mapping-studio-close { padding: 0 14px; }
  .mapping-studio-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 8px 14px; border-bottom: 1px solid rgba(98,132,173,0.14); background: #0d1826; }
  .mapping-studio-toolbar button { padding: 0 12px; }
  .mapping-studio-toolbar label { margin-left: auto; display: flex; align-items: center; gap: 8px; color: #9fb4cf; font-size: 12px; font-weight: 800; }
  .mapping-studio-toolbar input,
  .mapping-selected-column select { min-height: 34px; border-radius: 8px; border: 1px solid rgba(126, 149, 180, 0.24); background: rgba(5, 13, 24, 0.78); color: #eaf3ff; padding: 0 10px; }
  .mapping-studio-body { min-height: 0; display: grid; grid-template-columns: 180px minmax(0, 1fr) 320px; }
  .mapping-studio-sheets,
  .mapping-studio-selection { min-height: 0; display: grid; align-content: start; gap: 8px; padding: 14px; background: #0a1320; overflow: auto; }
  .mapping-studio-sheets { border-right: 1px solid rgba(98,132,173,0.14); }
  .mapping-studio-selection { border-left: 1px solid rgba(98,132,173,0.14); }
  .mapping-studio-sheets > span,
  .mapping-studio-selection > span { color: #8ea6c4; font-size: 12px; font-weight: 900; text-transform: uppercase; }
  .mapping-studio-sheets button { min-height: 38px; border-radius: 8px; border: 1px solid transparent; background: transparent; color: #dbe8f8; text-align: left; font-weight: 800; }
  .mapping-studio-sheets button:hover,
  .mapping-studio-sheet-active { border-color: rgba(126, 149, 180, 0.24); background: rgba(23, 35, 50, 0.72); }
  .mapping-studio-grid-wrap { min-width: 0; min-height: 0; overflow: auto; background: #08111d; }
  .mapping-studio-grid { width: max-content; min-width: 100%; display: grid; align-content: start; }
  .mapping-studio-grid-header,
  .mapping-studio-grid-row { display: grid; }
  .mapping-studio-grid-header { position: sticky; top: 0; z-index: 1; background: #111d2c; }
  .mapping-studio-grid-header button,
  .mapping-studio-grid-row span { display: block; min-width: 0; padding: 8px 10px; border: 0; border-right: 1px solid rgba(98,132,173,0.14); border-bottom: 1px solid rgba(98,132,173,0.14); color: #dbe8f8; text-align: left; overflow: hidden; text-overflow: ellipsis; }
  .mapping-studio-grid-header button { min-height: 44px; max-height: 44px; background: transparent; font-size: 12px; font-weight: 900; line-height: 1.25; white-space: normal; }
  .mapping-studio-grid-header button:hover,
  .mapping-preview-column-selected { background: rgba(34, 55, 78, 0.86); }
  .mapping-studio-grid-row span { min-height: 36px; max-height: 36px; color: #c9d8ec; font-size: 13px; line-height: 20px; white-space: nowrap; }
  .mapping-selected-column { display: grid; gap: 10px; padding: 12px; border: 1px solid rgba(98,132,173,0.16); border-radius: 8px; background: rgba(13, 24, 38, 0.84); }
  .mapping-selected-column strong { color: #f4f9ff; overflow-wrap: anywhere; }
  .mapping-selected-column label { display: grid; gap: 5px; color: #9fb4cf; font-size: 12px; font-weight: 800; }
  .mapping-required-check { display: flex !important; grid-template-columns: none; align-items: center; gap: 8px !important; }
  .mapping-required-check input { width: 15px; height: 15px; }
  .mapping-selected-column button { color: #ffbfaf; }
  .mapping-studio-selection p { margin: 0; color: #9fb4cf; line-height: 1.5; }
  .mapping-studio-status { min-height: 36px; display: flex; align-items: center; gap: 16px; padding: 0 16px; border-top: 1px solid rgba(98,132,173,0.14); background: #0d1826; color: #9fb4cf; font-size: 12px; font-weight: 800; }
  @media (max-width: 1180px) { .mapping-workspace-grid { grid-template-columns: 1fr; } }
  @media (max-width: 1100px) { .mapping-studio-body { grid-template-columns: 160px minmax(0, 1fr); } .mapping-studio-selection { grid-column: 1 / -1; border-left: none; border-top: 1px solid rgba(98,132,173,0.14); grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); } }
  @media (max-width: 980px) { .connection-map { grid-template-columns: 1fr; } .connection-canvas { display: none; } .connections-header { display: grid; } }
  @media (max-width: 760px) { .mapping-table-head { display: none; } .mapping-row { grid-template-columns: 1fr; gap: 8px; } }
  @media (max-width: 640px) { .connections-stage { padding: 20px; } .connection-target-node, .connection-source-node { min-height: 68px; } }
`
