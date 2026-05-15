import type { TechnicalStatus } from '../apiClient'

const technicalRuntimeNotes = [
  { label: 'Frontend dev', value: 'npm run dev' },
  { label: 'Backend API', value: 'npm run api' },
  { label: 'Local file helper', value: 'npm run helper' },
  { label: 'Production build', value: 'npm run build' },
]

const formatTechnicalTimestamp = (value?: string) => {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(value))
}

const formatUptime = (seconds?: number) => {
  if (seconds === undefined) return 'Unknown'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

const buildTechnicalRuntimeNotes = (status: TechnicalStatus | null) => {
  if (!status) return technicalRuntimeNotes

  return [
    { label: 'Frontend dev', value: status.commands.dev },
    { label: 'Backend API', value: status.commands.api },
    { label: 'Local file helper', value: status.commands.helper },
    { label: 'Production build', value: status.commands.build },
  ]
}

type DiagnosticTone = 'OK' | 'WARN' | 'INFO' | 'OFFLINE'

type DiagnosticRow = {
  label: string
  value: string
  tone: DiagnosticTone
  detail: string
}

const buildDiagnosticSections = (
  status: TechnicalStatus | null,
  error: string | null,
): Array<{ title: string; rows: DiagnosticRow[] }> => {
  if (!status) {
    return [
      {
        title: 'Runtime',
        rows: [
          {
            label: 'API',
            value: 'Unavailable',
            tone: 'OFFLINE',
            detail: error ?? 'Start npm run api to load live diagnostics.',
          },
        ],
      },
    ]
  }

  return [
    {
      title: 'Application',
      rows: [
        { label: 'App', value: status.app.name, tone: 'OK', detail: `Version ${status.app.version}` },
        { label: 'Environment', value: status.app.environment, tone: 'INFO', detail: 'Runtime environment reported by the API process.' },
        { label: 'Workflow contract', value: status.contract.primaryWorkUnit, tone: 'OK', detail: status.contract.auditRequired ? 'Audit trail is required.' : 'Audit trail is optional.' },
      ],
    },
    {
      title: 'Frontend',
      rows: [
        { label: 'Framework', value: status.frontend.framework, tone: 'OK', detail: status.frontend.frameworkVersion },
        { label: 'Language', value: status.frontend.language, tone: 'OK', detail: status.frontend.typeScriptVersion },
        { label: 'Bundler', value: status.frontend.bundler, tone: 'OK', detail: status.frontend.bundlerVersion },
      ],
    },
    {
      title: 'Backend',
      rows: [
        { label: 'Service', value: status.backend.service, tone: 'OK', detail: status.backend.baseUrl },
        { label: 'Runtime', value: status.backend.runtime, tone: 'OK', detail: `Uptime ${formatUptime(status.backend.uptimeSeconds)}` },
        { label: 'Database', value: status.backend.database.engine, tone: 'OK', detail: status.backend.database.path },
      ],
    },
    {
      title: 'Data',
      rows: [
        { label: 'Reviews', value: String(status.data.reviews), tone: 'INFO', detail: `${status.data.sources} sources registered.` },
        { label: 'Review issues', value: String(status.data.reviewIssues), tone: status.workflow.highSeverityIssues > 0 ? 'WARN' : 'OK', detail: `${status.workflow.openIssues} open, ${status.workflow.highSeverityIssues} high severity.` },
        { label: 'Decisions', value: String(status.data.decisions), tone: status.workflow.needsDecision > 0 ? 'WARN' : 'OK', detail: `${status.workflow.needsDecision} issues still need decision.` },
        { label: 'Output', value: String(status.data.outputItems), tone: status.workflow.blockedOutputItems > 0 ? 'WARN' : 'OK', detail: `${status.workflow.readyOutputItems} ready, ${status.workflow.blockedOutputItems} blocked.` },
        { label: 'Audit', value: String(status.data.auditEvents), tone: status.workflow.notPersistedAuditEvents > 0 ? 'WARN' : 'OK', detail: `${status.workflow.notPersistedAuditEvents} not persisted.` },
      ],
    },
  ]
}

const buildTechnicalLiveMetrics = (status: TechnicalStatus | null, error: string | null) => {
  if (!status) {
    return [
      { label: 'API status', value: 'Offline', detail: error ?? 'Waiting for API response' },
      { label: 'Reviews', value: '-', detail: 'No live data loaded' },
      { label: 'Issues', value: '-', detail: 'No live data loaded' },
      { label: 'Audit events', value: '-', detail: 'No live data loaded' },
    ]
  }

  return [
    { label: 'API status', value: 'Online', detail: status.backend.baseUrl },
    { label: 'Reviews', value: String(status.data.reviews), detail: `${status.data.sources} read-only sources` },
    { label: 'Issues', value: String(status.data.reviewIssues), detail: `${status.workflow.needsDecision} need decision` },
    { label: 'Audit events', value: String(status.data.auditEvents), detail: `${status.workflow.notPersistedAuditEvents} not persisted` },
  ]
}

type TechnicalStatusPanelProps = {
  technicalStatus: TechnicalStatus | null
  technicalStatusError: string | null
  technicalStatusRefreshing: boolean
  technicalStatusFetchedAt: string | null
  onRefresh: () => void
  onBackToDashboard: () => void
}

export function TechnicalStatusPanel({
  technicalStatus,
  technicalStatusError,
  technicalStatusRefreshing,
  technicalStatusFetchedAt,
  onRefresh,
  onBackToDashboard,
}: TechnicalStatusPanelProps) {
  const currentTechnicalRuntimeNotes = buildTechnicalRuntimeNotes(technicalStatus)
  const diagnosticSections = buildDiagnosticSections(technicalStatus, technicalStatusError)
  const technicalLiveMetrics = buildTechnicalLiveMetrics(technicalStatus, technicalStatusError)

  return (
    <div className="app-shell">
      <header className="page-header page-header-row">
        <div>
          <p className="eyebrow">Semi Panels Hub</p>
          <h1>Settings / Diagnostics</h1>
          <p className="page-subtitle">Live technical status from the local API and workflow repository.</p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="header-button"
            onClick={onRefresh}
            disabled={technicalStatusRefreshing}
          >
            {technicalStatusRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button type="button" className="header-button" onClick={onBackToDashboard}>
            Back to Dashboard
          </button>
        </div>
      </header>

      <main className="page-content settings-layout diagnostic-layout">
        <section className="diagnostic-toolbar" aria-label="Diagnostic status">
          <div className="diagnostic-toolbar-main">
            <span className={`diagnostic-led ${technicalStatus ? 'diagnostic-led-ok' : 'diagnostic-led-warn'}`} />
            <div>
              <strong>{technicalStatus ? 'API ONLINE' : technicalStatusError ? 'API OFFLINE' : 'API CHECKING'}</strong>
              <span>{technicalStatus?.backend.baseUrl ?? 'http://127.0.0.1:8788'}</span>
            </div>
          </div>
          <div className="diagnostic-toolbar-meta">
            <span>API snapshot</span>
            <strong>{formatTechnicalTimestamp(technicalStatus?.generatedAt)}</strong>
          </div>
          <div className="diagnostic-toolbar-meta">
            <span>UI fetched</span>
            <strong>{formatTechnicalTimestamp(technicalStatusFetchedAt ?? undefined)}</strong>
          </div>
          <div className="diagnostic-toolbar-meta">
            <span>Mode</span>
            <strong>Read-only diagnostics</strong>
          </div>
          {technicalStatusError ? <p className="diagnostic-error">{technicalStatusError}</p> : null}
        </section>

        <section className="diagnostic-summary-grid" aria-label="Live application status">
          {technicalLiveMetrics.map((metric) => (
            <article key={metric.label} className="diagnostic-summary-card">
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <p>{metric.detail}</p>
            </article>
          ))}
        </section>

        <section className="diagnostic-grid" aria-label="Diagnostic tables">
          {diagnosticSections.map((section) => (
            <article key={section.title} className="diagnostic-panel">
              <header className="diagnostic-panel-header">
                <h2>{section.title}</h2>
                <span>{section.rows.length} checks</span>
              </header>
              <div className="diagnostic-table" role="table" aria-label={`${section.title} diagnostics`}>
                <div className="diagnostic-row diagnostic-row-head" role="row">
                  <span role="columnheader">Check</span>
                  <span role="columnheader">Value</span>
                  <span role="columnheader">State</span>
                  <span role="columnheader">Details</span>
                </div>
                {section.rows.map((row) => (
                  <div key={`${section.title}-${row.label}`} className="diagnostic-row" role="row">
                    <span role="cell">{row.label}</span>
                    <strong role="cell">{row.value}</strong>
                    <span role="cell" className={`diagnostic-state diagnostic-state-${row.tone.toLowerCase()}`}>
                      {row.tone}
                    </span>
                    <span role="cell">{row.detail}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="diagnostic-panel diagnostic-panel-wide" aria-label="Developer commands">
          <header className="diagnostic-panel-header">
            <h2>Commands</h2>
            <span>{currentTechnicalRuntimeNotes.length} entries</span>
          </header>
          <dl className="diagnostic-command-table">
            {currentTechnicalRuntimeNotes.map((note) => (
              <div key={note.label}>
                <dt>{note.label}</dt>
                <dd>{note.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </div>
  )
}
