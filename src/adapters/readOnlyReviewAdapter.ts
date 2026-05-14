import type { DecisionState, ReviewIssue, ReviewIssueSeverity, ReviewIssueStatus } from '../types'

export type ReadOnlySourceIssueCandidate = {
  id: string
  title: string
  area: string
  source: string
  comparedWith: string
  severity?: ReviewIssueSeverity
  status?: ReviewIssueStatus
  decision?: DecisionState
  owner?: string
  updated?: string
  description?: string
  suggestedAction?: string
}

export type ReadOnlyReviewSourceSnapshot = {
  reviewId: string
  sourceName: string
  importedAt: string
  records: ReadonlyArray<ReadOnlySourceIssueCandidate>
}

export type ReviewIssueAdapterResult = {
  reviewId: string
  sourceName: string
  importedAt: string
  columns?: string[]
  issues: ReviewIssue[]
}

export const mapSourceSnapshotToReviewIssues = (
  snapshot: ReadOnlyReviewSourceSnapshot,
): ReviewIssueAdapterResult => ({
  reviewId: snapshot.reviewId,
  sourceName: snapshot.sourceName,
  importedAt: snapshot.importedAt,
  issues: snapshot.records.map((record): ReviewIssue => ({
    id: record.id,
    title: record.title,
    area: record.area,
    severity: record.severity ?? 'Medium',
    status: record.status ?? 'Open',
    source: record.source,
    comparedWith: record.comparedWith,
    decision: record.decision ?? 'None',
    owner: record.owner ?? 'Unassigned',
    updated: record.updated ?? snapshot.importedAt,
    description: record.description ?? `${record.title} was mapped from a read-only source snapshot.`,
    suggestedAction: record.suggestedAction ?? 'Review the mapped source context before creating a decision.',
  })),
})

const normalizeColumnName = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, '')

const splitDelimitedLine = (line: string, delimiter: string) => {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const nextChar = line[index + 1]

    if (char === '"' && nextChar === '"') {
      current += '"'
      index += 1
      continue
    }

    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  cells.push(current.trim())
  return cells
}

const chooseDelimiter = (headerLine: string) => {
  const candidates = [',', ';', '\t']

  return candidates.reduce((best, delimiter) => {
    const count = splitDelimitedLine(headerLine, delimiter).length
    const bestCount = splitDelimitedLine(headerLine, best).length

    return count > bestCount ? delimiter : best
  }, ',')
}

const getField = (
  row: Record<string, string>,
  aliases: string[],
) => aliases.map((alias) => row[normalizeColumnName(alias)]).find((value) => value)

const toSeverity = (value?: string): ReviewIssueSeverity | undefined => {
  if (value === 'High' || value === 'Medium' || value === 'Low') return value
  return undefined
}

const toStatus = (value?: string): ReviewIssueStatus | undefined => {
  if (value === 'Open' || value === 'In review' || value === 'Resolved') return value
  return undefined
}

const toDecision = (value?: string): DecisionState | undefined => {
  if (value === 'None' || value === 'Required' || value === 'Drafted' || value === 'Accepted' || value === 'Deferred') {
    return value
  }

  return undefined
}

export const parseDelimitedReviewSnapshot = (
  fileName: string,
  text: string,
  importedAt = 'Just now',
): ReviewIssueAdapterResult => {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)

  if (lines.length < 2) {
    return {
      reviewId: `preview-${fileName}`,
      sourceName: fileName,
      importedAt,
      columns: lines[0] ? splitDelimitedLine(lines[0], ',') : [],
      issues: [],
    }
  }

  const delimiter = chooseDelimiter(lines[0])
  const columns = splitDelimitedLine(lines[0], delimiter)
  const normalizedColumns = columns.map(normalizeColumnName)

  const records = lines.slice(1).map((line, index): ReadOnlySourceIssueCandidate => {
    const cells = splitDelimitedLine(line, delimiter)
    const row = normalizedColumns.reduce<Record<string, string>>((acc, column, columnIndex) => {
      acc[column] = cells[columnIndex] ?? ''
      return acc
    }, {})
    const title = getField(row, ['title', 'issueTitle', 'issue', 'problem', 'name']) ?? `Imported row ${index + 1}`

    return {
      id: getField(row, ['id', 'issueId', 'key']) ?? `import-${index + 1}`,
      title,
      area: getField(row, ['area', 'scope', 'stage', 'section']) ?? 'Imported data',
      source: getField(row, ['source', 'sourceA', 'from']) ?? fileName,
      comparedWith: getField(row, ['comparedWith', 'sourceB', 'target', 'compareTo']) ?? 'Not provided',
      severity: toSeverity(getField(row, ['severity', 'priority'])),
      status: toStatus(getField(row, ['status', 'issueStatus'])),
      decision: toDecision(getField(row, ['decision', 'decisionState'])),
      owner: getField(row, ['owner', 'assignee']),
      updated: getField(row, ['updated', 'lastUpdated', 'date']),
      description: getField(row, ['description', 'details', 'notes']),
      suggestedAction: getField(row, ['suggestedAction', 'action', 'nextStep']),
    }
  })

  return {
    ...mapSourceSnapshotToReviewIssues({
      reviewId: `preview-${fileName}`,
      sourceName: fileName,
      importedAt,
      records,
    }),
    columns,
  }
}
