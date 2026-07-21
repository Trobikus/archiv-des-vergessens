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

/** @typedef {import('../events/bus.js').default} EventBus */

/** @typedef {import('./hero-service.js').default} HeroService */

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
      return this.acceptFriend(cleanName);
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

    // --- SIMULATION ---
    const simulatedNames = ["Eldor", "Chronos", "Luminos", "Thalia", "Aria", "Kaelen", "Morrigan", "Archivar", "Mnemosyne"];
    const isSimulated = simulatedNames.map(n => n.toLowerCase()).includes(cleanName.toLowerCase());
    const delay = isSimulated ? 5000 : 10000;

    setTimeout(() => {
      const currentState = this._stateManager.getState();
      const stillSent = currentState.friends.sent.some(r => r.to === cleanName);
      if (stillSent && currentState.friends.list.length < this._maxFriends) {
        this._stateManager.dispatch((state) => ({
          ...state,
          friends: {
            ...state.friends,
            sent: state.friends.sent.filter(r => r.to !== cleanName),
            list: [...state.friends.list, { name: cleanName, added: Date.now() }]
          }
        }), 'friend/simulateAccept');

        this._eventBus.publish('friend:accepted', { name: cleanName });
        this._eventBus.publish('ui:showToast', {
          message: `🤝 ${cleanName} hat deine Freundschaftsanfrage angenommen!`,
          type: 'success',
          duration: 3000
        });
      }
    }, delay);

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
   * Lehnt eine Freundschaftsanfrage ab.
   */
  declineFriendRequest(name) {
    const state = this._stateManager.getState();
    const playerName = state.hero.name;
    const cleanName = sanitizeString(name, 50, '');

    const request = state.friends.pending.find(r => r.from === cleanName && r.to === playerName);
    if (!request) {
      return { success: false, message: 'Keine Anfrage von dieser Person.' };
    }

    this._stateManager.dispatch((state) => ({
      ...state,
      friends: {
        ...state.friends,
        pending: state.friends.pending.filter(r => r !== request)
      }
    }), 'friend/decline');

    this._eventBus.publish('friend:requestDeclined', { name: cleanName });
    this._eventBus.publish('ui:showToast', {
      message: `❌ Freundschaftsanfrage von ${cleanName} abgelehnt.`,
      type: 'info',
      duration: 2000
    });

    return { success: true, message: `Anfrage von ${cleanName} abgelehnt.` };
  }

  /**
   * Zieht eine gesendete Freundschaftsanfrage zurück.
   */
  cancelSentRequest(name) {
    const state = this._stateManager.getState();
    const cleanName = sanitizeString(name, 50, '');

    const request = state.friends.sent.find(r => r.to === cleanName);
    if (!request) {
      return { success: false, message: 'Keine gesendete Anfrage an diese Person.' };
    }

    this._stateManager.dispatch((state) => ({
      ...state,
      friends: {
        ...state.friends,
        sent: state.friends.sent.filter(r => r.to !== cleanName)
      }
    }), 'friend/cancelSent');

    this._eventBus.publish('friend:sentCancelled', { name: cleanName });
    this._eventBus.publish('ui:showToast', {
      message: `🚫 Freundschaftsanfrage an ${cleanName} zurückgezogen.`,
      type: 'info',
      duration: 2000
    });

    return { success: true, message: `Anfrage an ${cleanName} zurückgezogen.` };
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
   * Simuliert eine eingehende Freundschaftsanfrage.
   */
  simulateIncomingRequest(name) {
    const state = this._stateManager.getState();
    const playerName = state.hero.name;
    const cleanName = sanitizeString(name, 50, '');

    if (cleanName === playerName) return;
    if (state.friends.list.some(f => f.name === cleanName)) return;
    if (state.friends.pending.some(r => r.from === cleanName)) return;

    this._stateManager.dispatch((state) => ({
      ...state,
      friends: {
        ...state.friends,
        pending: [...state.friends.pending, { from: cleanName, to: playerName, timestamp: Date.now() }]
      }
    }), 'friend/receiveRequest');

    this._eventBus.publish('friend:requestReceived', { from: cleanName, to: playerName });
    this._eventBus.publish('ui:showToast', {
      message: `🔔 Neue Freundschaftsanfrage von ${cleanName}!`,
      type: 'info',
      duration: 3000
    });
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