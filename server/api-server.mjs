import { createServer } from 'node:http'
import { createRequestHandler } from './routes.mjs'

const host = process.env.API_HOST ?? '127.0.0.1'
const port = Number(process.env.API_PORT ?? 8788)

const server = createServer(createRequestHandler({ host, port }))

server.listen(port, host, () => {
  console.log(`Semi Panels Hub API listening on http://${host}:${port}`)
})
