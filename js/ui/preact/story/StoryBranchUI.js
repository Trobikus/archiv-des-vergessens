/**
 * ============================================================
 * FILE: ui/preact/story/StoryBranchUI.js – Cinematic Story Branches
 * ============================================================
 * Fullscreen narrative player for story_branches.js nodes.
 * Uses cinematic_scenes.js + cinematic_assets.js for atmosphere.
 * ============================================================
 */

import { h, html, useState, useEffect, useEventBus } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';
import { resolveSceneForStoryNode } from '../../../data/cinematic_scenes.js';

export function StoryBranchUI({ stateManager, eventBus, services }) {
  const { storyBranchService, i18nService } = services;
  const [isOpen, setIsOpen] = useState(false);
  const [lang, setLang] = useState(i18nService?.getLanguage?.() || 'de');
  const [tick, setTick] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEventBus(eventBus, 'i18n:languageChanged', (data) => {
    setLang(typeof data === 'string' ? data : data?.language || 'de');
  });

  useEventBus(eventBus, EVENTS.UI_OPEN_STORY_BRANCH, () => {
    setExiting(false);
    setIsOpen(true);
    setTick((t) => t + 1);
  });

  useEventBus(eventBus, EVENTS.UI_CLOSE_ALL_MODALS, () => {
    if (isOpen) closeBranch();
  });
  useEventBus(eventBus, EVENTS.STORY_BRANCH_CHANGED, () => setTick((t) => t + 1));

  const closeBranch = () => {
    if (exiting) return;
    setExiting(true);
    setTimeout(() => {
      setIsOpen(false);
      setExiting(false);
    }, 450);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') closeBranch();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, exiting]);

  if (!isOpen || !storyBranchService) return null;

  void tick;

  const node = storyBranchService.getCurrentNode();
  if (!node) return null;

  const options = storyBranchService.getAvailableOptions();
  const scene = resolveSceneForStoryNode(node);
  const assets = scene.assets || {};
  const portrait = assets.portrait || null;
  const glow = portrait?.glow || scene.glowColor || 'var(--color-primary)';
  const bgStyle = scene.background || 'rgba(5,5,7,0.97)';
  const ambientClass = scene.ambientClass || '';
  const vignetteClass =
    scene.vignette === 'extreme'
      ? 'cinematic-vignette-extreme'
      : scene.vignette === 'heavy'
        ? 'cinematic-vignette-heavy'
        : scene.vignette === 'medium'
          ? 'cinematic-vignette-medium'
          : '';
  const exitClass = exiting ? 'cin-exit' : '';

  const isEnding = !!node.isEnding;
  const progress = storyBranchService.getProgress?.() ?? 0;

  const handleChoose = (optionId) => {
    const result = storyBranchService.chooseOption(optionId);
    if (result?.success) {
      setTick((t) => t + 1);
      if (result.node?.isEnding) {
        eventBus.publish(EVENTS.UI_SHOW_TOAST, {
          message: lang === 'de' ? `Ende: ${result.node.title}` : `Ending: ${result.node.title}`,
          type: 'info',
          duration: 4000
        });
      }
    } else if (result?.message) {
      eventBus.publish(EVENTS.UI_SHOW_TOAST, {
        message: result.message,
        type: 'warning',
        duration: 3000
      });
    }
  };

  const title = node.title || '';
  const text = node.text || '';
  const portraitEmoji = portrait?.emoji || '🕯️';

  return html`
    <div
      class="cinematic-overlay cinematic-bars cinematic-active ${ambientClass} ${vignetteClass} ${exitClass}"
      style="background: ${bgStyle}; z-index: 9500;"
      onClick=${(e) => {
        if (e.target === e.currentTarget && isEnding) closeBranch();
      }}
    >
      <div class="cin-particles" aria-hidden="true"></div>
      <div
        class="cinematic-content"
        key=${node.id || tick}
        style="max-width: 820px; width: 92%; text-align: center;"
      >
        <div
          class="cin-scene-label"
          style="position: absolute; top: -2.5rem; left: 0; right: 0; font-size: 0.7rem; color: rgba(255,255,255,0.35); letter-spacing: 2px; text-transform: uppercase; font-family: var(--font-header, Cinzel, serif);"
        >
          ${lang === 'de' ? 'Chronik' : 'Chronicle'} · ${progress}%
        </div>

        <div class="cin-portrait" style="font-size: 4.5rem; margin-bottom: 0.8rem; filter: drop-shadow(0 0 22px ${glow});">
          ${portraitEmoji}
        </div>

        <div
          class="cin-scene-label"
          style="font-size: 0.75rem; color: ${glow}; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 1rem; font-family: var(--font-header, Cinzel, serif);"
        >
          ${lang === 'en' && scene.name_en ? scene.name_en : scene.name}
        </div>

        <h2
          class="cinzel cin-title"
          style="color: ${glow}; font-size: 1.9rem; letter-spacing: 2px; text-shadow: 0 0 18px ${glow}; margin-bottom: 1.8rem; text-transform: uppercase; line-height: 1.3;"
        >
          ${title}
        </h2>

        <div
          class="cin-text"
          style="font-family: 'Outfit', sans-serif; font-size: 1.2rem; color: #f0eae0; line-height: 1.85; margin-bottom: 2.8rem; text-shadow: 0 2px 8px rgba(0,0,0,0.9); font-style: ${scene.textStyle || 'italic'}; background: rgba(0,0,0,0.4); padding: 1.6rem 1.8rem; border-radius: 8px; border-left: 2px solid ${glow}; border-right: 2px solid ${glow}; text-align: left; white-space: pre-wrap;"
        >
          ${text}
        </div>

        <div class="dialog-options cin-options" style="display: flex; flex-direction: column; gap: 0.9rem; align-items: center;">
          ${isEnding
            ? html`
                <button
                  class="glass-btn primary cinzel"
                  style="padding: 1rem 3.5rem; font-size: 1.15rem; border-color: ${glow}; letter-spacing: 2px;"
                  onClick=${() => closeBranch()}
                >
                  ${lang === 'de' ? 'Schließen' : 'Close'}
                </button>
              `
            : options.length === 0
              ? html`
                  <div style="color: rgba(255,255,255,0.5); font-size: 0.95rem; font-style: italic; margin-bottom: 1rem;">
                    ${lang === 'de'
                      ? 'Keine Option verfügbar – besiege weitere Bosse oder erfülle Voraussetzungen.'
                      : 'No options available – defeat more bosses or meet requirements.'}
                  </div>
                  <button
                    class="glass-btn cinzel"
                    style="padding: 0.9rem 2.5rem; font-size: 1rem;"
                    onClick=${() => closeBranch()}
                  >
                    ${lang === 'de' ? 'Zurück' : 'Back'}
                  </button>
                `
              : options.map(
                  (opt) => html`
                    <button
                      class="glass-btn"
                      style="width: 100%; max-width: 580px; padding: 1.1rem 1.8rem; font-size: 1.05rem; background: rgba(0,0,0,0.55); border: 1px solid rgba(255,255,255,0.14); transition: all 0.3s ease; text-align: center; justify-content: center; line-height: 1.4;"
                      onMouseOver=${(e) => {
                        e.currentTarget.style.borderColor = glow;
                        e.currentTarget.style.boxShadow = `0 0 14px ${glow}`;
                      }}
                      onMouseOut=${(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      onClick=${() => handleChoose(opt.id)}
                    >
                      ${opt.text}
                    </button>
                  `
                )}
        </div>

        ${!isEnding
          ? html`
              <button
                class="glass-btn btn-small"
                style="margin-top: 2rem; opacity: 0.55; font-size: 0.8rem; padding: 0.45rem 1.2rem;"
                onClick=${() => closeBranch()}
              >
                ${lang === 'de' ? 'Später fortsetzen' : 'Continue later'}
              </button>
            `
          : null}
      </div>
    </div>
  `;
}

export default StoryBranchUI;
