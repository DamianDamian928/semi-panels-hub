import { useMemo, useState } from 'react'
import { Dashboard } from './components/Dashboard'
import { DesignTemplatePanel } from './components/DesignTemplatePanel'
import { ReviewEditor } from './components/ReviewEditor'
import { SettingsPanel } from './components/SettingsPanel'
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
        onOpenDiagnostics={() => setAppView('settings-diagnostics')}
        onOpenDesignTemplate={() => setAppView('settings-design-template')}
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
        validationStatesBySource={workflowData.validationStatesBySource}
        decisionRecords={workflowData.decisionRecords}
        outputItems={workflowData.outputItems}
        auditEvents={workflowData.auditEvents}
        issueDecisionStates={workflowData.issueDecisionStates}
        decisionStatuses={workflowData.decisionStatuses}
        decisionPersistenceStates={workflowData.decisionPersistenceStates}
        outputStatuses={workflowData.outputStatuses}
        outputPersistenceStates={workflowData.outputPersistenceStates}
        activeAuditEventId={workflowData.activeAuditEventId}
        setActiveAuditEventId={workflowData.setActiveAuditEventId}
        workflowView={workflowData.workflowView}
        localAuditEvents={workflowData.localAuditEvents}
        apiConnectionState={workflowData.apiConnectionState}
        apiConnectionError={workflowData.apiConnectionError}
        sourceConnectionsByTarget={workflowData.sourceConnectionsByTarget}
        sourceConnectionRolesByTarget={workflowData.sourceConnectionRolesByTarget}
        createSource={workflowData.createSource}
        deleteSource={workflowData.deleteSource}
        registerSourceLocalFile={workflowData.registerSourceLocalFile}
        checkSourcesAccess={workflowData.checkSourcesAccess}
        checkSourceAccess={workflowData.checkSourceAccess}
        refreshBootstrapData={workflowData.refreshBootstrapData}
        saveDecisionStatus={workflowData.setDecisionStatus}
        savePreparedOutput={workflowData.prepareOutput}
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
      onRefreshApi={workflowData.refreshBootstrapData}
      onOpenReview={(reviewId) => {
        setSelectedReviewId(reviewId)
        setAppView('review-editor')
      }}
      onOpenSettings={() => setAppView('settings')}
    />
  )
}
