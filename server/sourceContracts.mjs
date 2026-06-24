export const dataContractDefinitions = [
  {
    id: 'dashboard:mass-production',
    targetId: 'dashboard',
    role: 'Dashboard rows',
    sourceMatcher: { fileName: 'Mass Production.xlsm' },
    sheetName: 'Semi Panels List',
    fields: {
      item: 'Item',
      oracleItemDescription: 'ORACLE Item Description',
      intelDescription: 'INTEL Description',
      scope: 'Scope',
      intelPo: 'INTEL PO #',
      intelRtd: 'INTEL RTD',
      watlowRtd: 'WATLOW RTD',
      implementationStep: 'Implementation step',
      lastUpdate: 'Last update',
      implementationStepValid: 'Implementation step valid (po okresie 3 miesięcy dokumentacja wymaga aktualiazacji)',
    },
    requiredColumns: [
      'Item',
      'ORACLE Item Description',
      'INTEL Description',
      'Scope',
      'Implementation step',
      'Last update',
      'Implementation step valid (po okresie 3 miesięcy dokumentacja wymaga aktualiazacji)',
    ],
  },
  {
    id: 'dashboard:intel-po-files',
    targetId: 'dashboard',
    role: 'Intel PO files',
    sourceMatcher: { fileName: '01_Intel PO', type: 'Folder' },
    sheetName: null,
    fields: {},
    requiredColumns: [],
  },
  {
    id: 'bom-matvar:bom-l0',
    targetId: 'bom-matvar',
    role: 'BOM L0 rules',
    sourceMatcher: { fileName: 'BOM L0.xlsx' },
    sheetName: 'Arkusz1',
    fields: {
      partNumber: 'Part Number',
      description: 'Description',
      updatedAt: 'Data aktualizacji',
    },
    requiredColumns: ['Part Number', 'Description', 'Data aktualizacji'],
  },
  {
    id: 'bom-matvar:matvar-rules',
    targetId: 'bom-matvar',
    role: 'MATVAR rules',
    sourceMatcher: { fileName: 'Mass Production.xlsm' },
    sheetName: 'Semi Panels List',
    fields: {
      item: 'Item',
      oracleItemDescription: 'ORACLE Item Description',
      intelDescription: 'INTEL Description',
      phantomL1: 'Tool',
      scope: 'Scope',
    },
    requiredColumns: ['Item', 'ORACLE Item Description', 'INTEL Description', 'Tool', 'Scope'],
  },
  {
    id: 'bom-matvar:oracle-structure',
    targetId: 'bom-matvar',
    role: 'Oracle structure files',
    sourceMatcher: { fileName: 'Matvar', type: 'Folder' },
    sheetName: null,
    fields: {
      level: 'Level',
      itemName: 'Item Name',
      itemDescription: 'Item Description',
    },
    requiredColumns: ['Level', 'Item Name', 'Item Description'],
  },
]

const normalize = (value) => String(value ?? '').trim().toLowerCase()

const sourceDisplayName = (source) => source?.sourceFile?.name ?? source?.name ?? ''

export const sourceMatchesContract = (source, matcher = {}) => {
  if (!source) return false

  if (matcher.type && source.type !== matcher.type) return false
  if (matcher.fileName && normalize(source.sourceFile?.name) !== normalize(matcher.fileName)) return false
  if (matcher.sourceName && normalize(source.name) !== normalize(matcher.sourceName)) return false

  return true
}

export const resolveDataContracts = (sources, targetId = null) =>
  dataContractDefinitions
    .filter((contract) => !targetId || contract.targetId === targetId)
    .map((contract) => {
      const matches = sources.filter((source) => sourceMatchesContract(source, contract.sourceMatcher))
      const source = matches.length === 1 ? matches[0] : null
      const status = matches.length === 0
        ? 'Missing source'
        : matches.length > 1
          ? 'Ambiguous source'
          : source.status === 'Ready'
            ? 'Active'
            : 'Source not ready'

      return {
        ...contract,
        sourceId: source?.id ?? null,
        sourceName: source ? sourceDisplayName(source) : '',
        sourcePath: source?.sourceFile?.path ?? source?.location ?? '',
        sourceStatus: source?.status ?? null,
        status,
      }
    })

export const getResolvedContractsForTarget = (sources, targetId) =>
  resolveDataContracts(sources, targetId)

export const getContractById = (sources, contractId) =>
  resolveDataContracts(sources).find((contract) => contract.id === contractId) ?? null
