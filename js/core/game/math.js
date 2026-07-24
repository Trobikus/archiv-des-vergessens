/**
 * ============================================================
 * FILE: core/game/math.js – Kern-Berechnungsfunktionen (Clean Code)
 * ============================================================
 * 
 * VERANTWORTUNG:
 * - Reine Berechnungsfunktionen (Pure Functions) ohne State-Seiteneffekte
 * - Industriestandard-Formeln für Incremental & Idle Games
 * - Exakte Kosten-, Ertrags-, Bulk-Kauf- und Offline-Progression-Mathematik
 * ============================================================
 */

import { sanitizeNumber } from '../../utils/sanitizer.js';

/**
 * Berechnet die Einzelkosten für eine Gebäude- oder Upgrade-Stufe.
 * Formel: Kosten = floor(BasisKosten * (Multiplikator ^ AktuellesLevel))
 * 
 * @param {number} baseCost - BasisKosten (z.B. 10)
 * @param {number} [costMultiplier=1.15] - Industriestandard: 1.15 (15% Steigerung)
 * @param {number} [currentLevel=0] - Aktuelle Stufe
 * @returns {number}
 */
export function calculateBuildingCost(baseCost, costMultiplier = 1.15, currentLevel = 0) {
  const safeBase = Math.max(0, sanitizeNumber(baseCost, 0));
  const safeMult = Math.max(1.0, sanitizeNumber(costMultiplier, 1.15));
  const safeLevel = Math.max(0, sanitizeNumber(currentLevel, 0));
  
  return Math.floor(safeBase * Math.pow(safeMult, safeLevel));
}

/**
 * Berechnet die Gesamtkosten für den Kauf mehrerer Stufen auf einmal (Bulk Purchase).
 * 
 * @param {number} baseCost - BasisKosten
 * @param {number} [costMultiplier=1.15] - Kostenmultiplikator
 * @param {number} [currentLevel=0] - Aktuelle Stufe
 * @param {number} [count=1] - Anzahl der zu kaufenden Stufen
 * @returns {number}
 */
export function calculateBulkBuildingCost(baseCost, costMultiplier = 1.15, currentLevel = 0, count = 1) {
  const safeCount = Math.max(0, Math.floor(sanitizeNumber(count, 1)));
  if (safeCount <= 0) return 0;

  let totalCost = 0;
  const startLevel = Math.max(0, Math.floor(sanitizeNumber(currentLevel, 0)));

  for (let i = 0; i < safeCount; i++) {
    const levelCost = calculateBuildingCost(baseCost, costMultiplier, startLevel + i);
    totalCost += levelCost;
    // Sicherheitsgrenze gegen Number.MAX_SAFE_INTEGER
    if (totalCost > Number.MAX_SAFE_INTEGER) {
      return Number.MAX_SAFE_INTEGER;
    }
  }

  return totalCost;
}

/**
 * Berechnet die maximale Anzahl an Stufen, die mit den verfügbaren Ressourcen gekauft werden können.
 * 
 * @param {number} baseCost - BasisKosten
 * @param {number} [costMultiplier=1.15] - Kostenmultiplikator
 * @param {number} [currentLevel=0] - Aktuelle Stufe
 * @param {number|BigInt} availableResources - Verfügbare Ressourcen
 * @returns {{ count: number, totalCost: number }}
 */
export function calculateMaxAffordableLevel(baseCost, costMultiplier = 1.15, currentLevel = 0, availableResources = 0) {
  let resources = 0;
  if (typeof availableResources === 'bigint') {
    resources = availableResources > BigInt(Number.MAX_SAFE_INTEGER)
      ? Number.MAX_SAFE_INTEGER
      : Number(availableResources);
  } else {
    resources = Math.max(0, sanitizeNumber(availableResources, 0));
  }

  const startLevel = Math.max(0, Math.floor(sanitizeNumber(currentLevel, 0)));
  let count = 0;
  let totalCost = 0;

  while (true) {
    const nextCost = calculateBuildingCost(baseCost, costMultiplier, startLevel + count);
    if (totalCost + nextCost > resources || nextCost <= 0) {
      break;
    }
    totalCost += nextCost;
    count++;
    // Schutz gegen Endlosschleife bei extrem hohen Werten
    if (count >= 10000) break;
  }

  return { count, totalCost };
}

/**
 * Berechnet den Ertrag pro Sekunde.
 * Formel: ErtragProSekunde = BasisErtrag * Level * (1 + Summe(UpgradeBonusse)) * PrestigeMultiplikator
 * 
 * @param {number} baseYield - Basisertrag pro Level
 * @param {number} level - Aktuelle Stufe
 * @param {number} [upgradeBonusesSum=0] - Summe relativer Boni (z.B. 0.5 für +50%)
 * @param {number} [prestigeMultiplier=1.0] - Prestige-Multiplikator (z.B. 1.10)
 * @returns {number}
 */
export function calculateYieldPerSecond(baseYield, level, upgradeBonusesSum = 0, prestigeMultiplier = 1.0) {
  const safeBase = Math.max(0, sanitizeNumber(baseYield, 0));
  const safeLevel = Math.max(0, sanitizeNumber(level, 0));
  const safeBonus = Math.max(0, sanitizeNumber(upgradeBonusesSum, 0));
  const safePrestige = Math.max(1.0, sanitizeNumber(prestigeMultiplier, 1.0));

  return safeBase * safeLevel * (1 + safeBonus) * safePrestige;
}

/**
 * Berechnet die Offline-Progression basierend auf vergangener Zeit.
 * 
 * @param {number} lastTimestamp - Zeitstempel des letzten Speicherns/Aktivität (in ms)
 * @param {number} currentTimestamp - Aktueller Zeitstempel (in ms)
 * @param {number} yieldPerSecond - Ertrag pro Sekunde
 * @param {number} [maxOfflineSeconds=43200] - Maximale Anrechenbare Offline-Zeit in Sekunden (Standard: 12 Std)
 * @returns {{ elapsedSeconds: number, clampedSeconds: number, totalYield: number }}
 */
export function calculateOfflineProgress(lastTimestamp, currentTimestamp, yieldPerSecond, maxOfflineSeconds = 43200) {
  const last = sanitizeNumber(lastTimestamp, 0);
  const now = sanitizeNumber(currentTimestamp, 0);
  const safeYield = Math.max(0, sanitizeNumber(yieldPerSecond, 0));
  const maxSec = Math.max(0, sanitizeNumber(maxOfflineSeconds, 43200));

  if (now <= last || last <= 0) {
    return { elapsedSeconds: 0, clampedSeconds: 0, totalYield: 0 };
  }

  const elapsedSeconds = Math.floor((now - last) / 1000);
  const clampedSeconds = Math.min(elapsedSeconds, maxSec);
  const totalYield = Math.floor(clampedSeconds * safeYield);

  return { elapsedSeconds, clampedSeconds, totalYield };
}

/**
 * Berechnet die verdiente Prestige-Währung bei einem Reset.
 * Formel: PrestigeWährung = floor(Wurzel(GesamtRessourcen / Schwellenwert))
 * 
 * @param {number|BigInt} totalResources - Gesammelte Gesamt-Ressourcen
 * @param {number} [threshold=1000] - Mindestschwellenwert
 * @returns {number}
 */
export function calculatePrestigeCurrency(totalResources, threshold = 1000) {
  let numResources = 0;
  if (typeof totalResources === 'bigint') {
    numResources = totalResources > BigInt(Number.MAX_SAFE_INTEGER)
      ? Number.MAX_SAFE_INTEGER
      : Number(totalResources);
  } else {
    numResources = sanitizeNumber(totalResources, 0);
  }

  const safeThreshold = sanitizeNumber(threshold, 1000);

  if (numResources < safeThreshold || safeThreshold <= 0) {
    return 0;
  }

  return Math.floor(Math.sqrt(numResources / safeThreshold));
}

export default {
  calculateBuildingCost,
  calculateBulkBuildingCost,
  calculateMaxAffordableLevel,
  calculateYieldPerSecond,
  calculateOfflineProgress,
  calculatePrestigeCurrency
};
