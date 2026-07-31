import { EVENTS } from '../../core/events/definitions.js';

function clampVolume(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(1, Math.max(0, numeric)) : 0;
}

export function applyAudioSettings(settings, root = document) {
  const musicEnabled = settings?.music !== false;
  const sfxEnabled = settings?.sfx !== false;
  const musicVolume = clampVolume(settings?.volume ?? 0.7);
  const sfxVolume = clampVolume(settings?.sfxVolume ?? 0.7);

  root.querySelectorAll('audio[data-audio-channel]').forEach((node) => {
    const element = /** @type {HTMLAudioElement} */ (node);
    const isMusic = element.dataset.audioChannel === 'music';
    element.muted = isMusic ? !musicEnabled : !sfxEnabled;
    element.volume = isMusic ? musicVolume : sfxVolume;
  });
}

function playPreview({ channel, settings }) {
  const isMusic = channel === 'music';
  const enabled = isMusic ? settings?.music !== false : settings?.sfx !== false;
  const volume = clampVolume(isMusic ? settings?.volume : settings?.sfxVolume);
  if (!enabled || volume === 0 || typeof AudioContext === 'undefined') return;

  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = isMusic ? 330 : 660;
    gain.gain.setValueAtTime(Math.min(volume * 0.12, 0.12), context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.12);
    oscillator.addEventListener('ended', () => context.close());
  } catch {
    // Browser autoplay policies may prevent previews until the next direct user gesture.
  }
}

export function initAudioSettings(eventBus, settingsManager) {
  const apply = (settings) => applyAudioSettings(settings);
  apply(settingsManager.load());

  const settingsSubscription = eventBus.subscribe(EVENTS.SETTINGS_UPDATED, apply);
  const previewSubscription = eventBus.subscribe(EVENTS.AUDIO_PREVIEW, ({ channel }) => {
    playPreview({ channel, settings: settingsManager.load() });
  });

  const observer = typeof MutationObserver === 'undefined'
    ? null
    : new MutationObserver(() => apply(settingsManager.load()));
  observer?.observe(document.body, { childList: true, subtree: true });

  return {
    destroy: () => {
      eventBus.unsubscribe(settingsSubscription);
      eventBus.unsubscribe(previewSubscription);
      observer?.disconnect();
    }
  };
}
