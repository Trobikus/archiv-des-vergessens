// ============================================================
// FILE: core/security.js – Sanitizer, Checksum, IntegrityChecker (mit Worker-Support)
// ============================================================

import { clamp } from '../utils/sanitizer.js';

// ---- Checksum (wird nun hauptsächlich über Worker ausgeführt) ----
export class Checksum {
    /**
     * Berechnet eine Prüfsumme (synchroner Fallback).
     * Für Produktion wird der Worker bevorzugt.
     */
    static calculate(data) {
        // Diese Methode wird nur als Fallback verwendet
        const json = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < json.length; i++) {
            const char = json.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }
}

// ---- IntegrityChecker (wird nun hauptsächlich über Worker ausgeführt) ----
export class IntegrityChecker {
    /**
     * Führt eine vollständige Integritätsprüfung durch (synchrone Version).
     * Für Produktion wird der Worker bevorzugt.
     */
    static checkAll(context) {
        const errors = [];
        if (context.hero) {
            const hero = context.hero;
            if (hero.level < 1 || hero.level > 9999) {
                errors.push({ component: 'hero', field: 'level', value: hero.level });
            }
            if (hero.bossProgress < 0 || hero.bossProgress > 200) {
                errors.push({ component: 'hero', field: 'bossProgress', value: hero.bossProgress });
            }
            if (hero.prestigeLevel < 0 || hero.prestigeLevel > 999) {
                errors.push({ component: 'hero', field: 'prestigeLevel', value: hero.prestigeLevel });
            }
            const expectedPoints = (hero.level - 1) * 3;
            const totalSpent = hero.spentStats.attack + hero.spentStats.defense +
                               hero.spentStats.agility + hero.spentStats.stamina;
            const total = hero.unspentStatPoints + totalSpent;
            if (Math.abs(total - expectedPoints) > 5) {
                errors.push({ component: 'hero', field: 'statPoints', expected: expectedPoints, actual: total });
            }
        }
        if (context.resourceManager) {
            const res = context.resourceManager.getResources();
            if (res.particles < 0 || res.particles > 1e15) {
                errors.push({ component: 'resources', field: 'particles', value: res.particles });
            }
            if (res.relics < 0 || res.relics > 1e9) {
                errors.push({ component: 'resources', field: 'relics', value: res.relics });
            }
            if (res.artifacts < 0 || res.artifacts > 1e9) {
                errors.push({ component: 'resources', field: 'artifacts', value: res.artifacts });
            }
        }
        return errors;
    }

    /**
     * Repariert gefundene Inkonsistenzen (synchrone Version).
     */
    static repair(context) {
        const errors = this.checkAll(context);
        if (errors.length === 0) return [];

        const repairs = [];
        for (const err of errors) {
            switch (err.component) {
                case 'hero':
                    if (err.field === 'level') {
                        context.hero.level = clamp(err.value, 1, 9999);
                        repairs.push('level korrigiert');
                    }
                    if (err.field === 'bossProgress') {
                        context.hero.bossProgress = clamp(err.value, 0, 200);
                        repairs.push('bossProgress korrigiert');
                    }
                    if (err.field === 'prestigeLevel') {
                        context.hero.prestigeLevel = clamp(err.value, 0, 999);
                        repairs.push('prestigeLevel korrigiert');
                    }
                    if (err.field === 'statPoints') {
                        const expected = (context.hero.level - 1) * 3;
                        context.hero.unspentStatPoints = Math.max(0, expected - (context.hero.spentStats.attack + context.hero.spentStats.defense + context.hero.spentStats.agility + context.hero.spentStats.stamina));
                        repairs.push('statPoints korrigiert');
                    }
                    break;
                case 'resources':
                    if (err.field === 'particles') {
                        context.resourceManager.particles = clamp(err.value, 0, 1e15);
                        repairs.push('particles korrigiert');
                    }
                    if (err.field === 'relics') {
                        context.resourceManager.relics = clamp(err.value, 0, 1e9);
                        repairs.push('relics korrigiert');
                    }
                    break;
                default:
                    break;
            }
        }
        return repairs;
    }
}