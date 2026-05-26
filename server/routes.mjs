import { constants, readFileSync } from 'node:fs'
import { access, stat } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readExcelPreview, readExcelWorksheet } from './excelPreview.mjs'
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
const normalizeMappingField = (value) => String(value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '')
const partNumberPattern = /^\d+-\d+$/

const getDashboardCellByName = (review, fieldName) => {
  const normalizedFieldName = normalizeDashboardField(fieldName)
  const entry = Object.entries(review?.dashboardCells ?? {}).find(([key]) => normalizeDashboardField(key) === normalizedFieldName)
  return entry?.[1] ?? ''
}

const getReviewIntelDescription = (review) =>
  getDashboardCellByName(review, 'INTEL Description') ||
  getDashboardCellByName(review, 'Intel Description') ||
  review?.intelModel ||
  ''

const getReviewItem = (review) =>
  getDashboardCellByName(review, 'Item') ||
  review?.intelModel ||
  review?.id ||
  ''

const getMappingColumnMapping = (mapping, aliases) => {
  const normalizedAliases = aliases.map(normalizeMappingField)
  const mappedColumn = mapping?.columnMappings?.find((columnMapping) => {
    const sourceColumn = normalizeMappingField(columnMapping.sourceColumn)
    const targetField = normalizeMappingField(columnMapping.targetField)
    return normalizedAliases.includes(sourceColumn) || normalizedAliases.includes(targetField)
  })

  return mappedColumn ?? null
}

const getMappingColumn = (mapping, aliases) =>
  getMappingColumnMapping(mapping, aliases)?.sourceColumn ?? ''

const getMappingSheetName = (mapping) =>
  mapping?.sheetName || mapping?.columnMappings?.find((columnMapping) => columnMapping.sheetName)?.sheetName || ''

const parseExcelSerialDate = (value) => {
  const serial = Number(String(value ?? '').replace(',', '.'))
  if (!Number.isFinite(serial) || serial <= 0) return null
  const date = new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 24 * 60 * 60 * 1000)
  return Number.isNaN(date.getTime()) ? null : date
}

const parseSourceDate = (value) => {
  const text = String(value ?? '').trim()
  if (!text) return null

  const serialDate = parseExcelSerialDate(text)
  if (serialDate) return serialDate

  const parsedTime = Date.parse(text)
  return Number.isNaN(parsedTime) ? null : new Date(parsedTime)
}

const formatSourceDate = (value) => {
  const date = parseSourceDate(value)
  if (!date) return String(value ?? '').trim()

  const pad = (part) => String(part).padStart(2, '0')
  return `${pad(date.getUTCDate())}.${pad(date.getUTCMonth() + 1)}.${date.getUTCFullYear()}`
}

const getValidationStatus = (checks) => {
  if (checks.some((check) => check.status === 'Error')) return 'Error'
  if (checks.some((check) => check.status === 'Warning')) return 'Warning'
  return 'Valid'
}

const createValidationCheck = ({ id, label, source = 'BOM Matvar', status, message, detail = '' }) => ({
  id,
  label,
  source,
  status,
  message,
  detail,
})

const sourceLooksLikeBomL0 = (source, mapping) => {
  const sourceText = [
    source?.name,
    source?.sourceFile?.name,
    source?.description,
  ].join(' ').toLowerCase()

  if (sourceText.includes('bom l0') || sourceText.includes('bom_l0')) return true

  const mappedColumns = new Set((mapping?.columnMappings ?? []).map((columnMapping) => normalizeMappingField(columnMapping.sourceColumn)))
  return (
    mappedColumns.has(normalizeMappingField('Part Number')) &&
    mappedColumns.has(normalizeMappingField('Description')) &&
    mappedColumns.has(normalizeMappingField('Data aktualizacji'))
  )
}

const sourceLooksLikeMatvarBom = (source, mapping) => {
  const sourceText = [
    source?.name,
    source?.sourceFile?.name,
    source?.description,
  ].join(' ').toLowerCase()

  const mappedColumns = new Set((mapping?.columnMappings ?? []).map((columnMapping) => normalizeMappingField(columnMapping.sourceColumn)))
  const mappedTargets = new Set((mapping?.columnMappings ?? []).map((columnMapping) => normalizeMappingField(columnMapping.targetField)))
  const hasMappedField = (aliases) => aliases.some((alias) => {
    const normalized = normalizeMappingField(alias)
    return mappedColumns.has(normalized) || mappedTargets.has(normalized)
  })

  if (
    hasMappedField(['Item']) &&
    hasMappedField(['ORACLE Item Description', 'ORACLE Item Desc', 'ORACLE Description']) &&
    hasMappedField(['INTEL Description', 'INTEL Description (C)', 'Intel Description']) &&
    hasMappedField(['Phantom L1', 'PHANTOM L1', 'PhantomL1']) &&
    hasMappedField(['Scope', 'SCOPE'])
  ) {
    return true
  }

  return sourceText.includes('matvar') || sourceText.includes('mass production')
}

const mapWorksheetRow = (row, columnIndexByName, mappingByField) =>
  Object.fromEntries(Object.entries(mappingByField).map(([field, columnMapping]) => {
    if (!columnMapping) return [field, '']
    const value = row[columnIndexByName[columnMapping.sourceColumn]]
    return [field, applyMappingTransform(value, columnMapping.transform)]
  }))

const normalizeMatvarMappedRow = (row) => {
  const phantomL1 = String(row.phantomL1 ?? '').trim()
  const scope = String(row.scope ?? '').trim()

  if (!scope && phantomL1.toLowerCase() === 'full scope') {
    return {
      ...row,
      phantomL1: '',
      scope: 'Full Scope',
    }
  }

  return row
}

const swapUSforEU = (description) => String(description ?? '').replace(/\bUS\b/g, 'EU').replace(/_US/g, '_EU')

const computeBomL0Area2Rows = (rows) => {
  const rules = [
    { id: 'Controller Scope | EU | 10', tokens: ['controller scope', 'eu', '10'] },
    { id: 'Heat Scope | US | 20', tokens: ['heat scope', 'us', '20'] },
    { id: 'N2 Heat | 30', tokens: ['n2 heat', '30'] },
  ]

  const out = rules
    .map((rule) => {
      const match = rows.find((row) => {
        const description = String(row.description ?? '').toLowerCase()
        return rule.tokens.every((token) => description.includes(token))
      })
      return match
        ? {
            kind: 'ok',
            partNumber: match.partNumber,
            description: match.description,
          }
        : null
    })
    .filter(Boolean)

  const anyController = rows.find((row) => String(row.description ?? '').toLowerCase().includes('controller scope'))
  const hasControllerEu10 = rows.some((row) => {
    const description = String(row.description ?? '').toLowerCase()
    return description.includes('controller scope') && description.includes('eu') && description.includes('10')
  })
  if (anyController && !hasControllerEu10) {
    out.push({
      kind: 'nok',
      partNumber: 'NOK, brakujący PN.',
      description: swapUSforEU(anyController.description),
    })
  }

  const hasHeatInArea2 = out.some((row) => String(row.description ?? '').toLowerCase().includes('heat scope'))
  if (!hasHeatInArea2) {
    const heatRows = rows.filter((row) => String(row.description ?? '').toLowerCase().includes('heat scope'))
    if (heatRows.length === 1) {
      out.push({
        kind: 'ok',
        partNumber: heatRows[0].partNumber,
        description: heatRows[0].description,
      })
    }
  }

  return out
}

const computeMatvarTargets = (bomL0Area2Rows) => {
  const expected = {}
  const scopesSet = new Set()
  const pickScope = (description) => {
    const text = String(description ?? '').toLowerCase()
    if (text.includes('controller scope')) return 'Control Scope'
    if (text.includes('heat scope')) return 'Heat Scope'
    if (text.includes('n2 heat')) return 'N2 Heat'
    if (text.includes('full scope')) return 'Full Scope'
    return null
  }

  bomL0Area2Rows.forEach((row) => {
    const scope = pickScope(row.description)
    const partNumber = String(row.partNumber ?? '').trim()
    if (!scope) return
    scopesSet.add(scope)
    if (scope !== 'Full Scope' && partNumberPattern.test(partNumber)) {
      expected[scope] = partNumber
    }
  })

  const scopes = [...scopesSet]
  if (bomL0Area2Rows.length > 1 && !scopesSet.has('Full Scope')) scopes.push('Full Scope')

  const order = ['Full Scope', 'Control Scope', 'Heat Scope', 'N2 Heat']
  scopes.sort((left, right) => order.indexOf(left) - order.indexOf(right))

  return { scopes, expected }
}

const buildMatvarRowsView = ({ matvarRows, matvarTargets }) => {
  const existingByScope = new Map()

  matvarRows.forEach((row) => {
    const scopeKey = String(row.scope ?? '').trim().toLowerCase()
    if (!scopeKey || existingByScope.has(scopeKey)) return

    existingByScope.set(scopeKey, {
      item: row.item,
      oracleItemDescription: row.oracleItemDescription,
      intelDescription: row.intelDescription,
      phantomL1: row.phantomL1,
      scope: row.scope,
      verificationText: '',
      verificationStatus: 'None',
      expectedPhantomL1: '',
      isSynthetic: false,
    })
  })

  return matvarTargets.scopes.map((targetScope) => {
    const scopeKey = targetScope.trim().toLowerCase()
    const base = existingByScope.get(scopeKey)

    if (targetScope === 'Full Scope') {
      return base ?? {
        item: '',
        oracleItemDescription: '',
        intelDescription: '',
        phantomL1: '',
        scope: 'Full Scope',
        verificationText: 'NOK, brakujący matvar',
        verificationStatus: 'NOK',
        expectedPhantomL1: '',
        isSynthetic: true,
      }
    }

    const expectedPhantomL1 = matvarTargets.expected[targetScope] ?? ''
    if (!base) {
      return {
        item: '',
        oracleItemDescription: '',
        intelDescription: '',
        phantomL1: expectedPhantomL1,
        scope: targetScope,
        verificationText: 'NOK, brakujący matvar',
        verificationStatus: 'NOK',
        expectedPhantomL1,
        isSynthetic: true,
      }
    }

    if (!expectedPhantomL1) {
      return {
        ...base,
        verificationText: 'NOK, brakujący matvar',
        verificationStatus: 'NOK',
        expectedPhantomL1,
      }
    }

    const isMatching = base.phantomL1 && base.phantomL1 === expectedPhantomL1
    return {
      ...base,
      verificationText: isMatching ? 'OK, zgodne' : 'NOK, niezgodny matvar',
      verificationStatus: isMatching ? 'OK' : 'NOK',
      expectedPhantomL1,
    }
  })
}

const buildBomMatvarValidation = async (reviewId) => {
  const review = workflowRepository.getReview(reviewId)

  if (!review) {
    return null
  }

  const connectionsByTarget = workflowRepository.getSourceConnections() ?? {}
  const mappingConfigs = workflowRepository.getSourceMappings()
  const connectedSourceIds = connectionsByTarget['bom-matvar'] ?? []
  const connectedSources = connectedSourceIds
    .map((sourceId) => workflowRepository.getSource(sourceId))
    .filter(Boolean)
  const checks = []
  const intelDescription = getReviewIntelDescription(review).trim()

  checks.push(createValidationCheck({
    id: 'review-intel-description',
    label: 'Review Intel Description',
    source: 'Dashboard',
    status: intelDescription ? 'Valid' : 'Error',
    message: intelDescription
      ? `Using "${intelDescription}" from dashboard.`
      : 'Selected review does not contain INTEL Description.',
    detail: getReviewItem(review),
  }))

  checks.push(createValidationCheck({
    id: 'bom-matvar-connections',
    label: 'BOM Matvar connections',
    status: connectedSources.length ? 'Valid' : 'Error',
    message: connectedSources.length
      ? `${connectedSources.length} source(s) connected to BOM Matvar.`
      : 'No sources are connected to BOM Matvar.',
  }))

  const sourceMappings = connectedSources.map((source) => ({
    source,
    mapping: mappingConfigs[`bom-matvar:${source.id}`] ?? null,
  }))
  const bomL0Entry = sourceMappings.find(({ source, mapping }) => sourceLooksLikeBomL0(source, mapping))
  const matvarBomEntry = sourceMappings.find(({ source, mapping }) => !sourceLooksLikeBomL0(source, mapping) && sourceLooksLikeMatvarBom(source, mapping))

  if (!bomL0Entry) {
    checks.push(createValidationCheck({
      id: 'bom-l0-source',
      label: 'BOM L0 source',
      status: 'Error',
      message: 'BOM L0 source is not connected to BOM Matvar.',
    }))

    return {
      review: {
        id: review.id,
        item: getReviewItem(review),
        intelDescription,
      },
      targetId: 'bom-matvar',
      status: getValidationStatus(checks),
      summary: {
        connectedSources: connectedSources.length,
        mappedSources: sourceMappings.filter(({ mapping }) => mapping).length,
        matchedRows: 0,
        validPartNumbers: 0,
        invalidPartNumbers: 0,
        matvarRows: 0,
        matvarOk: 0,
        matvarNok: 0,
        matvarSynthetic: 0,
      },
      checks,
      connectedSources: sourceMappings.map(({ source, mapping }) => ({
        id: source.id,
        name: source.sourceFile?.name ?? source.name,
        status: source.status,
        role: mapping?.role ?? 'Not mapped',
        mappingStatus: mapping?.status ?? 'Missing',
        mappedColumns: mapping?.columnMappings?.map((columnMapping) => columnMapping.sourceColumn) ?? [],
      })),
      bomL0Rows: [],
      matvarRows: [],
    }
  }

  const { source: bomL0Source, mapping: bomL0Mapping } = bomL0Entry

  checks.push(createValidationCheck({
    id: 'bom-l0-source',
    label: 'BOM L0 source',
    source: bomL0Source.sourceFile?.name ?? bomL0Source.name,
    status: bomL0Source.status === 'Ready' ? 'Valid' : 'Error',
    message: bomL0Source.status === 'Ready'
      ? 'BOM L0 source is connected and ready.'
      : `BOM L0 source status is ${bomL0Source.status}.`,
    detail: bomL0Source.sourceFile?.path ?? bomL0Source.location,
  }))

  if (!bomL0Mapping) {
    checks.push(createValidationCheck({
      id: 'bom-l0-mapping',
      label: 'BOM L0 mapping',
      source: bomL0Source.sourceFile?.name ?? bomL0Source.name,
      status: 'Error',
      message: 'BOM L0 source is connected but not mapped.',
    }))
  }

  const partNumberColumn = getMappingColumn(bomL0Mapping, ['Part Number', 'PartNumber', 'Part_No', 'BOM L0 Part Number'])
  const descriptionColumn = getMappingColumn(bomL0Mapping, ['Description', 'BOM L0 Description'])
  const updatedAtColumn = getMappingColumn(bomL0Mapping, ['Data aktualizacji', 'Update Date', 'BOM L0 Data aktualizacji'])
  const requiredColumns = [
    { key: 'partNumber', label: 'Part Number', column: partNumberColumn },
    { key: 'description', label: 'Description', column: descriptionColumn },
    { key: 'updatedAt', label: 'Data aktualizacji', column: updatedAtColumn },
  ]
  const missingMappedColumns = requiredColumns.filter((column) => !column.column)

  checks.push(createValidationCheck({
    id: 'bom-l0-mapping',
    label: 'BOM L0 required mapping',
    source: bomL0Source.sourceFile?.name ?? bomL0Source.name,
    status: missingMappedColumns.length ? 'Error' : 'Valid',
    message: missingMappedColumns.length
      ? `Missing mapped column(s): ${missingMappedColumns.map((column) => column.label).join(', ')}.`
      : 'Required BOM L0 columns are mapped.',
    detail: requiredColumns.map((column) => `${column.label}: ${column.column || 'missing'}`).join(' | '),
  }))

  let bomL0Rows = []

  if (!missingMappedColumns.length && bomL0Source.sourceFile?.path) {
    try {
      const worksheet = await readExcelWorksheet(bomL0Source.sourceFile.path, {
        sheetName: bomL0Mapping?.sheetName || bomL0Mapping?.columnMappings?.[0]?.sheetName,
      })
      const columnIndexByName = Object.fromEntries(worksheet.columns.map((column, index) => [column, index]))
      const missingWorksheetColumns = requiredColumns.filter((column) => !(column.column in columnIndexByName))

      checks.push(createValidationCheck({
        id: 'bom-l0-worksheet-columns',
        label: 'BOM L0 worksheet columns',
        source: bomL0Source.sourceFile?.name ?? bomL0Source.name,
        status: missingWorksheetColumns.length ? 'Error' : 'Valid',
        message: missingWorksheetColumns.length
          ? `Mapped column(s) not found in workbook: ${missingWorksheetColumns.map((column) => column.column).join(', ')}.`
          : `Workbook sheet "${worksheet.activeSheetName}" contains all mapped columns.`,
        detail: `${worksheet.rows.length} row(s) read with full worksheet reader.`,
      }))

      if (!missingWorksheetColumns.length && intelDescription) {
        bomL0Rows = worksheet.rows
          .filter((row) => String(row[columnIndexByName[descriptionColumn]] ?? '').includes(intelDescription))
          .map((row) => {
            const partNumber = String(row[columnIndexByName[partNumberColumn]] ?? '').trim()
            const description = String(row[columnIndexByName[descriptionColumn]] ?? '').trim()
            const updatedAtRaw = String(row[columnIndexByName[updatedAtColumn]] ?? '').trim()

            return {
              partNumber,
              description,
              updatedAtRaw,
              updatedAt: formatSourceDate(updatedAtRaw),
              partNumberValid: partNumberPattern.test(partNumber),
            }
          })
          .sort((left, right) => left.description.localeCompare(right.description, undefined, {
            numeric: true,
            sensitivity: 'base',
          }))
      }
    } catch (error) {
      checks.push(createValidationCheck({
        id: 'bom-l0-read',
        label: 'BOM L0 full read',
        source: bomL0Source.sourceFile?.name ?? bomL0Source.name,
        status: 'Error',
        message: error instanceof Error ? error.message : 'BOM L0 workbook could not be read.',
      }))
    }
  }

  const invalidPartNumberCount = bomL0Rows.filter((row) => !row.partNumberValid).length

  checks.push(createValidationCheck({
    id: 'bom-l0-intel-description-match',
    label: 'Intel Description match',
    source: bomL0Source.sourceFile?.name ?? bomL0Source.name,
    status: bomL0Rows.length ? 'Valid' : 'Error',
    message: bomL0Rows.length
      ? `${bomL0Rows.length} BOM L0 row(s) match "${intelDescription}".`
      : `No BOM L0 rows match "${intelDescription}".`,
  }))

  checks.push(createValidationCheck({
    id: 'bom-l0-part-number-format',
    label: 'Part Number format',
    source: bomL0Source.sourceFile?.name ?? bomL0Source.name,
    status: invalidPartNumberCount ? 'Warning' : bomL0Rows.length ? 'Valid' : 'Warning',
    message: invalidPartNumberCount
      ? `${invalidPartNumberCount} matched row(s) have invalid Part Number format.`
      : bomL0Rows.length
        ? 'All matched Part Numbers use the expected numeric-numeric format.'
        : 'Part Number format could not be checked without matched rows.',
  }))

  let matvarRows = []

  if (!matvarBomEntry) {
    checks.push(createValidationCheck({
      id: 'matvar-bom-source',
      label: 'MATVAR BOM source',
      status: 'Error',
      message: 'MATVAR BOM source is not connected to BOM Matvar or does not have MATVAR columns mapped.',
      detail: 'Required mapping: Item | ORACLE Item Description | INTEL Description | Phantom L1 | Scope',
    }))
  } else {
    const { source: matvarSource, mapping: matvarMapping } = matvarBomEntry
    const sourceName = matvarSource.sourceFile?.name ?? matvarSource.name
    const itemMapping = getMappingColumnMapping(matvarMapping, ['Item'])
    const oracleDescriptionMapping = getMappingColumnMapping(matvarMapping, ['ORACLE Item Description', 'ORACLE Item Desc', 'ORACLE Description'])
    const intelDescriptionMapping = getMappingColumnMapping(matvarMapping, ['INTEL Description', 'INTEL Description (C)', 'Intel Description'])
    const phantomL1Mapping = getMappingColumnMapping(matvarMapping, ['Phantom L1', 'PHANTOM L1', 'PhantomL1'])
    const scopeMapping = getMappingColumnMapping(matvarMapping, ['Scope', 'SCOPE'])
    const requiredMatvarColumns = [
      { key: 'item', label: 'Item', mapping: itemMapping },
      { key: 'oracleItemDescription', label: 'ORACLE Item Description', mapping: oracleDescriptionMapping },
      { key: 'intelDescription', label: 'INTEL Description', mapping: intelDescriptionMapping },
      { key: 'phantomL1', label: 'Phantom L1', mapping: phantomL1Mapping },
      { key: 'scope', label: 'Scope', mapping: scopeMapping },
    ]
    const missingMatvarMappings = requiredMatvarColumns.filter((column) => !column.mapping)

    checks.push(createValidationCheck({
      id: 'matvar-bom-source',
      label: 'MATVAR BOM source',
      source: sourceName,
      status: matvarSource.status === 'Ready' ? 'Valid' : 'Error',
      message: matvarSource.status === 'Ready'
        ? 'MATVAR BOM source is connected and ready.'
        : `MATVAR BOM source status is ${matvarSource.status}.`,
      detail: matvarSource.sourceFile?.path ?? matvarSource.location,
    }))

    checks.push(createValidationCheck({
      id: 'matvar-bom-mapping',
      label: 'MATVAR BOM required mapping',
      source: sourceName,
      status: missingMatvarMappings.length
        ? 'Error'
        : matvarMapping?.status === 'Ready'
          ? 'Valid'
          : 'Warning',
      message: missingMatvarMappings.length
        ? `Missing mapped column(s): ${missingMatvarMappings.map((column) => column.label).join(', ')}.`
        : matvarMapping?.status === 'Ready'
          ? 'Required MATVAR BOM columns are mapped.'
          : 'Required MATVAR BOM columns are selected, but mapping is not marked Ready. Validation will read the selected columns.',
      detail: requiredMatvarColumns
        .map((column) => `${column.label}: ${column.mapping?.sheetName ?? 'missing'}/${column.mapping?.sourceColumn ?? 'missing'}`)
        .join(' | '),
    }))

    if (!missingMatvarMappings.length && matvarSource.sourceFile?.path) {
      try {
        const worksheet = await readExcelWorksheet(matvarSource.sourceFile.path, {
          sheetName: getMappingSheetName(matvarMapping),
        })
        const columnIndexByName = Object.fromEntries(worksheet.columns.map((column, index) => [column, index]))
        const missingWorksheetColumns = requiredMatvarColumns.filter((column) => !(column.mapping.sourceColumn in columnIndexByName))

        checks.push(createValidationCheck({
          id: 'matvar-bom-worksheet-columns',
          label: 'MATVAR BOM worksheet columns',
          source: sourceName,
          status: missingWorksheetColumns.length ? 'Error' : 'Valid',
          message: missingWorksheetColumns.length
            ? `Mapped column(s) not found in workbook: ${missingWorksheetColumns.map((column) => column.mapping.sourceColumn).join(', ')}.`
            : `Workbook sheet "${worksheet.activeSheetName}" contains all mapped MATVAR columns.`,
          detail: `${worksheet.rows.length} row(s) read with full worksheet reader.`,
        }))

        if (!missingWorksheetColumns.length && intelDescription) {
          const mappingByField = {
            item: itemMapping,
            oracleItemDescription: oracleDescriptionMapping,
            intelDescription: intelDescriptionMapping,
            phantomL1: phantomL1Mapping,
            scope: scopeMapping,
          }

          const filteredMatvarRows = worksheet.rows
            .map((row) => mapWorksheetRow(row, columnIndexByName, mappingByField))
            .map(normalizeMatvarMappedRow)
            .filter((row) => String(row.intelDescription ?? '').includes(intelDescription))

          const matvarTargets = computeMatvarTargets(computeBomL0Area2Rows(bomL0Rows))
          matvarRows = buildMatvarRowsView({
            matvarRows: filteredMatvarRows,
            matvarTargets,
          })

          checks.push(createValidationCheck({
            id: 'matvar-bom-intel-description-match',
            label: 'MATVAR Intel Description match',
            source: sourceName,
            status: filteredMatvarRows.length ? 'Valid' : 'Error',
            message: filteredMatvarRows.length
              ? `${filteredMatvarRows.length} MATVAR row(s) match "${intelDescription}".`
              : `No MATVAR rows match "${intelDescription}".`,
            detail: `Generated validation rows: ${matvarRows.length}.`,
          }))
        }
      } catch (error) {
        checks.push(createValidationCheck({
          id: 'matvar-bom-read',
          label: 'MATVAR BOM full read',
          source: sourceName,
          status: 'Error',
          message: error instanceof Error ? error.message : 'MATVAR BOM workbook could not be read.',
        }))
      }
    }
  }

  const matvarOkCount = matvarRows.filter((row) => row.verificationStatus === 'OK').length
  const matvarNokCount = matvarRows.filter((row) => row.verificationStatus === 'NOK').length
  const matvarSyntheticCount = matvarRows.filter((row) => row.isSynthetic).length

  sourceMappings
    .filter(({ source }) => source.id !== bomL0Source.id && source.id !== matvarBomEntry?.source.id)
    .forEach(({ source, mapping }) => {
      const mappedColumns = mapping?.columnMappings ?? []
      const sourceName = source.sourceFile?.name ?? source.name

      checks.push(createValidationCheck({
        id: `bom-matvar-extra-source-${source.id}`,
        label: 'Additional BOM Matvar source',
        source: sourceName,
        status: !mapping || mapping.status !== 'Ready' || mappedColumns.length === 0 ? 'Warning' : 'Valid',
        message: !mapping
          ? 'Source is connected to BOM Matvar but has no mapping yet.'
          : mapping.status !== 'Ready'
            ? `Source mapping status is ${mapping.status}.`
            : `${mappedColumns.length} column(s) mapped for this source.`,
        detail: mappedColumns.map((columnMapping) => `${columnMapping.sheetName}/${columnMapping.sourceColumn}`).join(' | '),
      }))
    })

  return {
    review: {
      id: review.id,
      item: getReviewItem(review),
      intelDescription,
    },
    targetId: 'bom-matvar',
    status: getValidationStatus(checks),
    summary: {
      connectedSources: connectedSources.length,
      mappedSources: sourceMappings.filter(({ mapping }) => mapping).length,
      matchedRows: bomL0Rows.length,
      validPartNumbers: bomL0Rows.filter((row) => row.partNumberValid).length,
      invalidPartNumbers: invalidPartNumberCount,
      matvarRows: matvarRows.length,
      matvarOk: matvarOkCount,
      matvarNok: matvarNokCount,
      matvarSynthetic: matvarSyntheticCount,
    },
    checks,
    connectedSources: sourceMappings.map(({ source, mapping }) => ({
      id: source.id,
      name: source.sourceFile?.name ?? source.name,
      status: source.status,
      role: mapping?.role ?? 'Not mapped',
      mappingStatus: mapping?.status ?? 'Missing',
      mappedColumns: mapping?.columnMappings?.map((columnMapping) => columnMapping.sourceColumn) ?? [],
    })),
    bomL0Rows,
    matvarRows,
  }
}

const findBomL0Row = (rows, matcher) => rows.find((row) => matcher(row.description.toLowerCase()))

const findBomL0Rows = (rows, matcher) => rows.filter((row) => matcher(row.description.toLowerCase()))

const createComparisonRule = ({
  id,
  rule,
  expected,
  result,
  partNumber = '',
  description = '',
  status,
  message,
}) => ({
  id,
  rule,
  expected,
  result,
  partNumber,
  description,
  status,
  message,
})

const buildBomMatvarComparison = async (reviewId) => {
  const validation = await buildBomMatvarValidation(reviewId)

  if (!validation) return null

  const rows = validation.bomL0Rows ?? []
  const controllerEu10 = findBomL0Row(rows, (description) =>
    description.includes('controller scope') &&
    description.includes('eu') &&
    description.includes('10'))
  const controllers = findBomL0Rows(rows, (description) => description.includes('controller scope'))
  const heatUs20 = findBomL0Row(rows, (description) =>
    description.includes('heat scope') &&
    description.includes('us') &&
    description.includes('20'))
  const heatScopes = findBomL0Rows(rows, (description) => description.includes('heat scope'))
  const heatFallback = !heatUs20 && heatScopes.length === 1 ? heatScopes[0] : null
  const fullScope = findBomL0Row(rows, (description) => description.includes('full scope'))
  const n2Heat30 = findBomL0Row(rows, (description) =>
    (description.includes('n2 heat') || description.includes('n2heat')) &&
    description.includes('30'))

  const rules = [
    createComparisonRule({
      id: 'controller-scope-eu-10',
      rule: 'Controller Scope',
      expected: 'EU-10',
      result: controllerEu10 ? 'Found' : controllers.length ? 'Missing expected variant' : 'Not found',
      partNumber: controllerEu10?.partNumber ?? '',
      description: controllerEu10?.description ?? '',
      status: controllerEu10 ? 'OK' : 'Missing',
      message: controllerEu10
        ? 'Expected Controller Scope EU-10 was found.'
        : controllers.length
          ? 'Controller Scope exists, but EU-10 was not found.'
          : 'No Controller Scope row was found.',
    }),
    createComparisonRule({
      id: 'heat-scope-us-20',
      rule: 'Heat Scope',
      expected: 'US-20',
      result: heatUs20 ? 'Found' : heatFallback ? 'Fallback' : 'Not found',
      partNumber: (heatUs20 ?? heatFallback)?.partNumber ?? '',
      description: (heatUs20 ?? heatFallback)?.description ?? '',
      status: heatUs20 ? 'OK' : heatFallback ? 'Fallback' : 'Missing',
      message: heatUs20
        ? 'Expected Heat Scope US-20 was found.'
        : heatFallback
          ? 'US-20 was not found, but exactly one Heat Scope row can be used as fallback.'
          : 'No Heat Scope US-20 row was found.',
    }),
    createComparisonRule({
      id: 'full-scope-any',
      rule: 'Full Scope',
      expected: 'Any',
      result: fullScope ? 'Found' : 'Not found',
      partNumber: fullScope?.partNumber ?? '',
      description: fullScope?.description ?? '',
      status: fullScope ? 'Context' : 'Info',
      message: fullScope
        ? 'Full Scope row is available as BOM Matvar context.'
        : 'Full Scope row is not available in the current BOM L0 match set.',
    }),
    createComparisonRule({
      id: 'n2-heat-30',
      rule: 'N2 Heat',
      expected: '30',
      result: n2Heat30 ? 'Found' : 'Not found',
      partNumber: n2Heat30?.partNumber ?? '',
      description: n2Heat30?.description ?? '',
      status: n2Heat30 ? 'OK' : 'Info',
      message: n2Heat30
        ? 'N2 Heat 30 row was found.'
        : 'N2 Heat 30 is not present in this BOM L0 match set.',
    }),
  ]

  return {
    review: validation.review,
    targetId: 'bom-matvar',
    status: rules.some((rule) => rule.status === 'Missing')
      ? 'Warning'
      : rules.some((rule) => rule.status === 'Fallback')
        ? 'Warning'
        : 'Valid',
    summary: {
      rules: rules.length,
      ok: rules.filter((rule) => rule.status === 'OK').length,
      fallback: rules.filter((rule) => rule.status === 'Fallback').length,
      missing: rules.filter((rule) => rule.status === 'Missing').length,
      context: rules.filter((rule) => rule.status === 'Context' || rule.status === 'Info').length,
      sourceRows: rows.length,
    },
    rules,
  }
}

const getComparisonIssueSeverity = (ruleStatus) => {
  if (ruleStatus === 'Missing') return 'High'
  if (ruleStatus === 'Fallback') return 'Medium'
  return 'Low'
}

const createComparisonIssue = (comparison, rule) => {
  const isFallback = rule.status === 'Fallback'
  const titlePrefix = isFallback ? 'Review fallback' : 'Missing expected match'
  const context = [
    rule.expected && `expected ${rule.expected}`,
    rule.result && `result ${rule.result}`,
    rule.partNumber && `part ${rule.partNumber}`,
  ].filter(Boolean).join(' | ')

  return {
    id: `bom-matvar-${comparison.review.id}-${rule.id}`,
    title: `${titlePrefix}: ${rule.rule}`,
    area: 'BOM / MATVAR',
    severity: getComparisonIssueSeverity(rule.status),
    status: isFallback ? 'In review' : 'Open',
    source: 'BOM L0',
    comparedWith: 'BOM Matvar rules',
    decision: 'None',
    owner: 'Damian',
    updated: 'Just now',
    description: [
      rule.message,
      rule.description ? `Matched row: ${rule.description}.` : '',
      context ? `Rule context: ${context}.` : '',
    ].filter(Boolean).join(' '),
    suggestedAction: isFallback
      ? 'Review the fallback candidate and decide whether it is acceptable for this BOM Matvar review.'
      : 'Confirm whether this missing BOM Matvar match requires a formal decision before output work continues.',
  }
}

const buildBomMatvarReviewIssues = async (reviewId) => {
  const comparison = await buildBomMatvarComparison(reviewId)

  if (!comparison) return null

  const issueRules = comparison.rules.filter((rule) => rule.status === 'Missing' || rule.status === 'Fallback')
  const issues = issueRules.map((rule) => createComparisonIssue(comparison, rule))

  return {
    review: comparison.review,
    targetId: 'bom-matvar',
    status: comparison.status,
    summary: {
      issues: issues.length,
      missing: issueRules.filter((rule) => rule.status === 'Missing').length,
      fallback: issueRules.filter((rule) => rule.status === 'Fallback').length,
      sourceRules: comparison.rules.length,
    },
    issues,
  }
}

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
