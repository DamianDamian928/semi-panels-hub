import type { ReactNode, SVGProps } from 'react'
import type {
  BomStage,
  ConnectionCard,
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
  .connections-card-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .connections-card-header-copy { display: grid; gap: 6px; }
  .connections-card-count { color: #91abc9; font-size: 13px; }
  .connections-card-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
  .connection-source-card { padding: 20px; border-radius: 22px; border: 1px solid rgba(98,132,173,0.2); background: linear-gradient(180deg, rgba(17,31,50,0.95), rgba(11,24,40,0.98)); box-shadow: inset 0 1px 0 rgba(255,255,255,0.03); }
  .connection-source-top { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
  .connection-source-brand { display: flex; gap: 14px; align-items: flex-start; }
  .connection-source-brand h4 { margin: 0 0 4px; font-size: 17px; color: #f8fbff; }
  .connection-source-brand p { margin: 0; color: #97acc8; font-size: 14px; }
  .connection-source-icon { width: 42px; height: 42px; border-radius: 14px; background: radial-gradient(circle at top, rgba(89,160,255,0.8), rgba(24,70,138,0.9)); box-shadow: 0 0 18px rgba(70, 134, 226, 0.35); }
  .connection-source-icon-connecting { background: radial-gradient(circle at top, rgba(255,212,87,0.92), rgba(160,120,20,0.95)); box-shadow: 0 0 18px rgba(255, 206, 84, 0.28); }
  .connection-source-icon-not-connected { background: radial-gradient(circle at top, rgba(124,143,168,0.75), rgba(52,68,92,0.95)); box-shadow: none; }
  .connection-source-icon-selected { background: radial-gradient(circle at top, rgba(91,213,255,0.86), rgba(25,98,155,0.95)); box-shadow: 0 0 18px rgba(91, 213, 255, 0.3); }
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
  .connection-source-status-selected { color: #64d8ff; }
  .connection-source-actions { display: grid; gap: 12px; margin-top: 14px; }
  .connection-file-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .connection-file-picker { display: inline-flex; align-items: center; justify-content: center; min-height: 38px; padding: 0 14px; border-radius: 11px; border: 1px solid rgba(97,155,244,0.32); background: rgba(8,29,56,0.88); color: #e7f2ff; font-weight: 700; cursor: pointer; }
  .connection-file-picker:disabled { opacity: 0.55; cursor: wait; }
  .connection-file-note { margin: 0; color: #91abc9; font-size: 13px; overflow-wrap: anywhere; }
  .connection-file-details { display: grid; gap: 8px; margin: 2px 0 0; padding: 12px; border-radius: 14px; border: 1px solid rgba(98,132,173,0.16); background: rgba(7, 18, 31, 0.58); }
  .connection-file-details div { display: grid; grid-template-columns: 82px minmax(0, 1fr); gap: 10px; }
  .connection-file-details dt { color: #8ca5c2; }
  .connection-file-details dd { margin: 0; color: #f4f8fd; overflow-wrap: anywhere; }
  .connection-file-error { margin: 0; color: #ffb9ad; font-size: 13px; line-height: 1.5; }
  .connection-card-footer { display: flex; justify-content: flex-end; margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(98,132,173,0.14); }
  .connection-remove-button { border-color: rgba(255,138,122,0.28); color: #ffb9ad; }
  .connections-empty-state { min-height: 220px; display: grid; place-items: center; gap: 14px; padding: 28px; border-radius: 22px; border: 1px dashed rgba(96,154,230,0.35); background: rgba(9, 21, 36, 0.68); text-align: center; }
  .connections-empty-state h4 { margin: 0; font-size: 17px; color: #f7fbff; }
  .connections-empty-state p { max-width: 420px; margin: 0; color: #9eb6d3; line-height: 1.55; }
  @media (max-width: 1200px) { .connections-layout { grid-template-columns: 1fr; } .connections-tree { border-right: none; border-bottom: 1px solid rgba(98,132,173,0.16); } }
  @media (max-width: 900px) { .connections-card-grid { grid-template-columns: 1fr; } }
`
