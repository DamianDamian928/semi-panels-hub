import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const serverDirectory = dirname(fileURLToPath(import.meta.url))
const defaultConfigPath = join(serverDirectory, 'data', 'fusion-bom.local.env')
const defaultBaseUrl = 'https://plmutility.watlow.com'
const defaultTestPartNumber = '2132-0849'

const parseEnvFile = (filePath) => {
  if (!existsSync(filePath)) return null

  const entries = {}
  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/)

  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine || trimmedLine.startsWith('#')) continue

    const separatorIndex = trimmedLine.indexOf('=')
    if (separatorIndex === -1) continue

    const key = trimmedLine.slice(0, separatorIndex).trim()
    const rawValue = trimmedLine.slice(separatorIndex + 1).trim()
    const value = rawValue.replace(/^["']|["']$/g, '')

    if (key) entries[key] = value
  }

  return entries
}

const getFusionBomEnv = () => {
  const filePath = process.env.FUSION_BOM_ENV_PATH ?? defaultConfigPath
  const fileValues = parseEnvFile(filePath) ?? {}

  return {
    filePath,
    values: {
      FUSION_BOM_API_BASE_URL: process.env.FUSION_BOM_API_BASE_URL ?? fileValues.FUSION_BOM_API_BASE_URL ?? defaultBaseUrl,
      FUSION_BOM_API_KEY: process.env.FUSION_BOM_API_KEY ?? fileValues.FUSION_BOM_API_KEY,
      FUSION_BOM_TEST_PART_NUMBER: process.env.FUSION_BOM_TEST_PART_NUMBER ?? fileValues.FUSION_BOM_TEST_PART_NUMBER ?? defaultTestPartNumber,
    },
  }
}

export const getFusionBomConfigSummary = () => {
  const { filePath, values } = getFusionBomEnv()

  return {
    baseUrl: values.FUSION_BOM_API_BASE_URL,
    configExists: existsSync(filePath),
    configPath: filePath,
    keyConfigured: Boolean(values.FUSION_BOM_API_KEY),
    testPartNumber: values.FUSION_BOM_TEST_PART_NUMBER,
  }
}

const requireApiKey = () => {
  const { values } = getFusionBomEnv()
  const apiKey = values.FUSION_BOM_API_KEY

  if (!apiKey || !String(apiKey).trim()) {
    throw new Error('Missing FUSION_BOM_API_KEY in Fusion BOM API configuration.')
  }

  return {
    apiKey: String(apiKey).trim(),
    baseUrl: values.FUSION_BOM_API_BASE_URL,
  }
}

const normalizeFusionBomRow = (row) => ({
  action: row?.action ?? null,
  componentItemNumber: row?.componentItemNumber ?? null,
  effectiveEndDate: row?.effectiveEndDate ?? null,
  effectiveStartDate: row?.effectiveStartDate ?? null,
  itemSequence: row?.itemSequence ?? null,
  plmSequence: row?.plmSequence ?? null,
  previousComponentItemNumber: row?.previousComponentItemNumber ?? null,
  primaryUOMCode: row?.primaryUOMCode ?? null,
  quantity: row?.quantity ?? null,
})

export const isActiveFusionBomRow = (row, effectiveDate = new Date()) => {
  const startDate = row.effectiveStartDate ? new Date(row.effectiveStartDate) : null
  const endDate = row.effectiveEndDate ? new Date(row.effectiveEndDate) : null

  if (startDate && Number.isNaN(startDate.getTime())) return false
  if (endDate && Number.isNaN(endDate.getTime())) return false

  return (!startDate || startDate <= effectiveDate) && (!endDate || endDate > effectiveDate)
}

export const fetchFusionBomRows = async (partNumber) => {
  const normalizedPartNumber = String(partNumber ?? '').trim()

  if (!normalizedPartNumber) {
    throw new Error('Part number is required for Fusion BOM lookup.')
  }

  const { apiKey, baseUrl } = requireApiKey()
  const url = new URL('/api/Fusion/BOM', baseUrl)
  url.searchParams.set('partNumber', normalizedPartNumber)

  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'X-Api-Key': apiKey,
    },
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new Error(details || `Fusion BOM API returned ${response.status}.`)
  }

  const payload = await response.json()

  return Array.isArray(payload) ? payload.map(normalizeFusionBomRow) : []
}

export const getActiveFusionBom = async (partNumber, { includeExpired = false } = {}) => {
  const rows = await fetchFusionBomRows(partNumber)
  const activeRows = rows.filter((row) => isActiveFusionBomRow(row))

  return {
    activeRowsCount: activeRows.length,
    allRowsCount: rows.length,
    includeExpired,
    partNumber: String(partNumber ?? '').trim(),
    rows: includeExpired ? rows : activeRows,
  }
}

export const testFusionBomApiConnection = async () => {
  const summary = getFusionBomConfigSummary()

  if (!summary.keyConfigured) {
    return {
      exists: summary.configExists,
      message: `Fusion BOM API profile is incomplete. Missing: FUSION_BOM_API_KEY in ${summary.configPath}.`,
      readable: false,
    }
  }

  const result = await getActiveFusionBom(summary.testPartNumber)

  return {
    exists: true,
    message: `Fusion BOM API returned ${result.activeRowsCount} active rows from ${result.allRowsCount} total rows for ${summary.testPartNumber}.`,
    readable: true,
    sample: result,
  }
}
