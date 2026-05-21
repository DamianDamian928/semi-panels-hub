import type { StorageStatusPayload } from '../apiClient'

type StorageStatusPanelProps = {
  status: StorageStatusPayload | null
  loading: boolean
  error: string | null
}

const formatStorageTime = (value: string | null) => {
  if (!value) return 'Not recorded'

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value))
}

export function StorageStatusPanel({ status, loading, error }: StorageStatusPanelProps) {
  if (loading && !status) {
    return (
      <section className="storage-status-panel" aria-live="polite">
        <span>Data storage</span>
        <strong>Refreshing...</strong>
      </section>
    )
  }

  if (error) {
    return (
      <section className="storage-status-panel storage-status-panel-error" aria-live="polite" title={error}>
        <span>Data storage</span>
        <strong>Status unavailable</strong>
      </section>
    )
  }

  if (!status) return null

  return (
    <section className="storage-status-panel" aria-live="polite" title={status.detail}>
      <span>Data storage</span>
      <span className="storage-status-detail">
        <small>{status.storage}</small>
        <small>{status.records} records{status.mappedColumns !== undefined ? ` / ${status.mappedColumns} columns` : ''}</small>
        <small>Refreshed {formatStorageTime(status.refreshedAt)}</small>
      </span>
    </section>
  )
}
