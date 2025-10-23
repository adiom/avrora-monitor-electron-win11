const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const ActivityMonitor = require('./src/activityMonitor');
const AvroraAdvisor = require('./src/advisor');

let mainWindow;
let activityMonitor;
let advisor;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    show: false
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Открыть DevTools в режиме разработки
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(async () => {
  createWindow();
  
  // Инициализируем мониторинг активности
  activityMonitor = new ActivityMonitor();
  advisor = new AvroraAdvisor();
  await activityMonitor.start();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (activityMonitor) {
      activityMonitor.stop();
    }
    app.quit();
  }
});

// IPC обработчики
ipcMain.handle('get-daily-stats', async () => {
  if (activityMonitor) {
    return await activityMonitor.generateDailyReport();
  }
  return null;
});

ipcMain.handle('get-advice', async () => {
  if (activityMonitor && advisor) {
    const stats = await activityMonitor.generateDailyReport();
    if (stats) {
      return advisor.generateAdvice(stats);
    }
  }
  return [];
});

ipcMain.handle('get-daily-summary', async () => {
  if (activityMonitor && advisor) {
    const stats = await activityMonitor.generateDailyReport();
    if (stats) {
      return advisor.generateDailySummary(stats);
    }
  }
  return 'Нет данных за сегодня';
});

// Создать меню приложения
const template = [
  {
    label: 'Файл',
    submenu: [
      {
        label: 'Выход',
        accelerator: 'CmdOrCtrl+Q',
        click: () => {
          app.quit();
        }
      }
    ]
  },
  {
    label: 'Вид',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  }
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
