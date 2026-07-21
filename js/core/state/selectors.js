/**
 * ============================================================
 * FILE: core/state/selectors.js – State-Selectoren
 * ============================================================
 * 
 * Memoized Selectoren für effiziente State-Abfragen.
 * Verwenden Reselect-ähnliche Memoization.
 * ============================================================
 */

// Cache-Speicher für echte Reference-Memoization
let cacheHero = null;
let cachedAttributes = null;

let cacheCombatStatsHero = null;
let cacheCombatStatsPact = null;
let cachedCombatStats = null;

let cacheResources = null;
let cachedResources = null;

let cacheHubState = null;
let cachedHubData = null;

// ============================================================
// HERO-SELECTOREN
// ============================================================

/**
 * Holt den gesamten Helden-State.
 */
export function selectHero(state) {
  return state.hero;
}

/**
 * Holt den Helden-Namen.
 */
export function selectHeroName(state) {
  return state.hero.name;
}

/**
 * Holt das Helden-Level.
 */
export function selectHeroLevel(state) {
  return state.hero.level;
}

/**
 * Holt die Helden-Attribute (Basis + verbrauchte Punkte + Equipment).
 */
export function selectHeroAttributes(state) {
  const hero = state.hero;
  if (hero === cacheHero && cachedAttributes !== null) {
    return cachedAttributes;
  }

  const base = hero.baseStats;
  const spent = hero.spentStats;
  
  const stats = {
    attack: base.attack + spent.attack,
    defense: base.defense + spent.defense,
    agility: base.agility + spent.agility,
    stamina: base.stamina + spent.stamina
  };
  
  // Equipment-Boni
  const equipment = hero.equipment;
  for (const slot of Object.values(equipment)) {
    if (slot && slot.stats) {
      stats.attack += slot.stats.attack || 0;
      stats.defense += slot.stats.defense || 0;
      stats.agility += slot.stats.agility || 0;
      stats.stamina += slot.stats.stamina || 0;
    }
  }
  
  cacheHero = hero;
  cachedAttributes = stats;
  return stats;
}

/**
 * Holt die Kampf-Statistiken.
 */
export function selectHeroCombatStats(state) {
  const hero = state.hero;
  const activePact = hero?.prestige?.activePact;

  if (hero === cacheCombatStatsHero && activePact === cacheCombatStatsPact && cachedCombatStats !== null) {
    return cachedCombatStats;
  }

  const stats = { ...selectHeroAttributes(state) };
  if (activePact === 'scourged_bodies') {
    stats.attack = Math.floor(stats.attack * 1.5);
    stats.defense = Math.floor(stats.defense * 1.5);
  }
  
  const combatStats = {
    ...stats,
    maxHp: 100 + (stats.stamina * 10) + (stats.defense * 2),
    damageReduction: stats.defense / (stats.defense + 100),
    critChance: Math.min(80, 5 + (stats.agility * 0.5)),
    critDamage: 150 + (stats.attack * 0.5),
    dodgeChance: Math.min(50, stats.agility * 0.25)
  };

  cacheCombatStatsHero = hero;
  cacheCombatStatsPact = activePact;
  cachedCombatStats = combatStats;
  return combatStats;
}

/**
 * Holt die Gesamtkampfkraft.
 */
export function selectHeroTotalPower(state) {
  const stats = selectHeroAttributes(state);
  return stats.attack + stats.defense + stats.agility + stats.stamina;
}

/**
 * Holt den Level-Fortschritt in Prozent.
 */
export function selectHeroLevelProgress(state) {
  const hero = state.hero;
  if (hero.expToNext === Infinity) return 100;
  return (hero.experience / hero.expToNext) * 100;
}

// ============================================================
// RESOURCE-SELECTOREN
// ============================================================

/**
 * Holt alle Ressourcen als Zahlen (BigInt → Number).
 */
export function selectResources(state) {
  const res = state.resources;
  if (res === cacheResources && cachedResources !== null) {
    return cachedResources;
  }

  const resources = {
    particles: Number(res.particles || '0'),
    relics: Number(res.relics || '0'),
    artifacts: Number(res.artifacts || '0'),
    memoryDust: Number(res.memoryDust || '0'),
    catalyst: Number(res.catalyst || '0'),
    essence: Number(res.essence || '0'),
    timeBank: res.timeBank || 0,
    totalParticles: Number(res.totalParticles || '0'),
    totalRelics: Number(res.totalRelics || '0')
  };

  cacheResources = res;
  cachedResources = resources;
  return resources;
}

/**
 * Holt Partikel als BigInt.
 */
export function selectParticlesBigInt(state) {
  return BigInt(state.resources.particles || '0');
}

/**
 * Holt Relikte als BigInt.
 */
export function selectRelicsBigInt(state) {
  return BigInt(state.resources.relics || '0');
}

// ============================================================
// CLAN-SELECTOREN
// ============================================================

/**
 * Holt alle Clan-Mitglieder.
 */
export function selectClanMembers(state) {
  return state.clan.members;
}

/**
 * Holt ein bestimmtes Clan-Mitglied.
 */
export function selectClanMember(state, memberId) {
  return state.clan.members.find(m => m.id === memberId) || null;
}

/**
 * Holt die Expedition-Status eines Mitglieds.
 */
export function selectClanMemberExpeditionStatus(state, memberId) {
  return state.clan.expeditionStatus[memberId] || false;
}

// ============================================================
// QUEST-SELECTOREN
// ============================================================

/**
 * Holt die aktuelle Hauptmission.
 */
export function selectCurrentMainQuest(state) {
  const quests = state.quests;
  const index = quests.mainIndex;
  // Die Quest-Definitionen werden extern geladen
  return { index, data: null }; // Wird später von QuestService gefüllt
}

/**
 * Holt die täglichen Missionen.
 */
export function selectDailyQuests(state) {
  return state.quests.daily;
}

// ============================================================
// ACHIEVEMENT-SELECTOREN
// ============================================================

/**
 * Holt alle Errungenschaften.
 */
export function selectAchievements(state) {
  return state.achievements.list;
}

/**
 * Holt den Fortschritt einer Errungenschaft.
 */
export function selectAchievementProgress(state, id) {
  return state.achievements.progress[id] || 0;
}

// ============================================================
// SYSTEM-SELECTOREN
// ============================================================

/**
 * Holt die aktuelle View.
 */
export function selectCurrentView(state) {
  return state.system.currentView;
}

/**
 * Holt den Speicherstatus.
 */
export function selectIsSaving(state) {
  return state.system.isSaving;
}

// ============================================================
// COMPOSED SELECTOREN
// ============================================================

/**
 * Holt alle relevanten Daten für das Hub-Dashboard.
 */
export function selectHubData(state) {
  if (state === cacheHubState && cachedHubData !== null) {
    return cachedHubData;
  }

  const data = {
    heroName: selectHeroName(state),
    heroLevel: selectHeroLevel(state),
    heroPrestige: state.hero.prestige.level,
    heroTitle: state.hero.title,
    resources: selectResources(state),
    clanMembers: selectClanMembers(state),
    currentView: selectCurrentView(state)
  };

  cacheHubState = state;
  cachedHubData = data;
  return data;
}

// ============================================================
// EXPORT
// ============================================================

export default {
  selectHero,
  selectHeroName,
  selectHeroLevel,
  selectHeroAttributes,
  selectHeroCombatStats,
  selectHeroTotalPower,
  selectHeroLevelProgress,
  selectResources,
  selectParticlesBigInt,
  selectRelicsBigInt,
  selectClanMembers,
  selectClanMember,
  selectClanMemberExpeditionStatus,
  selectCurrentMainQuest,
  selectDailyQuests,
  selectAchievements,
  selectAchievementProgress,
  selectCurrentView,
  selectIsSaving,
  selectHubData
};