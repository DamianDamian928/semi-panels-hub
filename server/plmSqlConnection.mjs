import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sql from 'mssql'

const serverDirectory = dirname(fileURLToPath(import.meta.url))
const defaultConfigPath = join(serverDirectory, 'data', 'plm-sql.local.env')

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || String(value).trim() === '') return fallback
  return ['1', 'true', 'yes', 'y', 'on'].includes(String(value).trim().toLowerCase())
}

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

const getPlmSqlEnv = () => {
  const filePath = process.env.PLM_SQL_ENV_PATH ?? defaultConfigPath
  const fileValues = parseEnvFile(filePath) ?? {}

  return {
    filePath,
    values: {
      SQL_SERVER: process.env.SQL_SERVER ?? fileValues.SQL_SERVER,
      SQL_INSTANCE: process.env.SQL_INSTANCE ?? fileValues.SQL_INSTANCE,
      SQL_DATABASE: process.env.SQL_DATABASE ?? fileValues.SQL_DATABASE,
      SQL_USER: process.env.SQL_USER ?? fileValues.SQL_USER,
      SQL_PASSWORD: process.env.SQL_PASSWORD ?? fileValues.SQL_PASSWORD,
      SQL_ENCRYPT: process.env.SQL_ENCRYPT ?? fileValues.SQL_ENCRYPT,
      SQL_TRUST_SERVER_CERTIFICATE: process.env.SQL_TRUST_SERVER_CERTIFICATE ?? fileValues.SQL_TRUST_SERVER_CERTIFICATE,
      SQL_CONNECTION_TIMEOUT_MS: process.env.SQL_CONNECTION_TIMEOUT_MS ?? fileValues.SQL_CONNECTION_TIMEOUT_MS,
      SQL_REQUEST_TIMEOUT_MS: process.env.SQL_REQUEST_TIMEOUT_MS ?? fileValues.SQL_REQUEST_TIMEOUT_MS,
    },
  }
}

export const getPlmSqlConfigSummary = () => {
  const { filePath, values } = getPlmSqlEnv()

  return {
    configPath: filePath,
    configExists: existsSync(filePath),
    server: values.SQL_SERVER ?? '',
    instance: values.SQL_INSTANCE ?? '',
    database: values.SQL_DATABASE ?? '',
    userConfigured: Boolean(values.SQL_USER),
    passwordConfigured: Boolean(values.SQL_PASSWORD),
    encrypt: parseBoolean(values.SQL_ENCRYPT, true),
    trustServerCertificate: parseBoolean(values.SQL_TRUST_SERVER_CERTIFICATE, false),
  }
}

const requireValue = (values, key) => {
  const value = values[key]
  if (!value || !String(value).trim()) {
    throw new Error(`Missing ${key} in PLMAccelerate SQL configuration.`)
  }

  return String(value).trim()
}

const buildMssqlConfig = () => {
  const { values } = getPlmSqlEnv()
  const server = requireValue(values, 'SQL_SERVER')
  const database = requireValue(values, 'SQL_DATABASE')
  const user = requireValue(values, 'SQL_USER')
  const password = requireValue(values, 'SQL_PASSWORD')
  const instanceName = values.SQL_INSTANCE?.trim()

  return {
    server,
    database,
    user,
    password,
    connectionTimeout: Number(values.SQL_CONNECTION_TIMEOUT_MS ?? 10000),
    requestTimeout: Number(values.SQL_REQUEST_TIMEOUT_MS ?? 10000),
    options: {
      encrypt: parseBoolean(values.SQL_ENCRYPT, true),
      trustServerCertificate: parseBoolean(values.SQL_TRUST_SERVER_CERTIFICATE, false),
      ...(instanceName ? { instanceName } : {}),
    },
  }
}

export const testPlmSqlConnection = async () => {
  const config = buildMssqlConfig()
  const pool = new sql.ConnectionPool(config)

  try {
    await pool.connect()
    const result = await pool.request().query('SELECT 1 AS connection_ok')
    const isReadable = result.recordset?.[0]?.connection_ok === 1

    return {
      readable: isReadable,
      message: isReadable
        ? 'PLMAccelerate SQL connection succeeded with read-only test query.'
        : 'PLMAccelerate SQL connection responded, but the test query returned an unexpected result.',
    }
  } finally {
    await pool.close().catch(() => undefined)
  }
}
