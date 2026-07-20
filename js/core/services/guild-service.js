/**
 * ============================================================
 * FILE: core/services/guild-service.js – Gilden-Service
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Gilden gründen, beitreten, verlassen
 * - Mitgliederverwaltung
 * - Gilden-Level & Bonus
 * ============================================================
 */

import StateManager from '../state/manager.js';
import { sanitizeString, sanitizeNumber, sanitizeArray } from '../../utils/sanitizer.js';

/** @typedef {import('../events/bus.js').default} EventBus */

/** @typedef {import('./hero-service.js').default} HeroService */

export class GuildService {
  /**
   * @param {StateManager} stateManager
   * @param {EventBus} eventBus
   * @param {HeroService} heroService
   */
  constructor(stateManager, eventBus, heroService) {
    this._stateManager = stateManager;
    this._eventBus = eventBus;
    this._heroService = heroService;
  }

  /**
   * Gründet eine neue Gilde.
   */
  createGuild(name, description = '') {
    const state = this._stateManager.getState();
    const hero = state.hero;
    const playerName = hero.name;

    // Prüfungen
    if (state.guild.id !== null) {
      return { success: false, message: 'Du bist bereits in einer Gilde.' };
    }
    const guilds = Object.values(state.guild.guilds);
    if (guilds.some(g => g.name.toLowerCase() === name.toLowerCase())) {
      return { success: false, message: 'Eine Gilde mit diesem Namen existiert bereits.' };
    }
    const cleanName = sanitizeString(name, 30, '');
    if (cleanName.length < 3) {
      return { success: false, message: 'Der Gildenname muss mindestens 3 Zeichen lang sein.' };
    }

    // Gilde erstellen
    const id = Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4);
    const newGuild = {
      id,
      name: cleanName,
      description: sanitizeString(description, 200, 'Eine Gilde des Mneme-Bundes.'),
      level: 1,
      members: [playerName],
      created: Date.now(),
      experience: 0,
      expToNext: 100
    };

    this._stateManager.dispatch((state) => ({
      ...state,
      guild: {
        id: id,
        guilds: { ...state.guild.guilds, [id]: newGuild },
        memberGuilds: { ...state.guild.memberGuilds, [playerName]: id }
      }
    }), 'guild/create');

    this._eventBus.publish('guild:created', { guildId: id, guild: newGuild });
    this._eventBus.publish('ui:showToast', {
      message: `🏛️ Gilde "${cleanName}" wurde gegründet!`,
      type: 'success',
      duration: 3000
    });

    return { success: true, guildId: id, guild: newGuild };
  }

  /**
   * Tritt einer Gilde bei.
   */
  joinGuild(guildId) {
    const state = this._stateManager.getState();
    const hero = state.hero;
    const playerName = hero.name;

    if (state.guild.id !== null) {
      return { success: false, message: 'Du bist bereits in einer Gilde.' };
    }
    const guild = state.guild.guilds[guildId];
    if (!guild) {
      return { success: false, message: 'Gilde nicht gefunden.' };
    }
    if (guild.members.includes(playerName)) {
      return { success: false, message: 'Du bist bereits Mitglied dieser Gilde.' };
    }

    this._stateManager.dispatch((state) => {
      const guilds = { ...state.guild.guilds };
      guilds[guildId] = {
        ...guilds[guildId],
        members: [...guilds[guildId].members, playerName]
      };
      return {
        ...state,
        guild: {
          ...state.guild,
          id: guildId,
          guilds,
          memberGuilds: { ...state.guild.memberGuilds, [playerName]: guildId }
        }
      };
    }, 'guild/join');

    this._eventBus.publish('guild:memberJoined', { guildId, playerName });
    this._eventBus.publish('ui:showToast', {
      message: `🤝 Du bist der Gilde "${guild.name}" beigetreten!`,
      type: 'success',
      duration: 3000
    });

    return { success: true, guild };
  }

  /**
   * Verlässt die aktuelle Gilde.
   */
  leaveGuild() {
    const state = this._stateManager.getState();
    const hero = state.hero;
    const playerName = hero.name;
    const guildId = state.guild.id;
    if (!guildId) {
      return { success: false, message: 'Du bist in keiner Gilde.' };
    }
    const guild = state.guild.guilds[guildId];
    if (!guild) {
      this._stateManager.dispatch((state) => ({
        ...state,
        guild: { ...state.guild, id: null, memberGuilds: { ...state.guild.memberGuilds, [playerName]: undefined } }
      }), 'guild/cleanup');
      return { success: true, message: 'Gilde nicht mehr vorhanden.' };
    }

    if (guild.members.length === 1 && guild.members[0] === playerName) {
      // Letztes Mitglied – Gilde auflösen
      this._stateManager.dispatch((state) => {
        const guilds = { ...state.guild.guilds };
        delete guilds[guildId];
        const memberGuilds = { ...state.guild.memberGuilds };
        delete memberGuilds[playerName];
        return {
          ...state,
          guild: { ...state.guild, id: null, guilds, memberGuilds }
        };
      }, 'guild/delete');
      this._eventBus.publish('guild:deleted', { guildId });
      this._eventBus.publish('ui:showToast', {
        message: `💔 Die Gilde "${guild.name}" wurde aufgelöst.`,
        type: 'warning',
        duration: 3000
      });
      return { success: true, message: 'Gilde aufgelöst.' };
    }

    // Mitglied entfernen
    this._stateManager.dispatch((state) => {
      const guilds = { ...state.guild.guilds };
      guilds[guildId] = {
        ...guilds[guildId],
        members: guilds[guildId].members.filter(m => m !== playerName)
      };
      const memberGuilds = { ...state.guild.memberGuilds };
      delete memberGuilds[playerName];
      return {
        ...state,
        guild: { ...state.guild, id: null, guilds, memberGuilds }
      };
    }, 'guild/leave');

    this._eventBus.publish('guild:memberLeft', { guildId, playerName });
    this._eventBus.publish('ui:showToast', {
      message: `👋 Du hast die Gilde "${guild.name}" verlassen.`,
      type: 'info',
      duration: 2000
    });

    return { success: true, message: 'Gilde verlassen.' };
  }

  /**
   * Gibt die Gilde des Spielers zurück.
   */
  getPlayerGuild() {
    const state = this._stateManager.getState();
    const id = state.guild.id;
    return id ? state.guild.guilds[id] : null;
  }

  /**
   * Gibt alle Gilden zurück.
   */
  getAllGuilds() {
    return Object.values(this._stateManager.getState().guild.guilds);
  }

  /**
   * Fügt Gilden-Erfahrung hinzu (löst Level-Up aus).
   */
  addGuildExperience(amount) {
    const state = this._stateManager.getState();
    const guild = this.getPlayerGuild();
    if (!guild) return;

    const safeAmount = sanitizeNumber(amount, 0);
    if (safeAmount <= 0) return;

    this._stateManager.dispatch((state) => {
      const guilds = { ...state.guild.guilds };
      const g = guilds[guild.id];
      if (!g) return state;
      g.experience += safeAmount;
      let leveled = false;
      while (g.experience >= g.expToNext) {
        g.experience -= g.expToNext;
        g.level++;
        g.expToNext = Math.floor(g.expToNext * 1.3);
        leveled = true;
      }
      guilds[guild.id] = g;
      return { ...state, guild: { ...state.guild, guilds } };
    }, 'guild/addExp');

    if (this._stateManager.getState().guild.guilds[guild.id]?.level > guild.level) {
      this._eventBus.publish('guild:levelUp', { guildId: guild.id, level: guild.level + 1 });
      this._eventBus.publish('ui:showToast', {
        message: `🏛️ Gilde "${guild.name}" erreicht Stufe ${guild.level + 1}!`,
        type: 'success',
        duration: 3000
      });
    }
  }

  /**
   * Gibt den Gilden-Bonus zurück.
   */
  getGuildBonus() {
    const guild = this.getPlayerGuild();
    if (!guild) return 0;
    return guild.level * 0.05;
  }
}

export default GuildService;