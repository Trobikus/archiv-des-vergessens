import { h, html, useState, useEffect, useCallback } from '../setup.js';

export function LoginView({ eventBus, services }) {
  const { authService, i18nService } = services || {};

  const t = (key, fallback = key) => i18nService ? i18nService.t(key, fallback) : fallback;

  const [currentUser, setCurrentUser] = useState(authService ? authService.getCurrentUser() : null);
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const isLoggedIn = currentUser && !currentUser.isGuest;

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

  const handleProceedToMenu = useCallback(() => {
    if (eventBus) {
      eventBus.publish('auth:proceedToMenu');
    }
  }, [eventBus]);

  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    if (!authService) return;

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await authService.login(username, password);
      if (res.success) {
        setSuccessMessage(t('auth.success.login', 'Willkommen zurück!'));
        setTimeout(() => {
          handleProceedToMenu();
        }, 800);
      } else {
        setErrorMessage(t(res.error || 'auth.error.missing_fields', 'Fehler beim Anmelden'));
      }
    } catch (err) {
      setErrorMessage(t('common.error', 'Ein Fehler ist aufgetreten.'));
    } finally {
      setLoading(false);
    }
  }, [authService, username, password, handleProceedToMenu, t]);

  const handleRegister = useCallback(async (e) => {
    e.preventDefault();
    if (!authService) return;

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await authService.register(username, email, password);
      if (res.success) {
        setSuccessMessage(t('auth.success.registered', 'Konto erfolgreich erstellt!'));
        setTimeout(() => {
          handleProceedToMenu();
        }, 800);
      } else {
        setErrorMessage(t(res.error || 'auth.error.missing_fields', 'Fehler bei der Registrierung'));
      }
    } catch (err) {
      setErrorMessage(t('common.error', 'Ein Fehler ist aufgetreten.'));
    } finally {
      setLoading(false);
    }
  }, [authService, username, email, password, handleProceedToMenu, t]);

  const handleGuestContinue = useCallback(() => {
    handleProceedToMenu();
  }, [handleProceedToMenu]);

  const handleLogout = useCallback(() => {
    if (authService) {
      authService.logout();
      setSuccessMessage('Erfolgreich abgemeldet.');
      setCurrentUser(authService.getCurrentUser());
    }
  }, [authService]);

  const toggleLanguage = (langKey) => {
    if (eventBus) {
      eventBus.publish('options:setLanguage', { value: langKey });
    }
  };

  return html`
    <section id="login-container" class="center-layout fade-in" role="main" aria-label="Login-Portal" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; position: relative; width: 100%; z-index: 10; pointer-events: auto;">
      
      <!-- Title Header -->
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 class="glow-text" style="font-size: clamp(2rem, 4.5vw, 3.2rem); text-transform: uppercase; margin-bottom: 6px; background: linear-gradient(to bottom, #ffffff, #c5a059); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
          ${t('menu.title', 'ARCHIV DES VERGESSENS')}
        </h1>
        <p class="subtitle" style="font-size: 0.95rem; letter-spacing: 4px; color: #a78bfa; margin: 0; text-transform: uppercase;">
          🛡️ LOGIN PORTAL
        </p>
      </div>

      <!-- Main Login Card -->
      <div class="glass-panel" style="width: 100%; max-width: 440px; padding: 28px 32px; border-radius: 16px; border: 1px solid rgba(197, 160, 89, 0.35); background: rgba(12, 12, 22, 0.88); backdrop-filter: blur(12px); box-shadow: 0 25px 60px rgba(0,0,0,0.85);">
        
        ${isLoggedIn ? html`
          <!-- BEREITS ANGEMELDET -->
          <div style="display: flex; flex-direction: column; gap: 20px; text-align: center;">
            <div style="font-size: 3rem; background: rgba(167, 139, 250, 0.15); width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; border: 1px solid rgba(167, 139, 250, 0.4);">
              ${currentUser.avatar || '⚔️'}
            </div>
            <div>
              <div style="font-size: 1.3rem; font-weight: 700; color: #f8fafc;">${currentUser.username}</div>
              <div style="font-size: 0.85rem; color: #a78bfa; margin-top: 4px;">${currentUser.email || 'Hüter des Archivs'}</div>
            </div>

            <button class="glass-btn primary" onClick=${handleProceedToMenu} style="padding: 14px; font-size: 1rem; font-weight: 700; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white; border: none; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 18px rgba(124, 58, 237, 0.5);">
              🚀 ${t('menu.continue', 'Weiter zum Hauptmenü')} »
            </button>

            <button onClick=${handleLogout} style="background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #fca5a5; padding: 10px; border-radius: 8px; font-size: 0.85rem; cursor: pointer;">
              🚪 ${t('auth.logout', 'Abmelden')}
            </button>
          </div>
        ` : html`
          <!-- LOGIN / REGISTRIERUNG FORM -->
          
          <!-- Tab Navigation -->
          <div style="display: flex; gap: 8px; margin-bottom: 22px; background: rgba(0,0,0,0.4); padding: 4px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);">
            <button 
              style=${`flex: 1; padding: 10px; border-radius: 7px; border: none; background: ${activeTab === 'login' ? '#7c3aed' : 'transparent'}; color: ${activeTab === 'login' ? '#fff' : '#94a3b8'}; font-weight: 600; cursor: pointer; transition: all 0.2s;`}
              onClick=${() => setActiveTab('login')}
            >
              🔑 ${t('auth.login', 'Anmelden')}
            </button>
            <button 
              style=${`flex: 1; padding: 10px; border-radius: 7px; border: none; background: ${activeTab === 'register' ? '#7c3aed' : 'transparent'}; color: ${activeTab === 'register' ? '#fff' : '#94a3b8'}; font-weight: 600; cursor: pointer; transition: all 0.2s;`}
              onClick=${() => setActiveTab('register')}
            >
              ✨ ${t('auth.register', 'Registrieren')}
            </button>
          </div>

          <!-- Banners -->
          ${errorMessage && html`
            <div style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #fca5a5; padding: 10px 14px; border-radius: 8px; font-size: 0.85rem; margin-bottom: 16px;">
              ⚠️ ${errorMessage}
            </div>
          `}
          ${successMessage && html`
            <div style="background: rgba(34, 197, 94, 0.2); border: 1px solid #22c55e; color: #86efac; padding: 10px 14px; border-radius: 8px; font-size: 0.85rem; margin-bottom: 16px;">
              ✓ ${successMessage}
            </div>
          `}

          <!-- LOGIN FORM -->
          ${activeTab === 'login' && html`
            <form onSubmit=${handleLogin} style="display: flex; flex-direction: column; gap: 14px;">
              <div>
                <label style="display: block; font-size: 0.82rem; color: #94a3b8; margin-bottom: 5px;">${t('auth.username', 'Benutzername')} / ${t('auth.email', 'E-Mail')}</label>
                <input type="text" required value=${username} onInput=${(e) => setUsername(e.target.value)} style=${inputStyle} placeholder="z. B. MnemeHüter" />
              </div>
              <div>
                <label style="display: block; font-size: 0.82rem; color: #94a3b8; margin-bottom: 5px;">${t('auth.password', 'Passwort')}</label>
                <input type="password" required value=${password} onInput=${(e) => setPassword(e.target.value)} style=${inputStyle} placeholder="••••••••" />
              </div>

              <button type="submit" disabled=${loading} style=${primaryButtonStyle}>
                ${loading ? 'Anmelden...' : `🔑 ${t('auth.login', 'Anmelden')}`}
              </button>
            </form>
          `}

          <!-- REGISTER FORM -->
          ${activeTab === 'register' && html`
            <form onSubmit=${handleRegister} style="display: flex; flex-direction: column; gap: 14px;">
              <div>
                <label style="display: block; font-size: 0.82rem; color: #94a3b8; margin-bottom: 5px;">${t('auth.username', 'Benutzername')}</label>
                <input type="text" required minlength="3" value=${username} onInput=${(e) => setUsername(e.target.value)} style=${inputStyle} placeholder="Dein Spielername" />
              </div>
              <div>
                <label style="display: block; font-size: 0.82rem; color: #94a3b8; margin-bottom: 5px;">${t('auth.email', 'E-Mail-Adresse')}</label>
                <input type="email" required value=${email} onInput=${(e) => setEmail(e.target.value)} style=${inputStyle} placeholder="name@beispiel.de" />
              </div>
              <div>
                <label style="display: block; font-size: 0.82rem; color: #94a3b8; margin-bottom: 5px;">${t('auth.password', 'Passwort')}</label>
                <input type="password" required minlength="6" value=${password} onInput=${(e) => setPassword(e.target.value)} style=${inputStyle} placeholder="Mindestens 6 Zeichen" />
              </div>

              <button type="submit" disabled=${loading} style=${primaryButtonStyle}>
                ${loading ? 'Erstelle Konto...' : `✨ ${t('auth.register', 'Konto erstellen')}`}
              </button>
            </form>
          `}

          <!-- DIVIDER -->
          <div style="display: flex; align-items: center; margin: 20px 0 16px 0;">
            <div style="flex: 1; border-bottom: 1px solid rgba(255,255,255,0.1);"></div>
            <span style="padding: 0 10px; font-size: 0.75rem; color: #64748b; text-transform: uppercase;">ODER</span>
            <div style="flex: 1; border-bottom: 1px solid rgba(255,255,255,0.1);"></div>
          </div>

          <!-- GUEST MODE BUTTON -->
          <button type="button" onClick=${handleGuestContinue} style=${guestButtonStyle}>
            🛡️ ${t('auth.guest', 'Als Gast fortfahren')}
          </button>
        `}
      </div>

      <!-- Footer Language Selector & Info -->
      <div style="margin-top: 24px; display: flex; align-items: center; gap: 16px; font-size: 0.8rem; color: #64748b;">
        <button onClick=${() => toggleLanguage('de')} style=${langBtnStyle(i18nService?.getLanguage() === 'de')}>🇩🇪 Deutsch</button>
        <span>|</span>
        <button onClick=${() => toggleLanguage('en')} style=${langBtnStyle(i18nService?.getLanguage() === 'en')}>🇬🇧 English</button>
      </div>

    </section>
  `;
}

const inputStyle = `
  width: 100%;
  padding: 11px 14px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(0, 0, 0, 0.4);
  color: #f8fafc;
  font-size: 0.92rem;
  outline: none;
  box-sizing: border-box;
`;

const primaryButtonStyle = `
  margin-top: 6px;
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(124, 58, 237, 0.45);
  transition: all 0.2s ease;
`;

const guestButtonStyle = `
  width: 100%;
  padding: 11px;
  border-radius: 8px;
  border: 1px solid rgba(234, 179, 8, 0.4);
  background: rgba(234, 179, 8, 0.08);
  color: #fef08a;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
`;

const langBtnStyle = (isActive) => `
  background: transparent;
  border: none;
  color: ${isActive ? '#c5a059' : '#64748b'};
  font-weight: ${isActive ? '700' : '400'};
  cursor: pointer;
  font-size: 0.8rem;
`;

export default LoginView;
