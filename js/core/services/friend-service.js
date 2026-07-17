/**
 * ============================================================
 * FILE: core/services/friend-service.js – Freundes-Service
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Freundesliste verwalten
 * - Freundschaftsanfragen senden/akzeptieren
 * - Freunde entfernen
 * ============================================================
 */

import StateManager from '../state/manager.js';
import { sanitizeString } from '../../utils/sanitizer.js';

export class FriendService {
  /**
   * @param {StateManager} stateManager
   * @param {EventBus} eventBus
   * @param {HeroService} heroService
   */
  constructor(stateManager, eventBus, heroService) {
    this._stateManager = stateManager;
    this._eventBus = eventBus;
    this._heroService = heroService;
    this._maxFriends = 50;
  }

  /**
   * Sendet eine Freundschaftsanfrage.
   */
  addFriend(name) {
    const state = this._stateManager.getState();
    const hero = state.hero;
    const playerName = hero.name;
    const cleanName = sanitizeString(name, 50, '');

    if (cleanName === playerName) {
      return { success: false, message: 'Du kannst dich nicht selbst als Freund hinzufügen.' };
    }
    if (state.friends.list.some(f => f.name === cleanName)) {
      return { success: false, message: `${cleanName} ist bereits dein Freund.` };
    }
    if (state.friends.list.length >= this._maxFriends) {
      return { success: false, message: 'Du hast die maximale Anzahl an Freunden erreicht.' };
    }
    if (state.friends.pending.some(r => r.from === cleanName && r.to === playerName)) {
      return { success: false, message: 'Du hast bereits eine Anfrage von dieser Person.' };
    }
    if (state.friends.sent.some(r => r.to === cleanName)) {
      return { success: false, message: 'Du hast bereits eine Anfrage an diese Person gesendet.' };
    }

    this._stateManager.dispatch((state) => ({
      ...state,
      friends: {
        ...state.friends,
        sent: [...state.friends.sent, { from: playerName, to: cleanName, timestamp: Date.now() }]
      }
    }), 'friend/sendRequest');

    this._eventBus.publish('friend:requestSent', { from: playerName, to: cleanName });
    this._eventBus.publish('ui:showToast', {
      message: `🤝 Freundschaftsanfrage an ${cleanName} gesendet.`,
      type: 'info',
      duration: 2000
    });

    return { success: true, message: `Anfrage an ${cleanName} gesendet.` };
  }

  /**
   * Akzeptiert eine Freundschaftsanfrage.
   */
  acceptFriend(name) {
    const state = this._stateManager.getState();
    const playerName = state.hero.name;
    const cleanName = sanitizeString(name, 50, '');

    const request = state.friends.pending.find(r => r.from === cleanName && r.to === playerName);
    if (!request) {
      return { success: false, message: 'Keine Anfrage von dieser Person.' };
    }
    if (state.friends.list.length >= this._maxFriends) {
      return { success: false, message: 'Du hast die maximale Anzahl an Freunden erreicht.' };
    }

    this._stateManager.dispatch((state) => ({
      ...state,
      friends: {
        ...state.friends,
        list: [...state.friends.list, { name: cleanName, added: Date.now() }],
        pending: state.friends.pending.filter(r => r !== request)
      }
    }), 'friend/accept');

    this._eventBus.publish('friend:accepted', { name: cleanName });
    this._eventBus.publish('ui:showToast', {
      message: `🤝 ${cleanName} ist jetzt dein Freund!`,
      type: 'success',
      duration: 3000
    });

    return { success: true, message: `${cleanName} ist jetzt dein Freund.` };
  }

  /**
   * Entfernt einen Freund.
   */
  removeFriend(name) {
    const state = this._stateManager.getState();
    const cleanName = sanitizeString(name, 50, '');

    if (!state.friends.list.some(f => f.name === cleanName)) {
      return { success: false, message: `${cleanName} ist nicht in deiner Freundesliste.` };
    }

    this._stateManager.dispatch((state) => ({
      ...state,
      friends: {
        ...state.friends,
        list: state.friends.list.filter(f => f.name !== cleanName)
      }
    }), 'friend/remove');

    this._eventBus.publish('friend:removed', { name: cleanName });
    this._eventBus.publish('ui:showToast', {
      message: `👋 ${cleanName} wurde aus deiner Freundesliste entfernt.`,
      type: 'info',
      duration: 2000
    });

    return { success: true, message: `${cleanName} entfernt.` };
  }

  /**
   * Gibt alle Freunde zurück.
   */
  getFriends() {
    return this._stateManager.getState().friends.list;
  }

  /**
   * Gibt alle ausstehenden Anfragen zurück.
   */
  getPendingRequests() {
    const state = this._stateManager.getState();
    const playerName = state.hero.name;
    return state.friends.pending.filter(r => r.to === playerName);
  }

  /**
   * Gibt alle gesendeten Anfragen zurück.
   */
  getSentRequests() {
    const state = this._stateManager.getState();
    const playerName = state.hero.name;
    return state.friends.sent.filter(r => r.from === playerName);
  }
}

export default FriendService;