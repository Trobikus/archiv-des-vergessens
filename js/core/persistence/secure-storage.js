/**
 * ============================================================
 * FILE: core/persistence/secure-storage.js – Secure Storage Wrapper
 * ============================================================
 *
 * VERANTWORTUNG:
 * - Verschlüsselung von sensiblen Daten (Session-Tokens, User-IDs, Kontodaten) vor der Ablage im localStorage.
 * - Schutz vor einfachem Auslesen/XSS-Extraktion von Klartext-Tokens.
 * - Unterstützt synchrone Methoden sowie nahtlose Migration bestehender Klartext-Daten.
 * - Stabiler Key (unabhängig von userAgent/Origin), damit Tauri-Updates Sessions nicht invalidieren.
 * ============================================================
 */

import { logger } from '../logger.js';

const ENC_PREFIX = '__enc_v1__:';

/** Stabiler App-Seed – darf sich zwischen Builds/Updates NICHT ändern. */
const STABLE_SEED = 'archiv_des_vergessens_sec_v1_stable';

export class SecureStorage {
  /**
   * Konsistenter Obfuskierungs-Schlüssel.
   * Wichtig: Kein userAgent und kein Origin – beides ändert sich in Tauri
   * (Launcher vs. App, WebView-Updates) und invalidiert sonst alle Sessions.
   * @private
   */
  static _getStorageKey() {
    if (!this._cachedKey) {
      this._cachedKey = STABLE_SEED;
    }
    return this._cachedKey;
  }

  /**
   * Einfache, schnelle synchrone XOR-Obfuskierung.
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
   * Sicheres Base64-Encoding (Unicode-sicher).
   * @private
   */
  static _toBase64(str) {
    // encodeURIComponent + unescape stellt Latin1 für btoa sicher
    return btoa(unescape(encodeURIComponent(str)));
  }

  /**
   * Sicheres Base64-Decoding (Unicode-sicher).
   * @private
   */
  static _fromBase64(b64) {
    return decodeURIComponent(escape(atob(b64)));
  }

  /**
   * Speichert ein Objekt oder einen String verschlüsselt im localStorage (synchron).
   * @param {string} key
   * @param {any} data
   */
  static setItemSync(key, data) {
    try {
      if (typeof localStorage === 'undefined') return;
      const rawString = typeof data === 'string' ? data : JSON.stringify(data);
      const obfuscated = this._transformSync(rawString);
      const encoded = this._toBase64(obfuscated);
      localStorage.setItem(key, ENC_PREFIX + encoded);
    } catch (e) {
      logger.error(`[SecureStorage] Fehler beim Speichern von '${key}':`, e);
    }
  }

  /**
   * Liest ein verschlüsseltes Objekt oder String aus dem localStorage (synchron).
   * Migriert Klartext-Daten automatisch. Bei korrupten/entschlüsselbaren Einträgen
   * wird der Key gelöscht, damit kein Dauer-Fehler entsteht.
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
          // reiner String
        }
        this.setItemSync(key, parsedData);
        logger.info(`[SecureStorage] Klartext-Eintrag für '${key}' erfolgreich verschlüsselt migriert.`);
        return parsedData;
      }

      // 2. Entschlüsseln
      const encoded = raw.substring(ENC_PREFIX.length);
      let decryptedString;
      try {
        const obfuscated = this._fromBase64(encoded);
        decryptedString = this._transformSync(obfuscated);
      } catch (decryptErr) {
        // Korrupt oder alter Key (vor stabilen Seed) → Eintrag entfernen
        logger.warn(`[SecureStorage] Entschlüsselung von '${key}' fehlgeschlagen – Eintrag wird bereinigt.`, decryptErr);
        this.removeItem(key);
        return null;
      }

      // Plausibilitätscheck: leerer/unsinniger String nach Decrypt
      if (decryptedString == null || decryptedString === '') {
        this.removeItem(key);
        return null;
      }

      try {
        return JSON.parse(decryptedString);
      } catch (e) {
        return decryptedString;
      }
    } catch (e) {
      logger.error(`[SecureStorage] Fehler beim Lesen von '${key}':`, e);
      try {
        this.removeItem(key);
      } catch (_) {}
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

  /**
   * Löscht bekannte Auth-/Cloud-Keys (Notfall-Reset nach Key-Migration).
   */
  static clearAuthRelated() {
    const keys = [
      'archiv_auth_session',
      'archiv_guest_id',
      'archiv_user_id',
      'archiv_cloud_save',
      'archiv_cloud_enabled'
    ];
    for (const k of keys) {
      this.removeItem(k);
      try {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(k);
      } catch (_) {}
    }
    logger.info('[SecureStorage] Auth-/Cloud-bezogene Keys bereinigt.');
  }
}

export default SecureStorage;
