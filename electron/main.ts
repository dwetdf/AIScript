// ============================================================================
// Electron 主进程入口
// 创建 BrowserWindow，加载 Vite 构建产物的 SPA
// ============================================================================

import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'AI 辅助剧本创作工具 — AIScript',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 判断是否为开发模式（ELECTRON_DEV 环境变量）
  const isDev = process.env.ELECTRON_DEV === 'true';

  if (isDev) {
    // 开发模式：加载 Vite 开发服务器
    mainWindow.loadURL('http://localhost:5173').catch((err) => {
      console.error('无法连接到 Vite 开发服务器 (http://localhost:5173)，请先运行 npm run dev');
      console.error(err);
      app.quit();
    });
    mainWindow.webContents.openDevTools();
  } else {
    // 生产模式：加载 file:// 协议构建产物
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ============================================================================
// IPC 处理：静默导出 PDF（不弹打印对话框）
// ============================================================================

ipcMain.handle('print-to-pdf', async (): Promise<Buffer> => {
  if (!mainWindow) throw new Error('窗口未初始化');

  const data = await mainWindow.webContents.printToPDF({
    printBackground: true,
    preferCSSPageSize: true,
  });

  return data;
});

// ============================================================================
// IPC 处理：保存文件对话框 + 写入文件
// ============================================================================

ipcMain.handle(
  'save-file',
  async (_event, options: { defaultName: string; data: ArrayBuffer }): Promise<string | null> => {
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: options.defaultName,
      filters: [
        { name: 'PDF 文件', extensions: ['pdf'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    });

    if (result.canceled || !result.filePath) return null;

    fs.writeFileSync(result.filePath, Buffer.from(options.data));
    return result.filePath;
  }
);

// ============================================================================
// 应用生命周期
// ============================================================================

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
