import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readExcelPreview } from './excelPreview.mjs'
import { searchPdfReviewDocuments } from './pdfReview.mjs'
import { workflowActions } from './workflowActions.mjs'
import { workflowRepository } from './workflowRepository.mjs'
import { buildBomMatvarComparison, buildBomMatvarReviewIssues, buildBomMatvarValidation } from './bomMatvar.mjs'
import { buildBootstrapPayload, ensureDashboardSourceFresh, getLiveReview, readDashboardRowsFromSource } from './dashboard.mjs'
import { getActiveFusionBom } from './fusionBomApi.mjs'
import { corsHeaders, readJsonBody, sendJson, sendJsonBodyError } from './http.mjs'
import {
  SourcePolicyError,
  checkAndSaveAllSources,
  checkAndSaveSource,
  defaultExpectedFormatByType,
  defaultLocationByType,
  getSourcePath,
  isLocalFilePayload,
  isSourceConfigurationPayload,
  isSourceConnectionsPayload,
  isSourceCreatePayload,
  previewableFileExtensions,
} from './sources.mjs'

const serverDirectory = dirname(fileURLToPath(import.meta.url))
const packageInfo = JSON.parse(readFileSync(join(serverDirectory, '..', 'package.json'), 'utf8'))

const getRoutes = ({ host, port }) => ({
  'GET /health': () => ({ ok: true, service: 'semi-panels-hub-api', database: workflowRepository.getDatabaseInfo() }),
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
  try {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, corsHeaders)
    response.end()
    return
  }

  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? `${host}:${port}`}`)
  const routeKey = `${request.method} ${url.pathname}`

  if (routeKey === 'GET /api/bootstrap') {
    await ensureDashboardSourceFresh({ forceRead: url.searchParams.get('sourceRead') === 'force' })
    sendJson(response, 200, await buildBootstrapPayload())
    return
  }

  if (routeKey === 'GET /api/reviews') {
    const { reviews } = await readDashboardRowsFromSource()
    sendJson(response, 200, reviews)
    return
  }

  if (routeKey === 'GET /api/fusion-bom') {
    const partNumber = url.searchParams.get('partNumber')?.trim()

    if (!partNumber) {
      sendJson(response, 400, { error: 'partNumber query parameter is required.' })
      return
    }

    const bom = await getActiveFusionBom(partNumber, {
      includeExpired: url.searchParams.get('includeExpired') === 'true',
    })

    sendJson(response, 200, {
      ...bom,
      generatedAt: new Date().toISOString(),
      source: {
        authentication: 'X-Api-Key',
        location: 'https://plmutility.watlow.com / Fusion BOM',
        name: 'Fusion BOM API',
        status: 'Ready',
        type: 'API connection',
      },
    })
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

    sendJson(response, 200, await buildBootstrapPayload())
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
    sendJson(response, 200, await buildBootstrapPayload())
    return
  }

  if (request.method === 'POST' && url.pathname.startsWith('/api/sources/') && url.pathname.endsWith('/configuration')) {
    let body

    try {
      body = await readJsonBody(request)
    } catch (error) {
      sendJsonBodyError(response, error)
      return
    }

    if (!isSourceConfigurationPayload(body)) {
      sendJson(response, 400, { error: 'Invalid source configuration payload' })
      return
    }

    const sourceId = decodeURIComponent(url.pathname.split('/')[3] ?? '')
    const source = workflowRepository.getSource(sourceId)

    if (!source) {
      sendJson(response, 404, { error: 'Source not found' })
      return
    }

    const nextName = body.name.trim()
    if (!nextName) {
      sendJson(response, 400, { error: 'Source configuration name is required' })
      return
    }

    const previousName = source.name
    const nextSource = {
      ...source,
      name: nextName,
      description: body.description.trim(),
    }

    workflowRepository.updateSource(nextSource)

    if (previousName !== nextName) {
      const previousValidationState = workflowRepository.getValidationStates()[previousName]
      if (previousValidationState) {
        workflowRepository.updateValidationState(nextName, previousValidationState)
        workflowRepository.deleteValidationState(previousName)
      }
    }

    sendJson(response, 200, await buildBootstrapPayload())
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/sources/check') {
    await checkAndSaveAllSources()
    sendJson(response, 200, await buildBootstrapPayload())
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
    sendJson(response, 200, await buildBootstrapPayload())
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/pdf-review/search') {
    let body

    try {
      body = await readJsonBody(request)
    } catch (error) {
      sendJsonBodyError(response, error)
      return
    }

    if (
      !body ||
      (body.mode !== 'file' && body.mode !== 'folder') ||
      typeof body.path !== 'string' ||
      typeof body.query !== 'string'
    ) {
      sendJson(response, 400, { error: 'Invalid PDF review search payload.' })
      return
    }

    try {
      sendJson(response, 200, await searchPdfReviewDocuments({
        mode: body.mode,
        path: body.path,
        query: body.query,
      }))
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : 'PDF review search could not be completed.',
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
    sendJson(response, 200, await buildBootstrapPayload())
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

  if (request.method === 'GET' && url.pathname.startsWith('/api/reviews/') && url.pathname.endsWith('/bom-matvar/validation')) {
    const reviewId = decodeURIComponent(url.pathname.split('/')[3] ?? '')
    const validation = await buildBomMatvarValidation(reviewId)

    if (!validation) {
      sendJson(response, 404, { error: 'Review not found' })
      return
    }

    sendJson(response, 200, validation)
    return
  }

  if (request.method === 'GET' && url.pathname.startsWith('/api/reviews/') && url.pathname.endsWith('/bom-matvar/comparison')) {
    const reviewId = decodeURIComponent(url.pathname.split('/')[3] ?? '')
    const comparison = await buildBomMatvarComparison(reviewId)

    if (!comparison) {
      sendJson(response, 404, { error: 'Review not found' })
      return
    }

    sendJson(response, 200, comparison)
    return
  }

  if (request.method === 'GET' && url.pathname.startsWith('/api/reviews/') && url.pathname.endsWith('/bom-matvar/review-issues')) {
    const reviewId = decodeURIComponent(url.pathname.split('/')[3] ?? '')
    const reviewIssues = await buildBomMatvarReviewIssues(reviewId)

    if (!reviewIssues) {
      sendJson(response, 404, { error: 'Review not found' })
      return
    }

    sendJson(response, 200, reviewIssues)
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
    const isFolderSource = source.type === 'Folder'
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
        message: `Local ${isFolderSource ? 'folder' : 'file'} location saved. Access will be checked automatically on Sources.`,
        exists: true,
        readable: false,
        sizeBytes: isFolderSource ? undefined : body.file.sizeBytes,
        modifiedAt: body.file.modifiedAt,
      },
    }

    workflowRepository.updateSource(nextSource)
    workflowRepository.updateValidationState(source.name, {
      state: 'Not checked',
      message: `Local ${isFolderSource ? 'folder' : 'file'} registered: ${body.file.name}. Waiting for access check.`,
    })

    sendJson(response, 200, await buildBootstrapPayload())
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
    const review = await getLiveReview(reviewId)

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
  } catch (error) {
    if (error instanceof SourcePolicyError) {
      sendJson(response, 409, {
        error: error.message,
        detail: error.detail,
        policy: 'API reads must use the local path registered in Sources for the matching source contract.',
      })
      return
    }

    sendJson(response, 500, {
      error: error instanceof Error ? error.message : 'Unexpected API error',
    })
  }
}
