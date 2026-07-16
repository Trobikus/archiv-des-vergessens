// --- START OF FILE audio/AudioManager.js ---

export default class AudioManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.ctx = null;
        this.enabled = true;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.ambientInterval = null;
        this.isInitialized = false;

        // Zustand
        this.musicVolume = 0.4;
        this.sfxVolume = 0.6;
        this.isMuted = false;

        // Synthetische Sound-Designs
        this.sounds = {
            // UI
            click: { type: 'click', freq: 800, duration: 0.05 },
            hover: { type: 'click', freq: 600, duration: 0.03 },
            confirm: { type: 'click', freq: 1000, duration: 0.08 },
            cancel: { type: 'click', freq: 400, duration: 0.1 },

            // Ressourcen
            gather: { type: 'sparkle', freq: 1200, duration: 0.15 },
            levelUp: { type: 'ascend', freq: 440, duration: 0.4 },
            prestige: { type: 'ascend', freq: 220, duration: 0.8 },

            // Kampf
            bossVictory: { type: 'fanfare', freq: 523, duration: 1.2 },
            bossDefeat: { type: 'descend', freq: 440, duration: 0.6 },
            bossHit: { type: 'impact', freq: 150, duration: 0.15 },

            // Crafting
            craft: { type: 'sparkle', freq: 900, duration: 0.2 },
            salvage: { type: 'impact', freq: 200, duration: 0.1 },

            // Expedition
            expeditionStart: { type: 'click', freq: 700, duration: 0.1 },
            expeditionComplete: { type: 'ascend', freq: 660, duration: 0.3 },

            // System
            error: { type: 'click', freq: 300, duration: 0.15 },
            notification: { type: 'click', freq: 1000, duration: 0.06 }
        };

        // Ambient-Melodien (Pentatonik)
        this.ambientMelodies = {
            menu: { notes: [523, 587, 659, 784, 880], tempo: 4000 },
            hub: { notes: [523, 587, 659, 784, 880, 988], tempo: 5000 },
            game: { notes: [440, 523, 587, 659, 784], tempo: 3000 },
            boss: { notes: [440, 523, 587, 659, 784, 880, 988], tempo: 2000 },
            victory: { notes: [523, 659, 784, 880, 988, 1175], tempo: 1500 }
        };

        // Event-Bus abonnieren
        this._bindEvents();
    }

    _bindEvents() {
        if (!this.eventBus) return;
        this.eventBus.subscribe('ui:addLog', (data) => {
            if (data.type === 'event') this.play('confirm');
            else if (data.type === 'system') this.play('notification');
        });
        this.eventBus.subscribe('hero:updated', () => { /* optional */ });
        this.eventBus.subscribe('resources:updated', () => { /* optional */ });
        this.eventBus.subscribe('story:battleResult', (data) => {
            if (data.victory) this.play('bossVictory');
            else this.play('bossDefeat');
        });
        this.eventBus.subscribe('forge:crafted', () => this.play('craft'));
        this.eventBus.subscribe('crafting:masterwork', () => this.play('craft'));
        this.eventBus.subscribe('achievement:unlocked', () => this.play('levelUp'));
        this.eventBus.subscribe('hero:prestige', () => this.play('prestige'));
        this.eventBus.subscribe('expedition:complete', () => this.play('expeditionComplete'));
        this.eventBus.subscribe('expedition:started', () => this.play('expeditionStart'));
    }

    // ---- INITIALISIERUNG ----

    init() {
        if (this.isInitialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 1;
            this.masterGain.connect(this.ctx.destination);

            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.musicGain.connect(this.masterGain);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = this.sfxVolume;
            this.sfxGain.connect(this.masterGain);

            this.isInitialized = true;
            console.log('[AudioManager] Initialisiert mit Web Audio API');
        } catch (e) {
            console.warn('[AudioManager] Web Audio nicht verfügbar:', e);
            this.isInitialized = false;
        }
    }

    // ---- SYNTHETISCHE TONE ----

    _playSyntheticSound(type, params) {
        if (!this.isInitialized || !this.enabled) return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const now = this.ctx.currentTime;

            osc.connect(gain);
            gain.connect(this.sfxGain);

            const freq = params.freq || 440;
            const duration = params.duration || 0.15;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            osc.start(now);
            osc.stop(now + duration);

            // Spezielle Effekte
            switch (type) {
                case 'ascend':
                    osc.frequency.linearRampToValueAtTime(freq * 2, now + duration);
                    break;
                case 'descend':
                    osc.frequency.linearRampToValueAtTime(freq * 0.5, now + duration);
                    break;
                case 'sparkle':
                    osc.frequency.setValueAtTime(freq * 1.5, now);
                    osc.frequency.linearRampToValueAtTime(freq * 0.8, now + duration);
                    gain.gain.setValueAtTime(0.2, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
                    break;
                case 'impact':
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(freq, now);
                    osc.frequency.exponentialRampToValueAtTime(50, now + duration);
                    gain.gain.setValueAtTime(0.4, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
                    break;
                case 'fanfare':
                    const notes = [freq, freq * 1.25, freq * 1.5, freq * 2];
                    notes.forEach((note, i) => {
                        const o = this.ctx.createOscillator();
                        const g = this.ctx.createGain();
                        const t = now + i * 0.15;
                        o.connect(g);
                        g.connect(this.sfxGain);
                        o.type = 'sine';
                        o.frequency.setValueAtTime(note, t);
                        g.gain.setValueAtTime(0.25, t);
                        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
                        o.start(t);
                        o.stop(t + 0.2);
                    });
                    break;
                default: // click
                    gain.gain.setValueAtTime(0.15, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
                    break;
            }
        } catch (e) {
            // Silent fail
        }
    }

    // ---- ÖFFENTLICHE METHODEN ----

    play(soundName, volume = 1) {
        if (!this.isInitialized || !this.enabled || this.isMuted) return;
        const sound = this.sounds[soundName];
        if (!sound) return;
        this._playSyntheticSound(sound.type, sound);
    }

    // ---- AMBIENT-MUSIK ----

    startAmbient(zone = 'hub') {
        if (!this.isInitialized || !this.enabled) return;
        this.stopAmbient();
        const melody = this.ambientMelodies[zone] || this.ambientMelodies.hub;
        let noteIndex = 0;

        this.ambientInterval = setInterval(() => {
            if (!this.enabled || this.isMuted) return;
            const note = melody.notes[noteIndex % melody.notes.length];
            const octave = Math.floor(noteIndex / melody.notes.length) % 3;
            const freq = note * (octave === 1 ? 2 : octave === 2 ? 4 : 1);

            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const now = this.ctx.currentTime;
                osc.connect(gain);
                gain.connect(this.musicGain);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now);
                gain.gain.setValueAtTime(0.06, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
                osc.start(now);
                osc.stop(now + 0.6);
                noteIndex++;
            } catch (e) { /* ignore */ }
        }, melody.tempo / 4);
    }

    stopAmbient() {
        if (this.ambientInterval) {
            clearInterval(this.ambientInterval);
            this.ambientInterval = null;
        }
    }

    // ---- VOLUMEN & MUTE ----

    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.musicGain) this.musicGain.gain.value = this.musicVolume;
    }

    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume;
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }

    // ---- SAVEGAME ----

    toJSON() {
        return {
            enabled: this.enabled,
            musicVolume: this.musicVolume,
            sfxVolume: this.sfxVolume,
            isMuted: this.isMuted
        };
    }

    fromJSON(data) {
        if (!data) return;
        this.enabled = data.enabled !== undefined ? data.enabled : true;
        this.musicVolume = data.musicVolume || 0.4;
        this.sfxVolume = data.sfxVolume || 0.6;
        this.isMuted = data.isMuted || false;
        this.setMusicVolume(this.musicVolume);
        this.setSfxVolume(this.sfxVolume);
    }
}