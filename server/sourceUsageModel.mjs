import { resolveDataContracts } from './sourceContracts.mjs'

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
  const contracts = resolveDataContracts(sources)

  contracts.forEach((contract) => {
    if (!contract.sourceId) return
    const targetConnections = connectionsByTarget[contract.targetId] ?? []
    if (!targetConnections.includes(contract.sourceId)) {
      targetConnections.push(contract.sourceId)
    }
    connectionsByTarget[contract.targetId] = targetConnections
  })

  return connectionsByTarget
}

export const buildSourceConnectionRolesByTarget = (sources) => {
  const rolesByTarget = createEmptySourceConnectionRolesByTarget()
  const contracts = resolveDataContracts(sources)

  contracts.forEach((contract) => {
    if (!contract.sourceId) return
    const currentRole = rolesByTarget[contract.targetId][contract.sourceId]
    rolesByTarget[contract.targetId][contract.sourceId] = currentRole
      ? `${currentRole}, ${contract.role}`
      : contract.role
  })

  return rolesByTarget
}
