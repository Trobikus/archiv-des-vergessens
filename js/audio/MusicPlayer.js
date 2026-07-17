// ============================================================
// FILE: audio/MusicPlayer.js – Musik-Playback mit Fade & Looping
// ============================================================

export class MusicPlayer {
    /**
     * @param {AudioContextManager} ctxManager – Audio-Context-Manager
     * @param {SoundPool} soundPool – Sound-Pool für Buffer-Zugriff
     */
    constructor(ctxManager, soundPool) {
        this.ctxManager = ctxManager;
        this.soundPool = soundPool;
        this.currentZone = 'menu';
        this.currentSource = null;
        this.currentGain = null;
        this._fadeTimeout = null;
        this._isPlaying = false;
        this._loop = true;
    }

    /**
     * Setzt die aktuelle Zone (wechselt die Musik).
     * @param {string} zone – 'menu', 'hub', 'game', 'boss', 'victory'
     * @param {boolean} once – Wenn true, wird die Musik nur einmal abgespielt (nicht geloopt)
     */
    playZone(zone, once = false) {
        if (this.currentZone === zone && this._isPlaying) return;
        this.currentZone = zone;

        const buffer = this.soundPool.getMusicBuffer(zone);
        if (!buffer) return;

        const ctx = this.ctxManager.context;
        if (!ctx) return;

        // Alte Musik ausblenden
        this.fadeOut(0.5);

        // Neue Musik nach Fade-Out starten
        setTimeout(() => {
            this._playBuffer(buffer, once);
        }, 550);
    }

    _playBuffer(buffer, once) {
        const ctx = this.ctxManager.context;
        if (!ctx) return;

        try {
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.loop = !once;

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(
                this.ctxManager.musicVolume * (this.ctxManager.isMuted ? 0 : 1),
                ctx.currentTime + 0.5
            );

            source.connect(gain);
            gain.connect(this.ctxManager.musicGain);

            source.start(0);
            source.onended = () => {
                source.disconnect();
                gain.disconnect();
                this._isPlaying = false;
                this.currentSource = null;
                this.currentGain = null;
                // Wenn nicht einmalig, neu starten (Looping)
                if (!once && this.ctxManager.enabled && !this.ctxManager.isMuted) {
                    this.playZone(this.currentZone);
                }
            };

            this.currentSource = source;
            this.currentGain = gain;
            this._isPlaying = true;
        } catch (e) {
            console.warn('[MusicPlayer] Fehler beim Starten der Musik:', e);
        }
    }

    /**
     * Blendet die aktuelle Musik aus.
     */
    fadeOut(duration = 0.5) {
        if (this.currentGain) {
            try {
                this.currentGain.gain.linearRampToValueAtTime(0.0001, this.ctxManager.currentTime + duration);
            } catch (e) {}
        }
        if (this.currentSource) {
            setTimeout(() => {
                try {
                    if (this.currentSource) {
                        this.currentSource.stop();
                        this.currentSource = null;
                        this.currentGain = null;
                        this._isPlaying = false;
                    }
                } catch (e) {}
            }, duration * 1000 + 100);
        }
    }

    /**
     * Stoppt die Musik sofort.
     */
    stop() {
        if (this.currentSource) {
            try { this.currentSource.stop(); } catch (e) {}
            this.currentSource = null;
            this.currentGain = null;
            this._isPlaying = false;
        }
    }

    /**
     * Pausiert die Musik (ohne zu stoppen – deaktiviert nur den Gain).
     */
    pause() {
        if (this.currentGain) {
            this.currentGain.gain.linearRampToValueAtTime(0.0001, this.ctxManager.currentTime + 0.3);
        }
        this._isPlaying = false;
    }

    /**
     * Setzt die Musik fort.
     */
    resume() {
        if (this.currentGain) {
            this.currentGain.gain.linearRampToValueAtTime(
                this.ctxManager.musicVolume * (this.ctxManager.isMuted ? 0 : 1),
                this.ctxManager.currentTime + 0.3
            );
        }
        this._isPlaying = true;
    }

    /**
     * Gibt zurück, ob Musik aktiv ist.
     */
    isPlaying() {
        return this._isPlaying;
    }
}