export default class EventBus {
  constructor() {
    this._listeners = new Map();
    this._globalListeners = [];
    this._idCounter = 0;
  }

  subscribe(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    const id = ++this._idCounter;
    this._listeners.get(event).push({ id, callback });
    return id;
  }

  subscribeAll(callback) {
    const id = ++this._idCounter;
    this._globalListeners.push({ id, callback });
    return id;
  }

  unsubscribe(subscriptionId) {
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

  clear() {
    this._listeners.clear();
    this._globalListeners = [];
    this._idCounter = 0;
  }
}