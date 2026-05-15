import type { ApiConnectionState } from '../types'

type ApiStatusBannerProps = {
  state: ApiConnectionState
  error: string | null
}

const apiStatusContent: Record<ApiConnectionState, { label: string; title: string; message: string }> = {
  loading: {
    label: 'Checking',
    title: 'Connecting to API',
    message: 'The app is loading workflow data from the backend.',
  },
  ready: {
    label: 'Online',
    title: 'API connected',
    message: 'Workflow data comes from the backend repository.',
  },
  offline: {
    label: 'Offline',
    title: 'API offline',
    message: 'Demo data is shown until the backend API is available.',
  },
  error: {
    label: 'Error',
    title: 'API returned an error',
    message: 'The last backend request failed. Check the API process before trusting workflow state.',
  },
}

export function ApiStatusBanner({ state, error }: ApiStatusBannerProps) {
  const content = apiStatusContent[state]
  const message = error ?? content.message

  return (
    <section className={`api-status-banner api-status-banner-${state}`} aria-live="polite" title={message}>
      <div className="api-status-banner-main">
        <span className="api-status-dot" aria-hidden="true" />
        <div>
          <span>{content.label}</span>
          <strong>{content.title}</strong>
        </div>
      </div>
      <p>{message}</p>
    </section>
  )
}
