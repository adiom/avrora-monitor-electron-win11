// Динамический импорт для ES модуля
let activeWin;
const { BrowserWindow } = require('electron');
const Database = require('./database');

class ActivityMonitor {
  constructor() {
    this.db = new Database();
    this.isMonitoring = false;
    this.currentActivity = null;
    this.lastActivityTime = Date.now();
    this.monitoringInterval = null;
    this.checkInterval = 2000; // Проверяем каждые 2 секунды
    
    // Категории приложений
    this.appCategories = {
      productive: ['Visual Studio Code', 'IntelliJ IDEA', 'WebStorm', 'Sublime Text', 'Notepad++', 'Terminal', 'Command Prompt', 'PowerShell', 'Git Bash', 'Figma', 'Adobe XD', 'Sketch'],
      communication: ['Slack', 'Discord', 'Microsoft Teams', 'Zoom', 'Skype', 'Telegram', 'WhatsApp'],
      entertainment: ['YouTube', 'Netflix', 'Steam', 'Spotify', 'VLC', 'Games'],
      social: ['Facebook', 'Instagram', 'Twitter', 'LinkedIn', 'TikTok', 'Reddit'],
      news: ['Google News', 'BBC', 'CNN', 'RIA', 'Lenta.ru'],
      shopping: ['Amazon', 'eBay', 'AliExpress', 'Wildberries', 'Ozon']
    };
  }

  async start() {
    try {
      // Динамический импорт active-win
      const activeWinModule = await import('active-win');
      activeWin = activeWinModule.default;
      
      await this.db.init();
      this.isMonitoring = true;
      this.startMonitoring();
      console.log('Мониторинг активности запущен');
    } catch (error) {
      console.error('Ошибка запуска мониторинга:', error);
    }
  }

  startMonitoring() {
    this.monitoringInterval = setInterval(async () => {
      if (this.isMonitoring) {
        await this.checkActivity();
      }
    }, this.checkInterval);
  }

  async checkActivity() {
    try {
      const activeWindow = await activeWin();
      if (!activeWindow) return;

      const currentTime = Date.now();
      const appName = this.extractAppName(activeWindow.owner?.name || activeWindow.owner);
      const windowTitle = activeWindow.title;
      const url = this.extractUrl(windowTitle);
      const category = this.categorizeActivity(appName, windowTitle, url);

      // Если активность изменилась
      if (!this.currentActivity || 
          this.currentActivity.appName !== appName || 
          this.currentActivity.windowTitle !== windowTitle) {
        
        // Сохраняем предыдущую активность
        if (this.currentActivity) {
          const duration = currentTime - this.lastActivityTime;
          await this.saveActivity(this.currentActivity, duration);
        }

        // Начинаем новую активность
        this.currentActivity = {
          appName,
          windowTitle,
          url,
          category,
          startTime: currentTime
        };
        this.lastActivityTime = currentTime;
      }
    } catch (error) {
      console.error('Ошибка проверки активности:', error);
    }
  }

  extractAppName(ownerName) {
    if (!ownerName) return 'Unknown';
    
    // Очищаем название приложения
    return ownerName.replace(/\.exe$/, '').trim();
  }

  extractUrl(windowTitle) {
    // Простая проверка на URL в заголовке окна
    const urlRegex = /(https?:\/\/[^\s]+)/;
    const match = windowTitle.match(urlRegex);
    return match ? match[1] : null;
  }

  categorizeActivity(appName, windowTitle, url) {
    const lowerAppName = appName.toLowerCase();
    const lowerTitle = windowTitle.toLowerCase();

    // Проверяем продуктивные приложения
    if (this.appCategories.productive.some(app => 
        lowerAppName.includes(app.toLowerCase()) || 
        lowerTitle.includes(app.toLowerCase()))) {
      return 'productive';
    }

    // Проверяем браузеры и веб-активность
    if (lowerAppName.includes('chrome') || lowerAppName.includes('firefox') || 
        lowerAppName.includes('edge') || lowerAppName.includes('safari')) {
      
      if (url) {
        const domain = this.extractDomain(url);
        if (this.isProductiveWebsite(domain)) {
          return 'productive';
        }
        if (this.isSocialWebsite(domain)) {
          return 'social';
        }
        if (this.isEntertainmentWebsite(domain)) {
          return 'entertainment';
        }
      }
      return 'browsing';
    }

    // Проверяем коммуникационные приложения
    if (this.appCategories.communication.some(app => 
        lowerAppName.includes(app.toLowerCase()))) {
      return 'communication';
    }

    // Проверяем развлекательные приложения
    if (this.appCategories.entertainment.some(app => 
        lowerAppName.includes(app.toLowerCase()) || 
        lowerTitle.includes(app.toLowerCase()))) {
      return 'entertainment';
    }

    return 'other';
  }

  extractDomain(url) {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  isProductiveWebsite(domain) {
    const productiveDomains = [
      'github.com', 'stackoverflow.com', 'developer.mozilla.org',
      'docs.microsoft.com', 'angular.io', 'reactjs.org', 'vuejs.org',
      'medium.com', 'dev.to', 'habr.com', 'tproger.ru'
    ];
    return productiveDomains.some(d => domain.includes(d));
  }

  isSocialWebsite(domain) {
    const socialDomains = [
      'facebook.com', 'instagram.com', 'twitter.com', 'linkedin.com',
      'vk.com', 'ok.ru', 'tiktok.com', 'reddit.com'
    ];
    return socialDomains.some(d => domain.includes(d));
  }

  isEntertainmentWebsite(domain) {
    const entertainmentDomains = [
      'youtube.com', 'netflix.com', 'twitch.tv', 'steam.com',
      'spotify.com', 'music.yandex.ru'
    ];
    return entertainmentDomains.some(d => domain.includes(d));
  }

  async saveActivity(activity, duration) {
    try {
      await this.db.logActivity(
        activity.appName,
        activity.windowTitle,
        activity.url,
        activity.category
      );
    } catch (error) {
      console.error('Ошибка сохранения активности:', error);
    }
  }

  async generateDailyReport() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const activities = await this.db.getActivityHistory(1);
      
      const stats = {
        totalTime: 0,
        productiveTime: 0,
        unproductiveTime: 0,
        appsUsed: {},
        websitesVisited: {},
        categories: {}
      };

      activities.forEach(activity => {
        const duration = activity.duration || 0;
        stats.totalTime += duration;
        
        if (activity.category === 'productive') {
          stats.productiveTime += duration;
        } else {
          stats.unproductiveTime += duration;
        }

        // Считаем приложения
        if (activity.app_name) {
          stats.appsUsed[activity.app_name] = (stats.appsUsed[activity.app_name] || 0) + duration;
        }

        // Считаем сайты
        if (activity.url) {
          const domain = this.extractDomain(activity.url);
          stats.websitesVisited[domain] = (stats.websitesVisited[domain] || 0) + duration;
        }

        // Считаем категории
        stats.categories[activity.category] = (stats.categories[activity.category] || 0) + duration;
      });

      await this.db.updateDailyStats(stats);
      return stats;
    } catch (error) {
      console.error('Ошибка генерации отчета:', error);
      return null;
    }
  }

  stop() {
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    this.db.close();
  }
}

module.exports = ActivityMonitor;
