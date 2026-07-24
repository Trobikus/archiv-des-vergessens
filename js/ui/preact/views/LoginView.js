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
        setSuccessMessage(t('auth.success.registered', 'Konto erfolgreich erstellt! Willkommen im Archiv.'));
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

  const handleQuit = useCallback(() => {
    if (eventBus) {
      eventBus.publish('menu:quit');
    }
  }, [eventBus]);

  const toggleLanguage = (langKey) => {
    if (eventBus) {
      eventBus.publish('options:setLanguage', { value: langKey });
    }
  };

  const currentLang = i18nService ? i18nService.getLanguage() : 'de';

  return html`
    <section id="login-container" class="center-layout fade-in" role="main" aria-label="Login-Portal" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; position: relative; width: 100%; z-index: 10; pointer-events: auto;">
      
      <!-- PORTAL DER ERINNERUNGEN: SPEZIELLER HINTERGRUND VFX -->
      <div class="login-bg-portal" aria-hidden="true">
        <div class="login-god-rays"></div>
        <div class="login-portal-core"></div>
        <div class="login-rune-ring">
          <svg viewBox="0 0 500 500" style="width: 100%; height: 100%;">
            <!-- Äußerer Runenkreis -->
            <circle cx="250" cy="250" r="230" fill="none" stroke="rgba(197,160,89,0.2)" stroke-width="1.5" stroke-dasharray="8 6" />
            <circle cx="250" cy="250" r="215" fill="none" stroke="rgba(197,160,89,0.12)" stroke-width="1" />
            
            <!-- Innere Geometrie -->
            <polygon points="250,35 436,357 64,357" fill="none" stroke="rgba(197,160,89,0.1)" stroke-width="1" />
            <polygon points="250,465 64,143 436,143" fill="none" stroke="rgba(197,160,89,0.1)" stroke-width="1" />
            <circle cx="250" cy="250" r="160" fill="none" stroke="rgba(197,160,89,0.25)" stroke-width="1" stroke-dasharray="12 12" />

            <!-- Runen-Glyphen -->
            <text x="250" y="28" text-anchor="middle" fill="rgba(197,160,89,0.6)" font-size="14" font-family="Cinzel, serif">ᚠ</text>
            <text x="440" y="98" text-anchor="middle" fill="rgba(197,160,89,0.6)" font-size="14" font-family="Cinzel, serif">ᚢ</text>
            <text x="480" y="255" text-anchor="middle" fill="rgba(197,160,89,0.6)" font-size="14" font-family="Cinzel, serif">ᚦ</text>
            <text x="430" y="415" text-anchor="middle" fill="rgba(197,160,89,0.6)" font-size="14" font-family="Cinzel, serif">ᚨ</text>
            <text x="250" y="488" text-anchor="middle" fill="rgba(197,160,89,0.6)" font-size="14" font-family="Cinzel, serif">ᚱ</text>
            <text x="70" y="415" text-anchor="middle" fill="rgba(197,160,89,0.6)" font-size="14" font-family="Cinzel, serif">ᚲ</text>
            <text x="20" y="255" text-anchor="middle" fill="rgba(197,160,89,0.6)" font-size="14" font-family="Cinzel, serif">ᚷ</text>
            <text x="60" y="98" text-anchor="middle" fill="rgba(197,160,89,0.6)" font-size="14" font-family="Cinzel, serif">ᚹ</text>
          </svg>
        </div>
      </div>

      <!-- Bottom Left Exit Button -->
      <div style="position: absolute; bottom: 24px; left: 24px; z-index: 20; pointer-events: auto;">
        <button 
          class="glass-btn btn-small" 
          onClick=${handleQuit}
          style="display: flex; align-items: center; gap: 6px; padding: 8px 14px; font-size: 0.82rem; border-color: rgba(197, 160, 89, 0.3); opacity: 0.85; transition: all var(--transition-default);"
          title=${t('menu.quit', 'Beenden')}
        >
          <span>🚪</span>
          <span class="cinzel" style="letter-spacing: 1px;">${t('menu.quit', 'Beenden')}</span>
        </button>
      </div>

      <!-- Title Header -->
      <div style="text-align: center; margin-bottom: 24px; position: relative; z-index: 10;">
        <h1 class="glow-text text-gold cinzel" style="font-size: clamp(2.2rem, 4.8vw, 3.4rem); text-transform: uppercase; margin-bottom: 6px;">
          ${t('menu.title', 'ARCHIV DES VERGESSENS')}
        </h1>
        <p class="subtitle cinzel text-gold" style="font-size: 0.95rem; letter-spacing: 5px; margin: 0; text-transform: uppercase; text-shadow: 0 0 10px var(--color-gold-glow);">
          ✦ LOGIN PORTAL ✦
        </p>
      </div>

      <!-- Main Login Card -->
      <div class="glass-panel login-card">
        
        ${isLoggedIn ? html`
          <!-- BEREITS ANGEMELDET -->
          <div style="display: flex; flex-direction: column; gap: 20px; text-align: center;">
            <div style="font-size: 3rem; background: rgba(197, 160, 89, 0.1); width: 84px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; border: 2px solid var(--color-gold); box-shadow: 0 0 18px var(--color-gold-glow);">
              ${currentUser.avatar || '⚔️'}
            </div>
            <div>
              <div class="cinzel text-gold" style="font-size: 1.35rem; font-weight: 700; letter-spacing: 1px;">${currentUser.username}</div>
              <div class="text-muted" style="font-size: 0.85rem; margin-top: 4px;">${currentUser.email || 'Hüter des Archivs'}</div>
            </div>

            <button class="glass-btn primary w-100" onClick=${handleProceedToMenu} style="padding: 13px; font-size: 0.95rem; font-weight: 700;">
              🚀 ${t('menu.continueToCharSelect', 'Weiter zur Charakterauswahl')} »
            </button>

            <button class="glass-btn btn-danger w-100" onClick=${handleLogout} style="padding: 10px; font-size: 0.85rem;">
              🚪 ${t('auth.logout', 'Abmelden')}
            </button>
          </div>
        ` : html`
          <!-- LOGIN / REGISTRIERUNG FORM -->
          
          <!-- Tab Navigation -->
          <div class="form-tabs">
            <button 
              class=${`form-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
              onClick=${() => setActiveTab('login')}
            >
              🔑 ${t('auth.login', 'Anmelden')}
            </button>
            <button 
              class=${`form-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
              onClick=${() => setActiveTab('register')}
            >
              ✨ ${t('auth.register', 'Registrieren')}
            </button>
          </div>

          <!-- Banners -->
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

          <!-- LOGIN FORM -->
          ${activeTab === 'login' && html`
            <form onSubmit=${handleLogin} style="display: flex; flex-direction: column; gap: 14px;">
              <div>
                <label class="cinzel text-gold" style="display: block; font-size: 0.8rem; margin-bottom: 6px; letter-spacing: 0.5px;">${t('auth.username', 'Benutzername')} / ${t('auth.email', 'E-Mail')}</label>
                <input type="text" class="form-input" required autoFocus autofocus value=${username} onInput=${(e) => setUsername(e.target.value)} placeholder="z. B. MnemeHüter" />
              </div>
              <div>
                <label class="cinzel text-gold" style="display: block; font-size: 0.8rem; margin-bottom: 6px; letter-spacing: 0.5px;">${t('auth.password', 'Passwort')}</label>
                <input type="password" class="form-input" required value=${password} onInput=${(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>

              <button type="submit" disabled=${loading || (authService && (authService.isAuthenticating || authService._isAuthenticating))} class="glass-btn primary w-100" style="margin-top: 6px; padding: 12px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                ${(loading || (authService && (authService.isAuthenticating || authService._isAuthenticating))) ? html`<span class="loading-spinner" style="display: inline-block; animation: spin 1s linear infinite;">⏳</span> ${t('auth.authenticating', 'Authentifizierung...')}` : `🔑 ${t('auth.login', 'Anmelden')}`}
              </button>
            </form>
          `}

          <!-- REGISTER FORM -->
          ${activeTab === 'register' && html`
            <form onSubmit=${handleRegister} style="display: flex; flex-direction: column; gap: 14px;">
              <div>
                <label class="cinzel text-gold" style="display: block; font-size: 0.8rem; margin-bottom: 6px; letter-spacing: 0.5px;">${t('auth.username', 'Benutzername')}</label>
                <input type="text" class="form-input" required autoFocus autofocus minlength="3" value=${username} onInput=${(e) => setUsername(e.target.value)} placeholder="Dein Spielername" />
              </div>
              <div>
                <label class="cinzel text-gold" style="display: block; font-size: 0.8rem; margin-bottom: 6px; letter-spacing: 0.5px;">${t('auth.email', 'E-Mail-Adresse')}</label>
                <input type="email" class="form-input" required value=${email} onInput=${(e) => setEmail(e.target.value)} placeholder="name@beispiel.de" />
              </div>
              <div>
                <label class="cinzel text-gold" style="display: block; font-size: 0.8rem; margin-bottom: 6px; letter-spacing: 0.5px;">${t('auth.password', 'Passwort')}</label>
                <input type="password" class="form-input" required minlength="6" value=${password} onInput=${(e) => setPassword(e.target.value)} placeholder="Mindestens 6 Zeichen" />
              </div>

              <button type="submit" disabled=${loading || (authService && (authService.isAuthenticating || authService._isAuthenticating))} class="glass-btn primary w-100" style="margin-top: 6px; padding: 12px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                ${(loading || (authService && (authService.isAuthenticating || authService._isAuthenticating))) ? html`<span class="loading-spinner" style="display: inline-block; animation: spin 1s linear infinite;">⏳</span> ${t('auth.registering', 'Erstelle Konto...')}` : `✨ ${t('auth.register', 'Konto erstellen')}`}
              </button>
            </form>
          `}

          <!-- DIVIDER -->
          <div class="form-divider">
            <span class="form-divider-text">✦ ODER ✦</span>
          </div>

          <!-- GUEST MODE BUTTON -->
          <button type="button" class="glass-btn w-100" onClick=${handleGuestContinue} style="border-color: rgba(197, 160, 89, 0.4); color: var(--color-gold);">
            🛡️ ${t('auth.guest', 'Als Gast fortfahren')}
          </button>
        `}
      </div>

      <!-- Footer Language Selector & Info -->
      <div style="margin-top: 24px; display: flex; align-items: center; gap: 12px; font-size: 0.8rem; position: relative; z-index: 10;">
        <button class=${`glass-btn btn-small ${currentLang === 'de' ? 'primary' : ''}`} onClick=${() => toggleLanguage('de')}>🇩🇪 Deutsch</button>
        <span class="text-gold" style="opacity: 0.4;">|</span>
        <button class=${`glass-btn btn-small ${currentLang === 'en' ? 'primary' : ''}`} onClick=${() => toggleLanguage('en')}>🇬🇧 English</button>
      </div>

    </section>
  `;
}

export default LoginView;
