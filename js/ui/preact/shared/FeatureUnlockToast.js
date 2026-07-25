import { h, html, useState, useEffect, useEventBus, useStateSelector } from '../setup.js';
import { selectDominantPath } from '../../../core/state/selectors.js';

export function FeatureUnlockToast({ eventBus, stateManager, lang = 'de' }) {
  const [unlock, setUnlock] = useState(null);

  const dominantPath = useStateSelector(stateManager, (state) => {
    const p = selectDominantPath(state);
    if (p === 'aethel') return 'guardian';
    if (p === 'lethe') return 'shadow';
    return 'lone';
  });

  useEventBus(eventBus, 'ui:showFeatureUnlock', (data) => {
    setUnlock(data);
    // Auto-hide after 5 seconds as per CSS animation duration
    setTimeout(() => setUnlock(null), 5000);
  });

  if (!unlock) return null;

  const pathClass = dominantPath ? `path-${dominantPath}` : 'path-neutral';

  return html`
    <div class="feature-unlock-toast ${pathClass}">
      <div class="unlock-icon" aria-hidden="true">${unlock.icon || '✨'}</div>
      <h3 class="cinzel">${unlock.title}</h3>
      <p>${unlock.description}</p>
    </div>
  `;
}
