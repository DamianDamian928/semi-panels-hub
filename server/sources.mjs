import { constants } from 'node:fs'
import { access, readdir, stat } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { getFusionBomConfigSummary, testFusionBomApiConnection } from './fusionBomApi.mjs'
import { getPlmSqlConfigSummary, testPlmSqlConnection } from './plmSqlConnection.mjs'
import { connectionTargetIds as sourceConnectionTargetIds } from './sourceUsageModel.mjs'
import { workflowRepository } from './workflowRepository.mjs'

export const isLocalFilePayload = (file) =>
  file &&
  typeof file.name === 'string' &&
  typeof file.path === 'string' &&
  typeof file.directory === 'string' &&
  typeof file.extension === 'string' &&
  typeof file.sizeBytes === 'number' &&
  typeof file.modifiedAt === 'string'

const sourceTypes = new Set(['File', 'Folder', 'SQL', 'API', 'SharePoint', 'Manual export'])
const sourceUsages = new Set(['BOM', 'Documentation', 'Costing'])
const connectionTargetIds = new Set(sourceConnectionTargetIds)

export const isSourceCreatePayload = (value) =>
  value &&
  typeof value.name === 'string' &&
  sourceTypes.has(value.type) &&
  Array.isArray(value.usedFor) &&
  value.usedFor.length > 0 &&
  value.usedFor.every((usage) => sourceUsages.has(usage)) &&
  typeof value.expectedFormat === 'string' &&
  typeof value.owner === 'string' &&
  typeof value.description === 'string'

export const isSourceConnectionsPayload = (value) =>
  value &&
  typeof value === 'object' &&
  value.connectionsByTarget &&
  typeof value.connectionsByTarget === 'object' &&
  [...connectionTargetIds].every((targetId) => {
    const sourceIds = value.connectionsByTarget[targetId]
    return Array.isArray(sourceIds) && sourceIds.every((sourceId) => typeof sourceId === 'string')
  })

export const isSourceConfigurationPayload = (value) =>
  value &&
  typeof value.name === 'string' &&
  typeof value.description === 'string'

export const defaultLocationByType = {
  File: 'Waiting for local file',
  Folder: 'Waiting for folder location',
  SQL: 'Connection profile not configured',
  API: 'API connection profile not configured',
  SharePoint: 'SharePoint location not configured',
  'Manual export': 'Waiting for local export',
}

export const defaultExpectedFormatByType = {
  File: 'Excel workbook or CSV export',
  Folder: 'Folder path',
  SQL: 'SQL connection profile',
  API: 'Read-only HTTP API',
  SharePoint: 'SharePoint folder or document library',
  'Manual export': 'Manual export file',
}

const checkedAtLabel = (checkedAt) => checkedAt

export const getSourcePath = (source) => source.sourceFile?.path

const getSqlLocationLabel = (summary) => {
  const serverLabel = summary.instance
    ? `${summary.server}\\${summary.instance}`
    : summary.server

  return serverLabel && summary.database
    ? `${serverLabel} / ${summary.database}`
    : 'Connection profile not configured'
}

const checkSqlSourceAccess = async (source, checkedAt) => {
  const summary = getPlmSqlConfigSummary()
  const location = getSqlLocationLabel(summary)

  if (!summary.configExists || !summary.server || !summary.database || !summary.userConfigured || !summary.passwordConfigured) {
    const missingParts = [
      !summary.configExists ? `config file ${summary.configPath}` : null,
      !summary.server ? 'SQL_SERVER' : null,
      !summary.database ? 'SQL_DATABASE' : null,
      !summary.userConfigured ? 'SQL_USER' : null,
      !summary.passwordConfigured ? 'SQL_PASSWORD' : null,
    ].filter(Boolean)

    return {
      ...source,
      location,
      status: 'Needs location',
      lastChecked: checkedAtLabel(checkedAt),
      accessCheck: {
        checkedAt,
        status: 'Needs location',
        message: `PLMAccelerate SQL profile is incomplete. Missing: ${missingParts.join(', ')}.`,
        exists: summary.configExists,
        readable: false,
      },
    }
  }

  try {
    const result = await testPlmSqlConnection()
    const status = result.readable ? 'Ready' : 'Error'

    return {
      ...source,
      location,
      status,
      lastChecked: checkedAtLabel(checkedAt),
      accessCheck: {
        checkedAt,
        status,
        message: result.message,
        exists: true,
        readable: result.readable,
      },
    }
  } catch (error) {
    return {
      ...source,
      location,
      status: 'Error',
      lastChecked: checkedAtLabel(checkedAt),
      accessCheck: {
        checkedAt,
        status: 'Error',
        message: error instanceof Error
          ? `PLMAccelerate SQL connection failed: ${error.message}`
          : 'PLMAccelerate SQL connection failed.',
        exists: true,
        readable: false,
      },
    }
  }
}

const getFusionBomApiLocationLabel = (summary) =>
  summary.baseUrl
    ? `${summary.baseUrl.replace(/\/$/, '')} / Fusion BOM`
    : 'API connection profile not configured'

const checkFusionBomApiSourceAccess = async (source, checkedAt) => {
  const summary = getFusionBomConfigSummary()
  const location = getFusionBomApiLocationLabel(summary)

  if (!summary.configExists || !summary.keyConfigured) {
    const missingParts = [
      !summary.configExists ? `config file ${summary.configPath}` : null,
      !summary.keyConfigured ? 'FUSION_BOM_API_KEY' : null,
    ].filter(Boolean)

    return {
      ...source,
      location,
      status: 'Needs location',
      lastChecked: checkedAtLabel(checkedAt),
      accessCheck: {
        checkedAt,
        status: 'Needs location',
        message: `Fusion BOM API profile is incomplete. Missing: ${missingParts.join(', ')}.`,
        exists: summary.configExists,
        readable: false,
      },
    }
  }

  try {
    const result = await testFusionBomApiConnection()
    const status = result.readable ? 'Ready' : 'Error'

    return {
      ...source,
      location,
      status,
      lastChecked: checkedAtLabel(checkedAt),
      accessCheck: {
        checkedAt,
        status,
        message: result.message,
        exists: result.exists,
        readable: result.readable,
      },
    }
  } catch (error) {
    return {
      ...source,
      location,
      status: 'Error',
      lastChecked: checkedAtLabel(checkedAt),
      accessCheck: {
        checkedAt,
        status: 'Error',
        message: error instanceof Error
          ? `Fusion BOM API connection failed: ${error.message}`
          : 'Fusion BOM API connection failed.',
        exists: true,
        readable: false,
      },
    }
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

export const previewableFileExtensions = new Set(['xlsx', 'xlsm'])

export class SourcePolicyError extends Error {
  constructor(message, detail = '') {
    super(message)
    this.name = 'SourcePolicyError'
    this.detail = detail
  }
}

export const requireConfiguredContractSource = (contractId, targetId = null) => {
  const contract = workflowRepository.getDataContracts(targetId).find((item) => item.id === contractId)

  if (!contract) {
    throw new SourcePolicyError(
      `Required source contract "${contractId}" is not configured.`,
      'API reads are allowed only through Sources and source contracts.',
    )
  }

  if (contract.status !== 'Active') {
    throw new SourcePolicyError(
      `Required source contract "${contractId}" is ${contract.status}.`,
      contract.sourceMatcher ? JSON.stringify(contract.sourceMatcher) : '',
    )
  }

  const source = contract.sourceId ? workflowRepository.getSource(contract.sourceId) : null
  const sourcePath = source?.sourceFile?.path

  if (!source || !sourcePath) {
    throw new SourcePolicyError(
      `Required source contract "${contractId}" does not resolve to a registered local Source path.`,
      contract.sourceMatcher ? JSON.stringify(contract.sourceMatcher) : '',
    )
  }

  return {
    contract,
    source,
    sourcePath,
    sourceName: source.sourceFile?.name ?? source.name,
  }
}

export const checkSourceAccess = async (source) => {
  const checkedAt = new Date().toISOString()

  if (source.type === 'SQL') {
    return checkSqlSourceAccess(source, checkedAt)
  }

  if (source.type === 'API') {
    return checkFusionBomApiSourceAccess(source, checkedAt)
  }

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

    const isFolderSource = source.type === 'Folder'
    const isDirectory = fileStats.isDirectory()
    const status = isFolderSource
      ? isDirectory ? 'Ready' : 'Error'
      : !isDirectory && fileStats.size > 0 ? 'Ready' : 'Error'
    const message = isFolderSource
      ? isDirectory
        ? 'Local folder exists and is readable.'
        : 'Saved local path is not a folder.'
      : isDirectory
        ? 'Saved local path is a folder, but this source expects a file.'
        : fileStats.size > 0
          ? 'Local file exists and is readable.'
          : 'Local file exists but is empty.'
    const folderSummary = isFolderSource && status === 'Ready'
      ? await scanLocalFolder(path)
      : undefined

    return {
      ...source,
      status,
      lastChecked: checkedAtLabel(checkedAt),
      sourceFile: source.sourceFile
        ? {
          ...source.sourceFile,
          folderSummary,
        }
        : source.sourceFile,
      accessCheck: {
        checkedAt,
        status,
        message,
        exists: true,
        readable: status === 'Ready',
        sizeBytes: isFolderSource ? undefined : fileStats.size,
        modifiedAt: fileStats.mtime.toISOString(),
      },
    }
  } catch (error) {
    const isFolder = source.type === 'Folder'
    const localPathLabel = isFolder ? 'folder' : 'file'
    const message = error?.code === 'ENOENT'
      ? `Local ${localPathLabel} was not found at the saved path.`
      : error?.code === 'EACCES' || error?.code === 'EPERM'
        ? `Local ${localPathLabel} exists but cannot be read.`
        : `Local ${localPathLabel} access check failed.`

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

export const checkAndSaveSource = async (source) => {
  const checkedSource = await checkSourceAccess(source)
  saveCheckedSource(checkedSource)
  return checkedSource
}

export const checkAndSaveAllSources = async () => {
  const sources = workflowRepository.getSources()
  const checkedSources = await Promise.all(sources.map((source) => checkSourceAccess(source)))
  checkedSources.forEach(saveCheckedSource)
  return checkedSources
}
