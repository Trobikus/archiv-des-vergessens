// ============================================================
// FILE: js/core/Logger.js – Zentrales Logging
// ============================================================

export default class Logger {
    constructor() {
        this.logs = [];
        this.maxLogs = 200;
        this.level = 'info';
        this.handlers = [];
        this.eventBus = null;
    }

    setEventBus(eventBus) {
        this.eventBus = eventBus;
    }

    debug(message, data = null) {
        this._log('debug', message, data);
    }

    info(message, data = null) {
        this._log('info', message, data);
    }

    warn(message, data = null) {
        this._log('warn', message, data);
    }

    error(message, data = null) {
        this._log('error', message, data);
    }

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

        const prefix = `[${level.toUpperCase()}] ${new Date(entry.timestamp).toISOString()}`;
        if (level === 'error') {
            console.error(prefix, message, data || '');
        } else if (level === 'warn') {
            console.warn(prefix, message, data || '');
        } else {
            console.log(prefix, message, data || '');
        }

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

        for (const handler of this.handlers) {
            try { handler(entry); } catch (e) { /* ignore */ }
        }
    }

    addHandler(handler) {
        this.handlers.push(handler);
    }

    getLogs(level = null) {
        if (level) return this.logs.filter(l => l.level === level);
        return [...this.logs];
    }

    clear() {
        this.logs = [];
    }

    toJSON() {
        return {
            logs: this.logs.slice(-50),
            level: this.level
        };
    }

    fromJSON(data) {
        if (!data) return;
        this.level = data.level || 'info';
        this.logs = data.logs || [];
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
    }
}