import { h, html, useState, useEffect } from '../setup.js';

export function MenuView({ eventBus, services }) {
  const [hasSave, setHasSave] = useState(false);
  const [lang, setLang] = useState(services?.i18nService ? services.i18nService.getLanguage() : 'de');

  useEffect(() => {
    if (services && services.saveManager) {
      services.saveManager.hasSave()
        .then(res => setHasSave(res))
        .catch(() => setHasSave(false));
    }
  }, [services]);

  useEffect(() => {
    if (eventBus) {
      const unsub = eventBus.subscribe('i18n:languageChanged', (data) => {
        setLang(data.language);
      });
      return unsub;
    }
  }, [eventBus]);

  const t = (key) => {
    if (services && services.i18nService) {
      return services.i18nService.t(key);
    }
    return key;
  };

  const handleNewGame = () => {
    eventBus.publish('menu:newGame');
  };

  const handleContinue = () => {
    eventBus.publish('menu:continue');
  };

  const handleOptions = () => {
    eventBus.publish('menu:options');
  };

  const handleQuit = () => {
    eventBus.publish('menu:quit');
  };

  return html`
    <section id="menu-container" class="center-layout fade-in" role="main" aria-label="Hauptmenü" style="display: flex;">
      <h1 class="glow-text">${t('menu.title')}</h1>
      <p class="subtitle" aria-label="Untertitel">${t('menu.subtitle')}</p>

      <nav class="menu-buttons" aria-label="Hauptmenü Navigation">
        ${!hasSave ? html`
          <button class="menu-btn primary glass-btn" id="menu-new-game" type="button" onClick=${handleNewGame}>${t('menu.newGame')}</button>
        ` : html`
          <button class="menu-btn primary glass-btn" id="menu-continue" type="button" onClick=${handleContinue}>${t('menu.continue')}</button>
        `}
        <button class="menu-btn glass-btn" id="menu-options" type="button" onClick=${handleOptions}>${t('menu.options')}</button>
        <button class="menu-btn glass-btn" id="menu-quit" type="button" onClick=${handleQuit}>${t('menu.quit')}</button>
      </nav>

      <footer class="menu-footer">${t('menu.version')}</footer>
    </section>
  `;
}

export default MenuView;
