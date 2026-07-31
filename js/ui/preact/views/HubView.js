import { h, html, useStateSelector, useState, useEffect } from '../setup.js';
import { selectDominantPath, selectTotalMnemeFragmenteBigInt } from '../../../core/state/selectors.js';
import { calculatePrestigeCurrency } from '../../../core/game/math.js';
import { EwigeMnemeSequence } from '../shared/EwigeMnemeSequence.js';

import { HubHeader } from './hub/HubHeader.js';
import { HubNavigation } from './hub/HubNavigation.js';
import { HubCategoryCore } from './hub/HubCategoryCore.js';
import { HubCategoryCrafting } from './hub/HubCategoryCrafting.js';
import { HubCategoryCollection } from './hub/HubCategoryCollection.js';
import { HubCategorySocial } from './hub/HubCategorySocial.js';
import { HubCategorySettings } from './hub/HubCategorySettings.js';
import { HubWikiModal } from './hub/HubWikiModal.js';

export function HubView({ stateManager, eventBus, services }) {
  const hero = useStateSelector(stateManager, (state) => state.hero);
  const guildId = useStateSelector(stateManager, (state) => state.guild?.id);
  const bossProgress = hero?.prestige?.bossProgress || 0;
  const prestigeLevel = hero?.prestige?.level || 0;

  const dominantPath = useStateSelector(stateManager, (state) => {
    const p = selectDominantPath(state);
    if (p === 'aethel') return 'guardian';
    if (p === 'lethe') return 'shadow';
    return 'lone';
  });

  const hubClasses = `fade-in path-${dominantPath} ${prestigeLevel > 0 ? 'prestige-amplified' : ''}`;

  const [activeCategory, setActiveCategory] = useState('core');
  const [isWikiOpen, setIsWikiOpen] = useState(false);
  const [lang, setLang] = useState(services?.i18nService ? services.i18nService.getLanguage() : 'de');
  
  const [showPrestigeSequence, setShowPrestigeSequence] = useState(false);
  const totalMneme = useStateSelector(stateManager, selectTotalMnemeFragmenteBigInt) || 0n;
  const pendingEwigeMneme = calculatePrestigeCurrency(totalMneme, 10000);

  useEffect(() => {
    if (eventBus) {
      const unsub = eventBus.subscribe('i18n:languageChanged', (data) => {
        setLang(data.language);
      });
      return () => eventBus.unsubscribe(unsub);
    }
  }, [eventBus]);

  const t = (key, fallback = key) => {
    if (services && services.i18nService) {
      return services.i18nService.t(key, fallback);
    }
    return fallback;
  };

  const handleTabClick = (category) => {
    setActiveCategory(category);
  };

  const handleAction = (eventName, data = {}) => {
    eventBus.publish(eventName, data);
  };

  const handleBackToMenu = () => {
    eventBus.publish('hub:backToMenu');
  };

  const handleEnterGame = () => {
    eventBus.publish('hub:enterGame');
  };

  const handleEwigeMnemePrestige = () => {
    if (pendingEwigeMneme <= 0 || showPrestigeSequence) return;
    // Pause Idle Loop
    eventBus.publish('game:pause');
    setShowPrestigeSequence(true);
  };

  const onPrestigeSequenceComplete = () => {
    setShowPrestigeSequence(false);
    // Resume Loop & trigger actual logic
    if (services?.idleService?.performEwigeMnemePrestige) {
      services.idleService.performEwigeMnemePrestige();
    }
    eventBus.publish('game:resume');
  };

  return html`
    <section id="hub-container" class="${hubClasses}" style="display: flex;" role="main" aria-label="Archiv-Hub">
      ${showPrestigeSequence ? html`
        <${EwigeMnemeSequence} 
          dominantPath=${dominantPath} 
          lang=${lang} 
          onComplete=${onPrestigeSequenceComplete} 
        />
      ` : null}
      
      <!-- Header -->
      <${HubHeader} 
        eventBus=${eventBus} 
        services=${services} 
        hero=${hero} 
        guildId=${guildId} 
        prestigeLevel=${prestigeLevel} 
        lang=${lang} 
        t=${t} 
      />

      <!-- Tab-Navigation -->
      <${HubNavigation} 
        activeCategory=${activeCategory} 
        handleTabClick=${handleTabClick} 
        bossProgress=${bossProgress} 
        prestigeLevel=${prestigeLevel} 
        lang=${lang} 
        t=${t} 
      />

      <!-- Hub-Inhalt -->
      <section id="hub-content">
        ${activeCategory === 'core' ? html`
          <${HubCategoryCore} 
            lang=${lang} 
            bossProgress=${bossProgress} 
            prestigeLevel=${prestigeLevel} 
            pendingEwigeMneme=${pendingEwigeMneme} 
            handleEnterGame=${handleEnterGame} 
            handleAction=${handleAction} 
            handleEwigeMnemePrestige=${handleEwigeMnemePrestige} 
          />
        ` : null}

        ${activeCategory === 'crafting' ? html`
          <${HubCategoryCrafting} 
            bossProgress=${bossProgress} 
            prestigeLevel=${prestigeLevel} 
            lang=${lang} 
            t=${t} 
            handleAction=${handleAction} 
          />
        ` : null}

        ${activeCategory === 'collection' ? html`
          <${HubCategoryCollection} 
            bossProgress=${bossProgress} 
            prestigeLevel=${prestigeLevel} 
            lang=${lang} 
            t=${t} 
            handleAction=${handleAction} 
          />
        ` : null}

        ${activeCategory === 'social' ? html`
          <${HubCategorySocial} 
            lang=${lang} 
            t=${t} 
            handleAction=${handleAction} 
          />
        ` : null}

        ${activeCategory === 'settings' ? html`
          <${HubCategorySettings} 
            lang=${lang} 
            t=${t} 
            handleAction=${handleAction} 
            setIsWikiOpen=${setIsWikiOpen} 
          />
        ` : null}
      </section>

      <!-- Hub-Footer -->
      <footer id="hub-footer">
        <button class="hub-back-btn glass-btn" id="hub-back-to-menu" onClick=${handleBackToMenu} type="button">« ${t('common.back')}</button>
        <div id="hub-notifications">
          <span id="hub-quest-indicator" style="display: none;">📋 ${lang === 'de' ? 'Mission aktiv' : 'Quest active'}</span>
        </div>
        <span class="hub-version">${t('menu.version')}</span>
      </footer>

      <!-- ARCHIV-KODEX WIKI MODAL OVERLAY -->
      <${HubWikiModal} 
        isOpen=${isWikiOpen} 
        onClose=${() => setIsWikiOpen(false)} 
        hero=${hero} 
        bossProgress=${bossProgress} 
        prestigeLevel=${prestigeLevel} 
        guildId=${guildId} 
        lang=${lang} 
      />
    </section>
  `;
}

export default HubView;
