import { readExcelWorksheet } from './excelPreview.mjs'
import { workflowRepository } from './workflowRepository.mjs'
import { SourcePolicyError, requireConfiguredContractSource } from './sources.mjs'
import { findPoDocumentsForValue, readIntelPoDocumentsByPoNumber } from './documents.mjs'

const normalizeDashboardField = (value) => String(value ?? '').trim().toLowerCase()
export const normalizeColumnField = (value) => String(value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '')
export const partNumberPattern = /^\d+-\d+$/

const getDashboardCellByName = (review, fieldName) => {
  const normalizedFieldName = normalizeDashboardField(fieldName)
  const entry = Object.entries(review?.dashboardCells ?? {}).find(([key]) => normalizeDashboardField(key) === normalizedFieldName)
  return entry?.[1] ?? ''
}

export const getReviewIntelDescription = (review) =>
  getDashboardCellByName(review, 'INTEL Description') ||
  getDashboardCellByName(review, 'Intel Description') ||
  review?.intelModel ||
  ''

export const getReviewItem = (review) =>
  getDashboardCellByName(review, 'Item') ||
  review?.intelModel ||
  review?.id ||
  ''

export const getColumnByAliases = (columns, aliases) => {
  const normalizedAliases = aliases.map(normalizeColumnField)
  return columns.find((column) => normalizedAliases.includes(normalizeColumnField(column))) ?? ''
}


const normalizeForecastLookupValue = (value) => String(value ?? '').trim().toLowerCase()

const normalizeForecastStatus = (value) => String(value ?? '').trim().toUpperCase()

const forecastColumns = {
  wo: 'WO',
  intelPo: 'INTEL PO #',
  intelRtd: 'INTEL RTD',
  oracleRtd: 'ORACLE RTD',
  watlowRtd: 'WATLOW RTD',
}
const dashboardBaseColumns = {
  item: 'Item',
  intelDescription: 'INTEL Description',
}
const forecastOnlyDashboardColumns = new Set([
  forecastColumns.wo,
  forecastColumns.intelPo,
  forecastColumns.intelRtd,
  forecastColumns.watlowRtd,
])

const forecastModelMatchesReviewScope = (forecastModel, intelDescription) => {
  const model = normalizeForecastLookupValue(forecastModel)
  const target = normalizeForecastLookupValue(intelDescription)

  if (!model || !target) return false

  return model === target || model.startsWith(`${target}-`)
}

const forecastModelMatchesReviewExactly = (forecastModel, intelDescription) =>
  normalizeForecastLookupValue(forecastModel) === normalizeForecastLookupValue(intelDescription)

const getB24040400A003AliasIntelDescription = (intelDescription) => {
  const normalizedIntelDescription = normalizeForecastLookupValue(intelDescription)
  const legacyPrefix = 'b2404040000-a003'

  if (!normalizedIntelDescription.startsWith(legacyPrefix)) return ''

  return `b24040400-a003${normalizedIntelDescription.slice(legacyPrefix.length)}`
}

const forecastRecordMatchesB24040400A003Alias = (record, intelDescription) => {
  const aliasIntelDescription = getB24040400A003AliasIntelDescription(intelDescription)

  return Boolean(aliasIntelDescription) &&
    normalizeForecastLookupValue(record.mvar) === 'semi_panel_v041' &&
    forecastModelMatchesReviewScope(record.model, aliasIntelDescription)
}

const findForecastRecordsForReview = (review, forecastRecords) => {
  const intelDescription = getReviewIntelDescription(review)
  const matvar = getReviewItem(review)
  const normalizedMatvar = normalizeForecastLookupValue(matvar)

  const matvarMatches = forecastRecords.filter((record) =>
    normalizedMatvar &&
    normalizeForecastLookupValue(record.mvar) === normalizedMatvar &&
    forecastModelMatchesReviewScope(record.model, intelDescription),
  )
  if (matvarMatches.length) return matvarMatches

  const b24040400A003AliasMatches = forecastRecords.filter((record) =>
    forecastRecordMatchesB24040400A003Alias(record, intelDescription),
  )
  if (b24040400A003AliasMatches.length) return b24040400A003AliasMatches

  return forecastRecords.filter((record) =>
    forecastModelMatchesReviewExactly(record.model, intelDescription),
  )
}


const createLiveSourceReadStatus = ({ source, sourcePath, rows }) => ({
  status: 'Live',
  sourceReadAt: new Date().toISOString(),
  sourceReadAtLabel: new Date().toISOString().replace('T', ' ').slice(0, 19),
  sourceModifiedAt: source.sourceFile?.modifiedAt ?? null,
  sourceFileName: source.sourceFile?.name ?? source.name,
  message: 'Dashboard source is read live from the file registered in Sources.',
  sourceId: source.id,
  sourcePath,
  sourceSizeBytes: source.sourceFile?.sizeBytes ?? null,
  rows,
})

export const readDashboardRowsFromSource = async () => {
  const { contract, source, sourcePath } = requireConfiguredContractSource('dashboard:mass-production', 'dashboard')
  const worksheet = await readExcelWorksheet(sourcePath, { sheetName: contract.sheetName })
  const columnIndexByName = Object.fromEntries(worksheet.columns.map((column, index) => [column, index]))
  const sourceDashboardColumns = [
    contract.fields.item,
    contract.fields.scope,
    contract.fields.implementationStep,
    contract.fields.lastUpdate,
    contract.fields.implementationStepValid,
    contract.fields.oracleItemDescription,
    contract.fields.intelDescription,
  ]
  const dashboardColumns = [
    contract.fields.item,
    contract.fields.scope,
    forecastColumns.wo,
    contract.fields.intelPo,
    contract.fields.intelRtd,
    contract.fields.watlowRtd,
    contract.fields.implementationStep,
    contract.fields.lastUpdate,
    contract.fields.implementationStepValid,
    contract.fields.oracleItemDescription,
    contract.fields.intelDescription,
  ]
  const missingColumns = sourceDashboardColumns.filter((column) => !(column in columnIndexByName))

  if (missingColumns.length) {
    throw new SourcePolicyError(
      `Dashboard source is missing required column(s): ${missingColumns.join(', ')}.`,
      `${source.sourceFile?.name ?? source.name} / ${contract.sheetName}`,
    )
  }

  const reviews = worksheet.rows
    .map((row, index) => {
      const dashboardCells = Object.fromEntries(
        dashboardColumns.map((column) => {
          if (forecastOnlyDashboardColumns.has(column)) return [column, '']

          const rawValue = String(
            column in columnIndexByName ? row[columnIndexByName[column]] : '',
          ).trim()
          const value = column === contract.fields.lastUpdate ? formatSourceDate(rawValue) : rawValue

          return [column, value]
        }),
      )
      const intelModel = dashboardCells[contract.fields.item] || dashboardCells[contract.fields.intelDescription] || `dashboard-row-${index + 1}`

      return {
        id: `dashboard-${source.id}-${index + 1}`,
        intelModel,
        status: 'Draft',
        owner: 'Unassigned',
        lastUpdated: source.sourceFile?.modifiedAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
        dashboardColumns,
        dashboardCells,
      }
    })
    .filter((row) => dashboardColumns.some((column) => row.dashboardCells[column]))

  const forecastDataByReviewId = await readForecastDataByReview(reviews)
  const poDocumentsByPoNumber = await readIntelPoDocumentsByPoNumber()
  const reviewsWithForecastData = reviews.flatMap((review) => {
    const forecastDataRows = forecastDataByReviewId.get(review.id) ?? []

    if (!forecastDataRows.length) {
      return [{
        ...review,
        poDocuments: [],
      }]
    }

    return forecastDataRows.map((forecastData, index) => {
      const dashboardCells = {
        ...review.dashboardCells,
        ...forecastData.dashboardCells,
      }

      return {
        ...review,
        id: `${review.id}-forecast-${forecastData.sourceIndex + 1}-${index + 1}`,
        forecastStatus: forecastData.forecastStatus || undefined,
        dashboardCells,
        poDocuments: findPoDocumentsForValue(dashboardCells[contract.fields.intelPo], poDocumentsByPoNumber),
      }
    })
  })

  return {
    reviews: reviewsWithForecastData,
    sourceReadStatus: createLiveSourceReadStatus({ source, sourcePath, rows: reviewsWithForecastData.length }),
  }
}

export const getLiveReview = async (reviewId) => {
  const { reviews } = await readDashboardRowsFromSource()
  return reviews.find((review) => review.id === reviewId) ?? null
}

const formatForecastRtdValue = (value) => {
  const text = String(value ?? '').trim()
  const numericValue = Number(text.replace(',', '.'))
  if (!text || numericValue <= 0) return ''

  return formatSourceDate(text)
}

const readForecastDataByReview = async (reviews) => {
  try {
    const { sourcePath } = requireConfiguredContractSource('dashboard:mass-production', 'dashboard')
    const worksheet = await readExcelWorksheet(sourcePath, { sheetName: 'Forecast' })
    const modelColumn = getColumnByAliases(worksheet.columns, ['INTEL MODEL NUMBER ITEM'])
    const statusColumn = getColumnByAliases(worksheet.columns, ['Status'])
    const mvarColumn = getColumnByAliases(worksheet.columns, ['MVAR'])
    const woColumn = getColumnByAliases(worksheet.columns, [forecastColumns.wo])
    const intelPoColumn = getColumnByAliases(worksheet.columns, [forecastColumns.intelPo])
    const intelRtdColumn = getColumnByAliases(worksheet.columns, [forecastColumns.intelRtd])
    const oracleRtdColumn = getColumnByAliases(worksheet.columns, [forecastColumns.oracleRtd])
    const watlowRtdColumn = getColumnByAliases(worksheet.columns, [forecastColumns.watlowRtd])
    const forecastDateColumn = getColumnByAliases(worksheet.columns, ['Forecast date'])
    const noScheduleDateColumn = getColumnByAliases(worksheet.columns, ['no schedule date'])

    if (!modelColumn || !statusColumn) return new Map()

    const columnIndex = (column) => column ? worksheet.columns.findIndex((sourceColumn) => sourceColumn === column) : -1
    const modelColumnIndex = columnIndex(modelColumn)
    const statusColumnIndex = columnIndex(statusColumn)
    const mvarColumnIndex = columnIndex(mvarColumn)
    const woColumnIndex = columnIndex(woColumn)
    const intelPoColumnIndex = columnIndex(intelPoColumn)
    const intelRtdColumnIndex = columnIndex(intelRtdColumn)
    const oracleRtdColumnIndex = columnIndex(oracleRtdColumn)
    const watlowRtdColumnIndex = columnIndex(watlowRtdColumn)
    const forecastDateColumnIndex = columnIndex(forecastDateColumn)
    const noScheduleDateColumnIndex = columnIndex(noScheduleDateColumn)

    const getCell = (row, index) => index >= 0 ? String(row[index] ?? '').trim() : ''
    const forecastRecords = worksheet.rows.map((row, sourceIndex) => ({
      sourceIndex,
      model: getCell(row, modelColumnIndex),
      status: normalizeForecastStatus(getCell(row, statusColumnIndex)),
      mvar: getCell(row, mvarColumnIndex),
      wo: getCell(row, woColumnIndex),
      intelPo: getCell(row, intelPoColumnIndex),
      intelRtdRaw: getCell(row, intelRtdColumnIndex),
      oracleRtdRaw: getCell(row, oracleRtdColumnIndex),
      watlowRtdRaw: getCell(row, watlowRtdColumnIndex),
      forecastDate: getCell(row, forecastDateColumnIndex),
      noScheduleDate: getCell(row, noScheduleDateColumnIndex),
    }))
      .filter((record) => record.model && record.status)

    return new Map(reviews.flatMap((review) => {
      const forecastRecordsForReview = findForecastRecordsForReview(review, forecastRecords)
      if (!forecastRecordsForReview.length) return []

      return [[review.id, forecastRecordsForReview.map((forecastRecord) => {
        const useB24040400A003Alias = forecastRecordMatchesB24040400A003Alias(
          forecastRecord,
          getReviewIntelDescription(review),
        )

        return {
          sourceIndex: forecastRecord.sourceIndex,
          forecastStatus: forecastRecord.status,
          dashboardCells: {
            [forecastColumns.wo]: forecastRecord.wo,
            [forecastColumns.intelPo]: forecastRecord.intelPo,
            [forecastColumns.intelRtd]: formatForecastRtdValue(forecastRecord.intelRtdRaw),
            [forecastColumns.watlowRtd]: formatForecastRtdValue(forecastRecord.watlowRtdRaw),
            ...(useB24040400A003Alias ? {
              [dashboardBaseColumns.item]: forecastRecord.mvar,
              [dashboardBaseColumns.intelDescription]: forecastRecord.model,
            } : {}),
          },
        }
      })]]
    }))
  } catch {
    return new Map()
  }
}

const createUnavailableMatvarForecastValidation = (message) => ({
  status: 'Unavailable',
  checkedRows: 0,
  issueCount: 0,
  issues: [],
  message,
  refreshedAt: new Date().toISOString(),
})

const readMatvarForecastValidationStatus = async () => {
  try {
    const { contract, sourcePath } = requireConfiguredContractSource('dashboard:mass-production', 'dashboard')
    const dashboardWorksheet = await readExcelWorksheet(sourcePath, { sheetName: contract.sheetName })
    const forecastWorksheet = await readExcelWorksheet(sourcePath, { sheetName: 'Forecast' })
    const dashboardColumnIndexByName = Object.fromEntries(
      dashboardWorksheet.columns.map((column, index) => [column, index]),
    )
    const dashboardMissingColumns = [contract.fields.intelDescription, contract.fields.item]
      .filter((column) => !(column in dashboardColumnIndexByName))

    if (dashboardMissingColumns.length) {
      throw new SourcePolicyError(
        `Matvar validation source is missing dashboard column(s): ${dashboardMissingColumns.join(', ')}.`,
        `${contract.sheetName}`,
      )
    }

    const forecastModelColumn = getColumnByAliases(forecastWorksheet.columns, ['INTEL MODEL NUMBER ITEM'])
    const forecastMvarColumn = getColumnByAliases(forecastWorksheet.columns, ['MVAR'])

    if (!forecastModelColumn || !forecastMvarColumn) {
      throw new SourcePolicyError(
        'Matvar validation source is missing Forecast column(s): INTEL MODEL NUMBER ITEM, MVAR.',
        'Forecast',
      )
    }

    const dashboardIntelDescriptionIndex = dashboardColumnIndexByName[contract.fields.intelDescription]
    const dashboardItemIndex = dashboardColumnIndexByName[contract.fields.item]
    const validMvarsByModel = new Map()

    dashboardWorksheet.rows.forEach((row) => {
      const model = String(row[dashboardIntelDescriptionIndex] ?? '').trim()
      const mvar = String(row[dashboardItemIndex] ?? '').trim()
      const modelKey = normalizeForecastLookupValue(model)
      const mvarKey = normalizeForecastLookupValue(mvar)

      if (!modelKey || !mvarKey) return

      const existing = validMvarsByModel.get(modelKey) ?? new Map()
      existing.set(mvarKey, mvar)
      validMvarsByModel.set(modelKey, existing)
    })

    const forecastModelColumnIndex = forecastWorksheet.columns.findIndex((column) => column === forecastModelColumn)
    const forecastMvarColumnIndex = forecastWorksheet.columns.findIndex((column) => column === forecastMvarColumn)
    const checkedRecords = forecastWorksheet.rows
      .map((row, index) => {
        const intelModelNumberItem = String(row[forecastModelColumnIndex] ?? '').trim()
        const forecastMvar = String(row[forecastMvarColumnIndex] ?? '').trim()

        return {
          rowNumber: forecastWorksheet.headerRow + index + 1,
          intelModelNumberItem,
          forecastMvar,
        }
      })
      .filter((record) => record.intelModelNumberItem || record.forecastMvar)

    const issues = checkedRecords.flatMap((record, index) => {
      const modelKey = normalizeForecastLookupValue(record.intelModelNumberItem)
      const mvarKey = normalizeForecastLookupValue(record.forecastMvar)

      if (!modelKey) {
        return [{
          id: `forecast-matvar-${index + 1}`,
          rowNumber: record.rowNumber,
          intelModelNumberItem: record.intelModelNumberItem,
          forecastMvar: record.forecastMvar,
          expectedMvar: null,
          issue: 'Forecast row has MVAR but no INTEL MODEL NUMBER ITEM.',
        }]
      }

      if (!mvarKey) {
        return [{
          id: `forecast-matvar-${index + 1}`,
          rowNumber: record.rowNumber,
          intelModelNumberItem: record.intelModelNumberItem,
          forecastMvar: record.forecastMvar,
          expectedMvar: null,
          issue: 'Forecast row has INTEL MODEL NUMBER ITEM but no MVAR.',
        }]
      }

      const validMvars = validMvarsByModel.get(modelKey)
      if (!validMvars) {
        return [{
          id: `forecast-matvar-${index + 1}`,
          rowNumber: record.rowNumber,
          intelModelNumberItem: record.intelModelNumberItem,
          forecastMvar: record.forecastMvar,
          expectedMvar: null,
          issue: 'INTEL MODEL NUMBER ITEM does not exist in Semi Panels List.',
        }]
      }

      if (!validMvars.has(mvarKey)) {
        return [{
          id: `forecast-matvar-${index + 1}`,
          rowNumber: record.rowNumber,
          intelModelNumberItem: record.intelModelNumberItem,
          forecastMvar: record.forecastMvar,
          expectedMvar: Array.from(validMvars.values()).join(', '),
          issue: 'MVAR does not match the Item assigned to this INTEL Description in Semi Panels List.',
        }]
      }

      return []
    })

    return {
      status: issues.length ? 'Error' : 'Valid',
      checkedRows: checkedRecords.length,
      issueCount: issues.length,
      issues,
      message: issues.length
        ? `${issues.length} Forecast row(s) have mismatched INTEL MODEL NUMBER ITEM / MVAR pairs.`
        : 'Forecast INTEL MODEL NUMBER ITEM / MVAR pairs match Semi Panels List.',
      refreshedAt: new Date().toISOString(),
    }
  } catch (error) {
    return createUnavailableMatvarForecastValidation(
      error instanceof Error ? error.message : 'Matvar forecast validation could not be completed.',
    )
  }
}

export const buildBootstrapPayload = async () => {
  const payload = workflowRepository.getBootstrapPayload()
  let reviews
  let sourceReadStatus
  let matvarForecastValidationStatus

  try {
    const [dashboardRead, validationStatus] = await Promise.all([
      readDashboardRowsFromSource(),
      readMatvarForecastValidationStatus(),
    ])
    reviews = dashboardRead.reviews
    sourceReadStatus = dashboardRead.sourceReadStatus
    matvarForecastValidationStatus = validationStatus
  } catch (error) {
    return {
      ...payload,
      reviews: [],
      matvarForecastValidationStatus: createUnavailableMatvarForecastValidation(
        error instanceof Error
          ? error.message
          : 'Matvar forecast validation could not be completed.',
      ),
      sourceReadStatus: {
        ...payload.sourceReadStatus,
        status: 'Source unavailable',
        sourceReadAt: null,
        sourceReadAtLabel: null,
        message: error instanceof Error
          ? error.message
          : 'Dashboard source could not be read.',
      },
    }
  }

  return {
    ...payload,
    reviews,
    sourceReadStatus,
    matvarForecastValidationStatus,
  }
}

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

export const formatSourceDate = (value) => {
  const date = parseSourceDate(value)
  if (!date) return String(value ?? '').trim()

  const pad = (part) => String(part).padStart(2, '0')
  return `${pad(date.getUTCDate())}.${pad(date.getUTCMonth() + 1)}.${date.getUTCFullYear()}`
}

export const ensureDashboardSourceFresh = async () => {}
