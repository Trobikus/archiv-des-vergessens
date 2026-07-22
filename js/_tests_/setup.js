/**
 * ============================================================
 * FILE: js/_tests_/setup.js – Test-Setup & Mocks für Vitest
 * ============================================================
 */

globalThis.__APP_VERSION__ = '1.8.0';

// Mock für localStorage
if (!globalThis.localStorage) {
  globalThis.localStorage = {
    _data: {},
    getItem(key) {
      return this._data[key] !== undefined ? this._data[key] : null;
    },
    setItem(key, value) {
      this._data[key] = String(value);
    },
    removeItem(key) {
      delete this._data[key];
    },
    clear() {
      this._data = {};
    },
    key(index) {
      return Object.keys(this._data)[index] || null;
    },
    get length() {
      return Object.keys(this._data).length;
    }
  };
}

// Mock für IndexedDB
if (!globalThis.indexedDB) {
  globalThis.__indexedDB_store = {};
  
  globalThis.indexedDB = {
    open(name, version) {
      const request = {
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        result: {
          objectStoreNames: {
            contains(storeName) {
              return storeName === 'saves';
            }
          },
          transaction(storeNames, mode) {
            return {
              objectStore(storeName) {
                return {
                  put(value, key) {
                    const req = { onsuccess: null, onerror: null };
                    setTimeout(() => {
                      globalThis.__indexedDB_store[key] = JSON.parse(JSON.stringify(value));
                      if (req.onsuccess) req.onsuccess({ target: req });
                    }, 0);
                    return req;
                  },
                  get(key) {
                    const req = { onsuccess: null, onerror: null, result: null };
                    setTimeout(() => {
                      const val = globalThis.__indexedDB_store[key];
                      req.result = val !== undefined ? JSON.parse(JSON.stringify(val)) : null;
                      if (req.onsuccess) req.onsuccess({ target: req });
                    }, 0);
                    return req;
                  },
                  count(key) {
                    const req = { onsuccess: null, onerror: null, result: 0 };
                    setTimeout(() => {
                      req.result = globalThis.__indexedDB_store[key] !== undefined ? 1 : 0;
                      if (req.onsuccess) req.onsuccess({ target: req });
                    }, 0);
                    return req;
                  },
                  delete(key) {
                    const req = { onsuccess: null, onerror: null };
                    setTimeout(() => {
                      delete globalThis.__indexedDB_store[key];
                      if (req.onsuccess) req.onsuccess({ target: req });
                    }, 0);
                    return req;
                  }
                };
              },
              onerror: null
            };
          },
          close() {}
        }
      };
      
      setTimeout(() => {
        if (request.onupgradeneeded) {
          request.onupgradeneeded({ target: request });
        }
        if (request.onsuccess) {
          request.onsuccess({ target: request });
        }
      }, 0);
      
      return request;
    },
    deleteDatabase(name) {
      const request = { onsuccess: null, onerror: null };
      setTimeout(() => {
        globalThis.__indexedDB_store = {};
        if (request.onsuccess) request.onsuccess();
      }, 0);
      return request;
    }
  };
}
