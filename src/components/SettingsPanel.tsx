type SettingsPanelProps = {
  onOpenDiagnostics: () => void
  onOpenDesignTemplate: () => void
  onBackToDashboard: () => void
}

const settingsOptions = [
  {
    id: 'design-template',
    title: 'Design Template',
    description: 'Visual contract for new screens: colors, typography, spacing, panels, tables and interaction style.',
    actionLabel: 'Open template',
  },
  {
    id: 'diagnostics',
    title: 'Diagnostics',
    description: 'Technical status, API health, database path, workflow counters and developer commands.',
    actionLabel: 'Open diagnostics',
  },
]

export function SettingsPanel({
  onOpenDiagnostics,
  onOpenDesignTemplate,
  onBackToDashboard,
}: SettingsPanelProps) {
  const handleOpenOption = (optionId: string) => {
    if (optionId === 'design-template') {
      onOpenDesignTemplate()
      return
    }

    onOpenDiagnostics()
  }

  return (
    <div className="app-shell">
      <header className="page-header page-header-row">
        <div>
          <p className="eyebrow">Semi Panels Hub</p>
          <h1>Settings</h1>
          <p className="page-subtitle">Application settings and maintenance tools.</p>
        </div>
        <div className="header-actions">
          <button type="button" className="header-button" onClick={onBackToDashboard}>
            Back to Dashboard
          </button>
        </div>
      </header>

      <main className="page-content settings-layout">
        <section className="settings-option-grid" aria-label="Settings sections">
          {settingsOptions.map((option) => (
            <article key={option.id} className="settings-option-card">
              <div>
                <p className="section-label">Settings</p>
                <h2>{option.title}</h2>
                <p>{option.description}</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => handleOpenOption(option.id)}>
                {option.actionLabel}
              </button>
            </article>
          ))}
        </section>
      </main>
    </div>
  )
}
