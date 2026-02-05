export interface ElectronAPI {
  checkForUpdates: () => Promise<{ success: boolean; updateInfo?: any; error?: string }>
  downloadUpdate: () => Promise<{ success: boolean; error?: string }>
  installUpdate: () => Promise<{ success: boolean; error?: string }>
  getAppVersion: () => Promise<string>
  on: (channel: string, callback: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void) => void
  off: (channel: string, callback: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void) => void
  send: (channel: string, ...args: unknown[]) => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
    ipcRenderer?: {
      on: (...args: Parameters<typeof import('electron').ipcRenderer.on>) => void
      off: (...args: Parameters<typeof import('electron').ipcRenderer.off>) => void
      send: (...args: Parameters<typeof import('electron').ipcRenderer.send>) => void
      invoke: (...args: Parameters<typeof import('electron').ipcRenderer.invoke>) => Promise<any>
    }
  }
}

