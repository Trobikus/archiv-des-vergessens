import { h, html, useStateSelector, useState, useEffect } from '../setup.js';

export function OptionsView({ stateManager, eventBus, services }) {
  const settings = useStateSelector(stateManager, (state) => state.settings);
  const [cloudLastSync, setCloudLastSync] = useState('Nie');
  const [cloudEnabled, setCloudEnabled] = useState(false);

  useEffect(() => {
    if (services && services.cloudManager) {
      setCloudEnabled(services.cloudManager.isEnabled());
      const info = services.cloudManager.getCloudInfo();
      if (info) {
        setCloudLastSync(new Date(info.timestamp).toLocaleString());
      }
    }
  }, [services]);

  const handleParticlesChange = (e) => {
    eventBus.publish('options:setParticles', { value: e.target.checked });
  };

  const handleFloatingChange = (e) => {
    eventBus.publish('options:setFloating', { value: e.target.checked });
  };

  const handleAudioToggle = () => {
    eventBus.publish('options:toggleAudio');
  };

  const handleMusicVolumeChange = (e) => {
    eventBus.publish('options:setMusicVolume', { value: parseInt(e.target.value, 10) });
  };

  const handleSfxVolumeChange = (e) => {
    eventBus.publish('options:setSfxVolume', { value: parseInt(e.target.value, 10) });
  };

  const handleAutosaveChange = (e) => {
    eventBus.publish('options:setAutosave', { value: parseInt(e.target.value, 10) });
  };

  const handleCloudEnabledChange = (e) => {
    const val = e.target.checked;
    setCloudEnabled(val);
    eventBus.publish('options:setCloudEnabled', { value: val });
  };

  const handleCloudSync = () => {
    eventBus.publish('options:syncCloud');
  };

  const handleHardReset = () => {
    eventBus.publish('options:hardReset');
  };

  const handleBack = () => {
    eventBus.publish('options:back');
  };

  return html`
    <section id="options-container" class="center-layout fade-in" style="display: flex;" role="dialog" aria-label="Einstellungen">
      <div class="glass-panel" style="padding: 3rem; width: 550px; max-width: 90vw;">
        <h2 class="glow-text text-center">EINSTELLUNGEN</h2>
        <p class="hub-subtitle text-center">Passe das Archiv an deine Bedürfnisse an</p>

        <div class="options-panel mt-2">
          <!-- Grafik -->
          <h3 class="options-header">Grafik & UI</h3>
          <div class="option-row flex-between mb-1">
            <span class="option-label text-muted">Mystisches Netzwerk (Partikel)</span>
            <span class="option-control">
              <input type="checkbox" id="opt-particles" checked=${settings?.particles} onChange=${handleParticlesChange} aria-label="Partikel aktivieren" />
            </span>
          </div>
          <div class="option-row flex-between mb-2">
            <span class="option-label text-muted">Floating-Text (Ressourcen)</span>
            <span class="option-control">
              <input type="checkbox" id="opt-floating" checked=${settings?.floatingText} onChange=${handleFloatingChange} aria-label="Floating-Text aktivieren" />
            </span>
          </div>

          <!-- Audio -->
          <h3 class="options-header mt-2">Audio</h3>
          <div class="option-row flex-between mb-1">
            <span class="option-label text-muted">Musik & Soundeffekte</span>
            <span class="option-control">
              <button id="opt-audio-toggle" class="glass-btn btn-small" type="button" onClick=${handleAudioToggle}>
                ${settings?.music ? '🔊 Aktiv' : '🔇 Stumm'}
              </button>
            </span>
          </div>
          <div class="option-row flex-between mb-1">
            <span class="option-label text-muted">Musik-Lautstärke</span>
            <span class="option-control">
              <input type="range" id="opt-music-volume" min="0" max="100" value=${settings?.volume !== undefined ? Math.round(settings.volume * 100) : (settings?.music ? 40 : 0)} style="width:120px;" onChange=${handleMusicVolumeChange} aria-label="Musik-Lautstärke" />
            </span>
          </div>
          <div class="option-row flex-between mb-2">
            <span class="option-label text-muted">Soundeffekt-Lautstärke</span>
            <span class="option-control">
              <input type="range" id="opt-sfx-volume" min="0" max="100" value=${settings?.sfxVolume !== undefined ? Math.round(settings.sfxVolume * 100) : (settings?.sfx ? 60 : 0)} style="width:120px;" onChange=${handleSfxVolumeChange} aria-label="Soundeffekt-Lautstärke" />
            </span>
          </div>

          <!-- Cloud -->
          <h3 class="options-header mt-2">Cloud & Synchronisation</h3>
          <div class="option-row flex-between mb-1">
            <span class="option-label text-muted">Cloud-Sync aktivieren</span>
            <span class="option-control">
              <input type="checkbox" id="opt-cloud-enabled" checked=${cloudEnabled} onChange=${handleCloudEnabledChange} aria-label="Cloud-Sync aktivieren" />
            </span>
          </div>
          <div class="option-row flex-between mb-1">
            <span class="option-label text-muted">Letzter Sync</span>
            <span class="option-control text-muted text-sm" id="opt-cloud-last-sync">${cloudLastSync}</span>
          </div>
          <div class="option-row flex-between mb-2">
            <span class="option-label text-muted">Manuell synchronisieren</span>
            <span class="option-control">
              <button id="opt-cloud-sync-btn" class="glass-btn btn-small" type="button" onClick=${handleCloudSync}>☁️ Jetzt sichern</button>
            </span>
          </div>

          <!-- System -->
          <h3 class="options-header mt-2">System</h3>
          <div class="option-row flex-between mb-1">
            <span class="option-label text-muted">Autosave-Intervall</span>
            <span class="option-control">
              <select id="opt-autosave" class="ui-select" value=${String(settings?.autosave)} onChange=${handleAutosaveChange} aria-label="Autosave-Intervall">
                <option value="0">Aus</option>
                <option value="15000">15 Sekunden</option>
                <option value="60000">1 Minute</option>
                <option value="300000">5 Minuten</option>
              </select>
            </span>
          </div>
          <div class="option-row flex-between mt-2 pt-1" style="border-top: 1px solid rgba(255,255,255,0.05);">
            <span class="option-label text-danger">Spielstand verwerfen</span>
            <span class="option-control">
              <button id="opt-hard-reset" class="btn-danger glass-btn" type="button" onClick=${handleHardReset}>Löschen</button>
            </span>
          </div>
        </div>

        <div class="text-center mt-2">
          <button class="glass-btn primary mt-1" id="options-back-btn" type="button" onClick=${handleBack}>« Zurück zum Hauptmenü</button>
        </div>
      </div>
    </section>
  `;
}

export default OptionsView;
