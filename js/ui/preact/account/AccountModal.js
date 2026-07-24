import { h, html, useState, useEffect, useCallback } from '../setup.js';

export function AccountModal({ isOpen, onClose, eventBus, services }) {
  const { authService, i18nService } = services || {};

  const t = (key) => i18nService ? i18nService.t(key) : key;

  const [currentUser, setCurrentUser] = useState(authService ? authService.getCurrentUser() : null);
  const isGuest = currentUser ? currentUser.isGuest : true;

  const [activeTab, setActiveTab] = useState('login');

  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Update user state & tabs when modal opens
  useEffect(() => {
    if (isOpen) {
      const freshUser = authService ? authService.getCurrentUser() : null;
      setCurrentUser(freshUser);
      setActiveTab(freshUser && !freshUser.isGuest ? 'profile' : 'login');
      setErrorMessage('');
      setSuccessMessage('');
      setUsername('');
      setEmail('');
      setPassword('');
    }
  }, [isOpen, authService]);

  // Subscribe to auth state changes
  useEffect(() => {
    if (eventBus) {
      const subId = eventBus.subscribe('auth:stateChanged', (data) => {
        if (data && data.user) {
          setCurrentUser(data.user);
        }
      });
      return () => eventBus.unsubscribe(subId);
    }
  }, [eventBus]);

  useEffect(() => {
    setErrorMessage('');
    setSuccessMessage('');
  }, [activeTab]);

  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    if (!authService) return;

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await authService.login(username, password);
      if (res.success) {
        setSuccessMessage(t('auth.success.login'));
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMessage(t(res.error || 'auth.error.missing_fields'));
      }
    } catch (err) {
      setErrorMessage(t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [authService, username, password, onClose, t]);

  const handleRegister = useCallback(async (e) => {
    e.preventDefault();
    if (!authService) return;

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      let res;
      if (isGuest) {
        res = await authService.convertGuestToAccount(username, email, password);
      } else {
        res = await authService.register(username, email, password);
      }

      if (res.success) {
        setSuccessMessage(t(isGuest ? 'auth.success.guestConverted' : 'auth.success.registered'));
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMessage(t(res.error || 'auth.error.missing_fields'));
      }
    } catch (err) {
      setErrorMessage(t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [authService, isGuest, username, email, password, onClose, t]);

  const handleLogout = useCallback(() => {
    if (authService) {
      authService.logout();
      setActiveTab('login');
      setSuccessMessage('Erfolgreich abgemeldet.');
    }
  }, [authService]);

  if (!isOpen) return null;

  return html`
    <div class="modal-overlay active" style="z-index: 12000; display: flex; align-items: center; justify-content: center; background: rgba(5, 5, 12, 0.9); backdrop-filter: blur(10px); pointer-events: auto;" onClick=${onClose}>
      <div class="modal-card dialog-window glass-panel" style="width: 100%; max-width: 480px; padding: 28px; border: 1px solid rgba(197, 160, 89, 0.3); border-top: 2px solid var(--color-gold); border-radius: var(--border-radius-lg); background: linear-gradient(135deg, rgba(15, 12, 20, 0.96), rgba(5, 5, 8, 0.95)); color: var(--color-text-main); box-shadow: 0 25px 60px rgba(0,0,0,0.9), 0 0 20px rgba(197, 160, 89, 0.1);" onClick=${(e) => e.stopPropagation()}>
        
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid rgba(197,160,89,0.2); padding-bottom: 12px;">
          <h2 class="glow-text text-gold cinzel" style="font-size: 1.35rem; margin: 0; display: flex; align-items: center; gap: 8px;">
            <span>🛡️</span> ${t('auth.title')}
          </h2>
          <button class="modal-close" style="position: static; font-size: 1.5rem;" onClick=${onClose}>✕</button>
        </div>

        <!-- Navigation Tabs -->
        <div class="form-tabs">
          ${!isGuest && html`
            <button class=${`form-tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick=${() => setActiveTab('profile')}>
              👤 Profil
            </button>
          `}
          <button class=${`form-tab-btn ${activeTab === 'login' ? 'active' : ''}`} onClick=${() => setActiveTab('login')}>
            🔑 ${t('auth.login')}
          </button>
          <button class=${`form-tab-btn ${activeTab === 'register' ? 'active' : ''}`} onClick=${() => setActiveTab('register')}>
            ✨ ${isGuest ? t('auth.upgradeGuest') : t('auth.register')}
          </button>
        </div>

        <!-- Error & Success Banners -->
        ${errorMessage && html`
          <div class="form-banner-error">
            <span>⚠️</span> <span>${errorMessage}</span>
          </div>
        `}
        ${successMessage && html`
          <div class="form-banner-success">
            <span>✓</span> <span>${successMessage}</span>
          </div>
        `}

        <!-- TAB: LOGIN -->
        ${activeTab === 'login' && html`
          <form onSubmit=${handleLogin} style="display: flex; flex-direction: column; gap: 14px;">
            <div>
              <label class="cinzel text-gold" style="display: block; font-size: 0.8rem; margin-bottom: 6px; letter-spacing: 0.5px;">${t('auth.username')} / ${t('auth.email')}</label>
              <input type="text" class="form-input" required value=${username} onInput=${(e) => setUsername(e.target.value)} placeholder="z. B. MnemeHüter" />
            </div>
            <div>
              <label class="cinzel text-gold" style="display: block; font-size: 0.8rem; margin-bottom: 6px; letter-spacing: 0.5px;">${t('auth.password')}</label>
              <input type="password" class="form-input" required value=${password} onInput=${(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <button type="submit" disabled=${loading} class="glass-btn primary w-100" style="margin-top: 6px; padding: 12px;">
              ${loading ? 'Anmelden...' : t('auth.login')}
            </button>
          </form>
        `}

        <!-- TAB: REGISTER -->
        ${activeTab === 'register' && html`
          <form onSubmit=${handleRegister} style="display: flex; flex-direction: column; gap: 14px;">
            <div>
              <label class="cinzel text-gold" style="display: block; font-size: 0.8rem; margin-bottom: 6px; letter-spacing: 0.5px;">${t('auth.username')}</label>
              <input type="text" class="form-input" required minlength="3" value=${username} onInput=${(e) => setUsername(e.target.value)} placeholder="Dein Spielername" />
            </div>
            <div>
              <label class="cinzel text-gold" style="display: block; font-size: 0.8rem; margin-bottom: 6px; letter-spacing: 0.5px;">${t('auth.email')}</label>
              <input type="email" class="form-input" required value=${email} onInput=${(e) => setEmail(e.target.value)} placeholder="name@beispiel.de" />
            </div>
            <div>
              <label class="cinzel text-gold" style="display: block; font-size: 0.8rem; margin-bottom: 6px; letter-spacing: 0.5px;">${t('auth.password')}</label>
              <input type="password" class="form-input" required minlength="6" value=${password} onInput=${(e) => setPassword(e.target.value)} placeholder="Mindestens 6 Zeichen" />
            </div>
            <button type="submit" disabled=${loading} class="glass-btn primary w-100" style="margin-top: 6px; padding: 12px;">
              ${loading ? 'Speichern...' : (isGuest ? t('auth.upgradeGuest') : t('auth.register'))}
            </button>
          </form>
        `}

        <!-- TAB: PROFILE -->
        ${activeTab === 'profile' && currentUser && html`
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div style="display: flex; align-items: center; gap: 14px; background: rgba(0,0,0,0.4); padding: 14px; border-radius: var(--border-radius-md); border: 1px solid rgba(197,160,89,0.2);">
              <div style="font-size: 2.5rem; background: rgba(197, 160, 89, 0.1); width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid var(--color-gold);">
                ${currentUser.avatar || '🛡️'}
              </div>
              <div>
                <div class="cinzel text-gold" style="font-size: 1.1rem; font-weight: 700;">${currentUser.username}</div>
                <div class="text-muted" style="font-size: 0.82rem;">${currentUser.email || 'Keine E-Mail hinterlegt'}</div>
                <div class="text-muted" style="font-size: 0.75rem; margin-top: 2px;">
                  ${t('auth.created')}: ${new Date(currentUser.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            <button class="glass-btn btn-danger w-100" onClick=${handleLogout} style="padding: 10px; font-size: 0.9rem;">
              🚪 ${t('auth.logout')}
            </button>
          </div>
        `}

      </div>
    </div>
  `;
}

export default AccountModal;
