import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { workflowActions } from './workflowActions.mjs'
import { workflowRepository } from './workflowRepository.mjs'

const serverDirectory = dirname(fileURLToPath(import.meta.url))
const packageInfo = JSON.parse(readFileSync(join(serverDirectory, '..', 'package.json'), 'utf8'))

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
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

    request.on('data', (chunk) => {
      body += chunk
    })

    request.on('end', () => {
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

    request.on('error', reject)
  })

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
    sendJson(response, 200, workflowRepository.getBootstrapPayload())
    return
  }

  if (request.method === 'POST' && url.pathname.startsWith('/api/workflow/')) {
    let body

    try {
      body = await readJsonBody(request)
    } catch {
      sendJson(response, 400, { error: 'Invalid JSON body' })
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
