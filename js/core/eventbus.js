export default class EventBus {
  constructor() {
    this._listeners = new Map();
    this._globalListeners = [];
    this._idCounter = 0;
    this._destroyed = false;
  }

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

  subscribeAll(callback) {
    if (this._destroyed) {
      console.warn('[EventBus] subscribeAll auf zerstörtem Bus aufgerufen');
      return -1;
    }
    const id = ++this._idCounter;
    this._globalListeners.push({ id, callback });
    return id;
  }

  unsubscribe(subscriptionId) {
    if (this._destroyed) return;
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

  publish(event, data = {}) {
    if (this._destroyed) return;

    const subscribers = this._listeners.get(event);
    if (subscribers) {
      // Flache Kopie verhindert Modifikation des Arrays während der Iteration
      const safeSubscribers = [...subscribers];
      for (let i = 0; i < safeSubscribers.length; i++) {
        try {
          safeSubscribers[i].callback(data);
        } catch (error) {
          console.error(`[EventBus] Fehler in Subscriber ${safeSubscribers[i].id} für '${event}':`, error);
        }
      }
    }

    const safeGlobals = [...this._globalListeners];
    for (let i = 0; i < safeGlobals.length; i++) {
      try {
        safeGlobals[i].callback(event, data);
      } catch (error) {
        console.error(`[EventBus] Fehler in globalem Subscriber ${safeGlobals[i].id} für '${event}':`, error);
      }
    }
  }

  // ---- CLEANUP: Alle Listener entfernen ----
  clear() {
    this._listeners.clear();
    this._globalListeners = [];
    this._idCounter = 0;
  }

  // ---- DESTROY: Bus endgültig deaktivieren ----
  destroy() {
    this._destroyed = true;
    this.clear();
  }

  // ---- STATISTIK FÜR DEBUGGING ----
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