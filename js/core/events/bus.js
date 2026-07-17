// ============================================================
// FILE: core/EventBus.js – Enhanced EventBus (mit Prioritäten)
// ============================================================

export default class EventBus {
    constructor() {
        this._listeners = new Map();
        this._globalListeners = [];
        this._idCounter = 0;
        this._destroyed = false;
        this._publishing = false;
        this._queue = [];
    }

    /**
     * Abonnieren mit Priorität.
     * @param {string} event – Event-Name
     * @param {Function} callback – Callback
     * @param {number} priority – Höhere Zahl = frühere Ausführung (Default: 0)
     * @returns {number} – Subscription-ID
     */
    subscribe(event, callback, priority = 0) {
        if (this._destroyed) return -1;
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }
        const id = ++this._idCounter;
        this._listeners.get(event).push({ id, callback, priority });
        this._listeners.get(event).sort((a, b) => b.priority - a.priority);
        return id;
    }

    subscribeAll(callback) {
        if (this._destroyed) return -1;
        const id = ++this._idCounter;
        this._globalListeners.push({ id, callback });
        return id;
    }

    unsubscribe(subscriptionId) {
        if (this._destroyed || subscriptionId === -1) return;
        for (const [event, subscribers] of this._listeners.entries()) {
            const index = subscribers.findIndex(sub => sub.id === subscriptionId);
            if (index !== -1) {
                subscribers.splice(index, 1);
                if (subscribers.length === 0) {
                    this._listeners.delete(event);
                }
                return;
            }
        }
        const globalIndex = this._globalListeners.findIndex(sub => sub.id === subscriptionId);
        if (globalIndex !== -1) {
            this._globalListeners.splice(globalIndex, 1);
        }
    }

    /**
     * Event auslösen (asynchron, mit Queue).
     */
    publish(event, data = {}) {
        if (this._destroyed) return;

        if (this._publishing) {
            this._queue.push({ event, data });
            return;
        }

        this._publishing = true;
        try {
            this._publishNow(event, data);
        } finally {
            this._publishing = false;
            if (this._queue.length > 0) {
                const next = this._queue.shift();
                this.publish(next.event, next.data);
            }
        }
    }

    _publishNow(event, data) {
        const subscribers = this._listeners.get(event);
        if (subscribers) {
            for (const sub of subscribers) {
                try {
                    sub.callback(data);
                } catch (error) {
                    console.error(`[EventBus] Fehler in Subscriber ${sub.id} für '${event}':`, error);
                }
            }
        }

        for (const sub of this._globalListeners) {
            try {
                sub.callback(event, data);
            } catch (error) {
                console.error(`[EventBus] Fehler in globalem Subscriber ${sub.id}:`, error);
            }
        }
    }

    /**
     * Event synchron auslösen (ohne Queue).
     */
    publishSync(event, data = {}) {
        if (this._destroyed) return;
        this._publishNow(event, data);
    }

    /**
     * Event einmalig auslösen.
     */
    publishOnce(event, data = {}) {
        if (this._destroyed) return;
        const subscribers = this._listeners.get(event);
        if (subscribers) {
            const copy = [...subscribers];
            this._listeners.delete(event);
            for (const sub of copy) {
                try {
                    sub.callback(data);
                } catch (error) {
                    console.error(`[EventBus] Fehler in Subscriber ${sub.id} für '${event}':`, error);
                }
            }
        }
    }

    clear() {
        this._listeners.clear();
        this._globalListeners = [];
        this._queue = [];
        this._idCounter = 0;
    }

    destroy() {
        this._destroyed = true;
        this.clear();
    }

    getStats() {
        let total = 0;
        for (const [, subs] of this._listeners) {
            total += subs.length;
        }
        return {
            eventCount: this._listeners.size,
            listenerCount: total,
            globalListenerCount: this._globalListeners.length,
            queueLength: this._queue.length
        };
    }
}