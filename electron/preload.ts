// ============================================================================
// Electron 预加载脚本
// 通过 contextBridge 暴露安全的 IPC API
// ============================================================================

import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  /** 静默打印当前页面为 PDF，返回 ArrayBuffer */
  printToPdf: () => Promise<ArrayBuffer>;
  /** 弹出保存文件对话框并写入文件，返回保存路径或 null */
  saveFile: (options: { defaultName: string; data: ArrayBuffer }) => Promise<string | null>;
}

contextBridge.exposeInMainWorld('electronAPI', {
  printToPdf: () => ipcRenderer.invoke('print-to-pdf'),
  saveFile: (options: { defaultName: string; data: ArrayBuffer }) =>
    ipcRenderer.invoke('save-file', options),
} satisfies ElectronAPI);
