const { contextBridge, ipcRenderer } = require('electron');

// Безопасный API для рендер-процесса
contextBridge.exposeInMainWorld('electronAPI', {
  // Получить информацию о платформе
  getPlatform: () => process.platform,
  
  // Получить версию приложения
  getVersion: () => process.versions.electron,
  
  // Получить статистику за день
  getDailyStats: () => ipcRenderer.invoke('get-daily-stats'),
  
  // Получить советы
  getAdvice: () => ipcRenderer.invoke('get-advice'),
  
  // Получить сводку за день
  getDailySummary: () => ipcRenderer.invoke('get-daily-summary'),
  
  // Слушать события от главного процесса
  onUpdateStatus: (callback) => {
    ipcRenderer.on('status-update', callback);
  },
  
  // Удалить слушатель
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Логирование для отладки
console.log('Preload script loaded successfully');
