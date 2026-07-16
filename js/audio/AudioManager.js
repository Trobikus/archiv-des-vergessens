// ============================================================
// FILE: audio/AudioManager.js
// ============================================================

export default class AudioManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.ctx = null;
        this.enabled = true;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.isInitialized = false;

        this.musicVolume = 0.35;
        this.sfxVolume = 0.5;
        this.isMuted = false;

        this.currentTrack = null;
        this.currentZone = 'menu';
        this.musicBuffers = {};
        this.musicSource = null;
        this.musicStartTime = 0;

        this.soundPool = new Map();
        this.poolSize = 4;

        this._bindResumeOnInteraction();
        this._bindEvents();
    }

    _bindResumeOnInteraction() {
        const resume = () => {
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => { });
            }
        };
        document.addEventListener('click', resume, { passive: true });
        document.addEventListener('touchstart', resume, { passive: true });
        document.addEventListener('keydown', resume, { passive: true });
    }

    _bindEvents() {
        if (!this.eventBus) return;

        this.eventBus.subscribe('ui:addLog', (data) => {
            if (data.type === 'event') this.play('click_positive');
            else if (data.type === 'system') this.play('click_soft');
        });

        this.eventBus.subscribe('story:battleResult', (data) => {
            if (data.victory) {
                this.play('boss_victory');
                this.playMusic('victory', true);
            } else {
                this.play('boss_defeat');
            }
        });

        this.eventBus.subscribe('forge:crafted', () => this.play('craft'));
        this.eventBus.subscribe('crafting:masterwork', () => this.play('craft_masterwork'));
        this.eventBus.subscribe('achievement:unlocked', () => this.play('achievement'));
        this.eventBus.subscribe('hero:prestige', () => this.play('prestige'));
        this.eventBus.subscribe('expedition:complete', (data) => {
            if (data.success) this.play('expedition_success');
            else this.play('expedition_fail');
        });

        this.eventBus.subscribe('game:stateChanged', (data) => {
            if (data.newState === 'running') {
                this.setZone('game');
            } else if (data.newState === 'paused') {
                this.setZone('menu');
            }
        });

        this.eventBus.subscribe('ui:enterGame', () => this.setZone('game'));
        this.eventBus.subscribe('ui:openHero', () => this.setZone('hub'));
    }

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
            console.log('[AudioManager] Web Audio API initialisiert');

            this._initSoundPool();
            this._generateFallbackSounds();
            this._loadMusic();

            return true;
        } catch (e) {
            console.warn('[AudioManager] Web Audio nicht verfügbar:', e);
            this.isInitialized = false;
            return false;
        }
    }

    _initSoundPool() {
        const soundNames = [
            'click_soft', 'click_positive', 'click_negative',
            'gather', 'gather_burst', 'level_up', 'prestige',
            'craft', 'craft_masterwork', 'salvage',
            'boss_hit', 'boss_victory', 'boss_defeat',
            'expedition_start', 'expedition_success', 'expedition_fail',
            'achievement', 'notification'
        ];

        for (let i = 0; i < soundNames.length; i++) {
            const name = soundNames[i];
            this.soundPool.set(name, new Array(this.poolSize).fill(null));
        }
    }

    _generateFallbackSounds() {
        this._generateSound('click_soft', 0.08, 400, 'sine');
        this._generateSound('click_positive', 0.06, 800, 'sine');
        this._generateSound('click_negative', 0.1, 300, 'sawtooth');
        this._generateSound('gather', 0.15, 900, 'sine');
        this._generateSound('gather_burst', 0.25, 1200, 'sine');
        this._generateSound('level_up', 0.6, 440, 'ascend');
        this._generateSound('prestige', 1.0, 220, 'fanfare');
        this._generateSound('craft', 0.2, 600, 'sine');
        this._generateSound('craft_masterwork', 0.4, 800, 'sparkle');
        this._generateSound('salvage', 0.15, 200, 'sawtooth');
        this._generateSound('boss_hit', 0.2, 120, 'impact');
        this._generateSound('boss_victory', 1.2, 523, 'fanfare');
        this._generateSound('boss_defeat', 0.8, 440, 'descend');
        this._generateSound('expedition_start', 0.1, 600, 'sine');
        this._generateSound('expedition_success', 0.3, 660, 'ascend');
        this._generateSound('expedition_fail', 0.2, 300, 'descend');
        this._generateSound('achievement', 0.5, 1000, 'sparkle');
        this._generateSound('notification', 0.08, 1000, 'sine');
    }

    _generateSound(name, duration, freq, type) {
        if (this.soundPool.has(name)) {
            const buffer = this._createSyntheticBuffer(duration, freq, type);
            if (buffer) {
                const pool = this.soundPool.get(name);
                if (pool && pool.length > 0) {
                    pool[0] = buffer;
                }
            }
        }
    }

    _createSyntheticBuffer(duration, freq, type) {
        if (!this.ctx) return null;

        const sampleRate = this.ctx.sampleRate;
        const samples = Math.floor(duration * sampleRate);
        const buffer = this.ctx.createBuffer(1, samples, sampleRate);
        const data = buffer.getChannelData(0);
        const baseFreq = freq || 440;

        for (let i = 0; i < samples; i++) {
            const t = i / sampleRate;
            let env = 0;
            let wave = 0;

            switch (type) {
                case 'sine':
                    env = Math.exp(-t * 8);
                    wave = Math.sin(2 * Math.PI * baseFreq * t);
                    break;
                case 'sawtooth':
                    env = Math.exp(-t * 6);
                    wave = 2 * ((t * baseFreq) % 1) - 1;
                    break;
                case 'ascend':
                    env = Math.exp(-t * 4);
                    wave = Math.sin(2 * Math.PI * (baseFreq * (1 + t * 1.5)) * t);
                    break;
                case 'descend':
                    env = Math.exp(-t * 5);
                    wave = Math.sin(2 * Math.PI * (baseFreq * (1 - t * 0.7)) * t);
                    break;
                case 'impact':
                    env = Math.exp(-t * 20);
                    wave = Math.random() * 2 - 1;
                    break;
                case 'sparkle':
                    env = Math.exp(-t * 6);
                    wave = Math.sin(2 * Math.PI * (baseFreq * (1 + Math.sin(t * 30) * 0.2)) * t);
                    break;
                case 'fanfare':
                    env = Math.exp(-t * 3);
                    wave = Math.sin(2 * Math.PI * baseFreq * t) + Math.sin(2 * Math.PI * baseFreq * 1.25 * t) * 0.5;
                    break;
                default:
                    env = Math.exp(-t * 6);
                    wave = Math.sin(2 * Math.PI * baseFreq * t);
            }
            data[i] = wave * env;
        }
        return buffer;
    }

    play(soundName) {
        if (!this.isInitialized || !this.enabled || this.isMuted) return;

        try {
            const pool = this.soundPool.get(soundName);
            if (!pool) return;

            let buffer = pool[0];
            if (!buffer) return;

            this._playBuffer(buffer, 0.3);
        } catch (e) {
            // Audio-Wiedergabe wirft im gesperrten Tab keine Fehler
        }
    }

    _playBuffer(buffer, volume = 0.3) {
        if (!this.ctx || !buffer) return;

        try {
            const source = this.ctx.createBufferSource();
            source.buffer = buffer;

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(volume * this.sfxVolume * (this.isMuted ? 0 : 1), this.ctx.currentTime);

            source.connect(gain);
            gain.connect(this.sfxGain);

            source.start(0);
            source.onended = () => {
                source.disconnect();
                gain.disconnect();
            };
        } catch (e) {
            // Fallback abgefangen
        }
    }

    _loadMusic() {
        this.musicBuffers = {
            menu: this._generateMusicBuffer('menu'),
            hub: this._generateMusicBuffer('hub'),
            game: this._generateMusicBuffer('game'),
            boss: this._generateMusicBuffer('boss'),
            victory: this._generateMusicBuffer('victory')
        };
    }

    _generateMusicBuffer(zone) {
        if (!this.ctx) return null;

        const duration = 15;
        const sampleRate = this.ctx.sampleRate;
        const samples = Math.floor(duration * sampleRate);
        const buffer = this.ctx.createBuffer(2, samples, sampleRate);
        const left = buffer.getChannelData(0);
        const right = buffer.getChannelData(1);

        let notes = [440, 523, 587, 659, 784];
        let tempo = 0.5;

        if (zone === 'boss') {
            notes = [110, 130, 147, 165, 220];
            tempo = 0.3;
        } else if (zone === 'hub') {
            notes = [220, 261, 293, 329, 392];
            tempo = 0.6;
        }

        for (let i = 0; i < samples; i++) {
            const t = i / sampleRate;
            let valL = 0;
            let valR = 0;

            for (let n = 0; n < notes.length; n++) {
                const note = notes[n];
                const offset = n * tempo * 0.5;
                const env = Math.exp(-((t % (tempo * 2)) / (tempo * 0.5)) * 4);
                const wave = Math.sin(2 * Math.PI * note * t + offset);
                valL += wave * env * 0.05;
                valR += wave * env * 0.05;
            }
            left[i] = valL;
            right[i] = valR;
        }
        return buffer;
    }

    setZone(zone) {
        if (this.currentZone === zone) return;
        this.currentZone = zone;
        this.playMusic(zone);
    }

    playMusic(zone, once = false) {
        if (!this.isInitialized || !this.enabled || this.isMuted) return;

        const buffer = this.musicBuffers?.[zone];
        if (!buffer) return;

        if (this.musicSource) {
            try {
                this.musicSource.stop();
                this.musicSource.disconnect();
            } catch (e) { }
            this.musicSource = null;
        }

        if (this.musicGain) {
            this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, this.ctx.currentTime);
            this.musicGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.5);
        }

        setTimeout(() => {
            try {
                const source = this.ctx.createBufferSource();
                source.buffer = buffer;

                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0, this.ctx.currentTime);
                gain.gain.linearRampToValueAtTime(this.musicVolume * (this.isMuted ? 0 : 1), this.ctx.currentTime + 0.5);

                source.connect(gain);
                gain.connect(this.musicGain);

                source.start(0);
                source.onended = () => {
                    source.disconnect();
                    gain.disconnect();
                    if (!once && this.currentZone === zone) {
                        this.playMusic(zone);
                    }
                };

                this.musicSource = source;
            } catch (e) { }
        }, 500);
    }

    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.musicGain) {
            this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
        }
    }

    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        if (this.sfxGain) {
            this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.musicGain?.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.3);
            this.sfxGain?.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.3);
        } else {
            this.musicGain?.gain.linearRampToValueAtTime(this.musicVolume, this.ctx.currentTime + 0.3);
            this.sfxGain?.gain.linearRampToValueAtTime(this.sfxVolume, this.ctx.currentTime + 0.3);
        }
        return this.isMuted;
    }

    // ============================================================
    // PHASE 1: toJSON / fromJSON für SaveGameManager
    // ============================================================

    toJSON() {
        return {
            musicVolume: this.musicVolume,
            sfxVolume: this.sfxVolume,
            isMuted: this.isMuted,
            isInitialized: this.isInitialized,
            currentZone: this.currentZone
        };
    }

    fromJSON(data) {
        if (!data) return;
        this.musicVolume = data.musicVolume !== undefined ? data.musicVolume : this.musicVolume;
        this.sfxVolume = data.sfxVolume !== undefined ? data.sfxVolume : this.sfxVolume;
        this.isMuted = data.isMuted !== undefined ? data.isMuted : this.isMuted;
        this.isInitialized = data.isInitialized !== undefined ? data.isInitialized : this.isInitialized;
        this.currentZone = data.currentZone || this.currentZone;

        // Volume-Werte anwenden, falls Initialisierung bereits erfolgt ist
        if (this.isInitialized) {
            if (this.musicGain) this.musicGain.gain.value = this.musicVolume;
            if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume;
        }
    }
}