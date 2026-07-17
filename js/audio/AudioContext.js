// ============================================================
// FILE: audio/AudioContext.js – Web Audio Context & Gain-Nodes
// ============================================================

export class AudioContextManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.isInitialized = false;
        this.enabled = true;
        this.isMuted = false;
        this.musicVolume = 0.35;
        this.sfxVolume = 0.5;
    }

    /**
     * Initialisiert den Web Audio Context und die Gain-Nodes.
     * @returns {boolean} – Erfolg
     */
    init() {
        if (this.isInitialized) return true;

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
            console.log('[AudioContext] Web Audio API initialisiert');
            return true;
        } catch (e) {
            console.warn('[AudioContext] Web Audio nicht verfügbar:', e);
            this.isInitialized = false;
            return false;
        }
    }

    /**
     * Resume des Audio-Contexts (wird bei Benutzerinteraktion aufgerufen).
     */
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    /**
     * Setzt die Musik-Lautstärke.
     */
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.musicGain) {
            this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
        }
    }

    /**
     * Setzt die Soundeffekt-Lautstärke.
     */
    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        if (this.sfxGain) {
            this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
        }
    }

    /**
     * Muted/Unmuted alle Audioausgaben (mit Fade).
     */
    toggleMute() {
        this.isMuted = !this.isMuted;
        const targetMusic = this.isMuted ? 0.0001 : this.musicVolume;
        const targetSfx = this.isMuted ? 0.0001 : this.sfxVolume;
        if (this.musicGain) {
            this.musicGain.gain.linearRampToValueAtTime(targetMusic, this.ctx.currentTime + 0.3);
        }
        if (this.sfxGain) {
            this.sfxGain.gain.linearRampToValueAtTime(targetSfx, this.ctx.currentTime + 0.3);
        }
        return this.isMuted;
    }

    /**
     * Prüft, ob der Context läuft.
     */
    isRunning() {
        return this.ctx && this.ctx.state === 'running';
    }

    /**
     * Gibt die aktuelle Zeit des Audio-Contexts zurück.
     */
    get currentTime() {
        return this.ctx ? this.ctx.currentTime : 0;
    }

    /**
     * Gibt die Sample-Rate zurück.
     */
    get sampleRate() {
        return this.ctx ? this.ctx.sampleRate : 44100;
    }

    /**
     * Gibt den Audio-Context für direkte Nutzung zurück (nur für interne Module).
     */
    get context() {
        return this.ctx;
    }

    // ---- PERSISTENZ ----

    toJSON() {
        return {
            musicVolume: this.musicVolume,
            sfxVolume: this.sfxVolume,
            isMuted: this.isMuted,
            isInitialized: this.isInitialized
        };
    }

    fromJSON(data) {
        if (!data) return;
        this.musicVolume = data.musicVolume !== undefined ? data.musicVolume : this.musicVolume;
        this.sfxVolume = data.sfxVolume !== undefined ? data.sfxVolume : this.sfxVolume;
        this.isMuted = data.isMuted !== undefined ? data.isMuted : this.isMuted;
        this.isInitialized = data.isInitialized !== undefined ? data.isInitialized : this.isInitialized;
        if (this.isInitialized && this.ctx) {
            this.setMusicVolume(this.musicVolume);
            this.setSfxVolume(this.sfxVolume);
        }
    }
}