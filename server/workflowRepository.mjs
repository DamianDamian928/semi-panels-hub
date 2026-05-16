import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import {
  auditEvents,
  decisionRecords,
  outputItems,
  reviewIssues,
  reviews,
  sources,
  validationStatesBySource,
} from './seedData.mjs'
import { buildWorkflowView } from './workflowViewModel.mjs'

const serverDirectory = dirname(fileURLToPath(import.meta.url))
const dataDirectory = process.env.API_DATA_DIR ?? join(serverDirectory, 'data')

if (!existsSync(dataDirectory)) {
  mkdirSync(dataDirectory, { recursive: true })
}

export const databasePath = process.env.API_DB_PATH ?? join(dataDirectory, 'semi-panels-hub.sqlite')

const db = new DatabaseSync(databasePath)

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS app_records (
    collection TEXT NOT NULL,
    record_id TEXT NOT NULL,
    payload TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (collection, record_id)
  );

  CREATE TABLE IF NOT EXISTS workflow_state (
    kind TEXT NOT NULL,
    record_id TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (kind, record_id)
  );
`)

const countRecordsStatement = db.prepare('SELECT COUNT(*) AS count FROM app_records WHERE collection = ?')
const insertRecordStatement = db.prepare(`
  INSERT INTO app_records (collection, record_id, payload, position)
  VALUES (?, ?, ?, ?)
`)
const upsertRecordStatement = db.prepare(`
  INSERT INTO app_records (collection, record_id, payload, position)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(collection, record_id) DO UPDATE SET
    payload = excluded.payload,
    position = excluded.position
`)
const deleteRecordStatement = db.prepare(`
  DELETE FROM app_records
  WHERE collection = ? AND record_id = ?
`)
const deleteCollectionStatement = db.prepare(`
  DELETE FROM app_records
  WHERE collection = ?
`)
const nextRecordPositionStatement = db.prepare(`
  SELECT COALESCE(MAX(position), -1) + 1 AS position
  FROM app_records
  WHERE collection = ?
`)
const listRecordsStatement = db.prepare(`
  SELECT payload
  FROM app_records
  WHERE collection = ?
  ORDER BY position ASC, record_id ASC
`)
const getRecordStatement = db.prepare(`
  SELECT payload
  FROM app_records
  WHERE collection = ? AND record_id = ?
`)
const updateRecordStatement = db.prepare(`
  UPDATE app_records
  SET payload = ?
  WHERE collection = ? AND record_id = ?
`)
const listStateStatement = db.prepare(`
  SELECT record_id, value
  FROM workflow_state
  WHERE kind = ?
`)
const setStateStatement = db.prepare(`
  INSERT INTO workflow_state (kind, record_id, value)
  VALUES (?, ?, ?)
  ON CONFLICT(kind, record_id) DO UPDATE SET value = excluded.value
`)
const nextAuditPositionStatement = db.prepare(`
  SELECT COALESCE(MIN(position), 0) - 1 AS position
  FROM app_records
  WHERE collection = 'audit_events'
`)

const serialize = (value) => JSON.stringify(value)
const parse = (value) => JSON.parse(value)

const insertSeedCollection = (collection, records, getRecordId) => {
  records.forEach((record, index) => {
    insertRecordStatement.run(collection, getRecordId(record), serialize(record), index)
  })
}

const seedIfNeeded = () => {
  const { count } = countRecordsStatement.get('reviews')
  if (count > 0) return

  db.exec('BEGIN')

  try {
    insertSeedCollection('reviews', reviews, (record) => record.id)
    insertSeedCollection('sources', sources, (record) => record.id)
    insertSeedCollection('review_issues', reviewIssues, (record) => record.id)
    insertSeedCollection('decision_records', decisionRecords, (record) => record.issueId)
    insertSeedCollection('output_items', outputItems, (record) => record.id)
    insertSeedCollection('audit_events', auditEvents, (record) => record.id)
    insertSeedCollection(
      'validation_states',
      Object.entries(validationStatesBySource).map(([sourceName, value]) => ({
        sourceName,
        ...value,
      })),
      (record) => record.sourceName,
    )

    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

seedIfNeeded()

const listRecords = (collection) => listRecordsStatement.all(collection).map((row) => parse(row.payload))

const getRecord = (collection, id) => {
  const row = getRecordStatement.get(collection, id)
  return row ? parse(row.payload) : undefined
}

const updateRecord = (collection, id, payload) => {
  updateRecordStatement.run(serialize(payload), collection, id)
}

const upsertRecord = (collection, id, payload, position) => {
  upsertRecordStatement.run(collection, id, serialize(payload), position)
}

const deleteRecord = (collection, id) => {
  deleteRecordStatement.run(collection, id)
}

const replaceCollection = (collection, records, getRecordId) => {
  db.exec('BEGIN')

  try {
    deleteCollectionStatement.run(collection)
    insertSeedCollection(collection, records, getRecordId)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

const getStateMap = (kind) =>
  Object.fromEntries(listStateStatement.all(kind).map((row) => [row.record_id, row.value]))

const setState = (kind, id, value) => {
  setStateStatement.run(kind, id, value)
}

const updateValidationState = (sourceName, value) => {
  const existingRecord = getRecord('validation_states', sourceName)
  const position = existingRecord ? undefined : nextRecordPositionStatement.get('validation_states').position

  if (existingRecord) {
    updateRecord('validation_states', sourceName, {
      sourceName,
      ...value,
    })
    return
  }

  upsertRecord('validation_states', sourceName, {
    sourceName,
    ...value,
  }, position)
}

const getValidationStates = () =>
  Object.fromEntries(
    listRecords('validation_states').map(({ sourceName, state, message }) => [
      sourceName,
      { state, message },
    ]),
  )

const addAuditEvent = (event) => {
  const { position } = nextAuditPositionStatement.get()
  insertRecordStatement.run('audit_events', event.id, serialize(event), position)
}

const getSourceConnections = () =>
  getRecord('source_connections', 'default')?.connectionsByTarget ?? null

const saveSourceConnections = (connectionsByTarget) => {
  upsertRecord('source_connections', 'default', {
    connectionsByTarget,
    updatedAt: new Date().toISOString(),
  }, 0)
}

const getSourceMappings = () =>
  getRecord('source_mappings', 'default')?.mappingConfigs ?? {}

const saveSourceMappings = (mappingConfigs) => {
  upsertRecord('source_mappings', 'default', {
    mappingConfigs,
    updatedAt: new Date().toISOString(),
  }, 0)
}

const getDashboardSourceReadStatus = () =>
  getRecord('dashboard_source_read_status', 'default') ?? {
    status: 'Not configured',
    sourceReadAt: null,
    sourceReadAtLabel: null,
    sourceModifiedAt: null,
    sourceFileName: null,
    message: 'Dashboard source has not been read yet.',
  }

const saveDashboardSourceReadStatus = (status) => {
  upsertRecord('dashboard_source_read_status', 'default', {
    ...getDashboardSourceReadStatus(),
    ...status,
    checkedAt: new Date().toISOString(),
  }, 0)
}

const getWorkflowPayload = () => {
  const payload = {
    reviewIssues: listRecords('review_issues'),
    decisionRecords: listRecords('decision_records'),
    outputItems: listRecords('output_items'),
    auditEvents: listRecords('audit_events'),
    issuePersistenceStates: getStateMap('issue_persistence'),
    decisionPersistenceStates: getStateMap('decision_persistence'),
    outputPersistenceStates: getStateMap('output_persistence'),
    outputStatuses: getStateMap('output_status'),
  }

  return {
    ...payload,
    workflowView: buildWorkflowView(payload),
  }
}

const getTechnicalStatus = ({ host, port, packageInfo }) => {
  const reviews = listRecords('reviews')
  const sources = listRecords('sources')
  const validationStates = getValidationStates()
  const workflowPayload = getWorkflowPayload()
  const { workflowView } = workflowPayload

  return {
    generatedAt: new Date().toISOString(),
    app: {
      name: packageInfo.name ?? 'semi-panels-hub',
      version: packageInfo.version ?? 'unknown',
      environment: process.env.NODE_ENV ?? 'development',
    },
    frontend: {
      framework: 'React',
      frameworkVersion: packageInfo.dependencies?.react ?? 'unknown',
      language: 'TypeScript',
      typeScriptVersion: packageInfo.devDependencies?.typescript ?? 'unknown',
      bundler: 'Vite',
      bundlerVersion: packageInfo.devDependencies?.vite ?? 'unknown',
    },
    backend: {
      service: 'Node HTTP API',
      runtime: `Node ${process.versions.node}`,
      host,
      port,
      baseUrl: `http://${host}:${port}`,
      uptimeSeconds: Math.round(process.uptime()),
      database: workflowRepository.getDatabaseInfo(),
    },
    data: {
      reviews: reviews.length,
      sources: sources.length,
      validationStates: Object.keys(validationStates).length,
      reviewIssues: workflowPayload.reviewIssues.length,
      decisions: workflowPayload.decisionRecords.length,
      outputItems: workflowPayload.outputItems.length,
      auditEvents: workflowPayload.auditEvents.length,
      sourceConnections: Object.values(getSourceConnections() ?? {}).reduce((count, sourceIds) => count + sourceIds.length, 0),
      sourceMappings: Object.keys(getSourceMappings()).length,
    },
    workflow: {
      openIssues: workflowView.review.summary.open,
      needsDecision: workflowView.review.summary.needsDecision,
      highSeverityIssues: workflowView.review.summary.highSeverity,
      resolvedIssues: workflowView.review.summary.resolved,
      acceptedDecisions: workflowView.decisions.summary.Accepted,
      readyOutputItems: workflowView.output.summary.ready,
      blockedOutputItems: workflowView.output.summary.blocked,
      notPersistedAuditEvents: workflowView.audit.summary.notPersisted,
    },
    commands: {
      dev: packageInfo.scripts?.dev ?? 'npm run dev',
      api: packageInfo.scripts?.api ?? 'npm run api',
      build: packageInfo.scripts?.build ?? 'npm run build',
      helper: packageInfo.scripts?.helper ?? 'npm run helper',
    },
    contract: {
      sourcesReadOnly: true,
      primaryWorkUnit: 'Review',
      issueDecisionSeparation: true,
      outputAsArtifact: true,
      auditRequired: true,
    },
  }
}

const getCollectionCount = (collection) => countRecordsStatement.get(collection).count

const getStorageRecordUpdatedAt = (collection, recordId) => {
  const record = getRecord(collection, recordId)
  return record?.updatedAt ?? null
}

const getStorageStatus = (step) => {
  const sourcesCount = getCollectionCount('sources')
  const sourceConnections = getSourceConnections() ?? {}
  const sourceMappings = getSourceMappings()
  const sourceConnectionsCount = Object.values(sourceConnections).reduce((count, sourceIds) => count + sourceIds.length, 0)
  const sourceMappingsCount = Object.keys(sourceMappings).length
  const sourceMappingColumnsCount = Object.values(sourceMappings).reduce(
    (count, mapping) => count + (Array.isArray(mapping.columnMappings) ? mapping.columnMappings.length : 0),
    0,
  )

  const common = {
    step,
    database: {
      engine: 'sqlite',
      status: 'ready',
    },
    refreshedAt: new Date().toISOString(),
    readOnlyInputs: true,
  }

  const statusByStep = {
    Sources: {
      storage: 'SQLite',
      subject: 'Sources',
      persistence: 'Saved after source changes',
      records: sourcesCount,
      lastUpdated: null,
      detail: 'Local files are stored as read-only path references.',
    },
    Connections: {
      storage: 'SQLite',
      subject: 'Connections',
      persistence: 'Saved after connect or disconnect',
      records: sourceConnectionsCount,
      lastUpdated: getStorageRecordUpdatedAt('source_connections', 'default'),
      detail: 'Target to source links are stored in the backend repository.',
    },
    Mapping: {
      storage: 'SQLite',
      subject: 'Mapping',
      persistence: 'Saved after mapping changes',
      records: sourceMappingsCount,
      mappedColumns: sourceMappingColumnsCount,
      lastUpdated: getStorageRecordUpdatedAt('source_mappings', 'default'),
      detail: 'Preview reads source files read-only; mapping rules are stored separately.',
    },
    Validation: {
      storage: 'SQLite',
      subject: 'Validation states',
      persistence: 'Refreshed after access or validation checks',
      records: getCollectionCount('validation_states'),
      lastUpdated: null,
      detail: 'Source files remain read-only while validation state is stored.',
    },
    Review: {
      storage: 'SQLite',
      subject: 'Review issues',
      persistence: 'Saved as workflow records',
      records: getCollectionCount('review_issues'),
      lastUpdated: null,
      detail: 'Imported previews remain local until promoted into workflow data.',
    },
    Decisions: {
      storage: 'SQLite',
      subject: 'Decisions',
      persistence: 'Saved after decision changes',
      records: getCollectionCount('decision_records'),
      lastUpdated: null,
      detail: 'Decision status and persistence state are stored in workflow state.',
    },
    Output: {
      storage: 'SQLite',
      subject: 'Output',
      persistence: 'Saved after prepare output',
      records: getCollectionCount('output_items'),
      lastUpdated: null,
      detail: 'Output state is stored separately from read-only source inputs.',
    },
    Main: {
      storage: 'SQLite',
      subject: 'Reviews',
      persistence: 'Saved as review records',
      records: getCollectionCount('reviews'),
      lastUpdated: null,
      detail: 'Main workspace reads the selected review context.',
    },
  }

  return {
    ...common,
    ...(statusByStep[step] ?? {
      storage: 'Planned',
      subject: step,
      persistence: 'Not implemented yet',
      records: 0,
      lastUpdated: null,
      detail: 'This workflow section is not persisted yet.',
    }),
  }
}

export const workflowRepository = {
  getDatabaseInfo: () => ({
    engine: 'sqlite',
    path: databasePath,
  }),

  getReviews: () => listRecords('reviews'),
  saveReviews: (reviewRows) => replaceCollection('reviews', reviewRows, (record) => record.id),
  getSources: () => listRecords('sources'),
  getSource: (sourceId) => getRecord('sources', sourceId),
  addSource: (source) => {
    const { position } = nextRecordPositionStatement.get('sources')
    insertRecordStatement.run('sources', source.id, serialize(source), position)
  },
  updateSource: (source) => updateRecord('sources', source.id, source),
  deleteSource: (sourceId) => deleteRecord('sources', sourceId),
  getValidationStates: () => getValidationStates(),
  updateValidationState,
  deleteValidationState: (sourceName) => deleteRecord('validation_states', sourceName),
  getReviewIssues: () => listRecords('review_issues'),
  getDecisionRecords: () => listRecords('decision_records'),
  getOutputItems: () => listRecords('output_items'),
  getAuditEvents: () => listRecords('audit_events'),
  getReview: (reviewId) => getRecord('reviews', reviewId),
  getIssue: (issueId) => getRecord('review_issues', issueId),
  updateIssue: (issue) => updateRecord('review_issues', issue.id, issue),
  getDecision: (issueId) => getRecord('decision_records', issueId),
  updateDecision: (decision) => updateRecord('decision_records', decision.issueId, decision),
  getOutputItem: (outputId) => getRecord('output_items', outputId),
  getSourceConnections,
  saveSourceConnections,
  getSourceMappings,
  saveSourceMappings,
  getDashboardSourceReadStatus,
  saveDashboardSourceReadStatus,
  addAuditEvent,
  setIssuePersistenceState: (issueId, value) => setState('issue_persistence', issueId, value),
  setDecisionPersistenceState: (issueId, value) => setState('decision_persistence', issueId, value),
  setOutputPersistenceState: (outputId, value) => setState('output_persistence', outputId, value),
  setOutputStatus: (outputId, value) => setState('output_status', outputId, value),

  getWorkflowPayload,

  getTechnicalStatus,
  getStorageStatus,

  getBootstrapPayload: () => ({
    reviews: listRecords('reviews'),
    sources: listRecords('sources'),
    validationStatesBySource: getValidationStates(),
    sourceConnectionsByTarget: getSourceConnections(),
    sourceMappingConfigs: getSourceMappings(),
    sourceReadStatus: getDashboardSourceReadStatus(),
    ...getWorkflowPayload(),
  }),
}
