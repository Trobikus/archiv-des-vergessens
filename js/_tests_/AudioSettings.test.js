import { describe, expect, it } from 'vitest';
import { applyAudioSettings } from '../ui/dom/audio-settings.js';

describe('audio settings', () => {
  it('applies independent music and SFX settings to managed audio elements', () => {
    const music = { dataset: { audioChannel: 'music' }, muted: false, volume: 0 };
    const sfx = { dataset: { audioChannel: 'sfx' }, muted: false, volume: 0 };
    const root = { querySelectorAll: () => [music, sfx] };

    applyAudioSettings({ music: true, volume: 0.25, sfx: false, sfxVolume: 0.8 }, root);

    expect(music.muted).toBe(false);
    expect(music.volume).toBeCloseTo(0.25);
    expect(sfx.muted).toBe(true);
    expect(sfx.volume).toBeCloseTo(0.8);
  });
});
