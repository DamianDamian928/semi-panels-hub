import { constants, readFileSync } from 'node:fs'
import { access, stat } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readExcelPreview } from './excelPreview.mjs'
import { workflowActions } from './workflowActions.mjs'
import { workflowRepository } from './workflowRepository.mjs'

const serverDirectory = dirname(fileURLToPath(import.meta.url))
const packageInfo = JSON.parse(readFileSync(join(serverDirectory, '..', 'package.json'), 'utf8'))

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}
const maxJsonBodyBytes = 5 * 1024 * 1024

class RequestBodyTooLargeError extends Error {
  constructor() {
    super('Request body is too large. Limit is 5 MB.')
    this.name = 'RequestBodyTooLargeError'
  }
}

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    ...corsHeaders,
    'Content-Type': 'application/json; charset=utf-8',
  })
  response.end(JSON.stringify(payload))
}

const readJsonBody = (request) =>
  new Promise((resolve, reject) => {
    let body = ''
    let receivedBytes = 0
    let bodyTooLarge = false

    request.on('data', (chunk) => {
      if (bodyTooLarge) return

      receivedBytes += chunk.length
      if (receivedBytes > maxJsonBodyBytes) {
        bodyTooLarge = true
        reject(new RequestBodyTooLargeError())
        return
      }

      body += chunk
    })

    request.on('end', () => {
      if (bodyTooLarge) return

      if (!body) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(body))
      } catch (error) {
        reject(error)
      }
    })

    request.on('error', (error) => {
      if (!bodyTooLarge) reject(error)
    })
  })

const sendJsonBodyError = (response, error) => {
  if (error instanceof RequestBodyTooLargeError) {
    sendJson(response, 413, { error: error.message })
    return
  }

  sendJson(response, 400, { error: 'Invalid JSON body' })
}

const isLocalFilePayload = (file) =>
  file &&
  typeof file.name === 'string' &&
  typeof file.path === 'string' &&
  typeof file.directory === 'string' &&
  typeof file.extension === 'string' &&
  typeof file.sizeBytes === 'number' &&
  typeof file.modifiedAt === 'string'

const sourceTypes = new Set(['File', 'Folder', 'SQL', 'SharePoint', 'Manual export'])
const sourceUsages = new Set(['BOM', 'Documentation', 'Costing'])
const connectionTargetIds = new Set(['dashboard', 'bom-matvar', 'bom-l1', 'bom-l2', 'bom-l3', 'documentation', 'costing'])

const isSourceCreatePayload = (value) =>
  value &&
  typeof value.name === 'string' &&
  sourceTypes.has(value.type) &&
  Array.isArray(value.usedFor) &&
  value.usedFor.length > 0 &&
  value.usedFor.every((usage) => sourceUsages.has(usage)) &&
  typeof value.expectedFormat === 'string' &&
  typeof value.owner === 'string' &&
  typeof value.description === 'string'

const isSourceConnectionsPayload = (value) =>
  value &&
  typeof value === 'object' &&
  value.connectionsByTarget &&
  typeof value.connectionsByTarget === 'object' &&
  [...connectionTargetIds].every((targetId) => {
    const sourceIds = value.connectionsByTarget[targetId]
    return Array.isArray(sourceIds) && sourceIds.every((sourceId) => typeof sourceId === 'string')
  })

const isSourceMappingsPayload = (value) =>
  value &&
  typeof value === 'object' &&
  value.mappingConfigs &&
  typeof value.mappingConfigs === 'object' &&
  Object.values(value.mappingConfigs).every((mapping) =>
    mapping &&
    typeof mapping === 'object' &&
    typeof mapping.id === 'string' &&
    connectionTargetIds.has(mapping.targetId) &&
    typeof mapping.sourceId === 'string' &&
    Array.isArray(mapping.columnMappings),
  )

const defaultLocationByType = {
  File: 'Waiting for local file',
  Folder: 'Waiting for folder location',
  SQL: 'Connection profile not configured',
  SharePoint: 'SharePoint location not configured',
  'Manual export': 'Waiting for local export',
}

const defaultExpectedFormatByType = {
  File: 'Excel workbook or CSV export',
  Folder: 'Folder path',
  SQL: 'SQL connection profile',
  SharePoint: 'SharePoint folder or document library',
  'Manual export': 'Manual export file',
}

const checkedAtLabel = (checkedAt) => checkedAt

const getSourcePath = (source) => source.sourceFile?.path

const previewableFileExtensions = new Set(['xlsx', 'xlsm'])
const reviewStatuses = new Set(['Draft', 'In progress', 'Completed'])

const formatSourceReadAt = (date) => {
  const pad = (value) => String(value).padStart(2, '0')

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const normalizeDashboardField = (value) => String(value ?? '').trim().toLowerCase()

const applyMappingTransform = (value, transform) => {
  const text = String(value ?? '')

  if (transform === 'Uppercase') return text.trim().toUpperCase()
  if (transform === 'Trim' || transform === 'Distinct') return text.trim()
  return text
}

const makeUniqueColumnLabel = (label, usedLabels) => {
  let nextLabel = label
  let index = 2

  while (usedLabels.has(nextLabel)) {
    nextLabel = `${label} ${index}`
    index += 1
  }

  usedLabels.add(nextLabel)
  return nextLabel
}

const buildDashboardRowsFromMapping = (mapping, preview) => {
  const selectedMappings = mapping.columnMappings.filter((columnMapping) => columnMapping.sheetName === preview.activeSheetName)
  const columnEntries = []
  const usedLabels = new Set()

  selectedMappings.forEach((columnMapping) => {
    const columnIndex = preview.columns.indexOf(columnMapping.sourceColumn)
    if (columnIndex < 0) return

    const preferredLabel = columnMapping.targetField?.trim() || columnMapping.sourceColumn
    columnEntries.push({
      ...columnMapping,
      columnIndex,
      label: makeUniqueColumnLabel(preferredLabel, usedLabels),
      normalizedTargetField: normalizeDashboardField(columnMapping.targetField),
    })
  })

  if (columnEntries.length === 0) {
    throw new Error('Selected mapping columns were not found in the source preview.')
  }

  const dashboardColumns = columnEntries.map((entry) => entry.label)
  const today = new Date().toISOString().slice(0, 10)

  return preview.rows
    .map((row, rowIndex) => {
      const cells = Object.fromEntries(
        columnEntries.map((entry) => [
          entry.label,
          applyMappingTransform(row[entry.columnIndex], entry.transform),
        ]),
      )
      const getByTargetField = (fieldName) => {
        const entry = columnEntries.find((candidate) => candidate.normalizedTargetField === normalizeDashboardField(fieldName))
        return entry ? cells[entry.label] : ''
      }
      const intelModel = getByTargetField('Intel Model Number') || Object.values(cells).find((value) => value.trim()) || `Dashboard row ${rowIndex + 1}`
      const status = getByTargetField('Status')

      return {
        id: `dashboard-${mapping.sourceId}-${rowIndex + 1}`,
        intelModel,
        status: reviewStatuses.has(status) ? status : 'Draft',
        owner: getByTargetField('Owner') || 'Unassigned',
        lastUpdated: getByTargetField('Last Updated') || today,
        dashboardColumns,
        dashboardCells: cells,
      }
    })
    .filter((row) => Object.values(row.dashboardCells).some((value) => value.trim()))
}

const isDashboardMappingReady = (mapping) =>
  mapping &&
  mapping.targetId === 'dashboard' &&
  typeof mapping.sourceId === 'string' &&
  Array.isArray(mapping.columnMappings) &&
  mapping.columnMappings.length > 0

const validateDashboardSource = async (source) => {
  const sourcePath = getSourcePath(source)
  const extension = source?.sourceFile?.extension?.toLowerCase()

  if (!sourcePath || !extension) {
    throw new Error('This source does not have a local file registered.')
  }

  if (!previewableFileExtensions.has(extension)) {
    throw new Error('Applying this mapping is currently available for .xlsx and .xlsm files.')
  }

  const fileStats = await stat(sourcePath)
  await access(sourcePath, constants.R_OK)

  return {
    sourcePath,
    fileStats,
  }
}

const rebuildDashboardFromMapping = async (mapping, mappingConfigs) => {
  const source = workflowRepository.getSource(mapping.sourceId)

  if (!source) {
    throw new Error('Source not found')
  }

  const { sourcePath, fileStats } = await validateDashboardSource(source)
  const selectedSheetName = mapping.columnMappings[0]?.sheetName || mapping.sheetName
  const preview = await readExcelPreview(sourcePath, {
    sheetName: selectedSheetName,
    rowLimit: 500,
  })
  const dashboardRows = buildDashboardRowsFromMapping(mapping, preview)

  if (dashboardRows.length === 0) {
    throw new Error('The selected columns do not contain dashboard rows.')
  }

  const sourceReadAt = new Date()

  workflowRepository.saveReviews(dashboardRows)
  workflowRepository.saveSourceMappings({
    ...mappingConfigs,
    [mapping.id]: {
      ...mapping,
      sheetName: preview.activeSheetName,
      status: 'Ready',
    },
  })
  workflowRepository.saveDashboardSourceReadStatus({
    status: 'Fresh',
    mappingId: mapping.id,
    sourceId: source.id,
    sourceFileName: source.sourceFile?.name ?? source.name,
    sourcePath,
    sourceModifiedAt: fileStats.mtime.toISOString(),
    sourceSizeBytes: fileStats.size,
    sourceReadAt: sourceReadAt.toISOString(),
    sourceReadAtLabel: formatSourceReadAt(sourceReadAt),
    rows: dashboardRows.length,
    message: 'Dashboard source was read successfully.',
  })

  return {
    dashboardRows,
    preview,
  }
}

let dashboardRefreshInFlight = null

const ensureDashboardSourceFresh = async ({ forceRead = false } = {}) => {
  if (dashboardRefreshInFlight) return dashboardRefreshInFlight

  dashboardRefreshInFlight = (async () => {
    const mappingConfigs = workflowRepository.getSourceMappings()
    const mapping = Object.values(mappingConfigs).find(isDashboardMappingReady)

    if (!mapping) {
      workflowRepository.saveDashboardSourceReadStatus({
        status: 'Mapping missing',
        message: 'Dashboard source read is waiting for a dashboard mapping.',
      })
      return
    }

    const source = workflowRepository.getSource(mapping.sourceId)

    if (!source) {
      workflowRepository.saveDashboardSourceReadStatus({
        status: 'Source unavailable',
        mappingId: mapping.id,
        sourceId: mapping.sourceId,
        message: 'Dashboard source was not found.',
      })
      return
    }

    try {
      const { sourcePath, fileStats } = await validateDashboardSource(source)
      const currentStatus = workflowRepository.getDashboardSourceReadStatus()
      const sourceModifiedAt = fileStats.mtime.toISOString()
      const sourceUnchanged =
        currentStatus.mappingId === mapping.id &&
        currentStatus.sourceId === source.id &&
        currentStatus.sourceModifiedAt === sourceModifiedAt &&
        currentStatus.sourceSizeBytes === fileStats.size &&
        currentStatus.status === 'Fresh'

      if (sourceUnchanged && !forceRead) return

      await rebuildDashboardFromMapping(mapping, mappingConfigs)
    } catch (error) {
      workflowRepository.saveDashboardSourceReadStatus({
        status: 'Source unavailable',
        mappingId: mapping.id,
        sourceId: source.id,
        sourceFileName: source.sourceFile?.name ?? source.name,
        sourcePath: getSourcePath(source) ?? null,
        message: error instanceof Error
          ? error.message
          : 'Dashboard source could not be read.',
      })
    }
  })()

  try {
    await dashboardRefreshInFlight
  } finally {
    dashboardRefreshInFlight = null
  }
}

const checkSourceAccess = async (source) => {
  const checkedAt = new Date().toISOString()
  const path = getSourcePath(source)

  if (!path) {
    return {
      ...source,
      status: 'Needs location',
      lastChecked: checkedAtLabel(checkedAt),
      accessCheck: {
        checkedAt,
        status: 'Needs location',
        message: 'No local path registered for this source.',
        exists: false,
        readable: false,
      },
    }
  }

  try {
    const fileStats = await stat(path)
    await access(path, constants.R_OK)

    const status = fileStats.size > 0 ? 'Ready' : 'Error'
    const message = fileStats.size > 0
      ? 'Local file exists and is readable.'
      : 'Local file exists but is empty.'

    return {
      ...source,
      status,
      lastChecked: checkedAtLabel(checkedAt),
      accessCheck: {
        checkedAt,
        status,
        message,
        exists: true,
        readable: true,
        sizeBytes: fileStats.size,
        modifiedAt: fileStats.mtime.toISOString(),
      },
    }
  } catch (error) {
    const message = error?.code === 'ENOENT'
      ? 'Local file was not found at the saved path.'
      : error?.code === 'EACCES' || error?.code === 'EPERM'
        ? 'Local file exists but cannot be read.'
        : 'Local file access check failed.'

    return {
      ...source,
      status: 'Error',
      lastChecked: checkedAtLabel(checkedAt),
      accessCheck: {
        checkedAt,
        status: 'Error',
        message,
        exists: error?.code !== 'ENOENT',
        readable: false,
      },
    }
  }
}

const saveCheckedSource = (source) => {
  workflowRepository.updateSource(source)
  workflowRepository.updateValidationState(source.name, {
    state: source.status === 'Ready' ? 'Valid' : source.status === 'Error' ? 'Error' : 'Not checked',
    message: source.accessCheck?.message ?? 'Access check was not run.',
  })
}

const checkAndSaveSource = async (source) => {
  const checkedSource = await checkSourceAccess(source)
  saveCheckedSource(checkedSource)
  return checkedSource
}

const checkAndSaveAllSources = async () => {
  const sources = workflowRepository.getSources()
  const checkedSources = await Promise.all(sources.map((source) => checkSourceAccess(source)))
  checkedSources.forEach(saveCheckedSource)
  return checkedSources
}

const getRoutes = ({ host, port }) => ({
  'GET /health': () => ({ ok: true, service: 'semi-panels-hub-api', database: workflowRepository.getDatabaseInfo() }),
  'GET /api/reviews': () => workflowRepository.getReviews(),
  'GET /api/sources': () => workflowRepository.getSources(),
  'GET /api/validation-states': () => workflowRepository.getValidationStates(),
  'GET /api/review-issues': () => workflowRepository.getReviewIssues(),
  'GET /api/decisions': () => workflowRepository.getDecisionRecords(),
  'GET /api/output-items': () => workflowRepository.getOutputItems(),
  'GET /api/audit-events': () => workflowRepository.getAuditEvents(),
  'GET /api/workflow': () => workflowRepository.getWorkflowPayload(),
  'GET /api/technical-status': () => workflowRepository.getTechnicalStatus({ host, port, packageInfo }),
})

export const createRequestHandler = ({ host, port }) => async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, corsHeaders)
    response.end()
    return
  }

  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? `${host}:${port}`}`)
  const routeKey = `${request.method} ${url.pathname}`

  if (routeKey === 'GET /api/bootstrap') {
    await ensureDashboardSourceFresh({ forceRead: url.searchParams.get('sourceRead') === 'force' })
    sendJson(response, 200, workflowRepository.getBootstrapPayload())
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/sources') {
    let body

    try {
      body = await readJsonBody(request)
    } catch (error) {
      sendJsonBodyError(response, error)
      return
    }

    if (!isSourceCreatePayload(body)) {
      sendJson(response, 400, { error: 'Invalid source payload' })
      return
    }

    const source = {
      id: `source-${randomUUID()}`,
      name: body.name.trim(),
      type: body.type,
      location: defaultLocationByType[body.type],
      scope: 'Global',
      status: 'Needs location',
      usedFor: body.usedFor,
      expectedFormat: body.expectedFormat.trim() || defaultExpectedFormatByType[body.type],
      lastChecked: 'Never checked',
      owner: body.owner.trim() || 'Unassigned',
      description: body.description.trim() || 'Read-only source registered for this review workflow.',
      accessMode: 'Read-only',
    }

    if (!source.name) {
      sendJson(response, 400, { error: 'Source name is required' })
      return
    }

    workflowRepository.addSource(source)
    workflowRepository.updateValidationState(source.name, {
      state: 'Not checked',
      message: 'Source registered. Waiting for location and access check.',
    })

    sendJson(response, 200, workflowRepository.getBootstrapPayload())
    return
  }

  if (request.method === 'DELETE' && url.pathname.startsWith('/api/sources/')) {
    const sourceId = decodeURIComponent(url.pathname.split('/')[3] ?? '')
    const source = workflowRepository.getSource(sourceId)

    if (!source) {
      sendJson(response, 404, { error: 'Source not found' })
      return
    }

    workflowRepository.deleteSource(sourceId)
    workflowRepository.deleteValidationState(source.name)
    sendJson(response, 200, workflowRepository.getBootstrapPayload())
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/sources/check') {
    await checkAndSaveAllSources()
    sendJson(response, 200, workflowRepository.getBootstrapPayload())
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/source-connections') {
    let body

    try {
      body = await readJsonBody(request)
    } catch (error) {
      sendJsonBodyError(response, error)
      return
    }

    if (!isSourceConnectionsPayload(body)) {
      sendJson(response, 400, { error: 'Invalid source connections payload' })
      return
    }

    workflowRepository.saveSourceConnections(body.connectionsByTarget)
    sendJson(response, 200, workflowRepository.getBootstrapPayload())
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/source-mappings') {
    let body

    try {
      body = await readJsonBody(request)
    } catch (error) {
      sendJsonBodyError(response, error)
      return
    }

    if (!isSourceMappingsPayload(body)) {
      sendJson(response, 400, { error: 'Invalid source mappings payload' })
      return
    }

    workflowRepository.saveSourceMappings(body.mappingConfigs)
    sendJson(response, 200, workflowRepository.getBootstrapPayload())
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/mappings/apply') {
    let body

    try {
      body = await readJsonBody(request)
    } catch (error) {
      sendJsonBodyError(response, error)
      return
    }

    const mappingConfigs = workflowRepository.getSourceMappings()
    const mapping = body?.mappingConfig ?? mappingConfigs[body?.mappingId]

    if (
      !mapping ||
      typeof mapping !== 'object' ||
      typeof mapping.id !== 'string' ||
      !connectionTargetIds.has(mapping.targetId) ||
      typeof mapping.sourceId !== 'string' ||
      !Array.isArray(mapping.columnMappings) ||
      mapping.columnMappings.length === 0
    ) {
      sendJson(response, 400, { error: 'A mapping with selected columns is required.' })
      return
    }

    if (mapping.targetId !== 'dashboard') {
      workflowRepository.saveSourceMappings({
        ...mappingConfigs,
        [mapping.id]: {
          ...mapping,
          sheetName: mapping.sheetName || mapping.columnMappings[0]?.sheetName || '',
          status: 'Ready',
        },
      })
      sendJson(response, 200, workflowRepository.getBootstrapPayload())
      return
    }

    try {
      await rebuildDashboardFromMapping(mapping, mappingConfigs)
      sendJson(response, 200, workflowRepository.getBootstrapPayload())
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error
          ? error.message
          : 'Dashboard mapping could not be applied.',
      })
    }

    return
  }

  if (request.method === 'POST' && url.pathname.startsWith('/api/sources/') && url.pathname.endsWith('/check')) {
    const sourceId = decodeURIComponent(url.pathname.split('/')[3] ?? '')
    const source = workflowRepository.getSource(sourceId)

    if (!source) {
      sendJson(response, 404, { error: 'Source not found' })
      return
    }

    await checkAndSaveSource(source)
    sendJson(response, 200, workflowRepository.getBootstrapPayload())
    return
  }

  if (request.method === 'GET' && url.pathname.startsWith('/api/sources/') && url.pathname.endsWith('/preview')) {
    const sourceId = decodeURIComponent(url.pathname.split('/')[3] ?? '')
    const source = workflowRepository.getSource(sourceId)

    if (!source) {
      sendJson(response, 404, { error: 'Source not found' })
      return
    }

    const sourcePath = getSourcePath(source)
    const extension = source.sourceFile?.extension?.toLowerCase()

    if (!sourcePath || !extension) {
      sendJson(response, 400, { error: 'This source does not have a local file registered.' })
      return
    }

    if (!previewableFileExtensions.has(extension)) {
      sendJson(response, 400, { error: 'Preview is currently available for .xlsx and .xlsm files.' })
      return
    }

    try {
      const preview = await readExcelPreview(sourcePath, {
        sheetName: url.searchParams.get('sheet') ?? undefined,
        rowLimit: url.searchParams.get('rowLimit') ?? undefined,
      })
      sendJson(response, 200, preview)
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error
          ? error.message
          : 'Source preview could not be read.',
      })
    }

    return
  }

  if (request.method === 'GET' && url.pathname === '/api/storage-status') {
    sendJson(response, 200, workflowRepository.getStorageStatus(url.searchParams.get('step') ?? 'Main'))
    return
  }

  if (request.method === 'POST' && url.pathname.startsWith('/api/sources/') && url.pathname.endsWith('/local-file')) {
    let body

    try {
      body = await readJsonBody(request)
    } catch (error) {
      sendJsonBodyError(response, error)
      return
    }

    const sourceId = decodeURIComponent(url.pathname.split('/')[3] ?? '')
    const source = workflowRepository.getSource(sourceId)

    if (!source) {
      sendJson(response, 404, { error: 'Source not found' })
      return
    }

    if (!isLocalFilePayload(body.file)) {
      sendJson(response, 400, { error: 'Invalid local file payload' })
      return
    }

    const registeredAt = new Date().toISOString()
    const nextSource = {
      ...source,
      location: body.file.path,
      status: 'Needs check',
      lastChecked: registeredAt,
      sourceFile: {
        ...body.file,
        registeredAt,
      },
      accessCheck: {
        checkedAt: registeredAt,
        status: 'Needs check',
        message: 'Local file location saved. Access will be checked automatically on Sources.',
        exists: true,
        readable: false,
        sizeBytes: body.file.sizeBytes,
        modifiedAt: body.file.modifiedAt,
      },
    }

    workflowRepository.updateSource(nextSource)
    workflowRepository.updateValidationState(source.name, {
      state: 'Not checked',
      message: `Local file registered: ${body.file.name}. Waiting for access check.`,
    })

    sendJson(response, 200, workflowRepository.getBootstrapPayload())
    return
  }

  if (request.method === 'POST' && url.pathname.startsWith('/api/workflow/')) {
    let body

    try {
      body = await readJsonBody(request)
    } catch (error) {
      sendJsonBodyError(response, error)
      return
    }

    const action = workflowActions[url.pathname]

    if (!action) {
      sendJson(response, 404, { error: 'Workflow action not found' })
      return
    }

    const result = action(body)
    sendJson(response, result.statusCode, result.payload)
    return
  }

  if (url.pathname.startsWith('/api/reviews/') && request.method === 'GET') {
    const reviewId = url.pathname.split('/')[3]
    const review = workflowRepository.getReview(reviewId)

    if (!review) {
      sendJson(response, 404, { error: 'Review not found' })
      return
    }

    sendJson(response, 200, review)
    return
  }

  const handler = getRoutes({ host, port })[routeKey]

  if (!handler) {
    sendJson(response, 404, { error: 'Not found' })
    return
  }

  sendJson(response, 200, handler())
}
