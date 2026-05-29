export const connectionTargetIds = [
  'dashboard',
  'bom-matvar',
  'bom-l1',
  'bom-l2',
  'bom-l3',
  'documentation',
  'costing',
]

export const createEmptySourceConnectionsByTarget = () =>
  Object.fromEntries(connectionTargetIds.map((targetId) => [targetId, []]))

export const createEmptySourceConnectionRolesByTarget = () =>
  Object.fromEntries(connectionTargetIds.map((targetId) => [targetId, {}]))

export const getSourceSearchText = (source) => [
  source?.name,
  source?.sourceFile?.name,
  source?.description,
].join(' ').toLowerCase()

export const sourceLooksLikeBomL0 = (source) => {
  const sourceText = getSourceSearchText(source)
  const compactSourceText = sourceText.replace(/[\s_-]+/g, '')

  return sourceText.includes('bom l0') ||
    sourceText.includes('bom_l0') ||
    sourceText.includes('bom-l0') ||
    compactSourceText.includes('boml0')
}

export const sourceLooksLikeMatvarBom = (source) => {
  const sourceText = getSourceSearchText(source)

  return sourceText.includes('matvar') || sourceText.includes('mass production')
}

export const classifySourceContractRole = (source) =>
  sourceLooksLikeBomL0(source)
    ? 'BOM L0'
    : sourceLooksLikeMatvarBom(source)
      ? 'Mass Production'
      : 'Additional source'

export const buildSourceContractEntries = (sources) =>
  sources.map((source) => ({
    source,
    contractRole: classifySourceContractRole(source),
  }))

export const scoreSourceCandidate = (source, preferredTerms = []) => {
  const sourceText = getSourceSearchText(source)
  const preferredScore = preferredTerms.reduce(
    (score, term, index) => score + (sourceText.includes(term) ? (preferredTerms.length - index) * 100 : 0),
    0,
  )
  const readyScore = source?.status === 'Ready' ? 40 : 0
  const fileScore = source?.sourceFile?.path ? 20 : 0

  return preferredScore + readyScore + fileScore
}

export const findBestSourceEntry = (entries, role, preferredTerms) =>
  entries
    .filter((entry) => entry.contractRole === role)
    .sort((left, right) =>
      scoreSourceCandidate(right.source, preferredTerms) - scoreSourceCandidate(left.source, preferredTerms))
    [0]

export const buildSourceConnectionsByTarget = (sources) => {
  const connectionsByTarget = createEmptySourceConnectionsByTarget()
  const sourceEntries = buildSourceContractEntries(sources)
  const bomL0Entry = findBestSourceEntry(sourceEntries, 'BOM L0', ['bom l0', 'bom_l0', 'bom-l0', 'boml0'])
  const matvarBomEntry = findBestSourceEntry(sourceEntries, 'Mass Production', ['mass production', 'matvar'])

  connectionsByTarget['bom-matvar'] = [
    bomL0Entry?.source.id,
    matvarBomEntry?.source.id,
  ].filter(Boolean)

  return connectionsByTarget
}

export const buildSourceConnectionRolesByTarget = (sources) => {
  const rolesByTarget = createEmptySourceConnectionRolesByTarget()
  const sourceEntries = buildSourceContractEntries(sources)
  const bomL0Entry = findBestSourceEntry(sourceEntries, 'BOM L0', ['bom l0', 'bom_l0', 'bom-l0', 'boml0'])
  const matvarBomEntry = findBestSourceEntry(sourceEntries, 'Mass Production', ['mass production', 'matvar'])

  if (bomL0Entry?.source.id) rolesByTarget['bom-matvar'][bomL0Entry.source.id] = bomL0Entry.contractRole
  if (matvarBomEntry?.source.id) rolesByTarget['bom-matvar'][matvarBomEntry.source.id] = matvarBomEntry.contractRole

  return rolesByTarget
}
