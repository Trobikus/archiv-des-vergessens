// ============================================================
// FILE: audio/AudioManager.js – Haupt-Audio-Manager (aggregiert)
// ============================================================

import { AudioContextManager } from './AudioContext.js';
import { SoundPool } from './SoundPool.js';
import { MusicPlayer } from './MusicPlayer.js';
import { EVENTS } from '../core/events.js';

export default class AudioManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.ctxManager = new AudioContextManager();
        this.soundPool = new SoundPool(this.ctxManager, 4);
        this.musicPlayer = new MusicPlayer(this.ctxManager, this.soundPool);
        this.enabled = true;
        this.currentZone = 'menu';

        this._bindResumeOnInteraction();
        this._bindEvents();
    }

    _bindResumeOnInteraction() {
        const resume = () => {
            if (this.ctxManager.ctx && this.ctxManager.ctx.state === 'suspended') {
                this.ctxManager.resume();
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

    // ---- Öffentliche API ----

    init() {
        return this.ctxManager.init();
    }

    get isInitialized() {
        return this.ctxManager.isInitialized;
    }

    get isMuted() {
        return this.ctxManager.isMuted;
    }

    play(soundName) {
        if (!this.enabled || !this.ctxManager.isInitialized) return;
        this.soundPool.play(soundName, 0.3);
    }

    setZone(zone) {
        if (this.currentZone === zone) return;
        this.currentZone = zone;
        this.playMusic(zone);
    }

    playMusic(zone, once = false) {
        if (!this.enabled || !this.ctxManager.isInitialized) return;
        this.musicPlayer.playZone(zone, once);
    }

    setMusicVolume(volume) {
        this.ctxManager.setMusicVolume(volume);
    }

    setSfxVolume(volume) {
        this.ctxManager.setSfxVolume(volume);
    }

    toggleMute() {
        const muted = this.ctxManager.toggleMute();
        if (muted) {
            this.musicPlayer.pause();
        } else {
            this.musicPlayer.resume();
        }
        return muted;
    }

    // ---- PERSISTENZ ----

    toJSON() {
        return {
            ...this.ctxManager.toJSON(),
            currentZone: this.currentZone,
            enabled: this.enabled
        };
    }

    fromJSON(data) {
        if (!data) return;
        this.ctxManager.fromJSON(data);
        this.currentZone = data.currentZone || 'menu';
        this.enabled = data.enabled !== undefined ? data.enabled : this.enabled;
        if (this.ctxManager.isInitialized && !this.ctxManager.isMuted) {
            this.playMusic(this.currentZone);
        }
    }
}