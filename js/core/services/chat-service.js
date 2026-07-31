/**
 * ============================================================
 * FILE: core/services/chat-service.js – Chat-Service
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Globale Nachrichten
 * - Clan-Nachrichten
 * - Nachrichten-Persistenz
 * ============================================================
 */

import StateManager from '../state/manager.js';
import { sanitizeString } from '../../utils/sanitizer.js';

/** @typedef {import('../events/bus.js').default} EventBus */

/** @typedef {import('./hero-service.js').default} HeroService */
/** @typedef {import('./clan-service.js').default} ClanService */

export class ChatService {
  /**
   * @param {StateManager} stateManager
   * @param {EventBus} eventBus
   * @param {HeroService} heroService
   * @param {ClanService} clanService
   */
  constructor(stateManager, eventBus, heroService, clanService) {
    this._stateManager = stateManager;
    this._eventBus = eventBus;
    this._heroService = heroService;
    this._clanService = clanService;
    this._maxMessages = 100;
  }

  sendGlobalMessage(text) {
    const cleanText = sanitizeString(text, 200, '');
    if (!cleanText) {
      return { success: false, message: 'Nachricht darf nicht leer sein.' };
    }

    if (this._networkService && this._networkService.isConnected()) {
      const sent = this._networkService.send('chat:global', { message: cleanText });
      if (sent) {
        return { success: true };
      }
    }

    const playerName = this._stateManager.getState().hero.name;

    const msg = {
      id: Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4),
      player: playerName,
      message: cleanText,
      timestamp: Date.now(),
      type: 'global'
    };

    this.addReceivedGlobalMessage(msg);
    return { success: true, msg };
  }

  sendClanMessage(text) {
    const cleanText = sanitizeString(text, 200, '');
    if (!cleanText) {
      return { success: false, message: 'Nachricht darf nicht leer sein.' };
    }
    const clanId = 'local_clan';

    // Falls Netzwerk verbunden, senden wir über das WebSocket-Netzwerk
    // FALLBACK: Lokale Simulation (Offline-Modus)
    const playerName = this._stateManager.getState().hero.name;

    const msg = {
      id: Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4),
      player: playerName,
      message: cleanText,
      timestamp: Date.now(),
      clanId: clanId
    };

    this.addReceivedClanMessage(msg);
    return { success: true, msg };
  }

  /**
   * Gibt globale Nachrichten zurück.
   */
  getGlobalMessages(limit = 50) {
    return this._stateManager.getState().chat.global.slice(-limit);
  }

  /**
   * Gibt Clan-Nachrichten zurück.
   */
  getClanMessages(limit = 50) {
    return this._stateManager.getState().chat.clan.slice(-limit);
  }

  /**
   * Leert den globalen Chat.
   */
  clearGlobalChat() {
    this._stateManager.dispatch((state) => ({
      ...state,
      chat: { ...state.chat, global: [] }
    }), 'chat/clearGlobal');
    this._eventBus.publish('chat:cleared', { type: 'global' });
    return { success: true };
  }

  /**
   * Leert den Clan-Chat.
   */
  clearClanChat() {
    this._stateManager.dispatch((state) => ({
      ...state,
      chat: { ...state.chat, clan: [] }
    }), 'chat/clearClan');
    this._eventBus.publish('chat:cleared', { type: 'clan' });
    return { success: true };
  }

  /**
   * Wird aufgerufen, wenn ein globales Chat-Paket vom Server empfangen wird.
   */
  addReceivedGlobalMessage(msg) {
    this._stateManager.dispatch((state) => {
      const global = [...state.chat.global, msg];
      if (global.length > this._maxMessages) {
        global.splice(0, global.length - this._maxMessages);
      }
      return {
        ...state,
        chat: { ...state.chat, global }
      };
    }, 'chat/globalMessage');

    this._eventBus.publish('chat:globalMessage', msg);
  }

  /**
   * Wird aufgerufen, wenn ein Clan-Chat-Paket vom Server empfangen wird.
   */
  addReceivedClanMessage(msg) {
    this._stateManager.dispatch((state) => {
      const clanChat = [...state.chat.clan, msg];
      if (clanChat.length > this._maxMessages) {
        clanChat.splice(0, clanChat.length - this._maxMessages);
      }
      return {
        ...state,
        chat: { ...state.chat, clan: clanChat }
      };
    }, 'chat/clanMessage');

    this._eventBus.publish('chat:clanMessage', msg);
  }
}

export default ChatService;
