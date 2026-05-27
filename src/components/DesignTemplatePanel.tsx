type DesignTemplatePanelProps = {
  onBackToSettings: () => void
}

const sourceTokens = [
  { name: 'Main panel background', value: 'linear-gradient(180deg, rgba(10, 18, 29, 0.94), rgba(8, 15, 25, 0.96))', usage: '.sources-registry-main' },
  { name: 'Main panel border', value: 'rgba(126, 145, 168, 0.16)', usage: '.sources-registry-main' },
  { name: 'Right panel background', value: 'linear-gradient(180deg, rgba(10, 17, 25, 0.98), rgba(8, 14, 22, 0.98))', usage: '.source-detail-panel' },
  { name: 'Right panel border', value: 'rgba(126, 145, 168, 0.18)', usage: '.source-detail-panel' },
  { name: 'Table background', value: 'linear-gradient(180deg, rgba(9, 17, 27, 0.94), rgba(7, 14, 23, 0.96))', usage: '.source-registry-list' },
  { name: 'Table header background', value: 'rgba(255, 255, 255, 0.012)', usage: '.source-registry-list-head' },
  { name: 'Row divider', value: 'rgba(126, 145, 168, 0.12)', usage: '.source-registry-row' },
  { name: 'Header divider', value: 'rgba(126, 145, 168, 0.16)', usage: '.source-registry-list-head' },
  { name: 'Selected row background', value: 'rgba(22, 32, 45, 0.72)', usage: '.source-registry-row-active' },
  { name: 'Selected row indicator', value: 'inset 2px 0 0 rgba(132, 200, 255, 0.8)', usage: '.source-registry-row-active' },
  { name: 'Selected row text', value: '#d8e1ec', usage: '.source-registry-row-active' },
  { name: 'Body row text', value: 'var(--text-soft)', usage: '.source-registry-row' },
  { name: 'Header label text', value: '#8692a2', usage: '.source-registry-list-head, .section-label' },
  { name: 'Primary content text', value: '#d8e1ec', usage: 'source titles, right panel values' },
  { name: 'Muted content text', value: '#9ca8b8', usage: 'right panel descriptions' },
  { name: 'Button background', value: 'rgba(8, 16, 27, 0.46)', usage: '.sources-registry-actions .secondary-button' },
  { name: 'Button hover background', value: 'rgba(18, 31, 47, 0.64)', usage: '.sources-registry-actions .secondary-button:hover' },
  { name: 'Button border', value: 'rgba(126, 145, 168, 0.24)', usage: '.secondary-button' },
]

const layoutSpecs = [
  { item: 'Sources grid, no detail panel', value: 'grid-template-columns: minmax(0, 1fr)', source: '.sources-registry-grid' },
  { item: 'Sources grid, with detail panel', value: 'grid-template-columns: minmax(0, 1fr) 360px', source: '.sources-registry-grid-with-detail' },
  { item: 'Main panel gap', value: 'gap: 20px', source: '.sources-registry-main' },
  { item: 'Page section gap', value: 'gap: 24px', source: '.sources-registry-grid' },
  { item: 'Main panel radius', value: 'border-radius: 8px', source: '.sources-registry-main' },
  { item: 'Right panel radius', value: 'border-radius: 8px', source: '.source-detail-panel' },
  { item: 'Right panel padding', value: '22px 24px 24px', source: '.source-detail-panel' },
  { item: 'Summary grid', value: 'repeat(4, minmax(0, 1fr)); gap: 12px', source: '.source-summary-grid' },
  { item: 'Table columns', value: '44px minmax(200px, 1fr) minmax(128px, 160px) 92px 124px', source: '.source-registry-row' },
  { item: 'Table row padding', value: '11px 16px', source: '.source-registry-row' },
  { item: 'Table header padding', value: '10px 16px', source: '.source-registry-list-head' },
  { item: 'Button height', value: 'min-height: 46px main / 42px right panel', source: '.secondary-button' },
]

const typographySpecs = [
  { item: 'Data UI font', value: "'Cascadia Mono', Consolas, 'Roboto Mono', 'Courier New', monospace", source: '.sources-registry-main, .source-detail-panel' },
  { item: 'Panel title', value: '18px / 600 / line-height 1.25 / #d8e1ec', source: '.sources-registry-header h3' },
  { item: 'Right panel title', value: '14px / 500 / line-height 1.35 / #d8e1ec', source: '.source-connector-header h2' },
  { item: 'Upper labels', value: '11px / 500 / uppercase / #8692a2', source: '.sources-registry-header p, .source-property-row dt' },
  { item: 'Table header', value: '11px / 500 / uppercase / #8692a2', source: '.source-registry-list-head' },
  { item: 'Row title', value: '12px / 500 / line-height 1.4 / #d8e1ec', source: '.source-registry-name strong' },
  { item: 'Row meta', value: '12px / normal / var(--muted)', source: '.source-registry-name small' },
  { item: 'Right panel value', value: '12px / 400 / line-height 1.45 / #d8e1ec', source: '.source-property-row dd' },
]

const componentSpecs = [
  { component: 'Main registry panel', required: 'Use .sources-registry-main values exactly. No alternate dark panels for registry screens.' },
  { component: 'Right configuration panel', required: 'Use .source-detail-panel geometry, padding, header divider and typography exactly.' },
  { component: 'Selected row', required: 'Use background rgba(22, 32, 45, 0.72) and box-shadow inset 2px 0 0 rgba(132, 200, 255, 0.8). No substitutes.' },
  { component: 'Hover row', required: 'Use the same background as selected only when the row is hovered. Selected state must persist after mouse leaves.' },
  { component: 'Tables', required: 'Use .source-registry-list, .source-registry-list-head and .source-registry-row structure unless a different column count is required.' },
  { component: 'Buttons', required: 'Use .secondary-button values from Sources. Hover must use rgba(18, 31, 47, 0.64), no brighter custom hover.' },
  { component: 'Close action', required: 'Use .source-detail-close-button: transparent, uppercase 11px, #8692a2, underline on hover.' },
  { component: 'Status dots', required: 'Use inline 5px dot pattern from .source-status-dot inside row or detail panel.' },
  { component: 'Validation workspaces', required: 'When restyling, copy Sources selected row, right panel and table tokens exactly. Do not invent new active colors.' },
]

const strictRules = [
  'Sources is the source of truth for new review-workspace content.',
  'Do not create similar colors. Copy exact CSS values or reuse existing Sources classes.',
  'Do not rename a visual pattern unless the CSS values are still identical to the Sources pattern.',
  'Selected, active and current states must use the selected row token exactly.',
  'Hover state may never replace the persistent selected state.',
  'Left review navigation remains locked and is outside this template.',
]

const getTokenSwatch = (value: string) => {
  if (value.startsWith('#') || value.startsWith('rgba')) return value
  if (value.startsWith('linear-gradient')) return value
  if (value.startsWith('inset')) return 'rgba(132, 200, 255, 0.8)'
  return 'transparent'
}

export function DesignTemplatePanel({ onBackToSettings }: DesignTemplatePanelProps) {
  return (
    <div className="app-shell">
      <header className="page-header page-header-row">
        <div>
          <p className="eyebrow">Semi Panels Hub</p>
          <h1>Design Template</h1>
          <p className="page-subtitle">Strict Sources-based UI specification. Exact values only.</p>
        </div>
        <div className="header-actions">
          <button type="button" className="header-button" onClick={onBackToSettings}>
            Back to Settings
          </button>
        </div>
      </header>

      <main className="page-content settings-layout design-template-layout">
        <section className="design-template-hero" aria-label="Template summary">
          <div>
            <p className="section-label">Source of Truth</p>
            <h2>Sources screen is the design contract</h2>
            <p>
              Build new review-workspace content by copying exact Sources tokens and component states.
              Similar colors, approximate highlights and invented active states are not allowed.
            </p>
          </div>
          <div className="design-template-lock">
            <span>LOCKED RULE</span>
            <strong>No interpretation</strong>
            <p>Use exact CSS values from this page or the existing Sources classes. If a value is missing, add it here first.</p>
          </div>
        </section>

        <section className="diagnostic-panel diagnostic-panel-wide" aria-label="Strict rules">
          <header className="diagnostic-panel-header">
            <h2>Strict Rules</h2>
            <span>{strictRules.length} rules</span>
          </header>
          <ol className="design-rule-list">
            {strictRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ol>
        </section>

        <section className="diagnostic-panel diagnostic-panel-wide" aria-label="Sources tokens">
          <header className="diagnostic-panel-header">
            <h2>Sources Tokens</h2>
            <span>{sourceTokens.length} exact values</span>
          </header>
          <div className="design-token-list">
            {sourceTokens.map((token) => (
              <div key={token.name} className="design-token-row">
                <span className="design-color-swatch" style={{ background: getTokenSwatch(token.value) }} />
                <strong>{token.name}</strong>
                <code>{token.value}</code>
                <span>{token.usage}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="design-template-grid" aria-label="Layout and typography specs">
          <article className="diagnostic-panel design-template-panel">
            <header className="diagnostic-panel-header">
              <h2>Layout Specs</h2>
              <span>{layoutSpecs.length} values</span>
            </header>
            <div className="diagnostic-table" role="table" aria-label="Layout specs">
              {layoutSpecs.map((spec) => (
                <div key={spec.item} className="diagnostic-row" role="row">
                  <span role="cell">{spec.item}</span>
                  <strong role="cell">{spec.value}</strong>
                  <span role="cell">{spec.source}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="diagnostic-panel design-template-panel">
            <header className="diagnostic-panel-header">
              <h2>Typography Specs</h2>
              <span>{typographySpecs.length} values</span>
            </header>
            <div className="diagnostic-table" role="table" aria-label="Typography specs">
              {typographySpecs.map((spec) => (
                <div key={spec.item} className="diagnostic-row" role="row">
                  <span role="cell">{spec.item}</span>
                  <strong role="cell">{spec.value}</strong>
                  <span role="cell">{spec.source}</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="diagnostic-panel diagnostic-panel-wide" aria-label="Component specs">
          <header className="diagnostic-panel-header">
            <h2>Component Specs</h2>
            <span>{componentSpecs.length} components</span>
          </header>
          <div className="diagnostic-table" role="table" aria-label="Component specs">
            {componentSpecs.map((spec) => (
              <div key={spec.component} className="diagnostic-row" role="row">
                <span role="cell">{spec.component}</span>
                <strong role="cell">{spec.required}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="diagnostic-panel diagnostic-panel-wide" aria-label="Approved selected row">
          <header className="diagnostic-panel-header">
            <h2>Approved Selected Row</h2>
            <span>copy exactly</span>
          </header>
          <div className="source-registry-list design-table-sample">
            <div className="source-registry-list-head" aria-hidden="true">
              <span />
              <span>Source</span>
              <span>Type</span>
              <span>File size</span>
              <span>Status</span>
            </div>
            <div className="source-registry-row source-registry-row-active">
              <span />
              <span className="source-registry-name">
                <strong>Selected row token</strong>
                <small>background rgba(22, 32, 45, 0.72)</small>
              </span>
              <span className="source-application-type">Exact Sources style</span>
              <span className="source-file-size">Required</span>
              <span className="source-status source-status-ready"><span className="source-status-dot" />Ready</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
