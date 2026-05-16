import type { ConnectionTargetId, SourceColumnMapping, SourceMappingConfig } from '../types'

export const createMappingId = (targetId: ConnectionTargetId, sourceId: string) => `${targetId}:${sourceId}`

export const createDefaultMappingConfig = (
  targetId: ConnectionTargetId,
  sourceId: string,
): SourceMappingConfig => ({
  id: createMappingId(targetId, sourceId),
  targetId,
  sourceId,
  role: 'Reference',
  sheetName: '',
  keyColumn: '',
  partNumberColumn: '',
  quantityColumn: '',
  revisionColumn: '',
  status: 'Needs mapping',
  columnMappings: [],
})

export const createColumnMapping = (sheetName: string, sourceColumn: string): SourceColumnMapping => ({
  id: `${sheetName}:${sourceColumn}`,
  sheetName,
  sourceColumn,
  targetField: '',
  transform: 'Trim',
  required: true,
})
