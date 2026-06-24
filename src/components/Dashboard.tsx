import { useEffect, useMemo, useRef, useState } from 'react'
import type { ApiConnectionState, DashboardRow, MatvarForecastValidationStatus, SourceReadStatus } from '../types'
import { localFileOpenLocationEndpoint } from '../localFileHelper'
import { ApiStatusBanner } from './ApiStatusBanner'
import { statusClassName } from './sharedReviewUi'

const sourceRefreshIntervalMs = 5 * 60 * 1000
type SortDirection = 'asc' | 'desc'
type SortKind = 'value' | 'forecastStatus'
type ForecastStatusFilter = 'CANCELED' | 'FORECAST' | 'ORDERED' | 'PLACED' | 'PO_ISSUE' | 'SHIPPED' | 'No status'
type DashboardSortState = { key: string; direction: SortDirection; kind: SortKind }
type DashboardPreferences = {
  sortState: DashboardSortState | null
  forecastStatusFilters: ForecastStatusFilter[]
  scopeFilters: string[]
  implementationStepFilters: string[]
  implementationStepValidFilters: string[]
  columnTextFilters: Record<string, string>
  latestWatlowRtdOnly: boolean
}
type SortMenuPosition = {
  top: number
  left: number
}

type DashboardColumn = {
  key: string
  label: string
  getValue: (row: DashboardRow) => string
}

const preferredMappedDashboardColumns = [
  'INTEL Description',
  'ORACLE Item Description',
  'Item',
  'Scope',
  'INTEL RTD',
  'WATLOW RTD',
  'Implementation step',
  'Last update',
  'Implementation step valid (po okresie 3 miesięcy dokumentacja wymaga aktualiazacji)',
  'WO',
  'INTEL PO #',
]
const forecastStatusOrder = ['CANCELED', 'FORECAST', 'ORDERED', 'PLACED', 'PO_ISSUE', 'SHIPPED'] as const
const forecastStatusFilters: ForecastStatusFilter[] = [...forecastStatusOrder, 'No status']
const dashboardPreferencesStorageKey = 'semi-panels-hub.dashboard.preferences.v2'

const normalizeDashboardColumn = (column: string) => column.trim().replace(/\s+/g, ' ').toLowerCase()
const normalizeForecastStatus = (status?: string) => String(status ?? '').trim().toUpperCase()
const isIntelDescriptionColumn = (columnKey: string) => normalizeDashboardColumn(columnKey) === 'intel description'
const isScopeColumn = (columnKey: string) => normalizeDashboardColumn(columnKey) === 'scope'
const isIntelPoColumn = (columnKey: string) => normalizeDashboardColumn(columnKey) === 'intel po #'
const isWatlowRtdColumn = (columnKey: string) => normalizeDashboardColumn(columnKey) === 'watlow rtd'
const isImplementationStepColumn = (columnKey: string) => normalizeDashboardColumn(columnKey) === 'implementation step'
const isImplementationStepValidColumn = (columnKey: string) =>
  normalizeDashboardColumn(columnKey).startsWith('implementation step valid')
const getForecastStatusRank = (status?: string) => {
  const rank = forecastStatusOrder.indexOf(normalizeForecastStatus(status) as typeof forecastStatusOrder[number])
  return rank === -1 ? Number.MAX_SAFE_INTEGER : rank
}

const getForecastStatusFilterSummary = (filters: ForecastStatusFilter[]) => {
  if (filters.length === 0) return ''
  if (filters.length === 1) return '1 filter'
  return `${filters.length} filters`
}

const getDefaultDashboardPreferences = (): DashboardPreferences => ({
  sortState: null,
  forecastStatusFilters: [],
  scopeFilters: [],
  implementationStepFilters: [],
  implementationStepValidFilters: [],
  columnTextFilters: {},
  latestWatlowRtdOnly: false,
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isSortDirection = (value: unknown): value is SortDirection =>
  value === 'asc' || value === 'desc'

const isSortKind = (value: unknown): value is SortKind =>
  value === 'value' || value === 'forecastStatus'

const isForecastStatusFilter = (value: unknown): value is ForecastStatusFilter =>
  typeof value === 'string' && forecastStatusFilters.includes(value as ForecastStatusFilter)

const isDashboardSortState = (value: unknown): value is DashboardSortState =>
  isRecord(value) &&
  typeof value.key === 'string' &&
  value.key.length > 0 &&
  isSortDirection(value.direction) &&
  isSortKind(value.kind)

const getStoredDashboardPreferences = (): DashboardPreferences => {
  const fallbackPreferences = getDefaultDashboardPreferences()
  if (typeof window === 'undefined') return fallbackPreferences

  try {
    const rawPreferences = window.localStorage.getItem(dashboardPreferencesStorageKey)
    if (!rawPreferences) return fallbackPreferences

    const parsedPreferences: unknown = JSON.parse(rawPreferences)
    if (!isRecord(parsedPreferences)) return fallbackPreferences

    const forecastStatusFiltersValue = parsedPreferences.forecastStatusFilters
    const scopeFiltersValue = parsedPreferences.scopeFilters
    const implementationStepFiltersValue = parsedPreferences.implementationStepFilters
    const implementationStepValidFiltersValue = parsedPreferences.implementationStepValidFilters
    const columnTextFiltersValue = parsedPreferences.columnTextFilters

    return {
      sortState: isDashboardSortState(parsedPreferences.sortState) ? parsedPreferences.sortState : null,
      forecastStatusFilters: Array.isArray(forecastStatusFiltersValue)
        ? [...new Set(forecastStatusFiltersValue.filter(isForecastStatusFilter))]
        : [],
      scopeFilters: Array.isArray(scopeFiltersValue)
        ? [...new Set(scopeFiltersValue.filter((scope): scope is string => typeof scope === 'string' && scope.length > 0))]
        : [],
      implementationStepFilters: Array.isArray(implementationStepFiltersValue)
        ? [...new Set(implementationStepFiltersValue
          .filter((value): value is string => typeof value === 'string' && value.length > 0))]
        : [],
      implementationStepValidFilters: Array.isArray(implementationStepValidFiltersValue)
        ? [...new Set(implementationStepValidFiltersValue
          .filter((value): value is string => typeof value === 'string' && value.length > 0))]
        : [],
      columnTextFilters: isRecord(columnTextFiltersValue)
        ? Object.fromEntries(Object.entries(columnTextFiltersValue)
          .filter((entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string'))
        : {},
      latestWatlowRtdOnly: parsedPreferences.latestWatlowRtdOnly === true,
    }
  } catch {
    return fallbackPreferences
  }
}

const saveDashboardPreferences = (preferences: DashboardPreferences) => {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(dashboardPreferencesStorageKey, JSON.stringify(preferences))
  } catch {
    // Browser storage can be unavailable in private mode or locked-down environments.
  }
}

const getScopeFilterSummary = (filters: string[]) => {
  if (filters.length === 0) return ''
  if (filters.length <= 2) return filters.join(', ')
  return `${filters[0]} +${filters.length - 1}`
}

const getValueFilterSummary = (filters: string[]) => {
  if (filters.length === 0) return ''
  if (filters.length === 1) return '1 value'
  return `${filters.length} values`
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

const compareDashboardValues = (leftValue: string, rightValue: string) => {
  const left = String(leftValue ?? '').trim()
  const right = String(rightValue ?? '').trim()

  if (!left && !right) return 0
  if (!left) return 1
  if (!right) return -1

  if (strictNumberPattern.test(left) && strictNumberPattern.test(right)) {
    return Number(left.replace(',', '.')) - Number(right.replace(',', '.'))
  }

  const leftDateTime = parseDashboardDateValue(left)
  const rightDateTime = parseDashboardDateValue(right)
  if (leftDateTime !== null && rightDateTime !== null) {
    return leftDateTime - rightDateTime
  }

  return textCollator.compare(left, right)
}

const normalizeColumnSearchValue = (value: string) => value.trim().toLowerCase()

const getDashboardBaseRowId = (row: DashboardRow) => row.id.replace(/-forecast-\d+-\d+$/, '')

const parseDashboardDateValue = (value: string) => {
  const text = String(value ?? '').trim()
  if (!text) return null

  const dotMatch = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (dotMatch) {
    const day = Number(dotMatch[1])
    const month = Number(dotMatch[2])
    const year = Number(dotMatch[3])
    const time = Date.UTC(year, month - 1, day)
    return Number.isFinite(time) ? time : null
  }

  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashMatch) {
    const day = Number(slashMatch[1])
    const month = Number(slashMatch[2])
    const year = Number(slashMatch[3])
    const time = Date.UTC(year, month - 1, day)
    return Number.isFinite(time) ? time : null
  }

  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (isoMatch) {
    const year = Number(isoMatch[1])
    const month = Number(isoMatch[2])
    const day = Number(isoMatch[3])
    const time = Date.UTC(year, month - 1, day)
    return Number.isFinite(time) ? time : null
  }

  const parsedTime = Date.parse(text)
  return Number.isFinite(parsedTime) ? parsedTime : null
}

type DashboardProps = {
  dashboardRows: DashboardRow[]
  isAdmin: boolean
  apiConnectionState: ApiConnectionState
  apiConnectionError: string | null
  sourceReadStatus: SourceReadStatus | null
  matvarForecastValidationStatus: MatvarForecastValidationStatus | null
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
  matvarForecastValidationStatus,
  onRefreshApi,
  onOpenReview,
  onOpenSettings,
}: DashboardProps) {
  const mappedColumns = dashboardRows.find((row) => row.dashboardColumns?.length)?.dashboardColumns ?? []
  const isMappedDashboard = mappedColumns.length > 0
  const [initialDashboardPreferences] = useState(getStoredDashboardPreferences)
  const [sortState, setSortState] = useState<DashboardSortState | null>(initialDashboardPreferences.sortState)
  const [forecastStatusFiltersState, setForecastStatusFiltersState] = useState<ForecastStatusFilter[]>(
    initialDashboardPreferences.forecastStatusFilters,
  )
  const [scopeFiltersState, setScopeFiltersState] = useState<string[]>(initialDashboardPreferences.scopeFilters)
  const [implementationStepFiltersState, setImplementationStepFiltersState] = useState<string[]>(
    initialDashboardPreferences.implementationStepFilters,
  )
  const [implementationStepValidFiltersState, setImplementationStepValidFiltersState] = useState<string[]>(
    initialDashboardPreferences.implementationStepValidFilters,
  )
  const [columnTextFiltersState, setColumnTextFiltersState] = useState<Record<string, string>>(
    initialDashboardPreferences.columnTextFilters,
  )
  const [latestWatlowRtdOnly, setLatestWatlowRtdOnly] = useState(initialDashboardPreferences.latestWatlowRtdOnly)
  const [isMatvarValidationOpen, setIsMatvarValidationOpen] = useState(false)
  const [isRefreshingSources, setIsRefreshingSources] = useState(false)
  const [openSortMenuKey, setOpenSortMenuKey] = useState<string | null>(null)
  const [sortMenuPosition, setSortMenuPosition] = useState<SortMenuPosition | null>(null)
  const refreshApiRef = useRef(onRefreshApi)
  const dashboardTableWrapRef = useRef<HTMLDivElement | null>(null)
  const dashboardTableRef = useRef<HTMLTableElement | null>(null)
  const fixedScrollbarRef = useRef<HTMLDivElement | null>(null)
  const isSyncingScrollRef = useRef(false)
  const [dashboardScrollMetrics, setDashboardScrollMetrics] = useState({
    scrollWidth: 0,
    clientWidth: 0,
    left: 0,
  })
  const scopeColumnKey = mappedColumns.find((column) => isScopeColumn(column)) ?? null
  const watlowRtdColumnKey = mappedColumns.find((column) => isWatlowRtdColumn(column)) ?? null
  const implementationStepColumnKey = mappedColumns.find((column) => isImplementationStepColumn(column)) ?? null
  const implementationStepValidColumnKey = mappedColumns.find((column) => isImplementationStepValidColumn(column)) ?? null
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
  const implementationStepFilterOptions = useMemo(() => {
    if (!implementationStepColumnKey) return []

    return [...new Set(dashboardRows
      .map((row) => String(row.dashboardCells?.[implementationStepColumnKey] ?? '').trim())
      .filter(Boolean))]
      .sort((left, right) => textCollator.compare(left, right))
  }, [dashboardRows, implementationStepColumnKey])
  const implementationStepValidFilterOptions = useMemo(() => {
    if (!implementationStepValidColumnKey) return []

    return [...new Set(dashboardRows
      .map((row) => String(row.dashboardCells?.[implementationStepValidColumnKey] ?? '').trim())
      .filter(Boolean))]
      .sort((left, right) => textCollator.compare(left, right))
  }, [dashboardRows, implementationStepValidColumnKey])

  const filteredDashboardRows = useMemo(() => {
    const activeColumnFilters = dashboardColumns
      .map((column) => ({
        column,
        filter: normalizeColumnSearchValue(columnTextFiltersState[column.key] ?? ''),
      }))
      .filter((entry) => entry.filter.length > 0)

    return dashboardRows.filter((row) => {
      const status = normalizeForecastStatus(row.forecastStatus)
      const matchesForecastStatus = forecastStatusFiltersState.length === 0 || forecastStatusFiltersState.some((filter) => (
        filter === 'No status'
          ? !status
          : status === filter
      ))
      const scope = scopeColumnKey ? String(row.dashboardCells?.[scopeColumnKey] ?? '').trim() : ''
      const matchesScope = scopeFiltersState.length === 0 || scopeFiltersState.includes(scope)
      const implementationStep = implementationStepColumnKey
        ? String(row.dashboardCells?.[implementationStepColumnKey] ?? '').trim()
        : ''
      const matchesImplementationStep = implementationStepFiltersState.length === 0 ||
        implementationStepFiltersState.includes(implementationStep)
      const implementationStepValid = implementationStepValidColumnKey
        ? String(row.dashboardCells?.[implementationStepValidColumnKey] ?? '').trim()
        : ''
      const matchesImplementationStepValid = implementationStepValidFiltersState.length === 0 ||
        implementationStepValidFiltersState.includes(implementationStepValid)
      const matchesColumnFilters = activeColumnFilters.every(({ column, filter }) => {
        const value = isIntelDescriptionColumn(column.key)
          ? `${column.getValue(row)} ${row.forecastStatus ?? ''}`
          : column.getValue(row)

        return normalizeColumnSearchValue(value).includes(filter)
      })

      return matchesForecastStatus &&
        matchesScope &&
        matchesImplementationStep &&
        matchesImplementationStepValid &&
        matchesColumnFilters
    })
  }, [
    columnTextFiltersState,
    dashboardColumns,
    dashboardRows,
    forecastStatusFiltersState,
    implementationStepColumnKey,
    implementationStepFiltersState,
    implementationStepValidColumnKey,
    implementationStepValidFiltersState,
    scopeColumnKey,
    scopeFiltersState,
  ])

  const latestWatlowRtdFilteredRows = useMemo(() => {
    if (!latestWatlowRtdOnly || !watlowRtdColumnKey) return filteredDashboardRows

    const rowsByBaseId = new Map<string, DashboardRow[]>()
    filteredDashboardRows.forEach((row) => {
      const baseId = getDashboardBaseRowId(row)
      rowsByBaseId.set(baseId, [...(rowsByBaseId.get(baseId) ?? []), row])
    })

    return Array.from(rowsByBaseId.values()).flatMap((rows) => {
      if (rows.length <= 1) return rows

      const rowDateEntries = rows
        .map((row) => ({
          row,
          time: parseDashboardDateValue(row.dashboardCells?.[watlowRtdColumnKey] ?? ''),
        }))
        .filter((entry): entry is { row: DashboardRow; time: number } => entry.time !== null)

      if (!rowDateEntries.length) return rows

      const latestTime = Math.max(...rowDateEntries.map((entry) => entry.time))
      return rowDateEntries
        .filter((entry) => entry.time === latestTime)
        .map((entry) => entry.row)
    })
  }, [filteredDashboardRows, latestWatlowRtdOnly, watlowRtdColumnKey])

  const sortedDashboardRows = useMemo(() => {
    if (!sortState) return latestWatlowRtdFilteredRows

    const activeColumn = dashboardColumns.find((column) => column.key === sortState.key)
    if (!activeColumn) return latestWatlowRtdFilteredRows

    return latestWatlowRtdFilteredRows
      .map((row, index) => ({ row, index }))
      .sort((left, right) => {
        if (sortState.kind === 'forecastStatus') {
          const statusResult = getForecastStatusRank(left.row.forecastStatus) - getForecastStatusRank(right.row.forecastStatus)
          const directedStatusResult = sortState.direction === 'asc' ? statusResult : -statusResult
          const descriptionResult = compareDashboardValues(activeColumn.getValue(left.row), activeColumn.getValue(right.row))

          return directedStatusResult || descriptionResult || left.index - right.index
        }

        const valueResult = compareDashboardValues(activeColumn.getValue(left.row), activeColumn.getValue(right.row))
        const directedResult = sortState.direction === 'asc' ? valueResult : -valueResult

        return directedResult || left.index - right.index
      })
      .map(({ row }) => row)
  }, [dashboardColumns, latestWatlowRtdFilteredRows, sortState])

  const setColumnSort = (columnKey: string, direction: SortDirection) => {
    setSortState({ key: columnKey, direction, kind: 'value' })
    setOpenSortMenuKey(null)
    setSortMenuPosition(null)
  }

  const setForecastStatusSort = (columnKey: string, direction: SortDirection) => {
    setSortState({ key: columnKey, direction, kind: 'forecastStatus' })
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

  const clearImplementationStepFilters = () => {
    setImplementationStepFiltersState([])
  }

  const clearImplementationStepValidFilters = () => {
    setImplementationStepValidFiltersState([])
  }

  const clearDashboardFilters = () => {
    setForecastStatusFiltersState([])
    setScopeFiltersState([])
    setImplementationStepFiltersState([])
    setImplementationStepValidFiltersState([])
    setColumnTextFiltersState({})
    setLatestWatlowRtdOnly(false)
  }

  const setColumnTextFilter = (columnKey: string, value: string) => {
    setColumnTextFiltersState((current) => {
      const nextFilters = {
        ...current,
        [columnKey]: value,
      }

      if (!value.trim()) {
        delete nextFilters[columnKey]
      }

      return nextFilters
    })
  }

  const clearColumnTextFilter = (columnKey: string) => {
    setColumnTextFiltersState((current) => {
      const nextFilters = { ...current }
      delete nextFilters[columnKey]
      return nextFilters
    })
  }

  const activeColumnTextFilters = dashboardColumns
    .map((column) => ({
      column,
      value: columnTextFiltersState[column.key] ?? '',
    }))
    .filter(({ value }) => value.trim().length > 0)
  const hasActiveDashboardFilters = forecastStatusFiltersState.length > 0 ||
    scopeFiltersState.length > 0 ||
    implementationStepFiltersState.length > 0 ||
    implementationStepValidFiltersState.length > 0 ||
    activeColumnTextFilters.length > 0 ||
    latestWatlowRtdOnly
  const activeDashboardFilterCount = forecastStatusFiltersState.length +
    scopeFiltersState.length +
    implementationStepFiltersState.length +
    implementationStepValidFiltersState.length +
    activeColumnTextFilters.length +
    (latestWatlowRtdOnly ? 1 : 0)

  const openPoDocument = async (path: string) => {
    try {
      const response = await fetch(localFileOpenLocationEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path, openMode: 'file' }),
      })

      if (!response.ok) {
        throw new Error('Could not open PO document.')
      }
    } catch (error) {
      console.error(error)
    }
  }

  const syncDashboardScroll = (source: HTMLDivElement | null, target: HTMLDivElement | null) => {
    if (!source || !target || isSyncingScrollRef.current) return

    isSyncingScrollRef.current = true
    target.scrollLeft = source.scrollLeft
    window.requestAnimationFrame(() => {
      isSyncingScrollRef.current = false
    })
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

  const toggleImplementationStepFilter = (value: string) => {
    setImplementationStepFiltersState((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    )
  }

  const toggleImplementationStepValidFilter = (value: string) => {
    setImplementationStepValidFiltersState((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    )
  }

  const refreshSourceData = async () => {
    if (isRefreshingSources) return

    setIsRefreshingSources(true)
    try {
      await onRefreshApi()
    } finally {
      setIsRefreshingSources(false)
    }
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
    if (isIntelPoColumn(column.key)) {
      return (
        <span className="dashboard-po-cell">
          <span>{column.getValue(row)}</span>
          {row.poDocuments?.map((document) => (
            <button
              key={document.path}
              type="button"
              className="dashboard-po-document-button"
              title={`Open ${document.name}`}
              aria-label={`Open PO ${document.poNumber}`}
              onClick={(event) => {
                event.stopPropagation()
                void openPoDocument(document.path)
              }}
            >
              <span className="dashboard-po-document-icon" aria-hidden="true" />
            </button>
          ))}
        </span>
      )
    }

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
    const isWatlowRtd = isMappedDashboard && isWatlowRtdColumn(column.key)
    const isImplementationStep = isMappedDashboard && isImplementationStepColumn(column.key)
    const isImplementationStepValid = isMappedDashboard && isImplementationStepValidColumn(column.key)
    const forecastStatusFilterSummary = getForecastStatusFilterSummary(forecastStatusFiltersState)
    const scopeFilterSummary = getScopeFilterSummary(scopeFiltersState)
    const implementationStepFilterSummary = getValueFilterSummary(implementationStepFiltersState)
    const implementationStepValidFilterSummary = getValueFilterSummary(implementationStepValidFiltersState)
    const columnTextFilter = columnTextFiltersState[column.key] ?? ''
    const hasColumnIndicator = isSortActive ||
      Boolean(columnTextFilter) ||
      (isWatlowRtd && latestWatlowRtdOnly) ||
      (isIntelDescription && Boolean(forecastStatusFilterSummary)) ||
      (isScope && Boolean(scopeFilterSummary)) ||
      (isImplementationStep && Boolean(implementationStepFilterSummary)) ||
      (isImplementationStepValid && Boolean(implementationStepValidFilterSummary))

    return (
      <th
        key={column.key}
        className={[
          isSortActive ? 'dashboard-th-sorted' : '',
          columnTextFilter ? 'dashboard-th-filtered' : '',
        ].filter(Boolean).join(' ') || undefined}
      >
        <div
          className="dashboard-column-header"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setOpenSortMenuKey(null)
              setSortMenuPosition(null)
            }
          }}
        >
          <span className="dashboard-column-main">
            <span className="dashboard-column-title-row">
              <span className="dashboard-column-label">{column.label}</span>
              {hasColumnIndicator ? (
                <span className="dashboard-column-active-indicator" aria-label="Column has active sort or filter" title="Column has active sort or filter" />
              ) : null}
            </span>
          </span>
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
    const isWatlowRtd = isMappedDashboard && isWatlowRtdColumn(column.key)
    const isImplementationStep = isMappedDashboard && isImplementationStepColumn(column.key)
    const isImplementationStepValid = isMappedDashboard && isImplementationStepValidColumn(column.key)
    const columnTextFilter = columnTextFiltersState[column.key] ?? ''

    return (
      <div
        className="dashboard-sort-menu dashboard-sort-menu-fixed"
        role="menu"
        style={{
          top: sortMenuPosition.top,
          left: sortMenuPosition.left,
        }}
      >
        <div className="dashboard-sort-menu-section dashboard-sort-menu-search-section" role="group" aria-label={`Search ${column.label}`}>
          <span className="dashboard-sort-menu-label">Search column</span>
          <label className="dashboard-column-search">
            <span className="sr-only">Search {column.label}</span>
            <input
              type="search"
              value={columnTextFilter}
              placeholder="Type to filter"
              aria-label={`Search ${column.label}`}
              autoFocus
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setOpenSortMenuKey(null)
                  setSortMenuPosition(null)
                }
              }}
              onChange={(event) => setColumnTextFilter(column.key, event.target.value)}
            />
          </label>
          <button
            type="button"
            role="menuitem"
            disabled={!columnTextFilter}
            onClick={() => clearColumnTextFilter(column.key)}
          >
            <span className="dashboard-sort-menu-icon dashboard-sort-menu-icon-clear" aria-hidden="true" />
            Clear search
          </button>
        </div>
        <button type="button" role="menuitem" onClick={() => setColumnSort(column.key, 'asc')}>
          <span className="dashboard-sort-menu-icon dashboard-sort-menu-icon-asc" aria-hidden="true" />
          Sort A to Z
        </button>
        <button type="button" role="menuitem" onClick={() => setColumnSort(column.key, 'desc')}>
          <span className="dashboard-sort-menu-icon dashboard-sort-menu-icon-desc" aria-hidden="true" />
          Sort Z to A
        </button>
        {isWatlowRtd ? (
          <div className="dashboard-sort-menu-section" role="group" aria-label="Filter by latest WATLOW RTD">
            <span className="dashboard-sort-menu-label">Latest date</span>
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={latestWatlowRtdOnly}
              className={latestWatlowRtdOnly ? 'dashboard-sort-menu-selected' : undefined}
              onClick={() => setLatestWatlowRtdOnly((current) => !current)}
            >
              <span className="dashboard-sort-menu-icon dashboard-sort-menu-icon-check" aria-hidden="true" />
              Latest WATLOW RTD only
            </button>
          </div>
        ) : null}
        {isIntelDescription ? (
          <>
            <button type="button" role="menuitem" onClick={() => setForecastStatusSort(column.key, 'asc')}>
              <span className="dashboard-sort-menu-icon dashboard-sort-menu-icon-status" aria-hidden="true" />
              Sort status A to Z
            </button>
            <button type="button" role="menuitem" onClick={() => setForecastStatusSort(column.key, 'desc')}>
              <span className="dashboard-sort-menu-icon dashboard-sort-menu-icon-status" aria-hidden="true" />
              Sort status Z to A
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
        {isImplementationStep ? (
          <div className="dashboard-sort-menu-section" role="group" aria-label="Filter by implementation step value">
            <span className="dashboard-sort-menu-label">Filter values</span>
            <button
              type="button"
              role="menuitem"
              disabled={implementationStepFiltersState.length === 0}
              onClick={clearImplementationStepFilters}
            >
              <span className="dashboard-sort-menu-icon dashboard-sort-menu-icon-clear" aria-hidden="true" />
              All values
            </button>
            {implementationStepFilterOptions.map((value) => {
              const isFilterSelected = implementationStepFiltersState.includes(value)

              return (
                <button
                  key={value}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={isFilterSelected}
                  className={isFilterSelected ? 'dashboard-sort-menu-selected' : undefined}
                  onClick={() => toggleImplementationStepFilter(value)}
                >
                  <span className="dashboard-sort-menu-icon dashboard-sort-menu-icon-check" aria-hidden="true" />
                  {value}
                </button>
              )
            })}
          </div>
        ) : null}
        {isImplementationStepValid ? (
          <div className="dashboard-sort-menu-section" role="group" aria-label="Filter by implementation step valid value">
            <span className="dashboard-sort-menu-label">Filter values</span>
            <button
              type="button"
              role="menuitem"
              disabled={implementationStepValidFiltersState.length === 0}
              onClick={clearImplementationStepValidFilters}
            >
              <span className="dashboard-sort-menu-icon dashboard-sort-menu-icon-clear" aria-hidden="true" />
              All values
            </button>
            {implementationStepValidFilterOptions.map((value) => {
              const isFilterSelected = implementationStepValidFiltersState.includes(value)

              return (
                <button
                  key={value}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={isFilterSelected}
                  className={isFilterSelected ? 'dashboard-sort-menu-selected' : undefined}
                  onClick={() => toggleImplementationStepValidFilter(value)}
                >
                  <span className="dashboard-sort-menu-icon dashboard-sort-menu-icon-check" aria-hidden="true" />
                  {value}
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
    saveDashboardPreferences({
      sortState,
      forecastStatusFilters: forecastStatusFiltersState,
      scopeFilters: scopeFiltersState,
      implementationStepFilters: implementationStepFiltersState,
      implementationStepValidFilters: implementationStepValidFiltersState,
      columnTextFilters: columnTextFiltersState,
      latestWatlowRtdOnly,
    })
  }, [
    columnTextFiltersState,
    forecastStatusFiltersState,
    implementationStepFiltersState,
    implementationStepValidFiltersState,
    latestWatlowRtdOnly,
    scopeFiltersState,
    sortState,
  ])

  useEffect(() => {
    if (!scopeColumnKey) return

    setScopeFiltersState((current) => current.filter((scope) => scopeFilterOptions.includes(scope)))
  }, [scopeColumnKey, scopeFilterOptions])

  useEffect(() => {
    if (!implementationStepColumnKey) return

    setImplementationStepFiltersState((current) =>
      current.filter((value) => implementationStepFilterOptions.includes(value)))
  }, [implementationStepColumnKey, implementationStepFilterOptions])

  useEffect(() => {
    if (!implementationStepValidColumnKey) return

    setImplementationStepValidFiltersState((current) =>
      current.filter((value) => implementationStepValidFilterOptions.includes(value)))
  }, [implementationStepValidColumnKey, implementationStepValidFilterOptions])

  useEffect(() => {
    const tableWrap = dashboardTableWrapRef.current
    const table = dashboardTableRef.current
    if (!tableWrap || !table) return

    const updateScrollMetrics = () => {
      const tableWrapRect = tableWrap.getBoundingClientRect()

      setDashboardScrollMetrics({
        scrollWidth: table.scrollWidth,
        clientWidth: tableWrap.clientWidth,
        left: tableWrapRect.left,
      })

      if (fixedScrollbarRef.current) {
        fixedScrollbarRef.current.scrollLeft = tableWrap.scrollLeft
      }
    }

    updateScrollMetrics()
    window.addEventListener('resize', updateScrollMetrics)

    const resizeObserver = new ResizeObserver(updateScrollMetrics)
    resizeObserver.observe(tableWrap)
    resizeObserver.observe(table)

    return () => {
      window.removeEventListener('resize', updateScrollMetrics)
      resizeObserver.disconnect()
    }
  }, [dashboardColumns.length, sortedDashboardRows.length])

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

  const matvarValidationStatus = matvarForecastValidationStatus?.status ?? 'Unavailable'
  const matvarValidationLabel = matvarForecastValidationStatus
    ? matvarValidationStatus === 'Valid'
      ? 'Matvar OK'
      : matvarValidationStatus === 'Error'
        ? `Matvar issues: ${matvarForecastValidationStatus.issueCount}`
        : 'Matvar unavailable'
    : 'Matvar check...'
  const matvarValidationDetail = matvarForecastValidationStatus?.message ?? 'Matvar forecast validation is loading.'
  const matvarValidationStatusClass = matvarValidationStatus.toLowerCase()
  const matvarValidationRefreshedAt = matvarForecastValidationStatus?.refreshedAt
    ? matvarForecastValidationStatus.refreshedAt.replace('T', ' ').slice(0, 19)
    : 'Not available'

  return (
    <div className="app-shell dashboard-shell">
      <header className="page-header page-header-row">
        <div>
          <p className="eyebrow">Semi Panels Hub</p>
          <h1>Dashboard</h1>
          <p className="page-subtitle">Review list with admin entry point to project edit mode.</p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className={`dashboard-matvar-status dashboard-matvar-status-header dashboard-matvar-status-${matvarValidationStatusClass}`}
            onClick={() => setIsMatvarValidationOpen(true)}
            title={matvarValidationDetail}
          >
            <span className="dashboard-matvar-status-dot" aria-hidden="true" />
            {matvarValidationLabel}
          </button>
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
          <button
            type="button"
            className={`source-refresh-button ${isRefreshingSources ? 'source-refresh-button-active' : ''}`}
            onClick={() => {
              void refreshSourceData().catch(() => undefined)
            }}
            disabled={isRefreshingSources}
            title="Refresh source data"
            aria-label="Refresh source data"
          >
            <span className="source-refresh-icon" aria-hidden="true" />
          </button>
          <button type="button" className="header-button" onClick={onOpenSettings}>
            Settings
          </button>
        </div>
      </header>

      <main className="page-content">
        <section className="card" aria-label="Review list">
          <div className="dashboard-filter-summary" aria-label="Dashboard controls and validation status">
            <div className="dashboard-filter-summary-main">
              {hasActiveDashboardFilters ? (
                <>
                <button type="button" className="dashboard-filter-summary-trigger" aria-haspopup="true">
                  Filters
                  <span>{activeDashboardFilterCount}</span>
                </button>
                <div className="dashboard-filter-popover" role="dialog" aria-label="Active filter details">
                  <div className="dashboard-filter-popover-header">
                    <span>Active filters</span>
                    <span>{activeDashboardFilterCount}</span>
                  </div>
                  <div className="dashboard-filter-chips">
                    {forecastStatusFiltersState.map((status) => (
                      <button
                        key={`status-${status}`}
                        type="button"
                        className="dashboard-filter-chip"
                        onClick={() => toggleForecastStatusFilter(status)}
                        aria-label={`Remove status filter ${status}`}
                      >
                        Status: {status}
                        <span aria-hidden="true">x</span>
                      </button>
                    ))}
                    {scopeFiltersState.map((scope) => (
                      <button
                        key={`scope-${scope}`}
                        type="button"
                        className="dashboard-filter-chip"
                        onClick={() => toggleScopeFilter(scope)}
                        aria-label={`Remove scope filter ${scope}`}
                      >
                        Scope: {scope}
                        <span aria-hidden="true">x</span>
                      </button>
                    ))}
                    {implementationStepFiltersState.map((value) => (
                      <button
                        key={`implementation-step-${value}`}
                        type="button"
                        className="dashboard-filter-chip"
                        onClick={() => toggleImplementationStepFilter(value)}
                        aria-label={`Remove implementation step filter ${value}`}
                      >
                        Implementation step: {value}
                        <span aria-hidden="true">x</span>
                      </button>
                    ))}
                    {implementationStepValidFiltersState.map((value) => (
                      <button
                        key={`implementation-valid-${value}`}
                        type="button"
                        className="dashboard-filter-chip"
                        onClick={() => toggleImplementationStepValidFilter(value)}
                        aria-label={`Remove implementation step valid filter ${value}`}
                      >
                        Implementation valid: {value}
                        <span aria-hidden="true">x</span>
                      </button>
                    ))}
                    {activeColumnTextFilters.map(({ column, value }) => (
                      <button
                        key={`search-${column.key}`}
                        type="button"
                        className="dashboard-filter-chip"
                        onClick={() => clearColumnTextFilter(column.key)}
                        aria-label={`Remove search filter for ${column.label}`}
                      >
                        {column.label}: {value}
                        <span aria-hidden="true">x</span>
                      </button>
                    ))}
                    {latestWatlowRtdOnly ? (
                      <button
                        type="button"
                        className="dashboard-filter-chip"
                        onClick={() => setLatestWatlowRtdOnly(false)}
                        aria-label="Remove latest WATLOW RTD filter"
                      >
                        WATLOW RTD: latest per matched item
                        <span aria-hidden="true">x</span>
                      </button>
                    ) : null}
                  </div>
                </div>
                </>
              ) : null}
            </div>
            <div className="dashboard-filter-summary-actions">
              <span className="dashboard-filter-result-count">
                Showing {sortedDashboardRows.length} of {dashboardRows.length}
              </span>
              {hasActiveDashboardFilters ? (
                <button type="button" className="dashboard-filter-clear-all" onClick={clearDashboardFilters}>
                  Clear filters
                </button>
              ) : null}
            </div>
          </div>
          <div
            ref={dashboardTableWrapRef}
            className="table-wrap dashboard-table-wrap"
            onScroll={() => syncDashboardScroll(dashboardTableWrapRef.current, fixedScrollbarRef.current)}
          >
            <table ref={dashboardTableRef}>
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
      {isMatvarValidationOpen ? (
        <div
          className="dashboard-validation-modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsMatvarValidationOpen(false)
          }}
        >
          <div
            className="dashboard-validation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-matvar-validation-title"
          >
            <div className="dashboard-validation-modal-header">
              <div>
                <span className="dashboard-validation-modal-eyebrow">Forecast validation</span>
                <h2 id="dashboard-matvar-validation-title">Matvar mapping check</h2>
                <p>{matvarValidationDetail}</p>
              </div>
              <button
                type="button"
                className="dashboard-validation-modal-close"
                aria-label="Close Matvar validation details"
                onClick={() => setIsMatvarValidationOpen(false)}
              >
                x
              </button>
            </div>
            <div className="dashboard-validation-modal-summary">
              <div>
                <span>Status</span>
                <strong>{matvarValidationStatus}</strong>
              </div>
              <div>
                <span>Checked rows</span>
                <strong>{matvarForecastValidationStatus?.checkedRows ?? 0}</strong>
              </div>
              <div>
                <span>Issues</span>
                <strong>{matvarForecastValidationStatus?.issueCount ?? 0}</strong>
              </div>
              <div>
                <span>Refreshed</span>
                <strong>{matvarValidationRefreshedAt}</strong>
              </div>
            </div>
            {matvarForecastValidationStatus?.issues.length ? (
              <div className="dashboard-validation-issues-wrap">
                <table className="dashboard-validation-issues-table">
                  <thead>
                    <tr>
                      <th>Forecast row</th>
                      <th>Intel Model Number Item</th>
                      <th>Forecast MVAR</th>
                      <th>Expected MVAR</th>
                      <th>Issue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matvarForecastValidationStatus.issues.map((issue) => (
                      <tr key={issue.id}>
                        <td>{issue.rowNumber}</td>
                        <td>{issue.intelModelNumberItem || '-'}</td>
                        <td>{issue.forecastMvar || '-'}</td>
                        <td>{issue.expectedMvar || '-'}</td>
                        <td>{issue.issue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="dashboard-validation-empty">
                No mismatched Forecast INTEL MODEL NUMBER ITEM / MVAR pairs were found.
              </div>
            )}
          </div>
        </div>
      ) : null}
      {dashboardScrollMetrics.scrollWidth > dashboardScrollMetrics.clientWidth ? (
        <div
          ref={fixedScrollbarRef}
          className="dashboard-fixed-scrollbar"
          style={{
            left: dashboardScrollMetrics.left,
            width: dashboardScrollMetrics.clientWidth,
          }}
          aria-hidden="true"
          onScroll={() => syncDashboardScroll(fixedScrollbarRef.current, dashboardTableWrapRef.current)}
        >
          <div style={{ width: dashboardScrollMetrics.scrollWidth }} />
        </div>
      ) : null}
    </div>
  )
}
