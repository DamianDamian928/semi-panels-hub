import { useEffect, useMemo, useRef, useState } from 'react'
import type { ApiConnectionState, DashboardRow, SourceReadStatus } from '../types'
import { ApiStatusBanner } from './ApiStatusBanner'
import { statusClassName } from './sharedReviewUi'

const sourceRefreshIntervalMs = 5 * 60 * 1000
type SortDirection = 'asc' | 'desc'
type SortKind = 'value' | 'forecastStatus'
type ForecastStatusFilter = 'ORDERED' | 'FORECAST' | 'PLACED' | 'No status'
type SortMenuPosition = {
  top: number
  left: number
}

type DashboardColumn = {
  key: string
  label: string
  getValue: (row: DashboardRow) => string
}

const preferredMappedDashboardColumns = ['INTEL Description', 'ORACLE Item Description', 'Item', 'Scope']
const forecastStatusOrder = ['ORDERED', 'FORECAST', 'PLACED'] as const
const forecastStatusFilters: ForecastStatusFilter[] = [...forecastStatusOrder, 'No status']

const normalizeDashboardColumn = (column: string) => column.trim().replace(/\s+/g, ' ').toLowerCase()
const normalizeForecastStatus = (status?: string) => String(status ?? '').trim().toUpperCase()
const isIntelDescriptionColumn = (columnKey: string) => normalizeDashboardColumn(columnKey) === 'intel description'
const isScopeColumn = (columnKey: string) => normalizeDashboardColumn(columnKey) === 'scope'
const getForecastStatusRank = (status?: string) => {
  const rank = forecastStatusOrder.indexOf(normalizeForecastStatus(status) as typeof forecastStatusOrder[number])
  return rank === -1 ? Number.MAX_SAFE_INTEGER : rank
}

const getForecastStatusFilterSummary = (filters: ForecastStatusFilter[]) => {
  if (filters.length === 0) return ''
  if (filters.length === 1) return '1 filter'
  return `${filters.length} filters`
}

const getScopeFilterSummary = (filters: string[]) => {
  if (filters.length === 0) return ''
  if (filters.length <= 2) return filters.join(', ')
  return `${filters[0]} +${filters.length - 1}`
}

const orderMappedDashboardColumns = (columns: string[]) => {
  const columnOrder = new Map(
    preferredMappedDashboardColumns.map((column, index) => [normalizeDashboardColumn(column), index]),
  )

  return [...columns].sort((left, right) => {
    const leftOrder = columnOrder.get(normalizeDashboardColumn(left)) ?? Number.MAX_SAFE_INTEGER
    const rightOrder = columnOrder.get(normalizeDashboardColumn(right)) ?? Number.MAX_SAFE_INTEGER

    return leftOrder - rightOrder
  })
}

const getMappedDashboardColumnLabel = (column: string) => {
  const normalizedColumn = normalizeDashboardColumn(column)

  if (normalizedColumn === 'intel description') return 'Intel description'
  if (normalizedColumn === 'oracle item description') return 'Oracle Item description'
  if (normalizedColumn === 'item') return 'Matvar'

  return column
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
  const [sortState, setSortState] = useState<{ key: string; direction: SortDirection; kind: SortKind } | null>(null)
  const [forecastStatusFiltersState, setForecastStatusFiltersState] = useState<ForecastStatusFilter[]>([])
  const [scopeFiltersState, setScopeFiltersState] = useState<string[]>([])
  const [openSortMenuKey, setOpenSortMenuKey] = useState<string | null>(null)
  const [sortMenuPosition, setSortMenuPosition] = useState<SortMenuPosition | null>(null)
  const refreshApiRef = useRef(onRefreshApi)
  const scopeColumnKey = mappedColumns.find((column) => isScopeColumn(column)) ?? null
  const dashboardColumns = useMemo<DashboardColumn[]>(
    () => isMappedDashboard
      ? orderMappedDashboardColumns(mappedColumns).map((column) => ({
          key: column,
          label: getMappedDashboardColumnLabel(column),
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
  const scopeFilterOptions = useMemo(() => {
    if (!scopeColumnKey) return []

    return [...new Set(dashboardRows
      .map((row) => String(row.dashboardCells?.[scopeColumnKey] ?? '').trim())
      .filter(Boolean))]
      .sort((left, right) => textCollator.compare(left, right))
  }, [dashboardRows, scopeColumnKey])

  const filteredDashboardRows = useMemo(() => {
    return dashboardRows.filter((row) => {
      const status = normalizeForecastStatus(row.forecastStatus)
      const matchesForecastStatus = forecastStatusFiltersState.length === 0 || forecastStatusFiltersState.some((filter) => (
        filter === 'No status'
          ? !status
          : status === filter
      ))
      const scope = scopeColumnKey ? String(row.dashboardCells?.[scopeColumnKey] ?? '').trim() : ''
      const matchesScope = scopeFiltersState.length === 0 || scopeFiltersState.includes(scope)

      return matchesForecastStatus && matchesScope
    })
  }, [dashboardRows, forecastStatusFiltersState, scopeColumnKey, scopeFiltersState])

  const sortedDashboardRows = useMemo(() => {
    if (!sortState) return filteredDashboardRows

    const activeColumn = dashboardColumns.find((column) => column.key === sortState.key)
    if (!activeColumn) return filteredDashboardRows

    return filteredDashboardRows
      .map((row, index) => ({ row, index }))
      .sort((left, right) => {
        if (sortState.kind === 'forecastStatus') {
          const statusResult = getForecastStatusRank(left.row.forecastStatus) - getForecastStatusRank(right.row.forecastStatus)
          const descriptionResult = compareDashboardValues(activeColumn.getValue(left.row), activeColumn.getValue(right.row))

          return statusResult || descriptionResult || left.index - right.index
        }

        const valueResult = compareDashboardValues(activeColumn.getValue(left.row), activeColumn.getValue(right.row))
        const directedResult = sortState.direction === 'asc' ? valueResult : -valueResult

        return directedResult || left.index - right.index
      })
      .map(({ row }) => row)
  }, [dashboardColumns, filteredDashboardRows, sortState])

  const setColumnSort = (columnKey: string, direction: SortDirection) => {
    setSortState({ key: columnKey, direction, kind: 'value' })
    setOpenSortMenuKey(null)
    setSortMenuPosition(null)
  }

  const setForecastStatusSort = (columnKey: string) => {
    setSortState({ key: columnKey, direction: 'asc', kind: 'forecastStatus' })
    setOpenSortMenuKey(null)
    setSortMenuPosition(null)
  }

  const clearColumnSort = () => {
    setSortState(null)
    setOpenSortMenuKey(null)
    setSortMenuPosition(null)
  }

  const clearForecastStatusFilters = () => {
    setForecastStatusFiltersState([])
  }

  const clearScopeFilters = () => {
    setScopeFiltersState([])
  }

  const toggleForecastStatusFilter = (status: ForecastStatusFilter) => {
    setForecastStatusFiltersState((current) =>
      current.includes(status)
        ? current.filter((item) => item !== status)
        : [...current, status],
    )
  }

  const toggleScopeFilter = (scope: string) => {
    setScopeFiltersState((current) =>
      current.includes(scope)
        ? current.filter((item) => item !== scope)
        : [...current, scope],
    )
  }

  const toggleSortMenu = (columnKey: string, button: HTMLButtonElement) => {
    const buttonRect = button.getBoundingClientRect()
    const menuWidth = 220

    setOpenSortMenuKey((current) => current === columnKey ? null : columnKey)
    setSortMenuPosition({
      top: buttonRect.bottom + 8,
      left: Math.min(
        Math.max(8, buttonRect.right - menuWidth),
        window.innerWidth - menuWidth - 8,
      ),
    })
  }

  const renderMappedDashboardCell = (row: DashboardRow, column: DashboardColumn) => {
    if (!isIntelDescriptionColumn(column.key)) return column.getValue(row)

    return (
      <div className="dashboard-intel-description-cell">
        <span>{column.getValue(row)}</span>
        {row.forecastStatus ? (
          <span className={`dashboard-forecast-status dashboard-forecast-status-${row.forecastStatus.toLowerCase()}`}>
            <span className="dashboard-forecast-status-dot" aria-hidden="true" />
            {row.forecastStatus}
          </span>
        ) : null}
      </div>
    )
  }

  const renderColumnHeader = (column: DashboardColumn) => {
    const isSortActive = sortState?.key === column.key
    const isMenuOpen = openSortMenuKey === column.key
    const isIntelDescription = isMappedDashboard && isIntelDescriptionColumn(column.key)
    const isScope = isMappedDashboard && isScopeColumn(column.key)
    const forecastStatusFilterSummary = getForecastStatusFilterSummary(forecastStatusFiltersState)
    const scopeFilterSummary = getScopeFilterSummary(scopeFiltersState)

    return (
      <th key={column.key} className={isSortActive ? 'dashboard-th-sorted' : undefined}>
        <div
          className="dashboard-column-header"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setOpenSortMenuKey(null)
              setSortMenuPosition(null)
            }
          }}
        >
          <span className="dashboard-column-label">{column.label}</span>
          {isSortActive ? (
            <span className="dashboard-sort-state">
              {sortState.kind === 'forecastStatus'
                ? 'STATUS'
                : sortState.direction === 'asc' ? 'A-Z' : 'Z-A'}
            </span>
          ) : null}
          {isIntelDescription && forecastStatusFilterSummary ? (
            <span className="dashboard-sort-state dashboard-filter-state">
              {forecastStatusFilterSummary}
            </span>
          ) : null}
          {isScope && scopeFilterSummary ? (
            <span className="dashboard-sort-state dashboard-filter-state" title={scopeFiltersState.join(', ')}>
              {scopeFilterSummary}
            </span>
          ) : null}
          <button
            type="button"
            className={`dashboard-column-menu-button ${isMenuOpen ? 'dashboard-column-menu-button-open' : ''}`}
            aria-label={`Open sort menu for ${column.label}`}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            onClick={(event) => toggleSortMenu(column.key, event.currentTarget)}
          >
            <span className="dashboard-column-menu-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </th>
    )
  }

  const renderSortMenu = () => {
    if (!openSortMenuKey || !sortMenuPosition) return null

    const column = dashboardColumns.find((item) => item.key === openSortMenuKey)
    if (!column) return null

    const isIntelDescription = isMappedDashboard && isIntelDescriptionColumn(column.key)
    const isScope = isMappedDashboard && isScopeColumn(column.key)

    return (
      <div
        className="dashboard-sort-menu dashboard-sort-menu-fixed"
        role="menu"
        style={{
          top: sortMenuPosition.top,
          left: sortMenuPosition.left,
        }}
      >
        <button type="button" role="menuitem" onClick={() => setColumnSort(column.key, 'asc')}>
          <span className="dashboard-sort-menu-icon dashboard-sort-menu-icon-asc" aria-hidden="true" />
          Sort A to Z
        </button>
        <button type="button" role="menuitem" onClick={() => setColumnSort(column.key, 'desc')}>
          <span className="dashboard-sort-menu-icon dashboard-sort-menu-icon-desc" aria-hidden="true" />
          Sort Z to A
        </button>
        {isIntelDescription ? (
          <>
            <button type="button" role="menuitem" onClick={() => setForecastStatusSort(column.key)}>
              <span className="dashboard-sort-menu-icon dashboard-sort-menu-icon-status" aria-hidden="true" />
              Sort by status
            </button>
            <div className="dashboard-sort-menu-section" role="group" aria-label="Filter by forecast status">
              <span className="dashboard-sort-menu-label">Filter status</span>
              <button
                type="button"
                role="menuitem"
                disabled={forecastStatusFiltersState.length === 0}
                onClick={clearForecastStatusFilters}
              >
                <span className="dashboard-sort-menu-icon dashboard-sort-menu-icon-clear" aria-hidden="true" />
                All statuses
              </button>
              {forecastStatusFilters.map((status) => {
                const isFilterSelected = forecastStatusFiltersState.includes(status)

                return (
                  <button
                    key={status}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={isFilterSelected}
                    className={isFilterSelected ? 'dashboard-sort-menu-selected' : undefined}
                    onClick={() => toggleForecastStatusFilter(status)}
                  >
                    <span className="dashboard-sort-menu-icon dashboard-sort-menu-icon-check" aria-hidden="true" />
                    {status}
                  </button>
                )
              })}
            </div>
          </>
        ) : null}
        {isScope ? (
          <div className="dashboard-sort-menu-section" role="group" aria-label="Filter by scope">
            <span className="dashboard-sort-menu-label">Filter scope</span>
            <button
              type="button"
              role="menuitem"
              disabled={scopeFiltersState.length === 0}
              onClick={clearScopeFilters}
            >
              <span className="dashboard-sort-menu-icon dashboard-sort-menu-icon-clear" aria-hidden="true" />
              All scopes
            </button>
            {scopeFilterOptions.map((scope) => {
              const isFilterSelected = scopeFiltersState.includes(scope)

              return (
                <button
                  key={scope}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={isFilterSelected}
                  className={isFilterSelected ? 'dashboard-sort-menu-selected' : undefined}
                  onClick={() => toggleScopeFilter(scope)}
                >
                  <span className="dashboard-sort-menu-icon dashboard-sort-menu-icon-check" aria-hidden="true" />
                  {scope}
                </button>
              )
            })}
          </div>
        ) : null}
        <button type="button" role="menuitem" disabled={!sortState} onClick={clearColumnSort}>
          <span className="dashboard-sort-menu-icon dashboard-sort-menu-icon-clear" aria-hidden="true" />
          Clear sort
        </button>
      </div>
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

  useEffect(() => {
    setScopeFiltersState((current) => current.filter((scope) => scopeFilterOptions.includes(scope)))
  }, [scopeFilterOptions])

  useEffect(() => {
    if (!openSortMenuKey) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (
        target?.closest('.dashboard-sort-menu') ||
        target?.closest('.dashboard-column-menu-button')
      ) {
        return
      }

      setOpenSortMenuKey(null)
      setSortMenuPosition(null)
    }

    window.addEventListener('pointerdown', handlePointerDown)

    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [openSortMenuKey])

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
                {sortedDashboardRows.length > 0 ? sortedDashboardRows.map((row) => (
                  <tr key={row.id}>
                    {isMappedDashboard ? (
                      dashboardColumns.map((column) => (
                        <td key={column.key}>{renderMappedDashboardCell(row, column)}</td>
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
                        <button type="button" className="table-action table-action-secondary" disabled title="Open review view will use Decision data in a future pass.">
                          Open
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td className="dashboard-empty-cell" colSpan={dashboardColumns.length + 1}>
                      No dashboard rows match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      {renderSortMenu()}
    </div>
  )
}
