import { useMemo, useState } from 'react'
import { Dashboard } from './components/Dashboard'
import { ReviewEditor } from './components/ReviewEditor'
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
  } = useTechnicalStatus(appView === 'settings-sources')

  const selectedReview = useMemo(
    () => workflowData.dashboardRows.find((row) => row.id === selectedReviewId) ?? null,
    [selectedReviewId, workflowData.dashboardRows],
  )

  if (appView === 'settings-sources') {
    return (
      <TechnicalStatusPanel
        technicalStatus={technicalStatus}
        technicalStatusError={technicalStatusError}
        technicalStatusRefreshing={technicalStatusRefreshing}
        technicalStatusFetchedAt={technicalStatusFetchedAt}
        onRefresh={() => {
          void refreshTechnicalStatus()
        }}
        onBackToDashboard={() => setAppView('dashboard')}
      />
    )
  }

  if (appView === 'review-editor' && selectedReview) {
    return (
      <ReviewEditor
        selectedReview={selectedReview}
        sourceDefinitions={workflowData.sourceDefinitions}
        validationStatesBySource={workflowData.validationStatesBySource}
        reviewIssues={workflowData.reviewIssues}
        decisionRecords={workflowData.decisionRecords}
        outputItems={workflowData.outputItems}
        auditEvents={workflowData.auditEvents}
        issueDecisionStates={workflowData.issueDecisionStates}
        issuePersistenceStates={workflowData.issuePersistenceStates}
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
        createSource={workflowData.createSource}
        deleteSource={workflowData.deleteSource}
        registerSourceLocalFile={workflowData.registerSourceLocalFile}
        checkSourcesAccess={workflowData.checkSourcesAccess}
        checkSourceAccess={workflowData.checkSourceAccess}
        markIssueForDecision={workflowData.markIssueForDecision}
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
      onOpenReview={(reviewId) => {
        setSelectedReviewId(reviewId)
        setAppView('review-editor')
      }}
      onOpenSettings={() => setAppView('settings-sources')}
    />
  )
}
