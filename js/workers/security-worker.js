/**
 * ============================================================
 * FILE: workers/security-worker.js – Security Worker (v2.0)
 * ============================================================
 * 
 * Führt rechenintensive Sicherheitsprüfungen aus:
 * - Integritätschecks
 * - Prüfsummen
 * - Serialisierung/Deserialisierung
 * ============================================================
 */

// ---- Sanitizer (leichtgewichtige Kopie) ----
const Sanitizer = {
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  },
  sanitizeNumber(value, fallback = 0) {
    const num = Number(value);
    return isNaN(num) ? fallback : num;
  }
};

// ---- IntegrityChecker ----
const IntegrityChecker = {
  checkResourceState(resources) {
    const errors = [];
    if (resources.particles < 0) errors.push({ field: 'particles', value: resources.particles });
    if (resources.relics < 0) errors.push({ field: 'relics', value: resources.relics });
    if (resources.artifacts < 0) errors.push({ field: 'artifacts', value: resources.artifacts });
    if (resources.particles > 1e15) errors.push({ field: 'particles', value: resources.particles, max: 1e15 });
    if (resources.relics > 1e12) errors.push({ field: 'relics', value: resources.relics, max: 1e12 });
    return errors;
  },
  checkHeroState(hero) {
    const errors = [];
    if (hero.level < 1) errors.push({ field: 'level', value: hero.level, min: 1 });
    if (hero.prestigeLevel < 0) errors.push({ field: 'prestigeLevel', value: hero.prestigeLevel, min: 0 });
    if (hero.bossProgress > 200) errors.push({ field: 'bossProgress', value: hero.bossProgress, max: 200 });
    return errors;
  },
  checkAll(context) {
    const allErrors = [];
    if (context.resources) allErrors.push(...this.checkResourceState(context.resources));
    if (context.hero) allErrors.push(...this.checkHeroState(context.hero));
    return allErrors;
  },
  repair(context) {
    if (!context.resources && !context.hero) return false;
    const repairs = [];
    if (context.resources) {
      const res = context.resources;
      if (res.particles < 0) { res.particles = 0; repairs.push('particles korrigiert'); }
      if (res.particles > 1e15) { res.particles = 1e15; repairs.push('particles gekappt'); }
      if (res.relics < 0) { res.relics = 0; repairs.push('relics korrigiert'); }
      if (res.relics > 1e12) { res.relics = 1e12; repairs.push('relics gekappt'); }
    }
    if (context.hero) {
      const hero = context.hero;
      if (hero.level < 1) { hero.level = 1; repairs.push('level korrigiert'); }
      if (hero.prestigeLevel < 0) { hero.prestigeLevel = 0; repairs.push('prestigeLevel korrigiert'); }
      if (hero.bossProgress > 200) { hero.bossProgress = 200; repairs.push('bossProgress gekappt'); }
      const expectedPoints = (hero.level - 1) * 3;
      const totalSpent = (hero.spentStats?.attack || 0) + (hero.spentStats?.defense || 0) +
                         (hero.spentStats?.agility || 0) + (hero.spentStats?.stamina || 0);
      const currentTotal = (hero.unspentStatPoints || 0) + totalSpent;
      if (currentTotal < expectedPoints) {
        hero.unspentStatPoints = (hero.unspentStatPoints || 0) + (expectedPoints - currentTotal);
        repairs.push('statPoints korrigiert');
      }
    }
    return repairs;
  }
};

// ---- Checksum ----
const Checksum = {
  calculate(data) {
    const json = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < json.length; i++) {
      const char = json.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
};

// ---- Message-Handling ----
self.addEventListener('message', async (event) => {
  const { type, id, payload } = event.data;

  try {
    let result;
    switch (type) {
      case 'integrity:check':
        result = IntegrityChecker.checkAll(payload);
        break;
      case 'integrity:repair':
        result = IntegrityChecker.repair(payload);
        break;
      case 'checksum:calculate':
        result = Checksum.calculate(payload);
        break;
      case 'serialize':
        result = JSON.stringify(payload);
        break;
      case 'deserialize':
        result = JSON.parse(payload);
        break;
      case 'batch':
        const results = {};
        for (const [key, op] of Object.entries(payload.operations)) {
          switch (op.type) {
            case 'integrity:check': results[key] = IntegrityChecker.checkAll(op.payload); break;
            case 'integrity:repair': results[key] = IntegrityChecker.repair(op.payload); break;
            case 'checksum:calculate': results[key] = Checksum.calculate(op.payload); break;
            default: results[key] = { error: `Unbekannte Operation: ${op.type}` };
          }
        }
        result = results;
        break;
      default:
        result = { error: `Unbekannter Befehl: ${type}` };
    }

    self.postMessage({ id, success: true, result });
  } catch (error) {
    self.postMessage({ id, success: false, error: { message: error.message, stack: error.stack } });
  }
});

// Worker-Bereitschaft signalisieren
self.postMessage({ type: 'ready' });