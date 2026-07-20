/**
 * ============================================================
 * FILE: core/logger.js – Zentrales Logging-System
 * ============================================================
 * 
 * Bietet:
 * - Verschiedene Log-Level (debug, info, warn, error)
 * - Event-Bus-Integration
 * - Toast-Benachrichtigungen für Fehler
 * - Log-History für Debugging
 * ============================================================
 */

export class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 200;
    this.level = 'info';
    this.handlers = [];
    this.eventBus = null;
  }

  /**
   * Setzt den Event-Bus für Log-Events.
   */
  setEventBus(eventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Debug-Log.
   */
  debug(message, data = null) {
    this._log('debug', message, data);
  }

  /**
   * Info-Log.
   */
  info(message, data = null) {
    this._log('info', message, data);
  }

  /**
   * Warn-Log.
   */
  warn(message, data = null) {
    this._log('warn', message, data);
  }

  /**
   * Error-Log.
   */
  error(message, data = null) {
    this._log('error', message, data);
  }

  /**
   * Interne Log-Funktion.
   */
  _log(level, message, data) {
    const entry = {
      level,
      message,
      data: data || null,
      timestamp: Date.now(),
      stack: level === 'error' ? new Error().stack : null
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console-Ausgabe
    const prefix = `[${level.toUpperCase()}] ${new Date(entry.timestamp).toISOString()}`;
    if (level === 'error') {
      console.error(prefix, message, data || '');
    } else if (level === 'warn') {
      console.warn(prefix, message, data || '');
    } else {
      console.log(prefix, message, data || '');
    }

    // Event-Bus
    if (this.eventBus) {
      this.eventBus.publish('logger:log', entry);
      if (level === 'error') {
        this.eventBus.publish('ui:showToast', {
          message: `⚠️ ${message}`,
          type: 'error',
          duration: 6000
        });
      }
    }

    // Zusätzliche Handler
    for (const handler of this.handlers) {
      try {
        handler(entry);
      } catch (e) {
        // Ignorieren
      }
    }
  }

  /**
   * Fügt einen benutzerdefinierten Handler hinzu.
   */
  addHandler(handler) {
    this.handlers.push(handler);
  }

  /**
   * Gibt alle Logs zurück (gefiltert nach Level).
   */
  getLogs(level = null) {
    if (level) {
      return this.logs.filter(l => l.level === level);
    }
    return [...this.logs];
  }

  /**
   * Leert die Log-History.
   */
  clear() {
    this.logs = [];
  }

  /**
   * Gibt den Zustand als JSON zurück.
   */
  toJSON() {
    return {
      logs: this.logs.slice(-50),
      level: this.level
    };
  }

  /**
   * Setzt den Zustand aus einem gespeicherten Objekt.
   */
  fromJSON(data) {
    if (!data) return;
    this.level = data.level || 'info';
    this.logs = data.logs || [];
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }
}

// ============================================================
// DEFAULT-EXPORT (für Importe wie: import Logger from './logger.js')
// ============================================================

export default Logger;