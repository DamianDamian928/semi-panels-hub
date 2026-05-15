import type { ApiConnectionState, DashboardRow } from '../types'
import { ApiStatusBanner } from './ApiStatusBanner'
import { statusClassName } from './sharedReviewUi'

type DashboardProps = {
  dashboardRows: DashboardRow[]
  isAdmin: boolean
  apiConnectionState: ApiConnectionState
  apiConnectionError: string | null
  onOpenReview: (reviewId: string) => void
  onOpenSettings: () => void
}

export function Dashboard({
  dashboardRows,
  isAdmin,
  apiConnectionState,
  apiConnectionError,
  onOpenReview,
  onOpenSettings,
}: DashboardProps) {
  return (
    <div className="app-shell">
      <header className="page-header page-header-row">
        <div>
          <p className="eyebrow">Semi Panels Hub</p>
          <h1>Dashboard</h1>
          <p className="page-subtitle">Review list with admin entry point to project edit mode.</p>
        </div>

        <div className="header-actions">
          <ApiStatusBanner state={apiConnectionState} error={apiConnectionError} />
          <button type="button" className="header-button" onClick={onOpenSettings}>
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
                        <button type="button" className="table-action" onClick={() => onOpenReview(row.id)}>
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
