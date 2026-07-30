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
   * @param {import('./network-service.js').NetworkService} [networkService]
   */
  constructor(stateManager, eventBus, heroService, clanService, networkService = null) {
    this._stateManager = stateManager;
    this._eventBus = eventBus;
    this._heroService = heroService;
    this._clanService = clanService;
    this._networkService = networkService;
    this._maxMessages = 100;
  }

  sendGlobalMessage(text) {
    const cleanText = sanitizeString(text, 200, '');
    if (!cleanText) {
      return { success: false, message: 'Nachricht darf nicht leer sein.' };
    }

    // Falls Netzwerk verbunden, senden wir über das WebSocket-Netzwerk
    if (this._networkService && this._networkService.isConnected()) {
      const sent = this._networkService.send('chat:global', { message: cleanText });
      if (sent) {
        return { success: true };
      }
    }

    return { success: false, message: 'auth.error.server_offline' };
  }

  sendClanMessage(text) {
    const cleanText = sanitizeString(text, 200, '');
    if (!cleanText) {
      return { success: false, message: 'Nachricht darf nicht leer sein.' };
    }
    const clanId = 'local_clan';

    // Falls Netzwerk verbunden, senden wir über das WebSocket-Netzwerk
    if (this._networkService && this._networkService.isConnected()) {
      const sent = this._networkService.send('chat:clan', { message: cleanText, clanId });
      if (sent) {
        return { success: true };
      }
    }

    return { success: false, message: 'auth.error.server_offline' };
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