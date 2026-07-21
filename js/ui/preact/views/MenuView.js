import { h, html, useState, useEffect } from '../setup.js';

export function MenuView({ eventBus, services }) {
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    if (services && services.saveManager) {
      services.saveManager.hasSave()
        .then(res => setHasSave(res))
        .catch(() => setHasSave(false));
    }
  }, [services]);

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
      <h1 class="glow-text">ARCHIV DES VERGESSENS</h1>
      <p class="subtitle" aria-label="Untertitel">Der Mneme-Bund</p>

      <nav class="menu-buttons" aria-label="Hauptmenü Navigation">
        ${!hasSave ? html`
          <button class="menu-btn primary glass-btn" id="menu-new-game" type="button" onClick=${handleNewGame}>Neues Spiel</button>
        ` : html`
          <button class="menu-btn primary glass-btn" id="menu-continue" type="button" onClick=${handleContinue}>Weiter</button>
        `}
        <button class="menu-btn glass-btn" id="menu-options" type="button" onClick=${handleOptions}>Optionen</button>
        <button class="menu-btn glass-btn" id="menu-quit" type="button" onClick=${handleQuit}>Beenden</button>
      </nav>

      <footer class="menu-footer">Version 1.6 – AAA Overhaul</footer>
    </section>
  `;
}

export default MenuView;
