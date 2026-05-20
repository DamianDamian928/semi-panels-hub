import { useEffect, useMemo, useRef, useState } from 'react'
import type { ApiConnectionState, DashboardRow, SourceReadStatus } from '../types'
import { ApiStatusBanner } from './ApiStatusBanner'
import { statusClassName } from './sharedReviewUi'

const sourceRefreshIntervalMs = 5 * 60 * 1000
type SortDirection = 'asc' | 'desc'

type DashboardColumn = {
  key: string
  label: string
  getValue: (row: DashboardRow) => string
}

const textCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
})

const strictNumberPattern = /^[+-]?\d+(?:[.,]\d+)?$/
const dateLikePattern = /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?$/

const compareDashboardValues = (leftValue: string, rightValue: string) => {
  const left = String(leftValue ?? '').trim()
  const right = String(rightValue ?? '').trim()

  if (!left && !right) return 0
  if (!left) return 1
  if (!right) return -1

  if (strictNumberPattern.test(left) && strictNumberPattern.test(right)) {
    return Number(left.replace(',', '.')) - Number(right.replace(',', '.'))
  }

  if (dateLikePattern.test(left) && dateLikePattern.test(right)) {
    const leftTime = Date.parse(left)
    const rightTime = Date.parse(right)
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) return leftTime - rightTime
  }

  return textCollator.compare(left, right)
}

type DashboardProps = {
  dashboardRows: DashboardRow[]
  isAdmin: boolean
  apiConnectionState: ApiConnectionState
  apiConnectionError: string | null
  sourceReadStatus: SourceReadStatus | null
  onRefreshApi: () => Promise<void>
  onOpenReview: (reviewId: string) => void
  onOpenSettings: () => void
}

export function Dashboard({
  dashboardRows,
  isAdmin,
  apiConnectionState,
  apiConnectionError,
  sourceReadStatus,
  onRefreshApi,
  onOpenReview,
  onOpenSettings,
}: DashboardProps) {
  const mappedColumns = dashboardRows.find((row) => row.dashboardColumns?.length)?.dashboardColumns ?? []
  const isMappedDashboard = mappedColumns.length > 0
  const [sortState, setSortState] = useState<{ key: string; direction: SortDirection } | null>(null)
  const [openSortMenuKey, setOpenSortMenuKey] = useState<string | null>(null)
  const refreshApiRef = useRef(onRefreshApi)
  const dashboardColumns = useMemo<DashboardColumn[]>(
    () => isMappedDashboard
      ? mappedColumns.map((column) => ({
          key: column,
          label: column,
          getValue: (row) => row.dashboardCells?.[column] ?? '',
        }))
      : [
          {
            key: 'intelModel',
            label: 'Intel Model',
            getValue: (row) => row.intelModel,
          },
          {
            key: 'status',
            label: 'Status',
            getValue: (row) => row.status,
          },
          {
            key: 'owner',
            label: 'Owner',
            getValue: (row) => row.owner,
          },
          {
            key: 'lastUpdated',
            label: 'Last updated',
            getValue: (row) => row.lastUpdated,
          },
        ],
    [isMappedDashboard, mappedColumns],
  )
  const sortedDashboardRows = useMemo(() => {
    if (!sortState) return dashboardRows

    const activeColumn = dashboardColumns.find((column) => column.key === sortState.key)
    if (!activeColumn) return dashboardRows

    return dashboardRows
      .map((row, index) => ({ row, index }))
      .sort((left, right) => {
        const result = compareDashboardValues(activeColumn.getValue(left.row), activeColumn.getValue(right.row))
        const directedResult = sortState.direction === 'asc' ? result : -result
        return directedResult || left.index - right.index
      })
      .map(({ row }) => row)
  }, [dashboardColumns, dashboardRows, sortState])

  const setColumnSort = (columnKey: string, direction: SortDirection) => {
    setSortState({ key: columnKey, direction })
    setOpenSortMenuKey(null)
  }

  const clearColumnSort = () => {
    setSortState(null)
    setOpenSortMenuKey(null)
  }

  const renderColumnHeader = (column: DashboardColumn) => {
    const isSortActive = sortState?.key === column.key
    const isMenuOpen = openSortMenuKey === column.key

    return (
      <th key={column.key} className={isSortActive ? 'dashboard-th-sorted' : undefined}>
        <div
          className="dashboard-column-header"
          onBlur={(event) => {
            const nextTarget = event.relatedTarget
            if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
              setOpenSortMenuKey(null)
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setOpenSortMenuKey(null)
            }
          }}
        >
          <span className="dashboard-column-label">{column.label}</span>
          {isSortActive ? (
            <span className="dashboard-sort-state">
              {sortState.direction === 'asc' ? 'A-Z' : 'Z-A'}
            </span>
          ) : null}
          <button
            type="button"
            className={`dashboard-column-menu-button ${isMenuOpen ? 'dashboard-column-menu-button-open' : ''}`}
            aria-label={`Open sort menu for ${column.label}`}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            onClick={() => setOpenSortMenuKey((current) => current === column.key ? null : column.key)}
          >
            <span className="dashboard-column-menu-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>

          {isMenuOpen ? (
            <div className="dashboard-sort-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => setColumnSort(column.key, 'asc')}>
                <span className="dashboard-sort-menu-icon dashboard-sort-menu-icon-asc" aria-hidden="true" />
                Sort A to Z
              </button>
              <button type="button" role="menuitem" onClick={() => setColumnSort(column.key, 'desc')}>
                <span className="dashboard-sort-menu-icon dashboard-sort-menu-icon-desc" aria-hidden="true" />
                Sort Z to A
              </button>
              <button type="button" role="menuitem" disabled={!sortState} onClick={clearColumnSort}>
                <span className="dashboard-sort-menu-icon dashboard-sort-menu-icon-clear" aria-hidden="true" />
                Clear sort
              </button>
            </div>
          ) : null}
        </div>
      </th>
    )
  }

  useEffect(() => {
    refreshApiRef.current = onRefreshApi
  }, [onRefreshApi])

  useEffect(() => {
    void refreshApiRef.current().catch(() => undefined)

    const refreshIntervalId = window.setInterval(() => {
      void refreshApiRef.current().catch(() => undefined)
    }, sourceRefreshIntervalMs)

    return () => window.clearInterval(refreshIntervalId)
  }, [])

  useEffect(() => {
    if (apiConnectionState !== 'error' && apiConnectionState !== 'offline') return

    const retryId = window.setTimeout(() => {
      void onRefreshApi().catch(() => undefined)
    }, 1500)

    return () => window.clearTimeout(retryId)
  }, [apiConnectionState, onRefreshApi])

  return (
    <div className="app-shell">
      <header className="page-header page-header-row">
        <div>
          <p className="eyebrow">Semi Panels Hub</p>
          <h1>Dashboard</h1>
          <p className="page-subtitle">Review list with admin entry point to project edit mode.</p>
        </div>

        <div className="header-actions">
          <ApiStatusBanner
            state={apiConnectionState}
            error={apiConnectionError}
            onRefresh={() => {
              void onRefreshApi().catch(() => undefined)
            }}
          />
          <div
            className={`source-read-status source-read-status-${sourceReadStatus?.status.toLowerCase().replace(/\s+/g, '-') ?? 'unknown'}`}
            title={sourceReadStatus?.message ?? 'Waiting for source read status.'}
          >
            Source read: {sourceReadStatus?.sourceReadAtLabel ?? 'Not available'}
          </div>
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
                  {dashboardColumns.map(renderColumnHeader)}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedDashboardRows.map((row) => (
                  <tr key={row.id}>
                    {isMappedDashboard ? (
                      mappedColumns.map((column) => (
                        <td key={column}>{row.dashboardCells?.[column] ?? ''}</td>
                      ))
                    ) : (
                      <>
                        <td>{row.intelModel}</td>
                        <td>
                          <span className={statusClassName[row.status]}>{row.status}</span>
                        </td>
                        <td>{row.owner}</td>
                        <td>{row.lastUpdated}</td>
                      </>
                    )}
                    <td className="dashboard-actions-cell">
                      <div className="dashboard-action-stack">
                        {isAdmin ? (
                          <button type="button" className="table-action" onClick={() => onOpenReview(row.id)}>
                            Edit
                          </button>
                        ) : null}
                        <button type="button" className="table-action table-action-secondary" disabled title="Open review view is planned.">
                          Open
                        </button>
                      </div>
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
