class AvroraAdvisor {
  constructor() {
    this.adviceTemplates = {
      productive: [
        "Отличная работа! Вы провели {time} продуктивного времени.",
        "Вы хорошо сфокусировались на работе - {time} продуктивной активности.",
        "Отличная производительность! Продолжайте в том же духе."
      ],
      unproductive: [
        "Вы потратили {time} на развлечения. Попробуйте сократить это время.",
        "Слишком много времени на {category}. Рекомендую ограничить до 1-2 часов в день.",
        "Обратите внимание на баланс работы и отдыха."
      ],
      balance: [
        "Хороший баланс работы и отдыха!",
        "Вы поддерживаете здоровое соотношение продуктивности и расслабления.",
        "Отличный пример сбалансированного дня!"
      ],
      focus: [
        "Вы часто переключались между приложениями. Попробуйте работать блоками по 25-30 минут.",
        "Рекомендую использовать технику Pomodoro для лучшей фокусировки.",
        "Слишком много переключений между задачами. Попробуйте работать над одной задачей за раз."
      ],
      breaks: [
        "Не забывайте делать перерывы каждые 45-60 минут.",
        "Рекомендую сделать 5-минутный перерыв для глаз.",
        "Хорошая идея встать и размяться!"
      ]
    };
  }

  generateAdvice(stats) {
    const advice = [];
    
    // Анализируем продуктивность
    const productiveRatio = stats.productiveTime / (stats.totalTime || 1);
    
    if (productiveRatio > 0.7) {
      advice.push({
        type: 'positive',
        category: 'productive',
        message: this.getRandomAdvice('productive', {
          time: this.formatTime(stats.productiveTime)
        })
      });
    } else if (productiveRatio < 0.3) {
      advice.push({
        type: 'warning',
        category: 'unproductive',
        message: this.getRandomAdvice('unproductive', {
          time: this.formatTime(stats.unproductiveTime),
          category: this.getTopCategory(stats.categories)
        })
      });
    } else {
      advice.push({
        type: 'neutral',
        category: 'balance',
        message: this.getRandomAdvice('balance')
      });
    }

    // Анализируем переключения между приложениями
    const appCount = Object.keys(stats.appsUsed).length;
    if (appCount > 10) {
      advice.push({
        type: 'suggestion',
        category: 'focus',
        message: this.getRandomAdvice('focus')
      });
    }

    // Анализируем время работы
    const workHours = stats.totalTime / (1000 * 60 * 60);
    if (workHours > 8) {
      advice.push({
        type: 'warning',
        category: 'breaks',
        message: this.getRandomAdvice('breaks')
      });
    }

    // Анализируем топ приложения
    const topApps = this.getTopApps(stats.appsUsed, 3);
    if (topApps.length > 0) {
      advice.push({
        type: 'info',
        category: 'apps',
        message: `Больше всего времени вы провели в: ${topApps.map(app => app.name).join(', ')}`
      });
    }

    // Анализируем веб-активность
    const topWebsites = this.getTopWebsites(stats.websitesVisited, 3);
    if (topWebsites.length > 0) {
      advice.push({
        type: 'info',
        category: 'websites',
        message: `Топ сайты: ${topWebsites.map(site => site.name).join(', ')}`
      });
    }

    return advice;
  }

  getRandomAdvice(templateKey, params = {}) {
    const templates = this.adviceTemplates[templateKey];
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key] || match;
    });
  }

  formatTime(milliseconds) {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}ч ${minutes}м`;
    } else {
      return `${minutes}м`;
    }
  }

  getTopCategory(categories) {
    const sorted = Object.entries(categories)
      .sort(([,a], [,b]) => b - a);
    return sorted[0] ? sorted[0][0] : 'развлечения';
  }

  getTopApps(apps, limit = 3) {
    return Object.entries(apps)
      .map(([name, time]) => ({ name, time }))
      .sort((a, b) => b.time - a.time)
      .slice(0, limit);
  }

  getTopWebsites(websites, limit = 3) {
    return Object.entries(websites)
      .map(([name, time]) => ({ name, time }))
      .sort((a, b) => b.time - a.time)
      .slice(0, limit);
  }

  generateDailySummary(stats) {
    const productiveRatio = stats.productiveTime / (stats.totalTime || 1);
    const workHours = stats.totalTime / (1000 * 60 * 60);
    
    let summary = `📊 Отчет за день:\n\n`;
    summary += `⏱️ Общее время: ${this.formatTime(stats.totalTime)}\n`;
    summary += `✅ Продуктивное время: ${this.formatTime(stats.productiveTime)} (${Math.round(productiveRatio * 100)}%)\n`;
    summary += `🎯 Непродуктивное время: ${this.formatTime(stats.unproductiveTime)}\n\n`;
    
    const topApps = this.getTopApps(stats.appsUsed, 5);
    if (topApps.length > 0) {
      summary += `📱 Топ приложения:\n`;
      topApps.forEach((app, index) => {
        summary += `${index + 1}. ${app.name} - ${this.formatTime(app.time)}\n`;
      });
      summary += `\n`;
    }
    
    const topWebsites = this.getTopWebsites(stats.websitesVisited, 5);
    if (topWebsites.length > 0) {
      summary += `🌐 Топ сайты:\n`;
      topWebsites.forEach((site, index) => {
        summary += `${index + 1}. ${site.name} - ${this.formatTime(site.time)}\n`;
      });
      summary += `\n`;
    }
    
    return summary;
  }
}

module.exports = AvroraAdvisor;
