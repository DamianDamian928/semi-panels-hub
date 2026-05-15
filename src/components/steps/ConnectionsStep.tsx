import type { BomStage, ConnectionTreeSection, MainStage, SourceDefinition } from '../../types'
import type { EditableConnectionCard } from '../sharedReviewUi'
import { formatFileModifiedAt, formatFileSize } from '../sharedReviewUi'

type ConnectionsStepProps = {
  activeMainStage: MainStage
  activeConnectionNodeId: string
  activeConnectionSections: ConnectionTreeSection[]
  activeConnectionCards: EditableConnectionCard[]
  activeConnectionLabel: string
  activeConnectionMainLabel: string
  sourceDefinitions: SourceDefinition[]
  onSelectConnectionNode: (nodeId: string, bomStage?: BomStage) => void
  onAddConnectionCard: (stageId: string) => void
  onRemoveConnectionCard: (stageId: string, cardId: string) => void
  onChooseConnectionFile: (stageId: string, cardId: string) => void
}

const nodeIdToBomStage = (nodeId: string): BomStage | undefined => {
  if (nodeId === 'matvar') return 'MATVAR'
  if (nodeId === 'l1') return 'L1'
  if (nodeId === 'l2') return 'L2'
  if (nodeId === 'l3') return 'L3'
  return undefined
}

export function ConnectionsStep({
  activeMainStage,
  activeConnectionNodeId,
  activeConnectionSections,
  activeConnectionCards,
  activeConnectionLabel,
  activeConnectionMainLabel,
  sourceDefinitions,
  onSelectConnectionNode,
  onAddConnectionCard,
  onRemoveConnectionCard,
  onChooseConnectionFile,
}: ConnectionsStepProps) {
  return (
    <section className="workspace-main-grid">
      <section className="workspace-main card connections-stage">
        <div className="connections-layout">
          <aside className="connections-tree" aria-label="Connection groups">
            {activeConnectionSections.map((section) => {
              const sectionActive = section.items?.some((item) => item.id === activeConnectionNodeId) ?? section.id === activeConnectionNodeId
              return (
                <div key={section.id} className={`connection-group ${sectionActive ? 'connection-group-active' : ''}`}>
                  <button type="button" className="connection-group-header">
                    <span className="connection-group-arrow">&gt;</span>
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
                              onSelectConnectionNode(
                                item.id,
                                activeMainStage === 'BOM' ? nodeIdToBomStage(item.id) : undefined,
                              )
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
              <div className="connections-card-header">
                <div className="connections-card-header-copy">
                  <p className="section-label">Active data connections</p>
                  <span className="connections-card-count">Sources in this stage: {activeConnectionCards.length}</span>
                </div>
                <button type="button" className="table-action" onClick={() => onAddConnectionCard(activeConnectionNodeId)}>
                  Add source
                </button>
              </div>
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
                      <button type="button" className="connection-source-menu">...</button>
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
                      <div className="connection-file-row">
                        <button
                          type="button"
                          className="connection-file-picker"
                          disabled={card.fileSelectionPending}
                          onClick={() => onChooseConnectionFile(activeConnectionNodeId, card.id)}
                        >
                          {card.fileSelectionPending ? 'Opening...' : 'Choose file'}
                        </button>
                        <p className="connection-file-note">
                          {card.fileSelectionPending
                            ? 'Opening file dialog...'
                            : card.selectedFileName
                              ? `Selected: ${card.selectedFileName}`
                              : 'No file selected'}
                        </p>
                      </div>

                      {card.selectedFilePath ? (
                        <dl className="connection-file-details">
                          <div>
                            <dt>Name</dt>
                            <dd>{card.selectedFileName}</dd>
                          </div>
                          <div>
                            <dt>Path</dt>
                            <dd>{card.selectedFilePath}</dd>
                          </div>
                          <div>
                            <dt>Folder</dt>
                            <dd>{card.selectedFileDirectory}</dd>
                          </div>
                          <div>
                            <dt>Type</dt>
                            <dd>{card.selectedFileExtension || 'No extension'}</dd>
                          </div>
                          <div>
                            <dt>Size</dt>
                            <dd>{formatFileSize(card.selectedFileSizeBytes ?? 0)}</dd>
                          </div>
                          <div>
                            <dt>Modified</dt>
                            <dd>{card.selectedFileModifiedAt ? formatFileModifiedAt(card.selectedFileModifiedAt) : 'Unknown'}</dd>
                          </div>
                        </dl>
                      ) : null}

                      {card.fileSelectionError ? (
                        <p className="connection-file-error">{card.fileSelectionError}</p>
                      ) : null}
                    </div>

                    <div className="connection-card-footer">
                      <button
                        type="button"
                        className="table-action connection-remove-button"
                        onClick={() => onRemoveConnectionCard(activeConnectionNodeId, card.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              {activeConnectionCards.length === 0 ? (
                <div className="connections-empty-state">
                  <div>
                    <h4>No sources in this stage</h4>
                    <p>Add the first source tile for {activeConnectionMainLabel} &gt; {activeConnectionLabel}.</p>
                  </div>
                  <button type="button" className="table-action" onClick={() => onAddConnectionCard(activeConnectionNodeId)}>
                    Add source
                  </button>
                </div>
              ) : null}
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
            <dt>Sources in stage</dt>
            <dd>{activeConnectionCards.length}</dd>
          </div>
          <div>
            <dt>Mode</dt>
            <dd>Manual source assignment</dd>
          </div>
        </dl>
      </aside>
    </section>
  )
}
