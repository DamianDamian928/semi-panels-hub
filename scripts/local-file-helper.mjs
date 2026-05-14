import { execFile } from 'node:child_process'
import { createServer } from 'node:http'
import { extname, basename, dirname } from 'node:path'
import { stat } from 'node:fs/promises'

const host = '127.0.0.1'
const port = Number(process.env.LOCAL_FILE_HELPER_PORT ?? 8787)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

let activeDialog = false

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    ...corsHeaders,
    'Content-Type': 'application/json; charset=utf-8',
  })
  response.end(JSON.stringify(payload))
}

const openLocalFileDialog = () =>
  new Promise((resolve, reject) => {
    if (process.platform !== 'win32') {
      reject(new Error('Local file dialog helper currently supports Windows only.'))
      return
    }

    const script = `
Add-Type -AssemblyName System.Windows.Forms
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Title = 'Select source file'
$dialog.Filter = 'All files (*.*)|*.*'
$dialog.Multiselect = $false
$owner = New-Object System.Windows.Forms.Form
$owner.TopMost = $true
$owner.ShowInTaskbar = $false
$owner.WindowState = [System.Windows.Forms.FormWindowState]::Minimized
$owner.Add_Shown({ $owner.Activate() })
$owner.Show()
$result = $dialog.ShowDialog($owner)
$owner.Close()
$owner.Dispose()
if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
  Write-Output $dialog.FileName
} else {
  exit 2
}
`
    const encodedScript = Buffer.from(script, 'utf16le').toString('base64')

    execFile(
      'powershell.exe',
      ['-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encodedScript],
      { windowsHide: false },
      (error, stdout, stderr) => {
        if (error) {
          if (error.code === 2) {
            resolve(null)
            return
          }

          reject(new Error(stderr.trim() || error.message))
          return
        }

        resolve(stdout.trim())
      },
    )
  })

const getLocalFileMetadata = async (filePath) => {
  const fileStats = await stat(filePath)

  return {
    name: basename(filePath),
    path: filePath,
    directory: dirname(filePath),
    extension: extname(filePath).replace('.', ''),
    sizeBytes: fileStats.size,
    modifiedAt: fileStats.mtime.toISOString(),
  }
}

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, corsHeaders)
    response.end()
    return
  }

  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? `${host}:${port}`}`)

  if (request.method === 'GET' && url.pathname === '/health') {
    sendJson(response, 200, { ok: true })
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/local-file-dialog') {
    if (activeDialog) {
      sendJson(response, 409, {
        cancelled: false,
        error: 'A local file dialog is already open.',
      })
      return
    }

    activeDialog = true

    try {
      const selectedPath = await openLocalFileDialog()

      if (!selectedPath) {
        sendJson(response, 200, { cancelled: true })
        return
      }

      const file = await getLocalFileMetadata(selectedPath)
      sendJson(response, 200, { cancelled: false, file })
    } catch (error) {
      sendJson(response, 500, {
        cancelled: false,
        error: error instanceof Error ? error.message : 'Unknown helper error',
      })
    } finally {
      activeDialog = false
    }
    return
  }

  sendJson(response, 404, { error: 'Not found' })
})

server.listen(port, host, () => {
  console.log(`Local file helper listening on http://${host}:${port}`)
})
