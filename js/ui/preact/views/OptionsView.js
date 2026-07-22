import { h, html, useStateSelector, useState, useEffect, useCallback, useMemo } from '../setup.js';

export function OptionsView({ stateManager, eventBus, services }) {
  const settings = useStateSelector(stateManager, (state) => state.settings);
  const [cloudLastSync, setCloudLastSync] = useState('Nie');
  const [cloudEnabled, setCloudEnabled] = useState(false);
  const [lang, setLang] = useState(services?.i18nService ? services.i18nService.getLanguage() : 'de');

  useEffect(() => {
    if (services && services.cloudManager) {
      setCloudEnabled(services.cloudManager.isEnabled());
      const info = services.cloudManager.getCloudInfo();
      if (info) {
        setCloudLastSync(new Date(info.timestamp).toLocaleString());
      }
    }
  }, [services]);

  useEffect(() => {
    if (eventBus) {
      const unsub = eventBus.subscribe('i18n:languageChanged', (data) => {
        setLang(data.language);
      });
      return () => eventBus.unsubscribe(unsub);
    }
  }, [eventBus]);

  const t = (key) => {
    if (services && services.i18nService) {
      return services.i18nService.t(key);
    }
    return key;
  };

  const musicVolume = useMemo(() => {
    return settings?.volume !== undefined ? Math.round(settings.volume * 100) : (settings?.music ? 40 : 0);
  }, [settings?.volume, settings?.music]);

  const sfxVolume = useMemo(() => {
    return settings?.sfxVolume !== undefined ? Math.round(settings.sfxVolume * 100) : (settings?.sfx ? 60 : 0);
  }, [settings?.sfxVolume, settings?.sfx]);

  const handleLanguageChange = useCallback((e) => {
    const val = e.target.value;
    eventBus.publish('options:setLanguage', { value: val });
  }, [eventBus]);

  const handleParticlesChange = useCallback((e) => {
    eventBus.publish('options:setParticles', { value: e.target.checked });
  }, [eventBus]);

  const handleFloatingChange = useCallback((e) => {
    eventBus.publish('options:setFloating', { value: e.target.checked });
  }, [eventBus]);

  const handleAudioToggle = useCallback(() => {
    eventBus.publish('options:toggleAudio');
  }, [eventBus]);

  const handleMusicVolumeChange = useCallback((e) => {
    eventBus.publish('options:setMusicVolume', { value: parseInt(e.target.value, 10) });
  }, [eventBus]);

  const handleSfxVolumeChange = useCallback((e) => {
    eventBus.publish('options:setSfxVolume', { value: parseInt(e.target.value, 10) });
  }, [eventBus]);

  const handleAutosaveChange = useCallback((e) => {
    eventBus.publish('options:setAutosave', { value: parseInt(e.target.value, 10) });
  }, [eventBus]);

  const handleCloudEnabledChange = useCallback((e) => {
    const val = e.target.checked;
    setCloudEnabled(val);
    eventBus.publish('options:setCloudEnabled', { value: val });
  }, [eventBus]);

  const handleCloudSync = useCallback(() => {
    eventBus.publish('options:syncCloud');
  }, [eventBus]);

  const handleHardReset = useCallback(() => {
    eventBus.publish('options:hardReset');
  }, [eventBus]);

  const handleBack = useCallback(() => {
    eventBus.publish('options:back');
  }, [eventBus]);

  return html`
    <section id="options-container" class="center-layout fade-in" style="display: flex;" role="dialog" aria-label="Einstellungen">
      <div class="glass-panel" style="padding: 2.5rem; width: 550px; max-width: 90vw; margin: auto;">
        <h2 class="glow-text text-center">${t('options.title').toUpperCase()}</h2>
        <p class="hub-subtitle text-center text-muted" style="margin-bottom: 1.5rem;">${lang === 'de' ? 'Passe das Archiv an deine Bedürfnisse an' : 'Customize the archive to your needs'}</p>
 
        <div class="options-panel mt-1" style="max-height: 55vh; overflow-y: auto; padding-right: 0.5rem;">
          <!-- Sprache -->
          <h3 class="options-header" style="margin-top: 0.5rem;">${t('options.language')}</h3>
          <div class="option-row flex-between mb-2">
            <span class="option-label text-muted">${lang === 'de' ? 'Aktive Sprache' : 'Active Language'}</span>
            <span class="option-control">
              <select id="opt-language" class="ui-select" value=${lang} onChange=${handleLanguageChange} aria-label="Sprache">
                <option value="de">${t('options.lang_de')}</option>
                <option value="en">${t('options.lang_en')}</option>
              </select>
            </span>
          </div>

          <!-- Grafik -->
          <h3 class="options-header">Grafik & UI</h3>
          <div class="option-row flex-between mb-1">
            <span class="option-label text-muted">${lang === 'de' ? 'Mystisches Netzwerk (Partikel)' : 'Mystical Network (Particles)'}</span>
            <span class="option-control">
              <input type="checkbox" id="opt-particles" checked=${settings?.particles} onChange=${handleParticlesChange} aria-label="Partikel aktivieren" />
            </span>
          </div>
          <div class="option-row flex-between mb-2">
            <span class="option-label text-muted">${lang === 'de' ? 'Floating-Text (Ressourcen)' : 'Floating-Text (Resources)'}</span>
            <span class="option-control">
              <input type="checkbox" id="opt-floating" checked=${settings?.floatingText} onChange=${handleFloatingChange} aria-label="Floating-Text aktivieren" />
            </span>
          </div>
 
          <!-- Audio -->
          <h3 class="options-header mt-1">${t('options.audio')}</h3>
          <div class="option-row flex-between mb-1">
            <span class="option-label text-muted">${lang === 'de' ? 'Musik & Soundeffekte' : 'Music & Sound Effects'}</span>
            <span class="option-control">
              <button id="opt-audio-toggle" class="glass-btn btn-small" type="button" onClick=${handleAudioToggle}>
                ${settings?.music ? `🔊 ${t('options.enabled')}` : `🔇 ${t('options.disabled')}`}
              </button>
            </span>
          </div>
          <div class="option-row flex-between mb-1">
            <span class="option-label text-muted">${lang === 'de' ? 'Musik-Lautstärke' : 'Music Volume'}</span>
            <span class="option-control">
              <input type="range" id="opt-music-volume" min="0" max="100" value=${musicVolume} style="width:120px;" onChange=${handleMusicVolumeChange} aria-label="Musik-Lautstärke" />
            </span>
          </div>
          <div class="option-row flex-between mb-2">
            <span class="option-label text-muted">${lang === 'de' ? 'Soundeffekt-Lautstärke' : 'SFX Volume'}</span>
            <span class="option-control">
              <input type="range" id="opt-sfx-volume" min="0" max="100" value=${sfxVolume} style="width:120px;" onChange=${handleSfxVolumeChange} aria-label="Soundeffekt-Lautstärke" />
            </span>
          </div>
 
          <!-- Account -->
          <h3 class="options-header mt-1">${t('auth.title')}</h3>
          <div class="option-row flex-between mb-2">
            <span class="option-label text-muted">
              ${services?.authService?.getCurrentUser()?.isGuest 
                ? (lang === 'de' ? 'Status: Gast-Konto' : 'Status: Guest Account')
                : `${t('auth.loggedInAs')}: ${services?.authService?.getCurrentUser()?.username || ''}`}
            </span>
            <span class="option-control">
              <button class="glass-btn btn-small" type="button" onClick=${() => eventBus.publish('ui:openAccountModal')}>
                🛡️ ${services?.authService?.getCurrentUser()?.isGuest ? t('auth.login') : t('auth.accountDetails')}
              </button>
            </span>
          </div>

          <!-- Cloud -->
          <h3 class="options-header mt-1">${t('options.cloudSync')}</h3>
          <div class="option-row flex-between mb-1">
            <span class="option-label text-muted">${lang === 'de' ? 'Cloud-Sync aktivieren' : 'Enable Cloud Sync'}</span>
            <span class="option-control">
              <input type="checkbox" id="opt-cloud-enabled" checked=${cloudEnabled} onChange=${handleCloudEnabledChange} aria-label="Cloud-Sync aktivieren" />
            </span>
          </div>
          <div class="option-row flex-between mb-1">
            <span class="option-label text-muted">${lang === 'de' ? 'Letzter Sync' : 'Last Sync'}</span>
            <span class="option-control text-muted text-sm" id="opt-cloud-last-sync">${cloudLastSync}</span>
          </div>
          <div class="option-row flex-between mb-2">
            <span class="option-label text-muted">${lang === 'de' ? 'Manuell synchronisieren' : 'Sync Manually'}</span>
            <span class="option-control">
              <button id="opt-cloud-sync-btn" class="glass-btn btn-small" type="button" onClick=${handleCloudSync}>☁️ ${lang === 'de' ? 'Jetzt sichern' : 'Sync Now'}</button>
            </span>
          </div>
 
          <!-- System -->
          <h3 class="options-header mt-1">System</h3>
          <div class="option-row flex-between mb-1">
            <span class="option-label text-muted">${t('options.autosave')}</span>
            <span class="option-control">
              <select id="opt-autosave" class="ui-select" value=${String(settings?.autosave)} onChange=${handleAutosaveChange} aria-label="Autosave-Intervall">
                <option value="0">${lang === 'de' ? 'Aus' : 'Off'}</option>
                <option value="15000">${lang === 'de' ? '15 Sekunden' : '15 Seconds'}</option>
                <option value="60000">${lang === 'de' ? '1 Minute' : '1 Minute'}</option>
                <option value="300000">${lang === 'de' ? '5 Minuten' : '5 Minutes'}</option>
              </select>
            </span>
          </div>
          <div class="option-row flex-between mt-2 pt-1" style="border-top: 1px solid rgba(255,255,255,0.05);">
            <span class="option-label text-danger">${t('options.deleteSave')}</span>
            <span class="option-control">
              <button id="opt-hard-reset" class="btn-danger glass-btn" type="button" onClick=${handleHardReset}>${lang === 'de' ? 'Löschen' : 'Reset'}</button>
            </span>
          </div>
        </div>
 
        <div class="text-center mt-2">
          <button class="glass-btn primary mt-1" id="options-back-btn" type="button" onClick=${handleBack}>« ${t('common.back').toUpperCase()}</button>
        </div>
      </div>
    </section>
  `;
}

export default OptionsView;
