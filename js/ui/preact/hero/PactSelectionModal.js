import { h, html } from '../setup.js';
import { useItemDisplay } from './useItemDisplay.js';

export function PactSelectionModal({ isOpen, pactChoices, onSelectPact, onClose, lang }) {
  const { getLocText } = useItemDisplay(lang);

  if (!isOpen) return null;

  return html`
    <div class="modal-overlay fade-in active" style="z-index: 12000; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);">
      <div class="glass-panel" style="max-width: 850px; width: 90%; max-height: 90vh; overflow-y: auto; padding: 2rem; border-color: var(--color-gold); background: rgba(10, 8, 5, 0.9); box-shadow: 0 0 40px rgba(212, 175, 55, 0.15); border-radius: 8px; position: relative;">
        
        <h2 class="glow-text text-center text-gold cinzel" style="font-size: 1.8rem; letter-spacing: 2px; margin-bottom: 0.5rem; text-shadow: 0 0 10px rgba(212, 175, 55, 0.4); text-transform: uppercase;">${lang === 'de' ? '🌀 Finstre Pakte der Verewigung 🌀' : '🌀 Dark Pacts of Eternalization 🌀'}</h2>
        <p class="subtitle text-center" style="color: #ccc; font-size: 0.88rem; line-height: 1.4; max-width: 650px; margin: 0 auto 2rem auto; font-family: var(--font-header);">
          ${lang === 'de'
            ? 'Du stehst an den Grenzen des Archivs des Vergessens. Um den Kreislauf neu zu beginnen und deine Stufe zu erhöhen, musst du einen der drei angebotenen finsteren Pakte schließen. Wähle mit Bedacht – die Entscheidung ist bis zur nächsten Verewigung unumkehrbar.'
            : 'You stand at the threshold of the Archive of the Forgotten. To begin the cycle anew and raise your level, you must seal one of the three dark pacts offered. Choose wisely – this decision is irreversible until the next eternalization.'
          }
        </p>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.2rem; margin-bottom: 1.5rem;">
          ${pactChoices.map(pact => html`
            <div class="glass-panel text-center" 
                 style="display: flex; flex-direction: column; justify-content: space-between; padding: 1.2rem; border-color: rgba(212, 175, 55, 0.15); background: rgba(255, 255, 255, 0.01); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 4px 15px rgba(0,0,0,0.3); border-radius: 6px; cursor: pointer; position: relative; overflow: hidden;"
                 onMouseEnter=${(e) => {
                   e.currentTarget.style.borderColor = 'var(--color-gold)';
                   e.currentTarget.style.boxShadow = '0 0 25px rgba(212, 175, 55, 0.25)';
                   e.currentTarget.style.transform = 'translateY(-4px)';
                   e.currentTarget.style.background = 'rgba(212, 175, 55, 0.03)';
                 }}
                 onMouseLeave=${(e) => {
                   e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.15)';
                   e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
                   e.currentTarget.style.transform = 'translateY(0)';
                   e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)';
                 }}
                 onClick=${() => onSelectPact(pact.id)}>
              
              <div>
                <h3 class="text-gold cinzel" style="font-size: 1.1rem; margin-top: 0.2rem; margin-bottom: 0.8rem; font-weight: bold; letter-spacing: 1px;">${getLocText(pact, 'name')}</h3>
                <div style="width: 40px; height: 1px; background: linear-gradient(90deg, transparent, var(--color-gold), transparent); margin: 0 auto 1rem auto;"></div>
                <p style="font-size: 0.75rem; color: #aaa; line-height: 1.4; margin-bottom: 1.2rem; min-height: 3.2rem; display: flex; align-items: center; justify-content: center;">
                  „${getLocText(pact, 'desc')}“
                </p>
              </div>

              <div style="display: flex; flex-direction: column; gap: 0.8rem; background: rgba(0,0,0,0.4); padding: 0.8rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.03);">
                <!-- Segen -->
                <div>
                  <div class="text-success text-bold" style="font-size: 0.62rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; color: #2ecc71;">${lang === 'de' ? '🌌 Segen (Positiv)' : '🌌 Blessing (Positive)'}</div>
                  <div style="font-size: 0.78rem; font-weight: bold; color: #e5ffe5; line-height: 1.2;">
                    ${getLocText(pact, 'passiveText')}
                  </div>
                </div>

                <div style="height: 1px; background: rgba(255,255,255,0.05); margin: 0 auto; width: 60%;"></div>

                <!-- Fluch -->
                <div>
                  <div class="text-danger text-bold" style="font-size: 0.62rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; color: #e74c3c;">${lang === 'de' ? '💀 Fluch (Negativ)' : '💀 Curse (Negative)'}</div>
                  <div style="font-size: 0.78rem; font-weight: bold; color: #ffe5e5; line-height: 1.2;">
                    ${getLocText(pact, 'curseText')}
                  </div>
                </div>
              </div>

              <button class="glass-btn primary cinzel" style="width: 100%; margin-top: 1.2rem; padding: 0.45rem; font-size: 0.75rem; border-color: rgba(212, 175, 55, 0.3); pointer-events: none;">
                ${lang === 'de' ? 'Pakt besiegeln' : 'Seal Pact'}
              </button>
            </div>
          `)}
        </div>

        <div class="text-center" style="margin-top: 1.5rem;">
          <button class="glass-btn secondary cinzel" style="font-size: 0.75rem; padding: 0.4rem 1.2rem; border-color: rgba(255,255,255,0.15);" onClick=${onClose}>${lang === 'de' ? 'Abbrechen' : 'Cancel'}</button>
        </div>
      </div>
    </div>
  `;
}
