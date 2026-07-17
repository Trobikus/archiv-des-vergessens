// ============================================================
// FILE: audio/SoundPool.js – Pool für Sound-Wiedergabe
// ============================================================

import { SoundGenerator } from './SoundGenerator.js';

export class SoundPool {
    /**
     * @param {AudioContextManager} ctxManager – Audio-Context-Manager
     * @param {number} poolSize – Anzahl der gleichzeitigen Instanzen pro Sound
     */
    constructor(ctxManager, poolSize = 4) {
        this.ctxManager = ctxManager;
        this.poolSize = poolSize;
        this._buffers = new Map(); // name -> AudioBuffer
        this._sources = new Map(); // name -> [AudioBufferSourceNode, ...]
        this._initSounds();
        this._initMusic();
    }

    _initSounds() {
        const sounds = SoundGenerator.generateAll(this.ctxManager);
        for (const [name, buffer] of Object.entries(sounds)) {
            if (buffer) {
                this._buffers.set(name, buffer);
                this._sources.set(name, []);
            }
        }
    }

    _initMusic() {
        const zones = ['menu', 'hub', 'game', 'boss', 'victory'];
        for (const zone of zones) {
            const buffer = SoundGenerator.generateMusic(this.ctxManager, zone);
            if (buffer) {
                this._buffers.set('music_' + zone, buffer);
            }
        }
    }

    /**
     * Gibt den Buffer für einen Sound-Namen zurück.
     */
    getBuffer(name) {
        return this._buffers.get(name) || null;
    }

    /**
     * Gibt den Musik-Buffer für eine Zone zurück.
     */
    getMusicBuffer(zone) {
        return this._buffers.get('music_' + zone) || null;
    }

    /**
     * Spielt einen Sound ab (erstellt einen neuen Source-Node).
     * @param {string} name – Sound-Name
     * @param {number} volume – Lautstärke (0-1)
     * @param {function} onEnd – Callback bei Ende
     * @returns {AudioBufferSourceNode|null} – Der erzeugte Source-Node oder null
     */
    play(name, volume = 0.3, onEnd = null) {
        const ctx = this.ctxManager.context;
        if (!ctx) return null;

        const buffer = this._buffers.get(name);
        if (!buffer) return null;

        try {
            const source = ctx.createBufferSource();
            source.buffer = buffer;

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(volume * this.ctxManager.sfxVolume * (this.ctxManager.isMuted ? 0 : 1), ctx.currentTime);

            source.connect(gain);
            gain.connect(this.ctxManager.sfxGain);

            source.start(0);
            source.onended = () => {
                // Aus dem Pool entfernen
                const list = this._sources.get(name) || [];
                const idx = list.indexOf(source);
                if (idx !== -1) list.splice(idx, 1);
                source.disconnect();
                gain.disconnect();
                if (onEnd) onEnd();
            };

            const list = this._sources.get(name) || [];
            list.push(source);
            this._sources.set(name, list);
            return source;
        } catch (e) {
            console.warn('[SoundPool] Fehler beim Abspielen von', name, e);
            return null;
        }
    }

    /**
     * Stoppt alle aktiven Wiedergaben eines Sounds.
     */
    stopAll(name) {
        const list = this._sources.get(name) || [];
        for (const source of list) {
            try { source.stop(); } catch (e) {}
        }
        this._sources.set(name, []);
    }

    /**
     * Stoppt alle aktiven Sounds.
     */
    stopAllSounds() {
        for (const [name, list] of this._sources) {
            for (const source of list) {
                try { source.stop(); } catch (e) {}
            }
            this._sources.set(name, []);
        }
    }

    /**
     * Gibt die Anzahl der aktiven Sources zurück.
     */
    getActiveCount() {
        let count = 0;
        for (const list of this._sources.values()) {
            count += list.length;
        }
        return count;
    }
}