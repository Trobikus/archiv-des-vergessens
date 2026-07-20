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
   */
  constructor(stateManager, eventBus, heroService, guildService) {
    this._stateManager = stateManager;
    this._eventBus = eventBus;
    this._heroService = heroService;
    this._guildService = guildService;
    this._maxMessages = 100;
  }

  /**
   * Sendet eine globale Nachricht.
   */
  sendGlobalMessage(text) {
    const cleanText = sanitizeString(text, 200, '');
    if (!cleanText) {
      return { success: false, message: 'Nachricht darf nicht leer sein.' };
    }
    const playerName = this._stateManager.getState().hero.name;

    const msg = {
      id: Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4),
      player: playerName,
      message: cleanText,
      timestamp: Date.now(),
      type: 'global'
    };

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
    return { success: true, msg };
  }

  /**
   * Sendet eine Gilden-Nachricht.
   */
  sendGuildMessage(text) {
    const cleanText = sanitizeString(text, 200, '');
    if (!cleanText) {
      return { success: false, message: 'Nachricht darf nicht leer sein.' };
    }
    const guild = this._guildService.getPlayerGuild();
    if (!guild) {
      return { success: false, message: 'Du bist in keiner Gilde.' };
    }
    const playerName = this._stateManager.getState().hero.name;

    const msg = {
      id: Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4),
      player: playerName,
      message: cleanText,
      timestamp: Date.now(),
      guildId: guild.id
    };

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
}

export default ChatService;