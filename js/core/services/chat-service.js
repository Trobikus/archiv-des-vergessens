/**
 * ============================================================
 * FILE: core/services/chat-service.js – Chat-Service
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Globale Nachrichten
 * - Gilden-Nachrichten
 * - Nachrichten-Persistenz
 * ============================================================
 */

import StateManager from '../state/manager.js';
import { sanitizeString } from '../../utils/sanitizer.js';

/** @typedef {import('../events/bus.js').default} EventBus */

/** @typedef {import('./hero-service.js').default} HeroService */
/** @typedef {import('./guild-service.js').default} GuildService */

export class ChatService {
  /**
   * @param {StateManager} stateManager
   * @param {EventBus} eventBus
   * @param {HeroService} heroService
   * @param {GuildService} guildService
   * @param {import('./network-service.js').NetworkService} [networkService]
   */
  constructor(stateManager, eventBus, heroService, guildService, networkService = null) {
    this._stateManager = stateManager;
    this._eventBus = eventBus;
    this._heroService = heroService;
    this._guildService = guildService;
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

    // FALLBACK: Lokale Simulation (Offline-Modus)
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

  sendGuildMessage(text) {
    const cleanText = sanitizeString(text, 200, '');
    if (!cleanText) {
      return { success: false, message: 'Nachricht darf nicht leer sein.' };
    }
    const guild = this._guildService.getPlayerGuild();
    if (!guild) {
      return { success: false, message: 'Du bist in keiner Gilde.' };
    }

    // Falls Netzwerk verbunden, senden wir über das WebSocket-Netzwerk
    if (this._networkService && this._networkService.isConnected()) {
      const sent = this._networkService.send('chat:guild', { message: cleanText });
      if (sent) {
        return { success: true };
      }
    }

    // FALLBACK: Lokale Simulation (Offline-Modus)
    const playerName = this._stateManager.getState().hero.name;

    const msg = {
      id: Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4),
      player: playerName,
      message: cleanText,
      timestamp: Date.now(),
      guildId: guild.id
    };

    this.addReceivedGuildMessage(msg);
    return { success: true, msg };
  }

  /**
   * Gibt globale Nachrichten zurück.
   */
  getGlobalMessages(limit = 50) {
    return this._stateManager.getState().chat.global.slice(-limit);
  }

  /**
   * Gibt Gilden-Nachrichten zurück.
   */
  getGuildMessages(limit = 50) {
    return this._stateManager.getState().chat.guild.slice(-limit);
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
   * Leert den Gilden-Chat.
   */
  clearGuildChat() {
    this._stateManager.dispatch((state) => ({
      ...state,
      chat: { ...state.chat, guild: [] }
    }), 'chat/clearGuild');
    this._eventBus.publish('chat:cleared', { type: 'guild' });
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
   * Wird aufgerufen, wenn ein Gilden-Chat-Paket vom Server empfangen wird.
   */
  addReceivedGuildMessage(msg) {
    this._stateManager.dispatch((state) => {
      const guildChat = [...state.chat.guild, msg];
      if (guildChat.length > this._maxMessages) {
        guildChat.splice(0, guildChat.length - this._maxMessages);
      }
      return {
        ...state,
        chat: { ...state.chat, guild: guildChat }
      };
    }, 'chat/guildMessage');

    this._eventBus.publish('chat:guildMessage', msg);
  }
}

export default ChatService;