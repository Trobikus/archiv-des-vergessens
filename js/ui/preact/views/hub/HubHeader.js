import { h, html } from '../../setup.js';
import { AccountBadge } from '../../account/AccountBadge.js';

export function HubHeader({ eventBus, services, hero, guildId, prestigeLevel, lang, t }) {
  return html`
    <header id="hub-header" class="glass-panel">
      <div class="hub-header-left">
        <div class="hub-title-group">
          <span class="hub-icon" aria-hidden="true">🏛️</span>
          <div>
            <h2 class="hub-title glow-text">${t('menu.title')}</h2>
            <p class="hub-subtitle">${t('menu.subtitle')}</p>
          </div>
        </div>
      </div>
      <div class="hub-header-right" style="display: flex; align-items: center; gap: 12px;">
        <${AccountBadge} eventBus=${eventBus} services=${services} onClick=${() => eventBus.publish('ui:openAccountModal')} />
        <div class="hub-player-card">
          <div class="hub-avatar" aria-hidden="true">
            <span class="avatar-icon">⚔️</span>
            <div class="avatar-ring-rotating"></div>
          </div>
          <div class="hub-player-info">
            <div id="hub-hero-name" class="hub-player-name">${hero?.name || t('hub.hero')}</div>
            <div class="hub-player-stats">
              <span>${t('hero.level')} <span id="hub-level">${hero?.level || 1}</span></span>
              <span class="hub-stat-divider" aria-hidden="true">·</span>
              <span>${t('hero.prestige', 'Prestige')} <span id="hub-prestige">${prestigeLevel}</span></span>
              ${guildId ? html`<span class="hub-stat-divider" aria-hidden="true">·</span><span id="hub-guild-badge" aria-hidden="true">🏛️</span>` : null}
            </div>
            <!-- Premium XP Progress Bar -->
            <div class="hub-xp-container" title="${lang === 'de' ? 'Erfahrungspunkte' : 'Experience'}: ${hero?.experience || 0} / ${hero?.expToNext || 50} (${Math.min(100, Math.floor(((hero?.experience || 0) / (hero?.expToNext || 50)) * 100))}%)">
              <div class="hub-xp-bar-track">
                <div class="hub-xp-bar-fill" style="width: ${Math.min(100, Math.floor(((hero?.experience || 0) / (hero?.expToNext || 50)) * 100))}%;"></div>
              </div>
              <div class="hub-xp-bar-label">${hero?.experience || 0} / ${hero?.expToNext || 50} XP</div>
            </div>
          </div>
          <div class="hub-player-level">
            <div class="hub-level-ring-container">
              <div class="hub-level-ring-aura"></div>
              <div class="hub-level-ring">
                <span id="hub-level-number">${hero?.level || 1}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  `;
}
