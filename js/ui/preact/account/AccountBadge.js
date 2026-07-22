import { h, html, useState, useEffect } from '../setup.js';

export function AccountBadge({ eventBus, services, onClick }) {
  const { authService, i18nService } = services || {};

  const [user, setUser] = useState(authService ? authService.getCurrentUser() : null);

  useEffect(() => {
    if (eventBus) {
      const subId = eventBus.subscribe('auth:stateChanged', (data) => {
        if (data && data.user) setUser(data.user);
      });
      return () => eventBus.unsubscribe(subId);
    }
  }, [eventBus]);

  if (!user) return null;

  const isGuest = user.isGuest;
  const username = user.username || (isGuest ? 'Gast-Hüter' : 'Hüter');

  return html`
    <div 
      class="account-badge glass-panel interactive" 
      onClick=${onClick}
      style="
        display: inline-flex; 
        align-items: center; 
        gap: 8px; 
        padding: 6px 14px; 
        border-radius: 20px; 
        background: rgba(18, 18, 32, 0.85); 
        border: 1px solid ${isGuest ? 'rgba(234, 179, 8, 0.5)' : 'rgba(167, 139, 250, 0.5)'}; 
        color: #f1f5f9; 
        font-size: 0.85rem; 
        font-weight: 600; 
        cursor: pointer; 
        user-select: none;
        pointer-events: auto;
        position: relative;
        z-index: 100;
        transition: all 0.2s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      "
      title=${isGuest ? 'Gast-Modus – Klicken zum Anmelden / Registrieren' : `Angemeldet als ${username}`}
    >
      <span style="font-size: 1.05rem;">${user.avatar || (isGuest ? '🔮' : '🛡️')}</span>
      <span style="max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${username}</span>
      ${isGuest && html`
        <span style="font-size: 0.7rem; background: rgba(234, 179, 8, 0.25); color: #fef08a; padding: 2px 7px; border-radius: 10px; border: 1px solid rgba(234, 179, 8, 0.6); font-weight: 700;">
          🔑 Anmelden
        </span>
      `}
    </div>
  `;
}
