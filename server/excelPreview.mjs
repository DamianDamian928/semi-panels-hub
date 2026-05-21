import { readFile } from 'node:fs/promises'
import { dirname, posix } from 'node:path'
import { inflateRawSync } from 'node:zlib'

const textDecoder = new TextDecoder('utf-8')

const decodeXml = (value = '') =>
  value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")

const normalizeCellText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()

const columnNameToIndex = (columnName) =>
  [...columnName].reduce((index, char) => index * 26 + char.charCodeAt(0) - 64, 0) - 1

const getCellColumnIndex = (cellRef) => columnNameToIndex(cellRef.replace(/\d/g, ''))

const normalizeZipPath = (basePath, target) => {
  if (target.startsWith('/')) return target.replace(/^\/+/, '')
  return posix.normalize(posix.join(dirname(basePath), target))
}

const findEndOfCentralDirectory = (buffer) => {
  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset
  }

  throw new Error('Invalid workbook archive.')
}

const readZipEntries = (buffer) => {
  const entries = new Map()
  const eocdOffset = findEndOfCentralDirectory(buffer)
  const centralDirectorySize = buffer.readUInt32LE(eocdOffset + 12)
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16)
  let offset = centralDirectoryOffset
  const endOffset = centralDirectoryOffset + centralDirectorySize

  while (offset < endOffset) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break

    const compressionMethod = buffer.readUInt16LE(offset + 10)
    const compressedSize = buffer.readUInt32LE(offset + 20)
    const uncompressedSize = buffer.readUInt32LE(offset + 24)
    const fileNameLength = buffer.readUInt16LE(offset + 28)
    const extraFieldLength = buffer.readUInt16LE(offset + 30)
    const commentLength = buffer.readUInt16LE(offset + 32)
    const localHeaderOffset = buffer.readUInt32LE(offset + 42)
    const fileName = textDecoder.decode(buffer.subarray(offset + 46, offset + 46 + fileNameLength))

    entries.set(fileName, {
      compressionMethod,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    })

    offset += 46 + fileNameLength + extraFieldLength + commentLength
  }

  return {
    getText: (entryName) => {
      const entry = entries.get(entryName)
      if (!entry) return null

      const localOffset = entry.localHeaderOffset
      if (buffer.readUInt32LE(localOffset) !== 0x04034b50) return null

      const fileNameLength = buffer.readUInt16LE(localOffset + 26)
      const extraFieldLength = buffer.readUInt16LE(localOffset + 28)
      const dataOffset = localOffset + 30 + fileNameLength + extraFieldLength
      const compressedData = buffer.subarray(dataOffset, dataOffset + entry.compressedSize)
      const data = entry.compressionMethod === 0
        ? compressedData
        : entry.compressionMethod === 8
          ? inflateRawSync(compressedData, { finishFlush: 2 })
          : null

      if (!data) throw new Error(`Unsupported workbook compression method: ${entry.compressionMethod}`)
      if (entry.uncompressedSize && data.length !== entry.uncompressedSize) {
        return textDecoder.decode(data)
      }

      return textDecoder.decode(data)
    },
  }
}

const readRelationships = (xml) => {
  const relationships = new Map()
  if (!xml) return relationships

  for (const match of xml.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const attrs = match[1]
    const id = attrs.match(/\bId="([^"]+)"/)?.[1]
    const target = attrs.match(/\bTarget="([^"]+)"/)?.[1]
    if (id && target) relationships.set(id, target)
  }

  return relationships
}

const readWorkbookSheets = (workbookXml, relationships) => {
  const sheets = []

  for (const match of workbookXml.matchAll(/<sheet\b([^>]*)\/?>/g)) {
    const attrs = match[1]
    const name = decodeXml(attrs.match(/\bname="([^"]+)"/)?.[1] ?? '')
    const relationshipId = attrs.match(/\br:id="([^"]+)"/)?.[1]
    const target = relationshipId ? relationships.get(relationshipId) : undefined
    if (name && target) {
      sheets.push({
        name,
        path: normalizeZipPath('xl/workbook.xml', target),
      })
    }
  }

  return sheets
}

const readSharedStrings = (xml) => {
  if (!xml) return []

  return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) => {
    const textParts = [...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((textMatch) => decodeXml(textMatch[1]))
    return textParts.join('')
  })
}

const getCellValue = (cellXml, sharedStrings) => {
  const type = cellXml.match(/\bt="([^"]+)"/)?.[1]
  const inlineText = cellXml.match(/<is\b[^>]*>[\s\S]*?<t\b[^>]*>([\s\S]*?)<\/t>[\s\S]*?<\/is>/)?.[1]
  if (inlineText) return decodeXml(inlineText)

  const rawValue = cellXml.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1]
  if (!rawValue) return ''
  if (type === 's') return sharedStrings[Number(rawValue)] ?? ''
  if (type === 'b') return rawValue === '1' ? 'TRUE' : 'FALSE'
  return decodeXml(rawValue)
}

const readRows = (sheetXml, sharedStrings, maxRows = Number.POSITIVE_INFINITY) => {
  const rows = []

  for (const rowMatch of sheetXml.matchAll(/<row\b[^>]*\br="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const rowNumber = Number(rowMatch[1])
    const cells = []

    for (const cellMatch of rowMatch[2].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1]
      const cellRef = attrs.match(/\br="([^"]+)"/)?.[1]
      if (!cellRef) continue

      const columnIndex = getCellColumnIndex(cellRef)
      cells[columnIndex] = getCellValue(`<c ${attrs}>${cellMatch[2]}</c>`, sharedStrings)
    }

    if (cells.some((value) => value !== undefined && value !== '')) {
      rows.push({ rowNumber, cells: cells.map((value) => value ?? '') })
      if (rows.length >= maxRows) break
    }
  }

  return rows
}

const chooseHeaderRow = (rows) => {
  const candidates = rows.slice(0, 25)
  const scored = candidates.map((row) => ({
    row,
    score: row.cells.filter((cell) => String(cell).trim()).length,
  }))

  return scored.sort((left, right) => right.score - left.score)[0]?.row
}

const readExcelSheetData = async (filePath, options = {}) => {
  const rowLimit = options.rowLimit === undefined ? null : Math.max(Number(options.rowLimit), 1)
  const workbookBuffer = await readFile(filePath)
  const zip = readZipEntries(workbookBuffer)
  const workbookXml = zip.getText('xl/workbook.xml')
  const relationshipsXml = zip.getText('xl/_rels/workbook.xml.rels')

  if (!workbookXml || !relationshipsXml) {
    throw new Error('Workbook metadata could not be read.')
  }

  const relationships = readRelationships(relationshipsXml)
  const sheets = readWorkbookSheets(workbookXml, relationships)
  const selectedSheet = sheets.find((sheet) => sheet.name === options.sheetName)
    ?? sheets.find((sheet) => sheet.name.toLowerCase() === 'forecast')
    ?? sheets[0]

  if (!selectedSheet) {
    throw new Error('Workbook does not contain readable sheets.')
  }

  const sharedStrings = readSharedStrings(zip.getText('xl/sharedStrings.xml'))
  const sheetXml = zip.getText(selectedSheet.path)
  if (!sheetXml) throw new Error(`Sheet "${selectedSheet.name}" could not be read.`)

  const rows = readRows(
    sheetXml,
    sharedStrings,
    rowLimit === null ? Number.POSITIVE_INFINITY : rowLimit + 25,
  )
  const headerRow = chooseHeaderRow(rows)
  const headerRowIndex = headerRow?.rowNumber ?? 1
  const columnCount = Math.max(...rows.map((row) => row.cells.length), headerRow?.cells.length ?? 0, 0)
  const columns = Array.from({ length: columnCount }, (_, index) => {
    const value = normalizeCellText(headerRow?.cells[index])
    return value || `Column ${index + 1}`
  })
  const dataRows = rows
    .filter((row) => row.rowNumber > headerRowIndex)
    .slice(0, rowLimit ?? undefined)
    .map((row) => Array.from({ length: columnCount }, (_, index) => normalizeCellText(row.cells[index])))

  return {
    sourceType: 'excel',
    sheets: sheets.map((sheet) => sheet.name),
    activeSheetName: selectedSheet.name,
    headerRow: headerRowIndex,
    columns,
    rows: dataRows,
    rowLimit,
  }
}

export const readExcelPreview = async (filePath, options = {}) => {
  const rowLimit = Math.min(Math.max(Number(options.rowLimit ?? 100), 1), 500)
  return readExcelSheetData(filePath, { ...options, rowLimit })
}

export const readExcelWorksheet = async (filePath, options = {}) =>
  readExcelSheetData(filePath, options)
