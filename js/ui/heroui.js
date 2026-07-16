// --- START OF FILE ui/heroui.js ---

import { EVENTS } from '../core/events.js';
import { formatNumber } from '../utils/format.js';
import BaseModalUI from './basemodal.js';

function formatAchievementState(achievement) {
  return `${achievement.progress}/${achievement.target} ${achievement.unlocked ? '✅' : ''}`.trim();
}

export default class HeroUI extends BaseModalUI {
  constructor(context) {
    super('hero-overlay', 'hero-close');
    this.eventBus = context.eventBus;
    this.hero = context.hero;
    this.resourceManager = context.resourceManager;
    this.clanManager = context.clanManager;
    this.achievementManager = context.achievementManager;
    this.dailyRewardManager = context.dailyRewardManager;
    this.challengeManager = context.challengeManager;

    this._activeTab = 'resources';
    this._filterBound = false;

    this.heroName = document.getElementById('hero-name');
    this.heroLevel = document.getElementById('hero-level');
    this.heroExp = document.getElementById('hero-exp');
    this.heroStats = document.getElementById('hero-stats');
    this.heroStatPoints = document.getElementById('hero-stat-points');
    this.prestigeButton = document.getElementById('hero-prestige-btn');
    this.dailyButton = document.getElementById('hero-daily-btn');

    this.nodeWeapon = document.getElementById('node-weapon');
    this.nodeArmor = document.getElementById('node-armor');
    this.nodeAmulet = document.getElementById('node-amulet');
    this.nodeRing = document.getElementById('node-ring');
    this.nodeRing2 = document.getElementById('node-ring2');

    this.tabResources = document.getElementById('hero-tab-resources');
    this.tabEquipment = document.getElementById('hero-tab-equipment');
    this.tabLoot = document.getElementById('hero-tab-loot');
    this.bulkActionsContainer = document.getElementById('hero-bulk-actions');

    this.tabContents = {
      resources: document.getElementById('hero-inventory-resources'),
      equipment: document.getElementById('hero-inventory-equipment'),
      loot: document.getElementById('hero-inventory-loot')
    };

    this.tooltipEl = document.getElementById('custom-tooltip');
    this._bindTooltipEvents = this._bindTooltipEvents.bind(this);

    this.prestigeButton.addEventListener('click', () => {
      const result = this.hero.performPrestigeReset(this.resourceManager, this.clanManager);
      if (!result.success) {
        this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: result.message, type: 'system' });
      }
      this.render();
    });

    this.dailyButton.addEventListener('click', () => {
      if (!this.dailyRewardManager) return;
      const result = this.dailyRewardManager.claimDailyReward();
      if (!result.success) {
        this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: result.message, type: 'system' });
      }
      this.render();
    });

    this.tabResources.addEventListener('click', () => this._switchTab('resources'));
    this.tabEquipment.addEventListener('click', () => this._switchTab('equipment'));
    this.tabLoot.addEventListener('click', () => this._switchTab('loot'));

    this.eventBus.subscribe(EVENTS.UI_OPEN_HERO, () => this.open());
    this.eventBus.subscribe(EVENTS.HERO_UPDATED, () => {
      if (this.isOpen) this.render();
    });
    this.eventBus.subscribe(EVENTS.RESOURCES_UPDATED, () => {
      if (this.isOpen && this._activeTab === 'resources') {
        this._renderResourcesTab();
      }
    });
  }

  onOpen() {
    requestAnimationFrame(() => {
      this._switchTab(this._activeTab);
      this.render();
    });
  }

  onClose() {
    this._hideTooltip();
  }

  // --- TOOLTIP LOGIK ---
  _showTooltip(item, e) {
    if (!item || !this.tooltipEl) return;

    let html = `<div class="tooltip-title" style="color: ${item.getColor()}">${item.name} (Lv. ${item.level})</div>`;
    html += `<div class="tooltip-desc">${item.getRarityLabel()} ${item.slot.charAt(0).toUpperCase() + item.slot.slice(1)}</div>`;

    const statLabels = { attack: 'Stärke', defense: 'Zähigkeit', agility: 'Geschick', stamina: 'Vitalität' };
    for (const [key, val] of Object.entries(item.stats)) {
      if (val > 0) {
        html += `<div class="tooltip-stat"><span>${statLabels[key] || key}:</span> <span class="text-highlight">+${formatNumber(val)}</span></div>`;
      }
    }

    if (item.setName) {
      html += `<div class="tooltip-stat mt-1" style="color: #9a9acd;">Set: ${item.setName}</div>`;
    }

    this.tooltipEl.innerHTML = html;
    this.tooltipEl.style.display = 'block';
    this._updateTooltipPos(e);
  }

  _updateTooltipPos(e) {
    if (!this.tooltipEl || this.tooltipEl.style.display === 'none') return;

    const rect = this.tooltipEl.getBoundingClientRect();
    let left = e.clientX + 15;
    let top = e.clientY + 15;

    if (left + rect.width > window.innerWidth) {
      left = e.clientX - rect.width - 15;
    }
    if (top + rect.height > window.innerHeight) {
      top = e.clientY - rect.height - 15;
    }

    this.tooltipEl.style.left = `${left}px`;
    this.tooltipEl.style.top = `${top}px`;
  }

  _hideTooltip() {
    if (this.tooltipEl) this.tooltipEl.style.display = 'none';
  }

  _bindTooltipEvents(element, item) {
    element.addEventListener('mouseenter', (e) => this._showTooltip(item, e));
    element.addEventListener('mousemove', (e) => this._updateTooltipPos(e));
    element.addEventListener('mouseleave', () => this._hideTooltip());
  }

  render(previewItem = null) {
    if (!this.hero || !this.isOpen) return;
    const progress = this.hero.getLevelProgress();
    this.heroName.textContent = this.hero.name;
    this.heroLevel.textContent = `Stufe ${this.hero.level}`;
    this.heroExp.textContent = `Erfahrung: ${formatNumber(this.hero.experience)} / ${formatNumber(this.hero.expToNext)} (${Math.floor(progress)}%)`;

    this._renderStats(previewItem);
    this._renderPrestigeSection();
    this._renderAvatarNodes();

    if (this._activeTab === 'resources') this._renderResourcesTab();
    else if (this._activeTab === 'equipment') this._renderEquipmentTab();
    else if (this._activeTab === 'loot') this._renderLootTab();
  }

  _renderPrestigeSection() {
    const unlocked = this.hero.bossProgress >= 20;
    this.prestigeButton.style.display = unlocked ? 'inline-block' : 'none';
    if (this.dailyRewardManager) {
      const state = this.dailyRewardManager.getState();
      this.dailyButton.textContent = state.canClaimToday ? 'Tägliche Belohnung' : 'Heute schon erhalten';
    }
    this.prestigeButton.textContent = `Verewigen (${this.hero.prestigeLevel + 1})`;
  }

  _renderStats(previewItem) {
    const curAttr = this.hero.getStats();
    const curCStats = this.hero.getCombatStats();
    let simAttr = curAttr;
    let simCStats = curCStats;

    if (previewItem) {
      const oldItem = this.hero.equipment[previewItem.slot];
      this.hero.equipment[previewItem.slot] = previewItem;
      simAttr = this.hero.getStats();
      simCStats = this.hero.getCombatStats();
      this.hero.equipment[previewItem.slot] = oldItem;
    }

    // --- GOLDENER BALKEN FÜR STATPUNKTE (als Hintergrund des Containers) ---
    if (this.heroStatPoints) {
      if (this.hero.unspentStatPoints > 0) {
        // Setze den Hintergrund und die Umrandung auf den Container
        this.heroStatPoints.style.background = 'rgba(212, 175, 55, 0.08)';
        this.heroStatPoints.style.border = '1px solid var(--color-gold)';
        this.heroStatPoints.style.borderRadius = 'var(--border-radius-sm)';
        this.heroStatPoints.style.padding = '0.5rem';
        this.heroStatPoints.style.textAlign = 'center';
        this.heroStatPoints.style.fontFamily = 'var(--font-header)';
        this.heroStatPoints.innerHTML = `
          <span class="text-gold glow-text text-bold" style="font-size: 1.1rem;">
            ✨ ${this.hero.unspentStatPoints} PUNKTE VERFÜGBAR ✨
          </span>
        `;
      } else {
        // Container zurücksetzen
        this.heroStatPoints.style.background = '';
        this.heroStatPoints.style.border = '';
        this.heroStatPoints.style.borderRadius = '';
        this.heroStatPoints.style.padding = '';
        this.heroStatPoints.style.textAlign = '';
        this.heroStatPoints.style.fontFamily = '';
        this.heroStatPoints.innerHTML = '';
      }
    }

    // --- ATTRIBUTS-LISTE (im scrollbaren Container) ---
    let html = '';

    const attrConfig = [
      { key: 'attack', label: '⚔️ Stärke' },
      { key: 'defense', label: '🛡️ Zähigkeit' },
      { key: 'agility', label: '⚡ Geschick' },
      { key: 'stamina', label: '❤️ Vitalität' }
    ];

    for (const s of attrConfig) {
      const curVal = curAttr[s.key] || 0;
      const simVal = simAttr[s.key] || 0;
      let diffHtml = '';

      if (previewItem && simVal !== curVal) {
        const diff = simVal - curVal;
        diffHtml = `<span class="${diff > 0 ? 'stat-diff-pos' : 'stat-diff-neg'}">(${diff > 0 ? '+' : ''}${formatNumber(diff)})</span>`;
      }

      const btnHtml = this.hero.unspentStatPoints > 0
        ? `<button class="btn-stat-add" data-stat="${s.key}">+</button>`
        : '';

      html += `<div class="stat-row glass-inner-panel flex-between mb-1" style="padding: 0.5rem 0.8rem; margin-bottom: 0.5rem;">
                  <span><span class="text-muted">${s.label}:</span> <span class="text-highlight text-bold" style="font-size: 1.05rem;">${formatNumber(simVal)}</span> ${diffHtml}</span>
                  ${btnHtml}
               </div>`;
    }

    html += `<div class="border-t-light pt-1 mt-1 mb-1"></div>`;

    const combatConfig = [
      { key: 'maxHp', label: 'Max Leben', format: (v) => formatNumber(v) },
      { key: 'damageReduction', label: 'Schadensreduktion', format: (v) => (v * 100).toFixed(1) + '%' },
      { key: 'critChance', label: 'Krit-Chance', format: (v) => v.toFixed(1) + '%' },
      { key: 'critDamage', label: 'Krit-Schaden', format: (v) => v.toFixed(1) + '%' },
      { key: 'dodgeChance', label: 'Ausweichen', format: (v) => v.toFixed(1) + '%' }
    ];

    for (const s of combatConfig) {
      const curVal = curCStats[s.key] || 0;
      const simVal = simCStats[s.key] || 0;
      let diffHtml = '';

      if (previewItem && simVal !== curVal) {
        const diff = simVal - curVal;
        diffHtml = `<span class="${diff > 0 ? 'stat-diff-pos' : 'stat-diff-neg'}">(${diff > 0 ? '+' : ''}${s.format(diff)})</span>`;
      }
      html += `<div class="flex-between mb-1 py-1" style="border-bottom: 1px solid rgba(255,255,255,0.02); padding: 0.2rem 0.5rem;">
                 <span class="text-muted">${s.label}</span>
                 <span class="text-bold text-highlight">${s.format(curVal)} ${diffHtml}</span>
               </div>`;
    }

    this.heroStats.innerHTML = html;

    this.heroStats.querySelectorAll('.btn-stat-add').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const stat = e.target.dataset.stat;
        this.hero.spendStatPoint(stat);
      });
    });
  }

  _renderAvatarNodes() {
    const slots = [
      { key: 'weapon', node: this.nodeWeapon, icon: '🗡️' },
      { key: 'armor', node: this.nodeArmor, icon: '🛡️' },
      { key: 'amulet', node: this.nodeAmulet, icon: '📿' },
      { key: 'ring', node: this.nodeRing, icon: '💍' },
      { key: 'ring2', node: this.nodeRing2, icon: '💍' }
    ];

    slots.forEach(s => {
      if (!s.node) return;

      if (s.key === 'ring2' && !this.challengeManager.completedChallenges.includes('pacifist')) {
        s.node.style.display = 'none';
        return;
      } else if (s.key === 'ring2') {
        s.node.style.display = 'flex';
      }

      const item = this.hero.getEquippedItem(s.key);
      const clone = s.node.cloneNode(true);
      s.node.parentNode.replaceChild(clone, s.node);

      if (s.key === 'weapon') this.nodeWeapon = clone;
      if (s.key === 'armor') this.nodeArmor = clone;
      if (s.key === 'amulet') this.nodeAmulet = clone;
      if (s.key === 'ring') this.nodeRing = clone;
      if (s.key === 'ring2') this.nodeRing2 = clone;

      if (item) {
        clone.classList.remove('empty');
        clone.style.borderColor = item.getColor();
        clone.style.color = item.getColor();
        clone.innerHTML = s.icon;

        this._bindTooltipEvents(clone, item);

        clone.addEventListener('click', () => {
          this.hero.unequipItem(s.key);
          this._hideTooltip();
          this.eventBus.publish(EVENTS.HERO_UPDATED);
        });
      } else {
        clone.classList.add('empty');
        clone.style.borderColor = '#3a3a4a';
        clone.style.color = '#5a5a6a';
        clone.innerHTML = s.icon;
      }
    });
  }

  _switchTab(tab) {
    this._activeTab = tab;
    [this.tabResources, this.tabEquipment, this.tabLoot].forEach(el => el.classList.remove('active'));
    if (tab === 'resources') this.tabResources.classList.add('active');
    else if (tab === 'equipment') this.tabEquipment.classList.add('active');
    else if (tab === 'loot') this.tabLoot.classList.add('active');

    this.tabContents.resources.style.display = tab === 'resources' ? 'block' : 'none';
    this.tabContents.equipment.style.display = tab === 'equipment' ? 'block' : 'none';
    this.tabContents.loot.style.display = tab === 'loot' ? 'block' : 'none';

    this.bulkActionsContainer.style.display = (tab === 'equipment' || tab === 'loot') ? 'flex' : 'none';

    if (tab === 'resources') this._renderResourcesTab();
    else if (tab === 'equipment') this._renderEquipmentTab();
    else if (tab === 'loot') this._renderLootTab();
  }

  _renderResourcesTab() {
    const container = this.tabContents.resources;
    const res = this.resourceManager.getResources();
    const prestigeItems = this.hero.getUnlockedPrestigeItems().map(item => item.name).join(', ');
    const achievementsHtml = this.achievementManager ? this.achievementManager.getAchievements().slice(0, 3).map(a => `<div class="text-sm text-muted mb-1 flex-between"><span>${a.label}:</span> <span class="text-bold text-highlight">${formatAchievementState(a)}</span></div>`).join('') : '';
    const dailyState = this.dailyRewardManager ? this.dailyRewardManager.getState() : null;

    container.innerHTML = `
      <div class="glass-inner-panel mb-2">
        <h3 class="options-header cinzel text-sm" style="margin-bottom: 0.8rem;">Erinnerungsschatz</h3>
        <div class="flex-between mb-1">
          <span class="text-muted">Mneme-Partikel:</span>
          <span class="text-gold text-bold">${formatNumber(res.particles)}</span>
        </div>
        <div class="flex-between mb-1">
          <span class="text-muted">Mneme-Relikte:</span>
          <span class="text-gold text-bold">${formatNumber(res.relics)}</span>
        </div>
        <div class="flex-between mb-1">
          <span class="text-muted">Mneme-Artefakte:</span>
          <span class="text-gold text-bold">${formatNumber(res.artifacts)}</span>
        </div>
        <div class="flex-between">
          <span class="text-muted">Erinnerungsstaub:</span>
          <span class="text-dust text-bold">${formatNumber(res.memoryDust)}</span>
        </div>
      </div>

      <div class="glass-inner-panel mb-2">
        <h3 class="options-header cinzel text-sm" style="margin-bottom: 0.8rem;">Heldentum & Prestige</h3>
        <div class="flex-between mb-1">
          <span class="text-muted">Prestige-Stufe:</span>
          <span class="text-gold text-bold">Stufe ${this.hero.prestigeLevel}</span>
        </div>
        <div class="flex-between mb-1">
          <span class="text-muted">Prestige-Boni:</span>
          <span class="text-success text-sm" style="text-align: right;">
            +${this.hero.getPrestigeBonus('particleStart')} Startpartikel<br>
            +${this.hero.getPrestigeBonus('jobRate')}% Sammelrate<br>
            +${this.hero.getPrestigeBonus('relicChance')}% Reliktchance
          </span>
        </div>
        <div class="flex-between mt-1 pt-1" style="border-top: 1px solid rgba(255,255,255,0.03);">
          <span class="text-muted">Exklusive Items:</span>
          <span class="text-gold text-bold text-sm" style="max-width: 60%; text-align: right;">${prestigeItems || 'Keine'}</span>
        </div>
      </div>

      <div class="glass-inner-panel">
        <h3 class="options-header cinzel text-sm" style="margin-bottom: 0.8rem;">Statistiken & Ziele</h3>
        <div class="flex-between mb-2">
          <span class="text-muted">Besiegte Bosse:</span>
          <span class="text-highlight text-bold">${this.hero.defeatedBosses.length}</span>
        </div>
        ${achievementsHtml ? `
        <div class="border-t-light pt-2 mt-2">
          <div class="text-gold cinzel text-sm mb-1" style="letter-spacing: 0.5px;">Erfolgsfortschritt</div>
          ${achievementsHtml}
        </div>` : ''}
        ${dailyState ? `
        <div class="border-t-light pt-2 mt-2">
          <div class="text-gold cinzel text-sm mb-1" style="letter-spacing: 0.5px;">Tägliche Serie</div>
          <div class="flex-between text-sm text-muted">
            <span>Streak-Zähler:</span> 
            <span class="text-bold text-highlight">${dailyState.streak} Tage</span>
          </div>
        </div>` : ''}
      </div>
    `;
  }

  _renderEquipmentTab() {
    const container = this.tabContents.equipment;
    let items = [...this.hero.inventory.equipment];

    const filterEl = document.getElementById('inv-filter');
    const sortEl = document.getElementById('inv-sort');
    const btnWrapper = document.getElementById('bulk-btn-wrapper');

    filterEl.style.display = 'block';
    sortEl.style.display = 'block';
    btnWrapper.innerHTML = `<button class="glass-btn btn-danger btn-small" id="bulk-salvage-btn">Gewöhnliche zerlegen</button>`;

    if (!this._filterBound) {
      filterEl.addEventListener('change', () => this.render());
      sortEl.addEventListener('change', () => this.render());
      this._filterBound = true;
    }

    document.getElementById('bulk-salvage-btn').addEventListener('click', () => {
      if (confirm('Alle gewöhnlichen (grauen) Items zerlegen?')) {
        let salvaged = 0;
        let dustGained = 0;
        for (let i = this.hero.inventory.equipment.length - 1; i >= 0; i--) {
          if (this.hero.inventory.equipment[i].rarity === 'common') {
            const item = this.hero.removeEquipmentItem(i);
            dustGained += 1 * item.level;
            salvaged++;
          }
        }
        if (salvaged > 0) {
          this.resourceManager.addMemoryDust(dustGained);
          this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `${salvaged} Items verwertet. +${dustGained} Staub.`, type: 'event' });
          this.eventBus.publish(EVENTS.HERO_UPDATED);
        }
      }
    });

    if (filterEl.value !== 'all') {
      items = items.filter(i => i.slot === filterEl.value);
    }

    items.sort((a, b) => {
      if (sortEl.value === 'rarity') {
        const r = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
        if (r[b.rarity] !== r[a.rarity]) return r[b.rarity] - r[a.rarity];
        return b.level - a.level;
      } else if (sortEl.value === 'level') {
        return b.level - a.level;
      } else {
        return a.name.localeCompare(b.name);
      }
    });

    if (items.length === 0) {
      container.innerHTML = `<div class="text-disabled text-italic pt-1 text-center">Keine Ausrüstungsteile im Inventar vorhanden.</div>`;
      return;
    }

    container.replaceChildren();
    const fragment = document.createDocumentFragment();

    items.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'ui-card flex-between';
      row.style.borderLeft = `3px solid ${item.getColor()}`;
      row.style.background = 'rgba(255, 255, 255, 0.02)';
      row.style.padding = '0.8rem 1.2rem';
      row.style.marginBottom = '0.6rem';
      row.style.borderRadius = 'var(--border-radius-sm)';

      row.innerHTML = `
        <div class="item-name-span flex-1" style="color: ${item.getColor()}; cursor: help; font-weight: 600;">
          ${item.name} <span class="text-muted text-sm" style="font-weight: normal; margin-left: 5px;">Lv.${item.level}</span>
        </div>
        <div class="flex-row gap-sm">
          <button class="inv-equip-btn glass-btn btn-small" style="border-color: var(--color-blue); color: var(--color-blue);">Anlegen</button>
          <button class="inv-salvage-btn glass-btn btn-small" style="border-color: var(--color-danger); color: var(--color-danger);">Zerlegen</button>
        </div>
      `;

      this._bindTooltipEvents(row.querySelector('.item-name-span'), item);
      row.addEventListener('mouseenter', () => this._renderStats(item));
      row.addEventListener('mouseleave', () => this._renderStats(null));

      row.querySelector('.inv-equip-btn').addEventListener('click', () => {
        const removedItem = this.hero.removeEquipmentItemByRef(item);
        if (removedItem) {
          const hasPacifist = this.challengeManager.completedChallenges.includes('pacifist');
          const success = this.hero.equipItem(removedItem, null, hasPacifist);
          if (!success) this.hero.inventory.equipment.push(removedItem);
          this._hideTooltip();
          this._renderStats(null);
          this.eventBus.publish(EVENTS.HERO_UPDATED);
        }
      });

      row.querySelector('.inv-salvage-btn').addEventListener('click', () => {
        if (confirm('Gegenstand wirklich zerlegen?')) {
          this._hideTooltip();
          const removedItem = this.hero.removeEquipmentItemByRef(item);
          if (removedItem) {
            const dustAmounts = { common: 1, uncommon: 3, rare: 10, epic: 25, legendary: 100 };
            const amount = (dustAmounts[removedItem.rarity] || 1) * removedItem.level;
            this.resourceManager.addMemoryDust(amount);
            this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `${removedItem.name} zerlegt. +${amount} Staub.`, type: 'event' });
            this.eventBus.publish(EVENTS.HERO_UPDATED);
            this.eventBus.publish(EVENTS.RESOURCES_UPDATED);
          }
        }
      });

      fragment.appendChild(row);
    });
    container.appendChild(fragment);
  }

  _renderLootTab() {
    const container = this.tabContents.loot;
    const items = this.hero.inventory.loot;

    document.getElementById('inv-filter').style.display = 'none';
    document.getElementById('inv-sort').style.display = 'none';

    const btnWrapper = document.getElementById('bulk-btn-wrapper');
    btnWrapper.innerHTML = `<button class="glass-btn primary btn-small" id="bulk-sell-btn">Alles verkaufen</button>`;

    document.getElementById('bulk-sell-btn').addEventListener('click', () => {
      if (items.length === 0) return;
      let totalValue = 0;
      for (let i = items.length - 1; i >= 0; i--) {
        const val = this.hero.sellLootItem(i, this.resourceManager);
        if (val) totalValue += val;
      }
      if (totalValue > 0) {
        this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `Gesamten Loot für ${formatNumber(totalValue)} Partikel verkauft.`, type: 'event' });
        this.eventBus.publish(EVENTS.RESOURCES_UPDATED);
        this.eventBus.publish(EVENTS.HERO_UPDATED);
      }
    });

    if (items.length === 0) {
      container.innerHTML = `<div class="text-disabled text-italic pt-1 text-center">Kein Loot im Besitz.</div>`;
      return;
    }

    container.replaceChildren();
    const fragment = document.createDocumentFragment();

    items.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'ui-card flex-between';
      row.style.borderLeft = `3px solid ${item.getColor()}`;
      row.style.background = 'rgba(255, 255, 255, 0.02)';
      row.style.padding = '0.8rem 1.2rem';
      row.style.marginBottom = '0.6rem';
      row.style.borderRadius = 'var(--border-radius-sm)';

      const value = 5 + ({ common: 0, uncommon: 5, rare: 10, epic: 20, legendary: 50 }[item.rarity] || 0);

      row.innerHTML = `
        <div class="item-name-span flex-1" style="color: ${item.getColor()}; cursor: help; font-weight: 600;">
          ${item.name} <span class="text-muted text-sm" style="font-weight: normal; margin-left: 5px;">(${item.getRarityLabel()})</span>
        </div>
        <div class="flex-row gap-sm align-center">
          <span class="item-value-span text-muted text-sm" style="margin-right: 10px;">+${formatNumber(value)} Partikel</span>
          <button class="inv-sell-btn glass-btn btn-small" style="border-color: var(--color-blue); color: var(--color-blue);">Verkaufen</button>
          <button class="inv-salvage-btn glass-btn btn-small" style="border-color: var(--color-danger); color: var(--color-danger);">Zerlegen</button>
        </div>
      `;

      this._bindTooltipEvents(row.querySelector('.item-name-span'), item);

      row.querySelector('.inv-sell-btn').addEventListener('click', () => {
        const removedItem = this.hero.removeLootItemByRef(item);
        if (removedItem) {
          this.resourceManager.addParticles(value);
          this._hideTooltip();
          this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `Loot verkauft für ${formatNumber(value)} Partikel.`, type: 'event' });
          this.eventBus.publish(EVENTS.RESOURCES_UPDATED);
          this.eventBus.publish(EVENTS.HERO_UPDATED);
        }
      });

      row.querySelector('.inv-salvage-btn').addEventListener('click', () => {
        const removedItem = this.hero.removeLootItemByRef(item);
        if (removedItem) {
          const dustAmounts = { common: 1, uncommon: 3, rare: 10, epic: 25, legendary: 100 };
          const amount = (dustAmounts[removedItem.rarity] || 1) * removedItem.level;
          this.resourceManager.addMemoryDust(amount);
          this._hideTooltip();
          this.eventBus.publish(EVENTS.UI_ADD_LOG, { text: `${removedItem.name} zerlegt. +${amount} Staub.`, type: 'event' });
          this.eventBus.publish(EVENTS.RESOURCES_UPDATED);
          this.eventBus.publish(EVENTS.HERO_UPDATED);
        }
      });

      fragment.appendChild(row);
    });
    container.appendChild(fragment);
  }
}