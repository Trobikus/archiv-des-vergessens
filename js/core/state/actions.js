/**
 * ============================================================
 * FILE: core/state/actions.js – State-Aktionen (Pure Reducers)
 * ============================================================
 * 
 * SÄMTLICHE State-Mutationen werden hier als Pure Functions definiert.
 * Keine Seiteneffekte – nur State-Transformationen.
 * ============================================================
 */

import { deepClone, deepMerge } from '../../utils/object-utils.js';
import { sanitizeNumber, sanitizeString, sanitizeArray, clamp } from '../../utils/sanitizer.js';

// ============================================================
// HERO-ACTIONS
// ============================================================

/**
 * Aktualisiert den Helden-Namen.
 */
export function setHeroName(name) {
  return (state) => ({
    ...state,
    hero: {
      ...state.hero,
      name: sanitizeString(name, 50, 'Der Mneme-Bund')
    }
  });
}

/**
 * Fügt Erfahrung hinzu und löst Level-Up aus.
 */
export function addHeroExperience(amount) {
  return (state) => {
    let exp = sanitizeNumber(amount, 0);
    if (exp <= 0) return state;
    
    let hero = { ...state.hero };
    let experience = hero.experience + exp;
    let level = hero.level;
    let expToNext = hero.expToNext;
    let unspentStatPoints = hero.unspentStatPoints;
    let levelUps = 0;
    
    while (experience >= expToNext && level < 9999) {
      experience -= expToNext;
      level++;
      levelUps++;
      unspentStatPoints += 3;
      expToNext = Math.floor(expToNext * 1.2);
    }
    
    if (level >= 9999) {
      experience = 0;
      expToNext = Infinity;
    }
    
    hero.experience = experience;
    hero.level = level;
    hero.expToNext = expToNext;
    hero.unspentStatPoints = unspentStatPoints;
    
    return {
      ...state,
      hero,
      system: {
        ...state.system,
        _levelUps: levelUps > 0 ? levelUps : state.system._levelUps
      }
    };
  };
}

/**
 * Verteilt einen Stat-Punkt.
 */
export function spendStatPoint(statKey) {
  const validStats = ['attack', 'defense', 'agility', 'stamina'];
  if (!validStats.includes(statKey)) return (state) => state;
  
  return (state) => {
    const hero = state.hero;
    if (hero.unspentStatPoints <= 0) return state;
    
    return {
      ...state,
      hero: {
        ...hero,
        spentStats: {
          ...hero.spentStats,
          [statKey]: hero.spentStats[statKey] + 1
        },
        unspentStatPoints: hero.unspentStatPoints - 1
      }
    };
  };
}

/**
 * Rüstet ein Item aus.
 */
export function equipItem(slot, item) {
  return (state) => {
    const hero = state.hero;
    const validSlots = ['weapon', 'shield', 'helmet', 'shoulders', 'armor', 'gloves', 'belt', 'boots', 'amulet', 'ring', 'ring2'];
    if (!validSlots.includes(slot)) return state;
    if (!item) return state;
    
    const oldItem = hero.equipment[slot];
    const equipment = { ...hero.equipment, [slot]: item };
    const inventory = { ...hero.inventory };
    
    if (oldItem) {
      inventory.equipment = [...inventory.equipment, oldItem];
    }
    
    return {
      ...state,
      hero: {
        ...hero,
        equipment,
        inventory
      }
    };
  };
}

/**
 * Setzt den aktiven Titel des Helden.
 */
export function setHeroTitle(title) {
  return (state) => ({
    ...state,
    hero: {
      ...state.hero,
      title: sanitizeString(title, 100, '')
    }
  });
}

// ============================================================
// RESOURCE-ACTIONS
// ============================================================

/**
 * Fügt Partikel hinzu (mit BigInt-Unterstützung).
 */
export function addParticles(amount) {
  return (state) => {
    const safeAmount = sanitizeNumber(amount, 0);
    if (safeAmount <= 0) return state;
    
    const resources = state.resources;
    const current = BigInt(resources.particles || '0');
    const total = BigInt(resources.totalParticles || '0');
    const add = BigInt(safeAmount);
    
    return {
      ...state,
      resources: {
        ...resources,
        particles: String(current + add),
        totalParticles: String(total + add)
      }
    };
  };
}

/**
 * Entfernt Partikel.
 */
export function removeParticles(amount) {
  return (state) => {
    const safeAmount = sanitizeNumber(amount, 0);
    if (safeAmount <= 0) return state;
    
    const resources = state.resources;
    const current = BigInt(resources.particles || '0');
    const remove = BigInt(safeAmount);
    
    if (current < remove) return state;
    
    return {
      ...state,
      resources: {
        ...resources,
        particles: String(current - remove)
      }
    };
  };
}

/**
 * Fügt Relikte hinzu.
 */
export function addRelics(amount) {
  return (state) => {
    const safeAmount = sanitizeNumber(amount, 0);
    if (safeAmount <= 0) return state;
    
    const resources = state.resources;
    const current = BigInt(resources.relics || '0');
    const total = BigInt(resources.totalRelics || '0');
    const add = BigInt(safeAmount);
    
    return {
      ...state,
      resources: {
        ...resources,
        relics: String(current + add),
        totalRelics: String(total + add)
      }
    };
  };
}

/**
 * Entfernt Relikte (prüft vorher, ob genug vorhanden sind).
 */
export function removeRelics(amount) {
  return (state) => {
    const safeAmount = sanitizeNumber(amount, 0);
    if (safeAmount <= 0) return state;

    const resources = state.resources;
    const current = BigInt(resources.relics || '0');
    const remove = BigInt(safeAmount);

    if (current < remove) return state;

    return {
      ...state,
      resources: {
        ...resources,
        relics: String(current - remove)
      }
    };
  };
}

/**
 * Fügt Artefakte hinzu.
 */
export function addArtifacts(amount) {
  return (state) => {
    const safeAmount = sanitizeNumber(amount, 0);
    if (safeAmount <= 0) return state;

    const resources = state.resources;
    const current = BigInt(resources.artifacts || '0');
    const add = BigInt(safeAmount);

    return {
      ...state,
      resources: {
        ...resources,
        artifacts: String(current + add)
      }
    };
  };
}

/**
 * Fügt Erinnerungsstaub (Memory Dust) hinzu.
 */
export function addMemoryDust(amount) {
  return (state) => {
    const safeAmount = sanitizeNumber(amount, 0);
    if (safeAmount <= 0) return state;

    const resources = state.resources;
    const current = BigInt(resources.memoryDust || '0');
    const add = BigInt(safeAmount);

    return {
      ...state,
      resources: {
        ...resources,
        memoryDust: String(current + add)
      }
    };
  };
}

/**
 * Entfernt Erinnerungsstaub (Memory Dust), sofern genug vorhanden ist.
 */
export function removeMemoryDust(amount) {
  return (state) => {
    const safeAmount = sanitizeNumber(amount, 0);
    if (safeAmount <= 0) return state;

    const resources = state.resources;
    const current = BigInt(resources.memoryDust || '0');
    const remove = BigInt(safeAmount);

    if (current < remove) return state;

    return {
      ...state,
      resources: {
        ...resources,
        memoryDust: String(current - remove)
      }
    };
  };
}

// ============================================================
// CLAN-ACTIONS
// ============================================================

/**
 * Rekrutiert ein neues Clan-Mitglied.
 */
export function recruitClanMember(name, role, cost) {
  return (state) => {
    const resources = state.resources;
    const costBig = BigInt(cost);
    const particles = BigInt(resources.particles || '0');
    
    if (particles < costBig) return state;
    
    const clan = state.clan;
    const id = clan.nextId;
    
    // Basis-Raten festlegen (höhere Rollen sind effizienter)
    let rate = 1.0;
    if (role === 'collector') rate = 2.0;
    else if (role === 'weaver') rate = 1.2;
    else if (role === 'guardian') rate = 0.8;
    else if (role === 'archivist') rate = 2.5;
    else if (role === 'elder') rate = 3.5;
    
    const newMember = {
      id,
      name: sanitizeString(name, 50, `Mitglied ${id}`),
      role: sanitizeString(role, 20, 'collector'),
      level: 1,
      experience: 0,
      progress: 0,
      expToNextLevel: 50,
      baseCollectRate: rate
    };
    
    return {
      ...state,
      resources: {
        ...resources,
        particles: String(particles - costBig)
      },
      clan: {
        ...clan,
        members: [...clan.members, newMember],
        nextId: id + 1
      }
    };
  };
}

/**
 * Entlässt ein Clan-Mitglied und erstattet Partikel.
 */
export function dismissClanMember(id, refundParticles) {
  return (state) => {
    const clan = state.clan;
    const index = clan.members.findIndex(m => m.id === id);
    if (index === -1) return state;

    const resources = state.resources;
    const currentParticles = BigInt(resources.particles || '0');
    const refundBig = BigInt(refundParticles || '0');

    const newMembers = [...clan.members];
    newMembers.splice(index, 1);

    return {
      ...state,
      resources: {
        ...resources,
        particles: String(currentParticles + refundBig)
      },
      clan: {
        ...clan,
        members: newMembers
      }
    };
  };
}

/**
 * Aktualisiert den Fortschritt eines Clan-Mitglieds.
 */
export function updateClanMemberProgress(memberId, progress) {
  return (state) => {
    const clan = state.clan;
    const index = clan.members.findIndex(m => m.id === memberId);
    if (index === -1) return state;
    
    const members = [...clan.members];
    const member = { ...members[index] };
    member.progress = clamp(sanitizeNumber(progress, 0), 0, 100);
    members[index] = member;
    
    return {
      ...state,
      clan: { ...clan, members }
    };
  };
}

// ============================================================
// SYSTEM-ACTIONS
// ============================================================

/**
 * Setzt die aktuelle View.
 */
export function setCurrentView(view) {
  const validViews = ['intro', 'login', 'characterSelect', 'menu', 'hub', 'game', 'options'];
  if (!validViews.includes(view)) return (state) => state;
  
  return (state) => ({
    ...state,
    system: {
      ...state.system,
      currentView: view
    }
  });
}

/**
 * Setzt den Speicherstatus.
 */
export function setSavingStatus(isSaving) {
  return (state) => ({
    ...state,
    system: {
      ...state.system,
      isSaving,
      lastSave: isSaving ? state.system.lastSave : Date.now()
    }
  });
}

/**
 * Setzt den Tutorial-Schritt.
 */
export function setTutorialStep(step) {
  return (state) => ({
    ...state,
    system: {
      ...state.system,
      tutorialStep: sanitizeNumber(step, 0)
    }
  });
}

/**
 * Beendet das Tutorial.
 */
export function finishTutorial() {
  return (state) => ({
    ...state,
    system: {
      ...state.system,
      tutorialFinished: true,
      tutorialStep: -1
    }
  });
}

// ============================================================
// BATCH-ACTIONS
// ============================================================

/**
 * Führt mehrere Aktionen in einem Dispatch aus.
 */
export function batch(actions) {
  return (state) => {
    let currentState = state;
    for (const action of actions) {
      currentState = action(currentState);
    }
    return currentState;
  };
}

// ============================================================
// EXPORT
// ============================================================

export default {
  setHeroName,
  setHeroTitle,
  addHeroExperience,
  spendStatPoint,
  equipItem,
  addParticles,
  removeParticles,
  addRelics,
  recruitClanMember,
  dismissClanMember,
  updateClanMemberProgress,
  setCurrentView,
  setSavingStatus,
  setTutorialStep,
  finishTutorial,
  batch
};