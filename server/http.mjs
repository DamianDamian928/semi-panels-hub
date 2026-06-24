export const corsHeaders = {
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

export const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    ...corsHeaders,
    'Content-Type': 'application/json; charset=utf-8',
  })
  response.end(JSON.stringify(payload))
}

export const readJsonBody = (request) =>
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

export const sendJsonBodyError = (response, error) => {
  if (error instanceof RequestBodyTooLargeError) {
    sendJson(response, 413, { error: error.message })
    return
  }

  sendJson(response, 400, { error: 'Invalid JSON body' })
}
