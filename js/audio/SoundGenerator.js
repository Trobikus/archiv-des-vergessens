// ============================================================
// FILE: audio/SoundGenerator.js – Synthetische Sound-Erzeugung
// ============================================================

import { AudioContextManager } from './AudioContext.js';

export class SoundGenerator {
    /**
     * Erzeugt einen synthetischen Audio-Buffer.
     * @param {AudioContextManager} ctxManager – Audio-Context-Manager
     * @param {number} duration – Dauer in Sekunden
     * @param {number} freq – Grundfrequenz in Hz
     * @param {string} type – Wellenform-Typ: 'sine', 'sawtooth', 'ascend', 'descend', 'impact', 'sparkle', 'fanfare'
     * @param {number} volume – Lautstärke (0-1)
     * @returns {AudioBuffer|null} – Erzeugter Buffer oder null bei Fehler
     */
    static generate(ctxManager, duration, freq, type = 'sine', volume = 1.0) {
        const ctx = ctxManager.context;
        if (!ctx) return null;

        const sampleRate = ctx.sampleRate || 44100;
        const samples = Math.floor(duration * sampleRate);
        const buffer = ctx.createBuffer(1, samples, sampleRate);
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
            data[i] = wave * env * volume;
        }
        return buffer;
    }

    /**
     * Generiert eine ganze Reihe von Standard-Sounds und gibt ein Map mit Sound-Namen => Buffer zurück.
     */
    static generateAll(ctxManager) {
        const sounds = {};
        const gen = (name, duration, freq, type, volume) => {
            sounds[name] = this.generate(ctxManager, duration, freq, type, volume);
        };

        gen('click_soft', 0.08, 400, 'sine', 0.3);
        gen('click_positive', 0.06, 800, 'sine', 0.3);
        gen('click_negative', 0.1, 300, 'sawtooth', 0.3);
        gen('gather', 0.15, 900, 'sine', 0.3);
        gen('gather_burst', 0.25, 1200, 'sine', 0.4);
        gen('level_up', 0.6, 440, 'ascend', 0.4);
        gen('prestige', 1.0, 220, 'fanfare', 0.5);
        gen('craft', 0.2, 600, 'sine', 0.3);
        gen('craft_masterwork', 0.4, 800, 'sparkle', 0.4);
        gen('salvage', 0.15, 200, 'sawtooth', 0.3);
        gen('boss_hit', 0.2, 120, 'impact', 0.4);
        gen('boss_victory', 1.2, 523, 'fanfare', 0.6);
        gen('boss_defeat', 0.8, 440, 'descend', 0.4);
        gen('expedition_start', 0.1, 600, 'sine', 0.2);
        gen('expedition_success', 0.3, 660, 'ascend', 0.3);
        gen('expedition_fail', 0.2, 300, 'descend', 0.3);
        gen('achievement', 0.5, 1000, 'sparkle', 0.5);
        gen('notification', 0.08, 1000, 'sine', 0.3);

        return sounds;
    }

    /**
     * Generiert einen Musik-Buffer für eine Zone.
     */
    static generateMusic(ctxManager, zone, duration = 15) {
        const ctx = ctxManager.context;
        if (!ctx) return null;

        const sampleRate = ctx.sampleRate || 44100;
        const samples = Math.floor(duration * sampleRate);
        const buffer = ctx.createBuffer(2, samples, sampleRate);
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
        } else if (zone === 'victory') {
            notes = [523, 659, 784, 880, 1047];
            tempo = 0.7;
        } // menu und game verwenden Standard-Notes

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
}