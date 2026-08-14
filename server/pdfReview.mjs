import { readdir, readFile, stat } from 'node:fs/promises'
import { basename, dirname, extname, join } from 'node:path'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'

const maxSnippetLength = 180
const maxSnippetsPerPage = 3

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const normalizeText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()

const getSnippet = (text, matchIndex, queryLength) => {
  const contextLength = Math.max(42, Math.floor((maxSnippetLength - queryLength) / 2))
  const start = Math.max(0, matchIndex - contextLength)
  const end = Math.min(text.length, matchIndex + queryLength + contextLength)
  const prefix = start > 0 ? '...' : ''
  const suffix = end < text.length ? '...' : ''

  return `${prefix}${text.slice(start, end).trim()}${suffix}`
}

const countPageMatches = (text, query) => {
  const normalizedText = normalizeText(text)
  if (!normalizedText) {
    return {
      matchCount: 0,
      snippets: [],
    }
  }

  const queryPattern = new RegExp(escapeRegExp(query), 'gi')
  const snippets = []
  let matchCount = 0
  let match

  while ((match = queryPattern.exec(normalizedText)) !== null) {
    matchCount += 1

    if (snippets.length < maxSnippetsPerPage) {
      snippets.push(getSnippet(normalizedText, match.index, query.length))
    }

    if (match.index === queryPattern.lastIndex) {
      queryPattern.lastIndex += 1
    }
  }

  return {
    matchCount,
    snippets,
  }
}

const extractPdfPageTexts = async (filePath) => {
  const data = new Uint8Array(await readFile(filePath))
  const loadingTask = pdfjs.getDocument({
    data,
    disableWorker: true,
  })
  const document = await loadingTask.promise

  try {
    const pages = []

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber)
      const content = await page.getTextContent()
      const text = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .filter(Boolean)
        .join(' ')

      pages.push({
        pageNumber,
        text,
      })
    }

    return pages
  } finally {
    await loadingTask.destroy()
  }
}

const isPdfFile = (filePath) => extname(filePath).toLowerCase() === '.pdf'

const collectPdfFiles = async (folderPath) => {
  const pdfFiles = []

  const scanFolder = async (currentFolderPath) => {
    let entries

    try {
      entries = await readdir(currentFolderPath, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const entryPath = join(currentFolderPath, entry.name)

      if (entry.isDirectory()) {
        await scanFolder(entryPath)
        continue
      }

      if (entry.isFile() && isPdfFile(entry.name)) {
        pdfFiles.push(entryPath)
      }
    }
  }

  await scanFolder(folderPath)
  pdfFiles.sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }))

  return pdfFiles
}

const getSearchFiles = async ({ mode, path }) => {
  if (mode === 'file') {
    const fileStats = await stat(path)
    if (!fileStats.isFile()) throw new Error('Selected path is not a file.')
    if (!isPdfFile(path)) throw new Error('Selected file must be a PDF.')
    return [path]
  }

  if (mode === 'folder') {
    const folderStats = await stat(path)
    if (!folderStats.isDirectory()) throw new Error('Selected path is not a folder.')
    return collectPdfFiles(path)
  }

  throw new Error('Search mode must be file or folder.')
}

const searchPdfFile = async (filePath, query) => {
  const pages = await extractPdfPageTexts(filePath)
  const modelPath = dirname(filePath)
  const matchingPages = pages.flatMap(({ pageNumber, text }) => {
    const pageMatches = countPageMatches(text, query)

    if (pageMatches.matchCount === 0) return []

    return [{
      pageNumber,
      matchCount: pageMatches.matchCount,
      snippets: pageMatches.snippets,
    }]
  })
  const matchCount = matchingPages.reduce((total, page) => total + page.matchCount, 0)

  return {
    documentName: basename(filePath),
    path: filePath,
    modelName: basename(modelPath),
    modelPath,
    matchCount,
    pageCount: pages.length,
    pages: matchingPages,
    status: 'Searched',
    error: null,
  }
}

export const searchPdfReviewDocuments = async ({ mode, path, query }) => {
  const searchQuery = normalizeText(query)
  if (!searchQuery) throw new Error('Search text is required.')

  const files = await getSearchFiles({ mode, path })
  const documents = []

  for (const filePath of files) {
    try {
      documents.push(await searchPdfFile(filePath, searchQuery))
    } catch (error) {
      documents.push({
        documentName: basename(filePath),
        path: filePath,
        modelName: basename(dirname(filePath)),
        modelPath: dirname(filePath),
        matchCount: 0,
        pageCount: 0,
        pages: [],
        status: 'Error',
        error: error instanceof Error ? error.message : 'Could not read this PDF.',
      })
    }
  }

  return {
    mode,
    query: searchQuery,
    searchedAt: new Date().toISOString(),
    scannedDocuments: documents.length,
    matchedDocuments: documents.filter((document) => document.matchCount > 0).length,
    totalMatches: documents.reduce((total, document) => total + document.matchCount, 0),
    documents,
  }
}
