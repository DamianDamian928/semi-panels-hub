import { useMemo, useState } from 'react'
import { Dashboard } from './components/Dashboard'
import { DesignTemplatePanel } from './components/DesignTemplatePanel'
import { PdfReviewPanel } from './components/PdfReviewPanel'
import { ReviewEditor } from './components/ReviewEditor'
import { SettingsPanel } from './components/SettingsPanel'
import { SettingsSourcesPanel } from './components/SettingsSourcesPanel'
import { TechnicalStatusPanel } from './components/TechnicalStatusPanel'
import { useTechnicalStatus } from './hooks/useTechnicalStatus'
import { useWorkflowData } from './hooks/useWorkflowData'
import type { AppView } from './types'

export default function App() {
  const [isAdmin] = useState(true)
  const [appView, setAppView] = useState<AppView>('dashboard')
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null)
  const workflowData = useWorkflowData()
  const {
    technicalStatus,
    technicalStatusError,
    technicalStatusRefreshing,
    technicalStatusFetchedAt,
    refreshTechnicalStatus,
  } = useTechnicalStatus(appView === 'settings-diagnostics')

  const selectedReview = useMemo(
    () => workflowData.dashboardRows.find((row) => row.id === selectedReviewId) ?? null,
    [selectedReviewId, workflowData.dashboardRows],
  )

  if (appView === 'settings') {
    return (
      <SettingsPanel
        onOpenSources={() => setAppView('settings-sources')}
        onOpenDiagnostics={() => setAppView('settings-diagnostics')}
        onOpenDesignTemplate={() => setAppView('settings-design-template')}
        onBackToDashboard={() => setAppView('dashboard')}
      />
    )
  }

  if (appView === 'settings-sources') {
    return (
      <SettingsSourcesPanel
        sourceDefinitions={workflowData.sourceDefinitions}
        createSource={workflowData.createSource}
        updateSourceConfiguration={workflowData.updateSourceConfiguration}
        registerSourceLocalFile={workflowData.registerSourceLocalFile}
        checkSourcesAccess={workflowData.checkSourcesAccess}
        checkSourceAccess={workflowData.checkSourceAccess}
        onBackToSettings={() => setAppView('settings')}
        onBackToDashboard={() => setAppView('dashboard')}
      />
    )
  }

  if (appView === 'settings-design-template') {
    return (
      <DesignTemplatePanel
        onBackToSettings={() => setAppView('settings')}
      />
    )
  }

  if (appView === 'settings-diagnostics') {
    return (
      <TechnicalStatusPanel
        technicalStatus={technicalStatus}
        technicalStatusError={technicalStatusError}
        technicalStatusRefreshing={technicalStatusRefreshing}
        technicalStatusFetchedAt={technicalStatusFetchedAt}
        onRefresh={() => {
          void refreshTechnicalStatus()
        }}
        onBackToSettings={() => setAppView('settings')}
      />
    )
  }

  if (appView === 'review-editor' && selectedReview) {
    return (
      <ReviewEditor
        selectedReview={selectedReview}
        sourceDefinitions={workflowData.sourceDefinitions}
        apiConnectionState={workflowData.apiConnectionState}
        apiConnectionError={workflowData.apiConnectionError}
        createSource={workflowData.createSource}
        updateSourceConfiguration={workflowData.updateSourceConfiguration}
        registerSourceLocalFile={workflowData.registerSourceLocalFile}
        checkSourcesAccess={workflowData.checkSourcesAccess}
        checkSourceAccess={workflowData.checkSourceAccess}
        onBackToDashboard={() => setAppView('dashboard')}
      />
    )
  }

  if (appView === 'pdf-review') {
    return (
      <PdfReviewPanel
        onBackToDashboard={() => setAppView('dashboard')}
      />
    )
  }

  return (
    <Dashboard
      dashboardRows={workflowData.dashboardRows}
      isAdmin={isAdmin}
      apiConnectionState={workflowData.apiConnectionState}
      apiConnectionError={workflowData.apiConnectionError}
      sourceReadStatus={workflowData.sourceReadStatus}
      matvarForecastValidationStatus={workflowData.matvarForecastValidationStatus}
      onRefreshApi={workflowData.refreshBootstrapData}
      onOpenReview={(reviewId) => {
        setSelectedReviewId(reviewId)
        setAppView('review-editor')
      }}
      onOpenPdfReview={() => setAppView('pdf-review')}
      onOpenSettings={() => setAppView('settings')}
    />
  )
}
