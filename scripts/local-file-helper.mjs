import { execFile } from 'node:child_process'
import { createServer } from 'node:http'
import { extname, basename, dirname, join } from 'node:path'
import { readdir, stat } from 'node:fs/promises'

const host = '127.0.0.1'
const port = Number(process.env.LOCAL_FILE_HELPER_PORT ?? 8787)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}
const maxJsonBodyBytes = 5 * 1024 * 1024

class RequestBodyTooLargeError extends Error {
  constructor() {
    super('Request body is too large. Limit is 5 MB.')
    this.name = 'RequestBodyTooLargeError'
  }
}

let activeDialog = false

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

const openLocalFolderDialog = () =>
  new Promise((resolve, reject) => {
    if (process.platform !== 'win32') {
      reject(new Error('Local folder dialog helper currently supports Windows only.'))
      return
    }

    const script = `
Add-Type -AssemblyName System.Windows.Forms
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = 'Select source folder'
$dialog.ShowNewFolderButton = $false
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
  Write-Output $dialog.SelectedPath
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

const getFolderFileType = (fileName) => extname(fileName).replace('.', '').toUpperCase() || 'NO EXT'

const scanLocalFolder = async (folderPath) => {
  const entries = await readdir(folderPath, { withFileTypes: true })
  const summary = {
    fileCount: 0,
    folderCount: 0,
    totalSizeBytes: 0,
    typeCounts: {},
  }

  await Promise.all(entries.map(async (entry) => {
    if (entry.isDirectory()) {
      summary.folderCount += 1
      return
    }

    if (!entry.isFile()) return

    summary.fileCount += 1
    const fileType = getFolderFileType(entry.name)
    summary.typeCounts[fileType] = (summary.typeCounts[fileType] ?? 0) + 1

    try {
      const fileStats = await stat(join(folderPath, entry.name))
      summary.totalSizeBytes += fileStats.size
    } catch {
      // Keep the count even if a single file size cannot be read.
    }
  }))

  return summary
}

const getLocalFolderMetadata = async (folderPath) => {
  const folderStats = await stat(folderPath)

  return {
    name: basename(folderPath),
    path: folderPath,
    directory: folderPath,
    extension: '',
    sizeBytes: folderStats.size,
    modifiedAt: folderStats.mtime.toISOString(),
    folderSummary: await scanLocalFolder(folderPath),
  }
}

const openLocalLocation = (filePath, openMode = 'location') =>
  new Promise((resolve, reject) => {
    if (process.platform !== 'win32') {
      reject(new Error('Opening local locations currently supports Windows only.'))
      return
    }

    const escapedPath = filePath.replace(/'/g, "''")
    const shouldOpenFile = openMode === 'file'
    const script = `
$path = '${escapedPath}'
$openFile = ${shouldOpenFile ? '$true' : '$false'}
if ($openFile -and (Test-Path -LiteralPath $path -PathType Leaf)) {
  Start-Process -FilePath $path
} elseif (Test-Path -LiteralPath $path -PathType Leaf) {
  Start-Process explorer.exe -ArgumentList ('/select,"' + $path + '"')
} elseif (Test-Path -LiteralPath $path -PathType Container) {
  Start-Process explorer.exe -ArgumentList ('"' + $path + '"')
} else {
  $parent = Split-Path -LiteralPath $path -Parent
  if ($parent -and (Test-Path -LiteralPath $parent)) {
    Start-Process explorer.exe -ArgumentList ('"' + $parent + '"')
  } else {
    throw "Local path was not found: $path"
  }
}
`
    const encodedScript = Buffer.from(script, 'utf16le').toString('base64')

    execFile(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encodedScript],
      { windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr.trim() || error.message))
          return
        }

        resolve()
      },
    )
  })

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

  if (request.method === 'GET' && url.pathname === '/api/local-folder-dialog') {
    if (activeDialog) {
      sendJson(response, 409, {
        cancelled: false,
        error: 'A local file dialog is already open.',
      })
      return
    }

    activeDialog = true

    try {
      const selectedPath = await openLocalFolderDialog()

      if (!selectedPath) {
        sendJson(response, 200, { cancelled: true })
        return
      }

      const folder = await getLocalFolderMetadata(selectedPath)
      sendJson(response, 200, { cancelled: false, file: folder })
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

  if (request.method === 'POST' && url.pathname === '/api/open-local-location') {
    let body

    try {
      body = await readJsonBody(request)
    } catch (error) {
      sendJsonBodyError(response, error)
      return
    }

    if (!body.path || typeof body.path !== 'string') {
      sendJson(response, 400, { error: 'Local path is required.' })
      return
    }

    try {
      await openLocalLocation(body.path, body.openMode)
      sendJson(response, 200, { ok: true })
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : 'Could not open local location.',
      })
    }
    return
  }

  sendJson(response, 404, { error: 'Not found' })
})

server.listen(port, host, () => {
  console.log(`Local file helper listening on http://${host}:${port}`)
})
