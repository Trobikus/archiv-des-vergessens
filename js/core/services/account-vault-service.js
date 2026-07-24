/**
 * ============================================================
 * FILE: core/services/account-vault-service.js – Account-Lager Service
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Verwaltung des gemeinsamen Account-Lagers (Shared Vault) über alle 5 Charakter-Slots.
 * - Speichert und synchronisiert Rohstoffe kontoweit in IndexedDB.
 * - Ermöglicht allen Charakteren den Zugriff auf veredelte & gesammelte Rohstoffe.
 * ============================================================
 */

import SaveManager from '../persistence/save-manager.js';
import { sanitizeNumber } from '../../utils/sanitizer.js';

export class AccountVaultService {
  constructor(eventBus, authService) {
    this._eventBus = eventBus;
    this._authService = authService;
    this._vault = {
      particles: '0',
      relics: '0',
      artifacts: '0',
      memoryDust: '0',
      catalyst: '0',
      essence: '0',
      starIron: '0',
      shadowCrystals: '0',
      ancientWood: '0',
      sharedVault: []
    };
    this._isInitialized = false;
  }

  /**
   * Lädt das gemeinsame Account-Lager aus IndexedDB.
   */
  async init() {
    try {
      const u = this._authService ? this._authService.getCurrentUser() : null;
      const userId = u && !u.isGuest ? (u.id || u.username) : null;
      const loaded = await SaveManager.loadAccountVault(userId);
      if (loaded) {
        this._vault = {
          ...this._vault,
          ...loaded,
          sharedVault: Array.isArray(loaded.sharedVault) ? loaded.sharedVault : []
        };
      }
      this._isInitialized = true;
      if (this._eventBus) {
        this._eventBus.publish('vault:updated', { vault: this.getVaultResources(), items: this.getSharedVaultItems() });
      }
    } catch (e) {
      console.error('[AccountVaultService] Fehler bei der Initialisierung:', e);
    }
  }

  /**
   * Gibt alle im Tresor eingelagerten Ressourcen zurück.
   */
  getVaultResources() {
    return { ...this._vault };
  }

  /**
   * Gibt alle im gemeinsamen Tresor eingelagerten Gegenstände zurück.
   * @returns {Array}
   */
  getSharedVaultItems() {
    return Array.isArray(this._vault.sharedVault) ? [...this._vault.sharedVault] : [];
  }

  /**
   * Fügt einen Gegenstand zum gemeinsamen Account-Lager hinzu.
   * @param {Object} item
   */
  async depositItemToVault(item) {
    if (!item) return false;
    if (!Array.isArray(this._vault.sharedVault)) {
      this._vault.sharedVault = [];
    }

    const itemData = typeof item.toJSON === 'function' ? item.toJSON() : item;
    this._vault.sharedVault.push(itemData);

    await this._save();
    if (this._eventBus) {
      this._eventBus.publish('vault:updated', {
        type: 'item_deposited',
        item: itemData,
        items: this.getSharedVaultItems()
      });
    }
    return true;
  }

  /**
   * Entnimmt einen Gegenstand aus dem gemeinsamen Account-Lager.
   * @param {number} index
   * @returns {Promise<Object|null>}
   */
  async withdrawItemFromVault(index) {
    if (!Array.isArray(this._vault.sharedVault) || index < 0 || index >= this._vault.sharedVault.length) {
      return null;
    }

    const [removedItem] = this._vault.sharedVault.splice(index, 1);

    await this._save();
    if (this._eventBus) {
      this._eventBus.publish('vault:updated', {
        type: 'item_withdrawn',
        item: removedItem,
        items: this.getSharedVaultItems()
      });
    }
    return removedItem;
  }

  /**
   * Leert das gemeinsame Gegenstands-Lager.
   */
  async clearSharedVault() {
    this._vault.sharedVault = [];
    await this._save();
    if (this._eventBus) {
      this._eventBus.publish('vault:updated', { type: 'vault_cleared', items: [] });
    }
  }

  /**
   * Fügt Ressourcen dem gemeinsamen Account-Lager hinzu.
   */
  async depositResource(type, amount) {
    const safeAmount = sanitizeNumber(amount, 0);
    if (safeAmount <= 0) return;

    const currentVal = BigInt(this._vault[type] || '0');
    const newVal = currentVal + BigInt(safeAmount);
    this._vault[type] = newVal.toString();

    await this._save();
    if (this._eventBus) {
      this._eventBus.publish('vault:updated', { type, amount: safeAmount, total: this._vault[type] });
    }
  }

  /**
   * Bucht Ressourcen aus dem gemeinsamen Lager ab.
   */
  async withdrawResource(type, amount) {
    const safeAmount = sanitizeNumber(amount, 0);
    if (safeAmount <= 0) return false;

    const currentVal = BigInt(this._vault[type] || '0');
    const reqVal = BigInt(safeAmount);

    if (currentVal < reqVal) return false;

    const newVal = currentVal - reqVal;
    this._vault[type] = newVal.toString();

    await this._save();
    if (this._eventBus) {
      this._eventBus.publish('vault:updated', { type, amount: -safeAmount, total: this._vault[type] });
    }
    return true;
  }

  /**
   * Berechnet die Gesamtsumme aus lokalem Charakter-Inventar und Account-Lager.
   */
  getCombinedTotal(type, localAmount = '0') {
    const localVal = BigInt(localAmount || '0');
    const vaultVal = BigInt(this._vault[type] || '0');
    return (localVal + vaultVal).toString();
  }

  /**
   * Speichert den Tresor-Zustand.
   */
  async _save() {
    const u = this._authService ? this._authService.getCurrentUser() : null;
    const userId = u && !u.isGuest ? (u.id || u.username) : null;
    await SaveManager.saveAccountVault(this._vault, userId);
  }
}

export default AccountVaultService;
