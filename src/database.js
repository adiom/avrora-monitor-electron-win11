const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');

class Database {
  constructor() {
    this.db = null;
    this.dbPath = path.join(os.homedir(), '.avrora-monitor', 'activity.db');
  }

  async init() {
    return new Promise((resolve, reject) => {
      // Создаем директорию если не существует
      const fs = require('fs');
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    return new Promise((resolve, reject) => {
      const queries = [
        `CREATE TABLE IF NOT EXISTS activity_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          app_name TEXT,
          window_title TEXT,
          url TEXT,
          category TEXT,
          duration INTEGER DEFAULT 0
        )`,
        `CREATE TABLE IF NOT EXISTS daily_stats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT UNIQUE,
          total_time INTEGER DEFAULT 0,
          productive_time INTEGER DEFAULT 0,
          unproductive_time INTEGER DEFAULT 0,
          apps_used TEXT,
          websites_visited TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS app_categories (
          app_name TEXT PRIMARY KEY,
          category TEXT,
          is_productive BOOLEAN DEFAULT 0
        )`
      ];

      let completed = 0;
      queries.forEach(query => {
        this.db.run(query, (err) => {
          if (err) {
            reject(err);
            return;
          }
          completed++;
          if (completed === queries.length) {
            resolve();
          }
        });
      });
    });
  }

  async logActivity(appName, windowTitle, url = null, category = 'unknown') {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO activity_logs (app_name, window_title, url, category) 
                     VALUES (?, ?, ?, ?)`;
      this.db.run(query, [appName, windowTitle, url, category], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  async getTodayStats() {
    return new Promise((resolve, reject) => {
      const today = new Date().toISOString().split('T')[0];
      const query = `SELECT * FROM daily_stats WHERE date = ?`;
      this.db.get(query, [today], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async updateDailyStats(stats) {
    return new Promise((resolve, reject) => {
      const today = new Date().toISOString().split('T')[0];
      const query = `INSERT OR REPLACE INTO daily_stats 
                     (date, total_time, productive_time, unproductive_time, apps_used, websites_visited)
                     VALUES (?, ?, ?, ?, ?, ?)`;
      this.db.run(query, [
        today,
        stats.totalTime,
        stats.productiveTime,
        stats.unproductiveTime,
        JSON.stringify(stats.appsUsed),
        JSON.stringify(stats.websitesVisited)
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  async getActivityHistory(days = 7) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM activity_logs 
                     WHERE timestamp >= datetime('now', '-${days} days')
                     ORDER BY timestamp DESC`;
      this.db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = Database;
