// ============================================================
// FILE: js/ui/relicHuntUI.js – Relikt-Jagd
// ============================================================
import { EVENTS } from '../core/events.js';
import BaseModalUI from './basemodal.js';
import { formatNumber } from '../utils/format.js';

export default class RelicHuntUI extends BaseModalUI {
    constructor(context) {
        super('relic-hunt-overlay', 'relic-hunt-close');
        this.eventBus = context.eventBus;
        this.relicHuntManager = context.relicHuntManager;
        this.hero = context.hero;
        this.resourceManager = context.resourceManager;

        this.startBtn = document.getElementById('relic-hunt-start-btn');
        this.chanceDisplay = document.getElementById('relic-hunt-chance');
        this.powerDisplay = document.getElementById('relic-hunt-power');
        this.resultDisplay = document.getElementById('relic-hunt-result');
        this.cooldownContainer = document.getElementById('relic-hunt-cooldown');
        this.cooldownText = document.getElementById('relic-hunt-cooldown-text');
        this.cooldownFill = document.getElementById('relic-hunt-cooldown-fill');

        this._cooldownUpdateScheduled = false;

        if (this.startBtn) {
            this.startBtn.addEventListener('click', () => this._performHunt());
        }

        this.eventBus.subscribe(EVENTS.UI_OPEN_RELICHUNT, () => this.open());
        this.eventBus.subscribe(EVENTS.HERO_UPDATED, () => this._scheduleStatsUpdate());
        this.eventBus.subscribe(EVENTS.RESOURCES_UPDATED, () => this._scheduleStatsUpdate());
        this.eventBus.subscribe(EVENTS.RELICHUNT_COOLDOWN, () => this._startCooldownUI());
        this.eventBus.subscribe(EVENTS.RELICHUNT_READY, () => this._endCooldownUI());
        this.eventBus.subscribe(EVENTS.GAME_RENDER_TICK, () => this._updateCooldownBarIfNeeded());
    }

    _scheduleStatsUpdate() {
        if (this.isOpen) this._updateStats();
    }

    onOpen() {
        if (this.resultDisplay) this.resultDisplay.textContent = '';
        this._updateStats();

        const status = this.relicHuntManager.updateCooldown();
        if (status && !status.ready) {
            this._startCooldownUI();
            this._updateCooldownBar();
        } else {
            this._endCooldownUI();
        }
    }

    _updateStats() {
        const chance = 0.4 + this.hero.level * 0.02 + this.hero.getTotalPower() * 0.001 + this.hero.getPrestigeBonusPercent('relicChance') / 100;
        const clampedChance = Math.min(0.95, Math.max(0.05, chance));
        if (this.chanceDisplay) this.chanceDisplay.textContent = Math.round(clampedChance * 100) + '%';
        if (this.powerDisplay) this.powerDisplay.textContent = this.hero.getTotalPower();
    }

    _performHunt() {
        const result = this.relicHuntManager.performHunt();
        if (result.success === false && result.message !== 'Warte noch...') {
            if (this.resultDisplay) {
                this.resultDisplay.innerHTML = `<div class="relic-result-error">❌ ${result.message}</div>`;
            }
            return;
        }

        if (this.resultDisplay) {
            if (result.success) {
                this.resultDisplay.innerHTML = `
                    <div class="relic-result-success">
                        <span class="text-success glow-text">✦ ${result.message} ✦</span>
                    </div>
                `;
            } else if (result.message && result.message !== 'Warte noch...') {
                this.resultDisplay.innerHTML = `
                    <div class="relic-result-error">❌ ${result.message}</div>
                `;
            }
        }
    }

    _startCooldownUI() {
        if (this.cooldownContainer) {
            this.cooldownContainer.style.display = 'block';
            this.cooldownContainer.className = 'relic-cooldown-panel glass-inner-panel';
        }
        if (this.startBtn) {
            this.startBtn.disabled = true;
            this.startBtn.textContent = '⏳ WARTEN...';
            this.startBtn.classList.remove('epic-pulse');
        }
    }

    _updateCooldownBarIfNeeded() {
        if (!this.isOpen) return;
        const status = this.relicHuntManager.updateCooldown();
        if (!status || status.ready) {
            if (this.cooldownContainer && this.cooldownContainer.style.display !== 'none') {
                this._endCooldownUI();
            }
            return;
        }
        const progress = ((status.total - status.remaining) / status.total) * 100;
        if (this.cooldownFill) this.cooldownFill.style.width = Math.min(100, Math.max(0, progress)) + '%';
        if (this.cooldownText) this.cooldownText.textContent = `⏳ Wartezeit: ${Math.ceil(status.remaining / 1000)}s`;
    }

    _updateCooldownBar() {
        // Wird von _updateCooldownBarIfNeeded abgedeckt
    }

    _endCooldownUI() {
        if (this.cooldownContainer) this.cooldownContainer.style.display = 'none';
        if (this.startBtn) {
            this.startBtn.disabled = false;
            this.startBtn.textContent = '🔮 SUCHE STARTEN';
            this.startBtn.classList.add('epic-pulse');
        }
        this._updateStats();
    }
}