// ============================================================
// FILE: utils/Logger.js – Enhanced Logger
// ============================================================

export const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
};

export class Logger {
    constructor(level = LOG_LEVELS.INFO) {
        this.level = level;
        this.logs = [];
        this.maxLogs = 500;
        this.handlers = [];
        this.eventBus = null;
        this._timestamp = () => new Date().toISOString();
    }

    setEventBus(eventBus) {
        this.eventBus = eventBus;
    }

    debug(message, data = null) {
        this._log(LOG_LEVELS.DEBUG, message, data);
    }

    info(message, data = null) {
        this._log(LOG_LEVELS.INFO, message, data);
    }

    warn(message, data = null) {
        this._log(LOG_LEVELS.WARN, message, data);
    }

    error(message, data = null) {
        this._log(LOG_LEVELS.ERROR, message, data);
    }

    _log(level, message, data) {
        if (level < this.level) return;

        const entry = {
            level: Object.keys(LOG_LEVELS).find(k => LOG_LEVELS[k] === level) || 'UNKNOWN',
            message,
            data: data || null,
            timestamp: Date.now(),
            iso: this._timestamp(),
            stack: level === LOG_LEVELS.ERROR ? new Error().stack : null
        };

        this.logs.push(entry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // Console
        const prefix = `[${entry.level}] ${entry.iso}`;
        if (level === LOG_LEVELS.ERROR) {
            console.error(prefix, message, data || '');
        } else if (level === LOG_LEVELS.WARN) {
            console.warn(prefix, message, data || '');
        } else {
            console.log(prefix, message, data || '');
        }

        // EventBus
        if (this.eventBus) {
            this.eventBus.publish('logger:log', entry);
            if (level === LOG_LEVELS.ERROR) {
                this.eventBus.publish('ui:showToast', {
                    message: `⚠️ ${message}`,
                    type: 'error',
                    duration: 6000
                });
            }
        }

        // Custom Handlers
        for (const handler of this.handlers) {
            try { handler(entry); } catch (e) { /* ignore */ }
        }
    }

    addHandler(handler) {
        this.handlers.push(handler);
    }

    getLogs(level = null) {
        if (level !== null) {
            const numLevel = typeof level === 'number' ? level : LOG_LEVELS[level.toUpperCase()];
            return this.logs.filter(l => LOG_LEVELS[l.level] >= numLevel);
        }
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
        this.level = data.level || LOG_LEVELS.INFO;
        this.logs = data.logs || [];
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
    }
}