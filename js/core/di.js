// core/di.js
export class DIContainer {
    constructor() {
        this._instances = new Map();
        this._factories = new Map();
    }

    register(key, factory) {
        this._factories.set(key, factory);
        return this;
    }

    get(key) {
        if (this._instances.has(key)) {
            return this._instances.get(key);
        }
        const factory = this._factories.get(key);
        if (!factory) {
            throw new Error(`Dienst "${key}" nicht registriert`);
        }
        const instance = factory(this);
        this._instances.set(key, instance);
        return instance;
    }

    has(key) {
        return this._factories.has(key);
    }

    clear() {
        this._instances.clear();
        this._factories.clear();
    }
}