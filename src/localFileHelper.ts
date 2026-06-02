export type LocalFileSelection = {
  name: string
  path: string
  directory: string
  extension: string
  sizeBytes: number
  modifiedAt: string
  folderSummary?: {
    fileCount: number
    folderCount: number
    totalSizeBytes: number
    typeCounts: Record<string, number>
  }
}

export const localFileHelperEndpoint = 'http://127.0.0.1:8787/api/local-file-dialog'
export const localFolderHelperEndpoint = 'http://127.0.0.1:8787/api/local-folder-dialog'
export const localFileOpenLocationEndpoint = 'http://127.0.0.1:8787/api/open-local-location'
export const localFileHelperHealthEndpoint = 'http://127.0.0.1:8787/health'
