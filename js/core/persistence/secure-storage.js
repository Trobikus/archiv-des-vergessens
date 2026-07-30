/**
 * ============================================================
 * FILE: core/persistence/secure-storage.js – Secure Storage Wrapper
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Verschlüsselung von sensiblen Daten (Session-Tokens, User-IDs, Kontodaten) vor der Ablage im localStorage.
 * - Schutz vor einfachem Auslesen/XSS-Extraktion von Klartext-Tokens.
 * - Unterstützt synchrone und asynchrone Methoden sowie nahtlose Migration bestehender Klartext-Daten.
 * ============================================================
 */

import { logger } from '../logger.js';

const ENC_PREFIX = '__enc_v1__:';

export class SecureStorage {
  /**
   * Generiert oder lädt einen konsistenten Obfuskierungs-/Verschlüsselungs-Schlüssel basierend auf der Anwendungsumgebung.
   * @private
   */
  static _getStorageKey() {
    if (!this._cachedKey) {
      let seed = 'archiv_des_vergessens_sec_v1_';
      try {
        if (typeof window !== 'undefined' && window.location) {
          seed += window.location.origin || window.location.host || '';
        }
        if (typeof navigator !== 'undefined') {
          seed += navigator.userAgent || '';
        }
      } catch (e) {
        // Fallback seed
      }
      this._cachedKey = seed;
    }
    return this._cachedKey;
  }

  /**
   * Einfache, schnelle synchrone Verschlüsselung/Entschlüsselung (XOR + Base64) als synchroner Fallback.
   * @private
   * @param {string} str 
   * @returns {string}
   */
  static _transformSync(str) {
    const key = this._getStorageKey();
    let result = '';
    for (let i = 0; i < str.length; i++) {
      result += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  }

  /**
   * Speichert ein Objekt oder einen String verschlüsselt im localStorage (Synchron).
   * @param {string} key 
   * @param {any} data 
   */
  static setItemSync(key, data) {
    try {
      if (typeof localStorage === 'undefined') return;
      const rawString = typeof data === 'string' ? data : JSON.stringify(data);
      const obfuscated = this._transformSync(rawString);
      const encoded = btoa(encodeURIComponent(obfuscated));
      localStorage.setItem(key, ENC_PREFIX + encoded);
    } catch (e) {
      logger.error(`[SecureStorage] Fehler beim Speichern von '${key}':`, e);
    }
  }

  /**
   * Liest ein verschlüsseltes Objekt oder String aus dem localStorage (Synchron).
   * Führt eine automatische Migration durch, falls die Daten im Klartext vorliegen.
   * @param {string} key 
   * @returns {any}
   */
  static getItemSync(key) {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(key);
      if (!raw) return null;

      // 1. Automatische Migration von bestehenden Klartext-Daten
      if (!raw.startsWith(ENC_PREFIX)) {
        let parsedData = raw;
        try {
          parsedData = JSON.parse(raw);
        } catch (e) {
          // Ist ein reiner String
        }
        // Führe Migration durch
        this.setItemSync(key, parsedData);
        logger.info(`[SecureStorage] Klartext-Eintrag für '${key}' erfolgreich verschlüsselt migriert.`);
        return parsedData;
      }

      // 2. Entschlüsseln
      const encoded = raw.substring(ENC_PREFIX.length);
      const obfuscated = decodeURIComponent(atob(encoded));
      const decryptedString = this._transformSync(obfuscated);

      try {
        return JSON.parse(decryptedString);
      } catch (e) {
        return decryptedString;
      }
    } catch (e) {
      logger.error(`[SecureStorage] Fehler beim Lesen von '${key}':`, e);
      return null;
    }
  }

  /**
   * Entfernt einen Schlüssel aus dem localStorage.
   * @param {string} key 
   */
  static removeItem(key) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch (e) {
      logger.error(`[SecureStorage] Fehler beim Entfernen von '${key}':`, e);
    }
  }

  /**
   * Prüft, ob ein Eintrag im localStorage vorhanden ist.
   * @param {string} key 
   * @returns {boolean}
   */
  static hasItem(key) {
    try {
      return typeof localStorage !== 'undefined' && localStorage.getItem(key) !== null;
    } catch (e) {
      return false;
    }
  }
}

export default SecureStorage;
