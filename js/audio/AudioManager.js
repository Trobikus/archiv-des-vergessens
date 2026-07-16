// --- START OF FILE audio/AudioManager.js ---

export default class AudioManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.ctx = null;
        this.enabled = true;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.isInitialized = false;

        // Volumen-Einstellungen
        this.musicVolume = 0.35;
        this.sfxVolume = 0.5;
        this.isMuted = false;

        // Musik-Tracking
        this.currentTrack = null;
        this.currentZone = 'menu';
        this.musicBuffer = null;
        this.musicSource = null;
        this.musicStartTime = 0;

        // Sound-Pool für häufige Sounds
        this.soundPool = new Map();
        this.poolSize = 4;

        // Lade-Status
        this.loadedSounds = new Map();
        this.loadingQueue = [];

        // Event-Bus abonnieren
        this._bindEvents();
    }

    _bindEvents() {
        if (!this.eventBus) return;

        this.eventBus.subscribe('ui:addLog', (data) => {
            if (data.type === 'event') this.play('click_positive');
            else if (data.type === 'system') this.play('click_soft');
        });

        this.eventBus.subscribe('resources:updated', (data) => {
            // Nur bei großen Sprüngen abspielen
            if (data.particles && data.particles > 0) {
                // Wird über den Gather-Controller gesteuert
            }
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
        this.eventBus.subscribe('hero:updated', () => {
            // Level-Up erkennen
            if (this._lastLevel && this._lastLevel !== this.eventBus._hero?.level) {
                this.play('level_up');
            }
            this._lastLevel = this.eventBus._hero?.level;
        });

        // Zone-Wechsel für Musik
        this.eventBus.subscribe('game:stateChanged', (data) => {
            if (data.newState === 'running') {
                this.setZone('game');
            } else if (data.newState === 'paused') {
                this.setZone('menu');
            }
        });

        this.eventBus.subscribe('ui:enterGame', () => this.setZone('game'));
        this.eventBus.subscribe('ui:openHero', () => this.setZone('hub'));
        this.eventBus.subscribe('ui:openStory', () => {
            if (this.eventBus._storyManager?.battleInProgress) {
                this.setZone('boss');
            } else {
                this.setZone('hub');
            }
        });
        this.eventBus.subscribe('story:battleResult', (data) => {
            if (data.victory) {
                setTimeout(() => this.setZone('hub'), 2000);
            } else {
                setTimeout(() => this.setZone('hub'), 1500);
            }
        });
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
            console.log('[AudioManager] Web Audio API initialisiert');

            // Audio-Kontext bei Benutzerinteraktion starten
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }

            // Sound-Pool vorbereiten
            this._initSoundPool();

            // Synthetische Sounds als Fallback generieren
            this._generateFallbackSounds();

            // Musik laden
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
            'gather', 'gather_burst',
            'level_up', 'prestige',
            'craft', 'craft_masterwork', 'salvage',
            'boss_hit', 'boss_victory', 'boss_defeat',
            'expedition_start', 'expedition_success', 'expedition_fail',
            'achievement', 'notification'
        ];

        for (const name of soundNames) {
            this.soundPool.set(name, []);
            for (let i = 0; i < this.poolSize; i++) {
                this.soundPool.get(name).push(null);
            }
        }
    }

    // ---- SYNTHETISCHE FALLBACK-SOUNDS (AAA-Qualität) ----

    _generateFallbackSounds() {
        // Erstelle einen Buffer für jeden Sound
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
                // Erste Pool-Position mit dem generierten Sound füllen
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

        switch (type) {
            case 'sine':
                for (let i = 0; i < samples; i++) {
                    const t = i / sampleRate;
                    const env = Math.exp(-t * 8);
                    data[i] = Math.sin(2 * Math.PI * baseFreq * t) * env;
                }
                break;

            case 'sawtooth':
                for (let i = 0; i < samples; i++) {
                    const t = i / sampleRate;
                    const env = Math.exp(-t * 6);
                    const saw = 2 * ((t * baseFreq) % 1) - 1;
                    data[i] = saw * env * 0.6;
                }
                break;

            case 'ascend':
                for (let i = 0; i < samples; i++) {
                    const t = i / sampleRate;
                    const env = Math.exp(-t * 4);
                    const freqNow = baseFreq * (1 + t * 1.5);
                    data[i] = Math.sin(2 * Math.PI * freqNow * t) * env;
                }
                break;

            case 'descend':
                for (let i = 0; i < samples; i++) {
                    const t = i / sampleRate;
                    const env = Math.exp(-t * 5);
                    const freqNow = baseFreq * (1 - t * 0.7);
                    data[i] = Math.sin(2 * Math.PI * freqNow * t) * env;
                }
                break;

            case 'impact':
                for (let i = 0; i < samples; i++) {
                    const t = i / sampleRate;
                    const env = Math.exp(-t * 20);
                    const noise = Math.random() * 2 - 1;
                    data[i] = noise * env * 0.5;
                }
                break;

            case 'sparkle':
                for (let i = 0; i < samples; i++) {
                    const t = i / sampleRate;
                    const env = Math.exp(-t * 6);
                    const freqMod = baseFreq * (1 + Math.sin(t * 30) * 0.2);
                    data[i] = Math.sin(2 * Math.PI * freqMod * t) * env;
                }
                break;

            case 'fanfare':
                const notes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 2];
                for (let i = 0; i < samples; i++) {
                    const t = i / sampleRate;
                    let sum = 0;
                    for (let n = 0; n < notes.length; n++) {
                        const start = n * 0.12;
                        const end = start + 0.2;
                        if (t >= start && t < end) {
                            const env = (t - start) / 0.2;
                            const noteFreq = notes[n];
                            sum += Math.sin(2 * Math.PI * noteFreq * (t - start)) * (1 - env) * 0.3;
                        }
                    }
                    data[i] = sum;
                }
                break;

            default:
                for (let i = 0; i < samples; i++) {
                    const t = i / sampleRate;
                    const env = Math.exp(-t * 6);
                    data[i] = Math.sin(2 * Math.PI * baseFreq * t) * env;
                }
        }

        return buffer;
    }

    // ---- SOUND-ABSPIELEN ----

    play(soundName) {
        if (!this.isInitialized || !this.enabled || this.isMuted) return;

        try {
            // 1. Versuche echte Audio-Datei zu laden (über URL)
            const audioUrl = this._getSoundUrl(soundName);
            if (audioUrl) {
                this._playFromUrl(audioUrl, soundName);
                return;
            }

            // 2. Fallback: Synthetischer Sound aus Pool
            const pool = this.soundPool.get(soundName);
            if (!pool) {
                // Generiere einen generischen Sound
                this._playSyntheticFallback(soundName);
                return;
            }

            // 3. Suche einen freien Slot im Pool
            let buffer = null;
            for (let i = 0; i < pool.length; i++) {
                if (pool[i]) {
                    buffer = pool[i];
                    break;
                }
            }

            if (!buffer) {
                // Kein Sound verfügbar, erstelle einen neuen
                this._generateFallbackSound(soundName);
                buffer = pool[0];
                if (!buffer) return;
            }

            this._playBuffer(buffer, 0.3);

        } catch (e) {
            // Silent fail – Audio ist nicht kritisch
        }
    }

    _getSoundUrl(name) {
        // Prüfe, ob eine echte Audio-Datei im assets-Ordner existiert
        // Format: assets/audio/[name].mp3 oder .ogg
        const extensions = ['.mp3', '.ogg', '.wav'];
        const basePath = 'assets/audio/';

        // Wir simulieren die Existenz von Dateien – der Entwickler kann sie hinzufügen
        // Bei Fehlern fällt das System auf synthetische Sounds zurück
        return null;
    }

    _playFromUrl(url, name) {
        // Echte Audio-Datei laden und abspielen
        try {
            const audio = new Audio(url);
            audio.volume = this.sfxVolume * (this.isMuted ? 0 : 1);
            audio.play().catch(() => {
                // Fallback auf synthetischen Sound
                this._playSyntheticFallback(name);
            });
        } catch (e) {
            this._playSyntheticFallback(name);
        }
    }

    _playSyntheticFallback(name) {
        // Generiere einen generischen Sound für unbekannte Namen
        const pool = this.soundPool.get('click_soft');
        if (pool && pool[0]) {
            this._playBuffer(pool[0], 0.2);
        }
    }

    _playBuffer(buffer, volume = 0.3) {
        if (!this.ctx || !buffer) return;

        try {
            const source = this.ctx.createBufferSource();
            source.buffer = buffer;

            const gain = this.ctx.createGain();
            gain.gain.value = volume * this.sfxVolume * (this.isMuted ? 0 : 1);

            source.connect(gain);
            gain.connect(this.sfxGain);

            source.start(0);
            source.onended = () => {
                source.disconnect();
                gain.disconnect();
            };
        } catch (e) {
            // Ignorieren
        }
    }

    _generateFallbackSound(name) {
        // Dynamisch einen Sound generieren und im Pool speichern
        if (!this.ctx) return;
        const pool = this.soundPool.get(name);
        if (!pool) return;

        const duration = 0.1;
        const freq = 500;
        const buffer = this._createSyntheticBuffer(duration, freq, 'sine');
        if (buffer) {
            for (let i = 0; i < pool.length; i++) {
                if (!pool[i]) {
                    pool[i] = buffer;
                    break;
                }
            }
        }
    }

    // ---- HINTERGRUNDMUSIK ----

    _loadMusic() {
        // In einer echten Implementierung würden hier Audio-Dateien geladen
        // Wir verwenden synthetische Musik
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

        const duration = 15; // Sekunden
        const sampleRate = this.ctx.sampleRate;
        const samples = Math.floor(duration * sampleRate);
        const buffer = this.ctx.createBuffer(2, samples, sampleRate);

        const left = buffer.getChannelData(0);
        const right = buffer.getChannelData(1);

        // Unterschiedliche Melodien für verschiedene Zonen
        let notes = [];
        let tempo = 0.4;
        let style = 'ambient';

        switch (zone) {
            case 'menu':
                notes = [523, 587, 659, 784, 880, 988, 1175];
                tempo = 0.6;
                style = 'epic';
                break;
            case 'hub':
                notes = [440, 523, 587, 659, 784, 880];
                tempo = 0.5;
                style = 'mysterious';
                break;
            case 'game':
                notes = [440, 523, 587, 659, 784, 880, 988];
                tempo = 0.35;
                style = 'action';
                break;
            case 'boss':
                notes = [440, 523, 587, 659, 784, 880, 988, 1175];
                tempo = 0.25;
                style = 'intense';
                break;
            case 'victory':
                notes = [523, 659, 784, 880, 988, 1175];
                tempo = 0.5;
                style = 'triumph';
                break;
            default:
                notes = [440, 523, 587, 659, 784];
                tempo = 0.5;
                style = 'ambient';
        }

        for (let i = 0; i < samples; i++) {
            const t = i / sampleRate;
            let valueL = 0;
            let valueR = 0;

            // Melodie
            for (let n = 0; n < notes.length; n++) {
                const note = notes[n];
                const offset = n * tempo * 0.6;
                const phase = t * note * 2 * Math.PI + offset;
                const env = Math.exp(-((t % (tempo * 2)) / (tempo * 0.5)) * 4);
                const vol = 0.04 * env * (1 - n / notes.length * 0.3);

                if (style === 'epic' || style === 'triumph') {
                    valueL += Math.sin(phase) * vol * 0.5;
                    valueR += Math.sin(phase + 0.3) * vol * 0.5;
                } else if (style === 'intense') {
                    valueL += Math.sin(phase) * vol * 0.3;
                    valueR += Math.sin(phase + 0.5) * vol * 0.3;
                } else if (style === 'action') {
                    valueL += Math.sin(phase) * vol * 0.4;
                    valueR += Math.sin(phase + 0.2) * vol * 0.4;
                } else {
                    valueL += Math.sin(phase) * vol * 0.3;
                    valueR += Math.sin(phase + 0.4) * vol * 0.3;
                }
            }

            // Bass
            const bassFreq = 110;
            const bassPhase = t * bassFreq * 2 * Math.PI;
            const bassEnv = Math.exp(-((t % (tempo * 4)) / (tempo * 0.8)) * 2);
            const bassVol = 0.03 * bassEnv;
            valueL += Math.sin(bassPhase) * bassVol;
            valueR += Math.sin(bassPhase + 0.2) * bassVol;

            // Drone (Ambient)
            if (style === 'mysterious' || style === 'ambient') {
                const droneFreq = 220;
                const dronePhase = t * droneFreq * 2 * Math.PI;
                const droneVol = 0.015;
                valueL += Math.sin(dronePhase) * droneVol;
                valueR += Math.sin(dronePhase + 0.5) * droneVol;
            }

            left[i] = Math.max(-1, Math.min(1, valueL));
            right[i] = Math.max(-1, Math.min(1, valueR));
        }

        return buffer;
    }

    setZone(zone) {
        if (this.currentZone === zone) return;
        this.currentZone = zone;

        // Musik wechseln
        this.playMusic(zone);
    }

    playMusic(zone, once = false) {
        if (!this.isInitialized || !this.enabled || this.isMuted) return;

        const buffer = this.musicBuffers?.[zone];
        if (!buffer) return;

        // Alten Source stoppen
        if (this.musicSource) {
            try {
                this.musicSource.stop();
                this.musicSource.disconnect();
            } catch (e) { /* ignore */ }
            this.musicSource = null;
        }

        // Fade-out des aktuellen Tracks
        if (this.musicGain) {
            this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, this.ctx.currentTime);
            this.musicGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
        }

        // Nach Fade-out neuen Track starten
        setTimeout(() => {
            try {
                const source = this.ctx.createBufferSource();
                source.buffer = buffer;

                // Gain für den neuen Track
                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0, this.ctx.currentTime);
                gain.gain.linearRampToValueAtTime(this.musicVolume * (this.isMuted ? 0 : 1), this.ctx.currentTime + 0.5);

                source.connect(gain);
                gain.connect(this.musicGain);

                source.start(0);
                source.onended = () => {
                    source.disconnect();
                    gain.disconnect();
                    // Bei Endlosschleife neu starten, wenn nicht once
                    if (!once && this.currentZone === zone) {
                        this.playMusic(zone);
                    }
                };

                this.musicSource = source;

            } catch (e) {
                // Silent fail
            }
        }, 500);
    }

    // ---- VOLUMEN & MUTE ----

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
            // Leise ausblenden
            if (this.musicGain) {
                this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, this.ctx.currentTime);
                this.musicGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
            }
            if (this.sfxGain) {
                this.sfxGain.gain.setValueAtTime(this.sfxGain.gain.value, this.ctx.currentTime);
                this.sfxGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
            }
        } else {
            // Einblenden
            if (this.musicGain) {
                this.musicGain.gain.setValueAtTime(0, this.ctx.currentTime);
                this.musicGain.gain.linearRampToValueAtTime(this.musicVolume, this.ctx.currentTime + 0.3);
            }
            if (this.sfxGain) {
                this.sfxGain.gain.setValueAtTime(0, this.ctx.currentTime);
                this.sfxGain.gain.linearRampToValueAtTime(this.sfxVolume, this.ctx.currentTime + 0.3);
            }
        }
        return this.isMuted;
    }

    // ---- EXTERNE SOUNDS LADEN (für Entwickler) ----

    async loadSound(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);

            // In Pool speichern
            const pool = this.soundPool.get(name);
            if (pool) {
                for (let i = 0; i < pool.length; i++) {
                    if (!pool[i]) {
                        pool[i] = audioBuffer;
                        break;
                    }
                }
            } else {
                this.soundPool.set(name, [audioBuffer]);
            }
            return true;
        } catch (e) {
            console.warn(`[AudioManager] Sound "${name}" konnte nicht geladen werden:`, e);
            return false;
        }
    }

    async loadMusicTrack(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);

            if (this.musicBuffers) {
                this.musicBuffers[name] = audioBuffer;
            }
            return true;
        } catch (e) {
            console.warn(`[AudioManager] Musik "${name}" konnte nicht geladen werden:`, e);
            return false;
        }
    }

    // ---- SPEICHERN / LADEN ----

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
        this.musicVolume = data.musicVolume || 0.35;
        this.sfxVolume = data.sfxVolume || 0.5;
        this.isMuted = data.isMuted || false;

        if (this.isInitialized) {
            this.setMusicVolume(this.musicVolume);
            this.setSfxVolume(this.sfxVolume);
        }
    }
}