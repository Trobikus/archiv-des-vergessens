// ============================================================
// FILE: js/ui/preact/combat/FloatingDamageOverlay.js – Floating Combat Numbers
// ============================================================
import { h, html, useState, useEffect } from '../setup.js';

export function FloatingDamageOverlay({ eventBus }) {
  const [numbers, setNumbers] = useState([]);

  useEffect(() => {
    if (!eventBus) return;

    const unsubscribe = eventBus.subscribe('combat:floating-text', (data) => {
      if (!data) return;

      const id = Date.now() + Math.random();
      const x = 50 + (Math.random() * 20 - 10); // Center % + jitter
      const y = 40 + (Math.random() * 15 - 7.5);

      const newNumber = {
        id,
        value: data.damage,
        isCrit: data.isCrit,
        type: data.type || 'physical',
        x,
        y
      };

      setNumbers(prev => [...prev.slice(-15), newNumber]);

      // Auto-prune after 1 second animation duration
      setTimeout(() => {
        setNumbers(prev => prev.filter(n => n.id !== id));
      }, 950);
    });

    return () => unsubscribe();
  }, [eventBus]);

  return html`
    <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; overflow: hidden; z-index: 899;">
      ${numbers.map(n => {
        let color = n.type === 'heal' ? '#40ff80' : n.type === 'mneme' ? '#aa00ff' : n.isCrit ? '#ffaa00' : '#ffffff';
        let fontSize = n.isCrit ? '1.8rem' : '1.2rem';
        let textShadow = n.isCrit ? '0 0 10px #ff0000, 0 0 20px #ffaa00' : '0 0 6px rgba(0,0,0,0.8)';

        return html`
          <div
            key=${n.id}
            style="position: absolute; left: ${n.x}%; top: ${n.y}%; color: ${color}; font-size: ${fontSize}; font-weight: bold; text-shadow: ${textShadow}; pointer-events: none; animation: floatUpFade 1s ease-out forwards; z-index: 900;"
          >
            ${n.type === 'heal' ? `+${n.value}` : n.type === 'mneme' ? `+${n.value} ✨` : n.isCrit ? `💥 ${n.value}!` : n.value}
          </div>
        `;
      })}
    </div>
  `;
}
