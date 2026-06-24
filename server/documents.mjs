import { readdir } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { requireConfiguredContractSource } from './sources.mjs'

export const extractPoNumbers = (value) => [
  ...new Set([...String(value ?? '').matchAll(/(?:^|\D)(\d{10})(?!\d)/g)].map((match) => match[1])),
]


const scanIntelPoDocuments = async (folderPath) => {
  const documentsByPoNumber = new Map()

  const addDocument = (poNumber, document) => {
    const documents = documentsByPoNumber.get(poNumber) ?? []
    documents.push(document)
    documentsByPoNumber.set(poNumber, documents)
  }

  const scanFolder = async (currentFolderPath) => {
    let entries

    try {
      entries = await readdir(currentFolderPath, { withFileTypes: true })
    } catch {
      return
    }

    await Promise.all(entries.map(async (entry) => {
      const entryPath = join(currentFolderPath, entry.name)

      if (entry.isDirectory()) {
        await scanFolder(entryPath)
        return
      }

      if (!entry.isFile() || extname(entry.name).toLowerCase() !== '.pdf') return

      const poNumbers = extractPoNumbers(entry.name)
      if (!poNumbers.length) return

      for (const poNumber of poNumbers) {
        addDocument(poNumber, {
          poNumber,
          name: entry.name,
          path: entryPath,
        })
      }
    }))
  }

  await scanFolder(folderPath)

  for (const documents of documentsByPoNumber.values()) {
    documents.sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' }))
  }

  return documentsByPoNumber
}

export const findPoDocumentsForValue = (poValue, documentsByPoNumber) =>
  extractPoNumbers(poValue).flatMap((poNumber) => documentsByPoNumber.get(poNumber) ?? [])

export const readIntelPoDocumentsByPoNumber = async () => {
  try {
    const { sourcePath } = requireConfiguredContractSource('dashboard:intel-po-files', 'dashboard')
    return await scanIntelPoDocuments(sourcePath)
  } catch {
    return new Map()
  }
}
