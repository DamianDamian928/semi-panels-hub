import { useCallback, useEffect, useState } from 'react'
import { localFileHelperHealthEndpoint } from '../localFileHelper'

type LocalFileHelperState = 'checking' | 'ready' | 'offline'

const helperStatusContent: Record<LocalFileHelperState, { label: string; title: string; message: string }> = {
  checking: {
    label: 'Checking',
    title: 'Local helper',
    message: 'Checking local file helper availability.',
  },
  ready: {
    label: 'Ready',
    title: 'Local helper',
    message: 'Local file and folder actions are available.',
  },
  offline: {
    label: 'Offline',
    title: 'Local helper',
    message: 'Start npm run helper or npm run start:local to enable local file and folder actions.',
  },
}

export function LocalFileHelperStatus() {
  const [state, setState] = useState<LocalFileHelperState>('checking')

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(localFileHelperHealthEndpoint)
      setState(response.ok ? 'ready' : 'offline')
    } catch {
      setState('offline')
    }
  }, [])

  useEffect(() => {
    void refresh()
    const intervalId = window.setInterval(() => {
      void refresh()
    }, 15000)

    return () => window.clearInterval(intervalId)
  }, [refresh])

  const content = helperStatusContent[state]

  return (
    <section
      className={`local-helper-status local-helper-status-${state}`}
      aria-live="polite"
      title={content.message}
    >
      <span className="local-helper-status-dot" aria-hidden="true" />
      <span>{content.label}</span>
      <strong>{content.title}</strong>
    </section>
  )
}
