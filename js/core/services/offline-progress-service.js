import { IdleService } from './idle-service.js';
import { CONFIG } from '../../data/config.js';

/**
 * PURE FUNCTION: Berechnet den Offline-Fortschritt
 * @param {Object} state - Der aktuelle Redux-ähnliche Spiel-State
 * @param {number} offlineMs - Die vergangene Zeit in Millisekunden
 * @returns {Object} { simulatedMembers, totalParticles, totalRelics, totalArtifacts, totalLevels, offlineMneme }
 */
export function calculateOfflineProgress(state, offlineMs) {
  const clampedOffline = Math.min(offlineMs, 12 * 60 * 60 * 1000);
  
  // Offline-Fortschritt berechnen
  const offlineHours = clampedOffline / (3600 * 1000);
  const exponentialScale = Math.pow(1.02, offlineHours); // Exponentieller Skalierungsfaktor für Offline-Ertrag
  const prestigeBonus = state.hero?.prestige?.level * 2 || 0;
  const libraryBonus = (state.library?.upgrades?.clan_boost || 0) * 0.05;
  const talentBonus = ((state.hero?.talents?.allocatedNodeIds || []).length * 1.5) / 100;
  const tickRateMs = 10000; // CONFIG.CLAN.TICK_RATE_MS ist 10000 (10 Sekunden)
  const expPerCycle = 1; // CONFIG.CLAN.EXP_PER_CYCLE ist 1
  
  let totalParticles = 0;
  let totalRelics = 0;
  let totalArtifacts = 0;
  let totalLevels = 0;
  
  const simulatedMembers = [];
  const members = state.clan?.members || [];
  const expeditionStatus = state.clan?.expeditionStatus || {};
  
  for (const member of members) {
    // Wenn das Mitglied auf einer Expedition ist, produziert es keine Ressourcen offline
    if (expeditionStatus[member.id] === true) {
      simulatedMembers.push({ ...member });
      continue;
    }
    
    let memberProgress = member.progress || 0;
    let memberLevel = member.level || 1;
    let memberExp = member.experience || 0;
    let memberExpToNext = member.expToNextLevel || 50;
    const baseRate = member.baseCollectRate || 1.0;
    
    let remainingTime = clampedOffline;
    
    while (remainingTime > 0) {
      let rate = baseRate * Math.pow(1.05, memberLevel - 1) * exponentialScale;
      rate *= (1 + prestigeBonus / 100);
      rate *= (1 + libraryBonus + talentBonus);
      
      if (rate <= 0) break;
      
      // msNeeded = verbleibender Fortschritt bis 100 * tickRateMs / (rate * 100)
      const msNeeded = ((100 - memberProgress) * tickRateMs) / (rate * 100);
      
      if (remainingTime >= msNeeded) {
        remainingTime -= msNeeded;
        memberProgress = 0;
        
        const role = member.role;
        if (role === 'collector') {
          totalParticles += 1;
        } else if (role === 'weaver') {
          if (Math.random() < 0.1) {
            totalRelics += 1;
          } else {
            totalParticles += 2;
          }
        } else if (role === 'guardian') {
          if (Math.random() < 0.05) {
            totalArtifacts += 1;
          } else {
            totalParticles += 3;
          }
        } else if (role === 'archivist') {
          if (Math.random() < 0.15) {
            totalRelics += 1;
          } else {
            totalParticles += 4;
          }
        } else if (role === 'elder') {
          const rand = Math.random();
          if (rand < 0.1) {
            totalArtifacts += 1;
          } else if (rand < 0.3) {
            totalRelics += 1;
          } else {
            totalParticles += 6;
          }
        }
        
        memberExp += expPerCycle;
        while (memberExp >= memberExpToNext) {
          memberExp -= memberExpToNext;
          memberLevel++;
          totalLevels++;
          memberExpToNext = Math.floor(memberExpToNext * 1.15);
        }
      } else {
        const progressGain = (rate * remainingTime) / tickRateMs * 100;
        memberProgress = Math.min(100, memberProgress + progressGain);
        remainingTime = 0;
      }
    }
    
    simulatedMembers.push({
      ...member,
      level: memberLevel,
      experience: memberExp,
      progress: memberProgress,
      expToNextLevel: memberExpToNext
    });
  }
  
  // Idle Generator Offline Progress (Mneme-Fragmente)
  let offlineMneme = 0;
  const gen = state.idleGenerators?.gedankenArchiv;
  if (gen && gen.level > 0) {
    const ewigeMneme = Number(state.resources?.ewigeMneme || '0');
    const prestigeMult = 1.0 + (ewigeMneme * 0.10);
    const upgradeBonus = gen.upgrades?.focusBonus || 0;
    const yieldPerSec = IdleService.calculateYieldPerSecond(gen.baseYield, gen.level, upgradeBonus, prestigeMult);
    
    // We pass 1 as lastTimestamp and offlineMs + 1 as currentTimestamp to simulate the elapsed time
    // This keeps the function pure while satisfying the math service's requirement that lastTimestamp > 0.
    const idleOffline = IdleService.calculateOfflineProgress(1, offlineMs + 1, yieldPerSec, CONFIG.SYSTEM.MAX_OFFLINE_MS / 1000);
    offlineMneme = idleOffline.totalYield;
  }

  return {
    simulatedMembers,
    totalParticles,
    totalRelics,
    totalArtifacts,
    totalLevels,
    offlineMneme
  };
}
