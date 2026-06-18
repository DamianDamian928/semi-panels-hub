import type { ReactNode, SVGProps } from 'react'
import type {
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

export const sidebarSteps: SidebarStepDefinition[] = [
  { step: 'Sources', label: 'Sources', icon: 'sources' },
  { step: 'Comparison', label: 'Comparison', icon: 'comparison' },
  { step: 'Validation', label: 'Validation', icon: 'validation' },
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
    comparison: (
      <>
        <path d="M9 5 4 10l5 5" />
        <path d="m15 5 5 5-5 5" />
        <path d="M20 10H8" />
        <path d="M16 14H4" />
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
  .connections-stage { display: grid; gap: 20px; padding: 28px; overflow: hidden; }
  .connections-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 0; }
  .connections-header h3 { margin: 0 0 8px; }
  .connections-header p:last-child { max-width: 760px; margin: 0; color: #9fb4cf; line-height: 1.55; }
  .connections-registry-actions { align-items: flex-start; }
  .change-review-bar { display: flex; align-items: center; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
  .change-review-status { min-height: 46px; display: inline-flex; align-items: center; padding: 10px 16px; border: 1px solid rgba(98,132,173,0.16); border-radius: 8px; background: rgba(8, 17, 29, 0.46); color: #9fb4cf; font-size: 12px; font-weight: 800; }
  .change-review-status-dirty { border-color: rgba(255, 201, 112, 0.32); background: rgba(68, 48, 18, 0.34); color: #ffd68a; }
  .change-review-bar .secondary-button,
  .change-review-bar .primary-button { min-height: 36px; padding: 0 12px; border-radius: 8px; font-size: 12px; font-weight: 800; }
  .change-review-bar .primary-button { border: 1px solid rgba(132, 200, 255, 0.38); background: rgba(14, 45, 76, 0.72); color: #eaf6ff; }
  .change-review-bar .primary-button:hover:not(:disabled) { border-color: rgba(132, 200, 255, 0.68); background: rgba(20, 62, 102, 0.9); }
  .change-review-bar .primary-button:disabled,
  .change-review-bar .secondary-button:disabled { opacity: 0.48; cursor: not-allowed; }
  .connection-map { display: grid; grid-template-columns: minmax(300px, 360px) minmax(240px, 1fr) minmax(340px, 420px); gap: 16px; min-height: 650px; }
  .connection-map-column { min-width: 0; display: grid; grid-template-rows: auto 1fr; gap: 12px; }
  .connection-map-column-head { min-height: 44px; display: flex; align-items: end; justify-content: space-between; gap: 12px; padding: 0 4px; color: #8ea6c4; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0; }
  .connection-map-column-head strong { color: #ecf5ff; font-size: 13px; text-transform: none; }
  .connection-target-list,
  .connection-source-list { display: grid; gap: 10px; align-content: start; }
  .connection-target-node { min-height: 68px; width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; border-radius: 8px; border: 1px solid rgba(98,132,173,0.18); background: rgba(9, 19, 32, 0.74); color: #eaf3ff; text-align: left; cursor: pointer; }
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
  .connection-source-node { min-height: 74px; display: grid; grid-template-columns: 76px minmax(0, 1fr) 96px; gap: 10px; align-items: center; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(98,132,173,0.18); background: rgba(10, 20, 33, 0.76); cursor: grab; }
  .connection-source-node:active { cursor: grabbing; }
  .connection-source-node-active { border-color: rgba(106, 211, 149, 0.5); background: rgba(16, 41, 37, 0.48); box-shadow: none; }
  .connection-source-node-content { min-width: 0; display: grid; gap: 7px; }
  .connection-source-node-top { min-width: 0; display: grid; align-items: center; }
  .connection-source-node-top h4 { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #f4f9ff; font-size: 14px; }
  .connection-source-node-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; color: #9fb4cf; font-size: 12px; }
  .connection-source-role { display: inline-flex; align-items: center; min-height: 22px; padding: 2px 8px; border-radius: 7px; border: 1px solid rgba(126, 172, 220, 0.24); background: rgba(16, 39, 64, 0.62); color: #d9ecff; font-size: 11px; font-weight: 800; }
  .connection-node-action { min-height: 34px; width: 96px; border-radius: 7px; border: 1px solid rgba(97,155,244,0.28); background: rgba(8,29,56,0.58); color: #e7f2ff; font-size: 12px; font-weight: 800; cursor: pointer; }
  .connection-node-action:hover { border-color: rgba(119, 190, 255, 0.68); background: rgba(16, 48, 84, 0.86); }
  .connection-node-action-remove { border-color: rgba(255,138,122,0.28); background: rgba(69, 30, 31, 0.54); color: #ffbfaf; }
  .connection-source-app-icon { position: relative; width: 66px; height: 60px; display: inline-grid; place-items: center; }
  .connection-source-app-icon-back,
  .connection-source-app-icon-front { position: absolute; border-radius: 6px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.22); }
  .connection-source-app-icon-back { top: 4px; right: 2px; width: 48px; height: 44px; opacity: 0.92; }
  .connection-source-app-icon-front { right: 10px; bottom: 2px; width: 46px; height: 42px; opacity: 0.78; }
  .connection-source-app-icon-badge { position: absolute; left: 0; top: 18px; min-width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center; padding: 0 5px; border-radius: 5px; color: white; font-size: 20px; font-weight: 900; letter-spacing: -0.03em; box-shadow: 0 8px 18px rgba(0,0,0,0.26); }
  .connection-source-app-icon-sql .connection-source-app-icon-badge { font-size: 12px; letter-spacing: 0; }
  .connection-source-app-icon-excel .connection-source-app-icon-back { background: linear-gradient(135deg, #37c782, #0f7b45); }
  .connection-source-app-icon-excel .connection-source-app-icon-front { background: linear-gradient(135deg, #16864f, #0a5c38); }
  .connection-source-app-icon-excel .connection-source-app-icon-badge { background: linear-gradient(135deg, #21a365, #0b673e); }
  .connection-source-app-icon-folder .connection-source-app-icon-back,
  .connection-source-app-icon-file .connection-source-app-icon-back { background: linear-gradient(135deg, #4fb4ff, #1d68cc); }
  .connection-source-app-icon-folder .connection-source-app-icon-front,
  .connection-source-app-icon-file .connection-source-app-icon-front { background: linear-gradient(135deg, #2176d2, #144b9b); }
  .connection-source-app-icon-folder .connection-source-app-icon-badge,
  .connection-source-app-icon-file .connection-source-app-icon-badge { background: linear-gradient(135deg, #2f8ce6, #1252b0); }
  .connection-source-app-icon-folder .connection-source-app-icon-back { top: 15px; right: 2px; width: 58px; height: 38px; border-radius: 6px; background: linear-gradient(135deg, #ffd86b, #d9931c); }
  .connection-source-app-icon-folder .connection-source-app-icon-back::before { position: absolute; top: -9px; left: 4px; width: 26px; height: 12px; border-radius: 5px 5px 0 0; background: linear-gradient(135deg, #ffe48c, #e8ad2e); content: ''; }
  .connection-source-app-icon-folder .connection-source-app-icon-front { right: 8px; bottom: 4px; width: 52px; height: 34px; border-radius: 6px; background: linear-gradient(135deg, #f2b934, #b97610); opacity: 0.9; }
  .connection-source-app-icon-folder .connection-source-app-icon-badge { display: none; }
  .connection-source-app-icon-sharepoint .connection-source-app-icon-back { top: 2px; right: 12px; width: 38px; height: 38px; border-radius: 999px; background: linear-gradient(135deg, #079ca3, #047b84); }
  .connection-source-app-icon-sharepoint .connection-source-app-icon-back::before,
  .connection-source-app-icon-sharepoint .connection-source-app-icon-back::after { position: absolute; width: 34px; height: 34px; border-radius: 999px; content: ''; }
  .connection-source-app-icon-sharepoint .connection-source-app-icon-back::before { right: -18px; top: 20px; background: linear-gradient(135deg, #38c7c9, #0b8b93); }
  .connection-source-app-icon-sharepoint .connection-source-app-icon-back::after { left: 5px; top: 30px; background: linear-gradient(135deg, #43d1d3, #13a2aa); }
  .connection-source-app-icon-sharepoint .connection-source-app-icon-front { display: none; }
  .connection-source-app-icon-sharepoint .connection-source-app-icon-badge { left: 0; top: 20px; min-width: 34px; width: 34px; height: 34px; border-radius: 5px; background: linear-gradient(135deg, #0fa5a9, #067983); box-shadow: 0 8px 18px rgba(0,0,0,0.26); font-size: 20px; }
  .connection-source-app-icon-sql .connection-source-app-icon-back { background: linear-gradient(135deg, #5bb8f5, #2d7fbd); }
  .connection-source-app-icon-sql .connection-source-app-icon-front { background: linear-gradient(135deg, #4aa2dc, #216fa9); }
  .connection-source-app-icon-sql .connection-source-app-icon-badge { background: linear-gradient(135deg, #4a9fd6, #236fa9); }
  .connection-source-app-icon-sql .connection-source-app-icon-back { top: 2px; right: 2px; width: 60px; height: 58px; border-radius: 50% / 16%; background:
    radial-gradient(ellipse at 50% 8%, #5da6d9 0 48%, transparent 50%),
    linear-gradient(#438fc8 0 24%, #f1f8ff 24% 31%, #3d8bc6 31% 54%, #f1f8ff 54% 61%, #3783be 61% 100%);
    box-shadow: inset 0 2px 0 rgba(255,255,255,0.26), inset 0 -3px 0 rgba(21,83,132,0.26); overflow: hidden; }
  .connection-source-app-icon-sql .connection-source-app-icon-back::before { position: absolute; top: -1px; left: 0; width: 60px; height: 18px; border-radius: 50%; background: #5aa2d6; box-shadow: inset 0 2px 0 rgba(255,255,255,0.38); content: ''; }
  .connection-source-app-icon-sql .connection-source-app-icon-back::after { position: absolute; left: 0; top: 26px; width: 60px; height: 17px; border-radius: 50%; border-top: 4px solid #f1f8ff; content: ''; }
  .connection-source-app-icon-sql .connection-source-app-icon-front { display: block; top: 44px; right: 2px; width: 60px; height: 16px; border-radius: 50%; border-top: 4px solid #f1f8ff; background: #327cb6; opacity: 1; box-shadow: inset 0 -2px 0 rgba(20,76,122,0.32); }
  .connection-source-app-icon-sql .connection-source-app-icon-badge { display: none; }
  .connection-source-database-svg { width: 64px; height: 64px; overflow: visible; }
  .connection-source-database-svg ellipse,
  .connection-source-database-svg path:not(.connection-source-database-gap) { fill: #438fc8; stroke: none; }
  .connection-source-database-svg ellipse { fill: #4f9bd3; }
  .connection-source-database-svg path:nth-of-type(2) { fill: #3f8bc3; }
  .connection-source-database-svg path:nth-of-type(4) { fill: #347fb8; }
  .connection-source-database-gap { fill: none; stroke: #f1f8ff; stroke-width: 5; stroke-linecap: round; }
  .connection-source-app-icon-export .connection-source-app-icon-back { background: linear-gradient(135deg, #ff9a6a, #d34b24); }
  .connection-source-app-icon-export .connection-source-app-icon-front { background: linear-gradient(135deg, #f06d3a, #aa361b); }
  .connection-source-app-icon-export .connection-source-app-icon-badge { background: linear-gradient(135deg, #e86335, #b43a1c); }
  .connections-empty-state { min-height: 160px; display: grid; place-items: center; gap: 10px; padding: 24px; border-radius: 8px; border: 1px dashed rgba(96,154,230,0.35); background: rgba(9, 21, 36, 0.68); text-align: center; }
  .connections-empty-state h4 { margin: 0; font-size: 16px; color: #f7fbff; }
  .connections-empty-state p { margin: 0; color: #9eb6d3; line-height: 1.55; }
  @media (max-width: 1280px) { .connection-map { grid-template-columns: minmax(260px, 320px) minmax(140px, 1fr) minmax(300px, 380px); } }
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
  .impact-modal-overlay { position: fixed; inset: 0; z-index: 120; display: grid; place-items: center; padding: 24px; background: rgba(3, 8, 14, 0.78); }
  .impact-modal { width: min(620px, 100%); max-height: calc(100vh - 48px); display: grid; gap: 18px; padding: 24px; border: 1px solid rgba(126, 145, 168, 0.22); border-radius: 8px; background: #07111e; box-shadow: 0 24px 80px rgba(0, 0, 0, 0.46); overflow: auto; }
  .impact-modal-header { display: grid; gap: 8px; }
  .impact-modal-header h3 { margin: 0; color: #f7fbff; }
  .impact-modal-header p { margin: 0; color: #9fb4cf; line-height: 1.5; }
  .impact-summary-list { display: grid; gap: 10px; margin: 0; }
  .impact-summary-list div { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 12px; padding: 12px 14px; border: 1px solid rgba(98,132,173,0.16); border-radius: 8px; background: rgba(8, 17, 29, 0.58); }
  .impact-summary-list dt { color: #8ea6c4; font-size: 12px; font-weight: 800; text-transform: uppercase; }
  .impact-summary-list dd { margin: 0; color: #eef6ff; line-height: 1.45; overflow-wrap: anywhere; }
  .impact-change-list { display: grid; gap: 8px; }
  .impact-change-row { display: grid; grid-template-columns: 84px minmax(100px, 0.8fr) minmax(140px, 1fr); gap: 10px; align-items: center; padding: 10px 12px; border: 1px solid rgba(98,132,173,0.14); border-radius: 8px; background: rgba(5, 13, 24, 0.55); color: #dcecff; font-size: 12px; }
  .impact-change-row strong { color: #f7fbff; text-transform: capitalize; }
  .impact-change-row span,
  .impact-change-row small { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .impact-change-row small { color: #9fb4cf; }
  .impact-error { margin: 0; color: #ffb6a8; line-height: 1.5; }
  .impact-modal-actions { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
  .impact-modal-actions .secondary-button,
  .impact-modal-actions .primary-button { min-height: 42px; padding: 0 16px; border-radius: 8px; font-size: 12px; font-weight: 800; }
  .impact-modal-actions .primary-button { border: 1px solid rgba(132, 200, 255, 0.38); background: rgba(14, 45, 76, 0.72); color: #eaf6ff; }
  .impact-modal-actions .primary-button:hover { border-color: rgba(132, 200, 255, 0.68); background: rgba(20, 62, 102, 0.9); }
  .mapping-studio { height: 100%; display: grid; grid-template-rows: auto minmax(0, 1fr) auto; border: 1px solid rgba(126, 145, 168, 0.18); border-radius: 8px; background: #050d18; box-shadow: 0 24px 80px rgba(0, 0, 0, 0.38); overflow: hidden; font-family: 'Cascadia Mono', Consolas, 'Roboto Mono', 'Courier New', monospace; font-variant-numeric: tabular-nums; }
  .mapping-studio-titlebar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 24px; border-bottom: 1px solid rgba(126, 145, 168, 0.14); background: linear-gradient(180deg, rgba(10, 18, 29, 0.96), rgba(8, 15, 25, 0.98)); }
  .mapping-studio-titlebar h2 { margin: 0; color: #f7fbff; font-size: 18px; font-weight: 600; }
  .mapping-studio-close,
  .mapping-studio-toolbar button,
  .mapping-selected-column button { min-height: 42px; border-radius: 8px; border: 1px solid rgba(126, 145, 168, 0.24); background: rgba(8, 16, 27, 0.46); color: #d8e1ec; font-size: 12px; font-weight: 800; cursor: pointer; }
  .mapping-studio-close:hover,
  .mapping-studio-toolbar button:hover,
  .mapping-selected-column button:hover { border-color: rgba(126, 145, 168, 0.4); background: rgba(18, 31, 47, 0.64); transform: none; }
  .mapping-studio-close { padding: 0 14px; }
  .mapping-studio-toolbar { display: flex; align-items: center; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
  .mapping-studio-toolbar button { padding: 0 14px; }
  .mapping-studio-toolbar .mapping-studio-primary-action { border-color: rgba(132, 200, 255, 0.38); background: rgba(14, 45, 76, 0.56); color: #eaf6ff; }
  .mapping-studio-toolbar .mapping-studio-danger-action,
  .mapping-selected-column button { color: #cf8d83; }
  .mapping-studio-toolbar label { display: flex; align-items: center; gap: 8px; color: #9bacc3; font-size: 11px; font-weight: 800; text-transform: uppercase; }
  .mapping-studio-toolbar input,
  .mapping-selected-column select { min-height: 42px; border-radius: 8px; border: 1px solid rgba(126, 145, 168, 0.24); background: rgba(5, 13, 24, 0.78); color: #eaf3ff; padding: 0 12px; font: inherit; }
  .mapping-studio-body { min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 24px; padding: 24px; background: #050d18; }
  .mapping-studio-registry,
  .mapping-studio-selection { min-height: 0; display: grid; border: 1px solid rgba(126, 145, 168, 0.16); border-radius: 8px; background: linear-gradient(180deg, rgba(10, 18, 29, 0.94), rgba(8, 15, 25, 0.96)); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.018); overflow: hidden; }
  .mapping-studio-registry { grid-template-rows: auto minmax(0, 1fr); }
  .mapping-studio-registry-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; padding: 24px; }
  .mapping-studio-registry-header h3,
  .mapping-studio-selection-header h3 { margin: 0; color: #d8e1ec; font-size: 18px; font-weight: 600; line-height: 1.25; }
  .mapping-studio-registry-content { min-height: 0; display: grid; grid-template-columns: 180px minmax(0, 1fr); border-top: 1px solid rgba(126, 145, 168, 0.12); }
  .mapping-studio-sheets { min-height: 0; display: grid; align-content: start; gap: 0; padding: 0; border-right: 1px solid rgba(126, 145, 168, 0.12); background: linear-gradient(180deg, rgba(9, 17, 27, 0.94), rgba(7, 14, 23, 0.96)); overflow: auto; }
  .mapping-studio-selection { gap: 0; align-content: start; padding: 22px 24px 24px; overflow: auto; }
  .mapping-studio-sheets > span,
  .mapping-studio-selection > span { padding: 16px 0 10px; color: #8692a2; font-size: 11px; font-weight: 800; text-transform: uppercase; }
  .mapping-studio-sheets > span { padding: 12px 14px; border-bottom: 1px solid rgba(126, 145, 168, 0.12); }
  .mapping-studio-sheets button { position: relative; min-height: 54px; display: grid; align-items: center; padding: 11px 14px 11px 16px; border: none; border-bottom: 1px solid rgba(126, 145, 168, 0.12); background: transparent; color: var(--text-soft); text-align: left; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
  .mapping-studio-sheets button span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mapping-studio-sheets button:hover { background: rgba(22, 32, 45, 0.72); color: #d8e1ec; }
  .mapping-studio-sheet-active,
  .mapping-studio-sheet-active:hover { background: rgba(22, 32, 45, 0.72); color: #d8e1ec; box-shadow: inset 2px 0 0 rgba(132, 200, 255, 0.8); }
  .mapping-studio-grid-wrap { min-width: 0; min-height: 0; overflow: auto; background: #08111d; }
  .mapping-studio-grid { width: max-content; min-width: 100%; display: grid; align-content: start; }
  .mapping-studio-grid-header,
  .mapping-studio-grid-row { display: grid; }
  .mapping-studio-grid-header { position: sticky; top: 0; z-index: 1; background: #101b2a; box-shadow: 0 1px 0 rgba(126, 145, 168, 0.16); }
  .mapping-studio-grid-header button,
  .mapping-studio-grid-row span { display: block; min-width: 0; padding: 11px 16px; border: 0; border-right: 1px solid rgba(126, 145, 168, 0.12); border-bottom: 1px solid rgba(126, 145, 168, 0.12); color: #d8e1ec; text-align: left; overflow: hidden; text-overflow: ellipsis; }
  .mapping-studio-grid-header button { min-height: 46px; max-height: 46px; background: transparent; color: #d8e1ec; font: inherit; font-size: 11px; font-weight: 900; line-height: 1.25; text-transform: uppercase; white-space: normal; cursor: pointer; }
  .mapping-studio-grid-header button:hover,
  .mapping-preview-column-selected { background: rgba(22, 32, 45, 0.92); box-shadow: inset 0 -2px 0 rgba(132, 200, 255, 0.8); color: #f7fbff; }
  .mapping-studio-grid-row span { min-height: 42px; max-height: 42px; font-size: 12px; line-height: 20px; white-space: nowrap; }
  .mapping-preview-cell-selected { background: rgba(22, 32, 45, 0.46); color: #f7fbff !important; }
  .mapping-studio-selection-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; padding-bottom: 18px; border-bottom: 1px solid rgba(126, 145, 168, 0.18); }
  .mapping-studio-selection-header h3 { margin-top: 12px; font-size: 14px; font-weight: 500; overflow-wrap: anywhere; }
  .mapping-studio-selection-header button { padding: 0; border: none; background: transparent; color: #8692a2; font: inherit; font-size: 11px; font-weight: 500; line-height: 1.35; text-transform: uppercase; cursor: pointer; }
  .mapping-studio-selection-header button:hover { color: #d8e1ec; text-decoration: underline; text-underline-offset: 3px; }
  .mapping-selected-column { display: grid; gap: 12px; padding: 16px 0 18px; border: none; border-bottom: 1px solid rgba(126, 145, 168, 0.16); border-radius: 0; background: transparent; }
  .mapping-selected-column strong { color: #d8e1ec; font-size: 14px; font-weight: 600; overflow-wrap: anywhere; }
  .mapping-selected-column label { display: grid; gap: 7px; color: #8692a2; font-size: 11px; font-weight: 800; text-transform: uppercase; }
  .mapping-required-check { display: flex !important; grid-template-columns: none; align-items: center; gap: 8px !important; }
  .mapping-required-check input { width: 15px; height: 15px; }
  .mapping-studio-selection p { margin: 0; color: #9fb4cf; line-height: 1.5; }
  .mapping-studio-status { min-height: 38px; display: flex; align-items: center; gap: 16px; padding: 0 24px; border-top: 1px solid rgba(126, 145, 168, 0.14); background: #08111d; color: #9bacc3; font-size: 11px; font-weight: 800; text-transform: uppercase; }
  .mapping-studio-status span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  @media (max-width: 1180px) { .mapping-workspace-grid { grid-template-columns: 1fr; } }
  @media (max-width: 1100px) { .mapping-studio-body { grid-template-columns: 1fr; } .mapping-studio-selection { min-height: 260px; } .mapping-studio-registry-header { display: grid; } }
  @media (max-width: 980px) { .connection-map { grid-template-columns: 1fr; } .connection-canvas { display: none; } .connections-header { display: grid; } }
  @media (max-width: 760px) { .mapping-table-head { display: none; } .mapping-row { grid-template-columns: 1fr; gap: 8px; } }
  @media (max-width: 640px) { .connections-stage { padding: 20px; } .connection-target-node { min-height: 68px; } .connection-source-node { grid-template-columns: 76px minmax(0, 1fr); min-height: 104px; } .connection-node-action { grid-column: 2; width: 100%; } }
`
