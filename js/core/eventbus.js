// ============================================================
// FILE: js/core/eventbus.js – Zentraler Event-Bus
// ============================================================

export default class EventBus {
    constructor() {
        this._listeners = new Map();
        this._globalListeners = [];
        this._idCounter = 0;
        this._destroyed = false;
    }

    /**
     * Abonnieren eines Events.
     * @param {string} event – Event-Name
     * @param {Function} callback – Callback-Funktion
     * @returns {number} – Subscription-ID zum Kündigen
     */
    subscribe(event, callback) {
        if (this._destroyed) {
            console.warn('[EventBus] subscribe auf zerstörtem Bus aufgerufen');
            return -1;
        }
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }
        const id = ++this._idCounter;
        this._listeners.get(event).push({ id, callback });
        return id;
    }

    /**
     * Abonnieren aller Events (globaler Listener).
     */
    subscribeAll(callback) {
        if (this._destroyed) {
            console.warn('[EventBus] subscribeAll auf zerstörtem Bus aufgerufen');
            return -1;
        }
        const id = ++this._idCounter;
        this._globalListeners.push({ id, callback });
        return id;
    }

    /**
     * Kündigen eines Abonnements.
     */
    unsubscribe(subscriptionId) {
        if (this._destroyed) return;
        if (subscriptionId === -1) return;

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
     * Event auslösen.
     */
    publish(event, data = {}) {
        if (this._destroyed) return;

        const subscribers = this._listeners.get(event);
        if (subscribers) {
            const len = subscribers.length;
            for (let i = 0; i < len; i++) {
                const sub = subscribers[i];
                if (!sub) continue;
                try {
                    sub.callback(data);
                } catch (error) {
                    console.error(`[EventBus] Fehler in Subscriber ${sub.id} für '${event}':`, error);
                }
            }
        }

        const globalLen = this._globalListeners.length;
        for (let i = 0; i < globalLen; i++) {
            const sub = this._globalListeners[i];
            if (!sub) continue;
            try {
                sub.callback(event, data);
            } catch (error) {
                console.error(`[EventBus] Fehler in globalem Subscriber ${sub.id} für '${event}':`, error);
            }
        }
    }

    /**
     * Alle Listener entfernen.
     */
    clear() {
        this._listeners.clear();
        this._globalListeners = [];
        this._idCounter = 0;
    }

    /**
     * EventBus endgültig deaktivieren.
     */
    destroy() {
        this._destroyed = true;
        this.clear();
    }

    /**
     * Statistiken für Debugging.
     */
    getStats() {
        let total = 0;
        for (const [, subs] of this._listeners) {
            total += subs.length;
        }
        return {
            eventCount: this._listeners.size,
            listenerCount: total,
            globalListenerCount: this._globalListeners.length
        };
    }
}