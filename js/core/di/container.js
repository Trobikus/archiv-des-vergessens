/**
 * ============================================================
 * FILE: core/di/container.js – Dependency Injection Container
 * ============================================================
 * 
 * Einfacher DI-Container mit:
 * - Factory-basierter Registrierung
 * - Singleton-Caching
 * - Lazy Loading
 * ============================================================
 */

export class DIContainer {
  constructor() {
    this._factories = new Map();  // key → factory function
    this._instances = new Map();   // key → cached instance
  }

  /**
   * Registriert einen Dienst mit einer Factory-Funktion.
   * @param {string} key – Eindeutiger Schlüssel
   * @param {Function} factory – Funktion, die die Instanz erstellt
   * @returns {DIContainer} – Für Chaining
   */
  register(key, factory) {
    if (this._factories.has(key)) {
      console.warn(`[DI] Dienst "${key}" wird überschrieben.`);
    }
    this._factories.set(key, factory);
    return this;
  }

  /**
   * Holt eine Instanz eines Dienstes (Singleton).
   * @param {string} key – Schlüssel des Dienstes
   * @returns {*} – Die Instanz
   * @throws {Error} – Wenn der Dienst nicht registriert ist
   */
  get(key) {
    // Gecachte Instanz zurückgeben
    if (this._instances.has(key)) {
      return this._instances.get(key);
    }

    // Factory suchen
    const factory = this._factories.get(key);
    if (!factory) {
      throw new Error(`[DI] Dienst "${key}" nicht registriert. Verfügbare Dienste: ${Array.from(this._factories.keys()).join(', ')}`);
    }

    // Instanz erstellen und cachen
    const instance = factory(this);
    this._instances.set(key, instance);
    return instance;
  }

  /**
   * Prüft, ob ein Dienst registriert ist.
   * @param {string} key – Schlüssel des Dienstes
   * @returns {boolean}
   */
  has(key) {
    return this._factories.has(key);
  }

  /**
   * Löscht eine Instanz aus dem Cache (für Hot-Reload).
   * @param {string} key – Schlüssel des Dienstes
   */
  invalidate(key) {
    if (this._instances.has(key)) {
      const instance = this._instances.get(key);
      if (instance && typeof instance.destroy === 'function') {
        instance.destroy();
      }
      this._instances.delete(key);
    }
  }

  /**
   * Löscht alle Instanzen aus dem Cache.
   */
  invalidateAll() {
    for (const [key, instance] of this._instances) {
      if (instance && typeof instance.destroy === 'function') {
        instance.destroy();
      }
    }
    this._instances.clear();
  }

  /**
   * Gibt alle registrierten Schlüssel zurück.
   * @returns {string[]}
   */
  getKeys() {
    return Array.from(this._factories.keys());
  }

  /**
   * Gibt die Anzahl der registrierten Dienste zurück.
   * @returns {number}
   */
  get size() {
    return this._factories.size;
  }

  /**
   * Leert den gesamten Container.
   */
  clear() {
    this.invalidateAll();
    this._factories.clear();
  }
}

export default DIContainer;