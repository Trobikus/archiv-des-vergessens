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
    <div class="modal-overlay active" style="z-index: 12000; display: flex; align-items: center; justify-content: center; background: rgba(5, 5, 12, 0.88); backdrop-filter: blur(10px); pointer-events: auto;" onClick=${onClose}>
      <div class="modal-card dialog-window glass-panel" style="width: 100%; max-width: 480px; padding: 28px; border: 1px solid rgba(147, 112, 219, 0.4); border-radius: 16px; background: linear-gradient(135deg, rgba(18, 18, 32, 0.98), rgba(10, 10, 20, 0.99)); color: #e2e8f0; box-shadow: 0 20px 50px rgba(0,0,0,0.8);" onClick=${(e) => e.stopPropagation()}>
        
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px;">
          <h2 style="font-size: 1.4rem; font-weight: 700; color: #a78bfa; margin: 0; display: flex; align-items: center; gap: 8px;">
            <span>🛡️</span> ${t('auth.title')}
          </h2>
          <button style="background: transparent; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer;" onClick=${onClose}>✕</button>
        </div>

        <!-- Navigation Tabs -->
        <div style="display: flex; gap: 8px; margin-bottom: 20px; background: rgba(255,255,255,0.05); padding: 4px; border-radius: 8px;">
          ${!isGuest && html`
            <button class=${`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} style=${tabStyle(activeTab === 'profile')} onClick=${() => setActiveTab('profile')}>
              👤 Profil
            </button>
          `}
          <button class=${`tab-btn ${activeTab === 'login' ? 'active' : ''}`} style=${tabStyle(activeTab === 'login')} onClick=${() => setActiveTab('login')}>
            🔑 ${t('auth.login')}
          </button>
          <button class=${`tab-btn ${activeTab === 'register' ? 'active' : ''}`} style=${tabStyle(activeTab === 'register')} onClick=${() => setActiveTab('register')}>
            ✨ ${isGuest ? t('auth.upgradeGuest') : t('auth.register')}
          </button>
        </div>

        <!-- Error & Success Banners -->
        ${errorMessage && html`
          <div style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #fca5a5; padding: 10px 14px; border-radius: 8px; font-size: 0.88rem; margin-bottom: 16px;">
            ⚠️ ${errorMessage}
          </div>
        `}
        ${successMessage && html`
          <div style="background: rgba(34, 197, 94, 0.2); border: 1px solid #22c55e; color: #86efac; padding: 10px 14px; border-radius: 8px; font-size: 0.88rem; margin-bottom: 16px;">
            ✓ ${successMessage}
          </div>
        `}

        <!-- TAB: LOGIN -->
        ${activeTab === 'login' && html`
          <form onSubmit=${handleLogin} style="display: flex; flex-direction: column; gap: 14px;">
            <div>
              <label style="display: block; font-size: 0.82rem; color: #94a3b8; margin-bottom: 4px;">${t('auth.username')} / ${t('auth.email')}</label>
              <input type="text" required value=${username} onInput=${(e) => setUsername(e.target.value)} style=${inputStyle} placeholder="z. B. MnemeHüter" />
            </div>
            <div>
              <label style="display: block; font-size: 0.82rem; color: #94a3b8; margin-bottom: 4px;">${t('auth.password')}</label>
              <input type="password" required value=${password} onInput=${(e) => setPassword(e.target.value)} style=${inputStyle} placeholder="••••••••" />
            </div>
            <button type="submit" disabled=${loading} style=${submitButtonStyle}>
              ${loading ? 'Anmelden...' : t('auth.login')}
            </button>
          </form>
        `}

        <!-- TAB: REGISTER -->
        ${activeTab === 'register' && html`
          <form onSubmit=${handleRegister} style="display: flex; flex-direction: column; gap: 14px;">
            <div>
              <label style="display: block; font-size: 0.82rem; color: #94a3b8; margin-bottom: 4px;">${t('auth.username')}</label>
              <input type="text" required minlength="3" value=${username} onInput=${(e) => setUsername(e.target.value)} style=${inputStyle} placeholder="Dein Spielername" />
            </div>
            <div>
              <label style="display: block; font-size: 0.82rem; color: #94a3b8; margin-bottom: 4px;">${t('auth.email')}</label>
              <input type="email" required value=${email} onInput=${(e) => setEmail(e.target.value)} style=${inputStyle} placeholder="name@beispiel.de" />
            </div>
            <div>
              <label style="display: block; font-size: 0.82rem; color: #94a3b8; margin-bottom: 4px;">${t('auth.password')}</label>
              <input type="password" required minlength="6" value=${password} onInput=${(e) => setPassword(e.target.value)} style=${inputStyle} placeholder="Mindestens 6 Zeichen" />
            </div>
            <button type="submit" disabled=${loading} style=${submitButtonStyle}>
              ${loading ? 'Speichern...' : (isGuest ? t('auth.upgradeGuest') : t('auth.register'))}
            </button>
          </form>
        `}

        <!-- TAB: PROFILE -->
        ${activeTab === 'profile' && currentUser && html`
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div style="display: flex; align-items: center; gap: 14px; background: rgba(255,255,255,0.03); padding: 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06);">
              <div style="font-size: 2.5rem; background: rgba(167, 139, 250, 0.2); width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                ${currentUser.avatar || '🛡️'}
              </div>
              <div>
                <div style="font-size: 1.1rem; font-weight: 700; color: #f1f5f9;">${currentUser.username}</div>
                <div style="font-size: 0.82rem; color: #a78bfa;">${currentUser.email || 'Keine E-Mail hinterlegt'}</div>
                <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">
                  ${t('auth.created')}: ${new Date(currentUser.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            <button onClick=${handleLogout} style="background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #fca5a5; padding: 10px; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
              🚪 ${t('auth.logout')}
            </button>
          </div>
        `}

      </div>
    </div>
  `;
}

const tabStyle = (isActive) => `
  flex: 1;
  padding: 8px 12px;
  border-radius: 6px;
  border: none;
  background: ${isActive ? '#7c3aed' : 'transparent'};
  color: ${isActive ? '#ffffff' : '#94a3b8'};
  font-weight: ${isActive ? '600' : '400'};
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
`;

const inputStyle = `
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(0, 0, 0, 0.3);
  color: #f8fafc;
  font-size: 0.9rem;
  outline: none;
  box-sizing: border-box;
`;

const submitButtonStyle = `
  margin-top: 8px;
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4);
  transition: all 0.2s ease;
`;
