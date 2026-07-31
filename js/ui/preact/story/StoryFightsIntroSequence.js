/**
 * ============================================================
 * FILE: ui/preact/story/StoryFightsIntroSequence.js
 * ============================================================
 * Cinematic 3-Keyframe-Intro für das erste Öffnen von Story & Bosse.
 * ============================================================
 */

import { html, useState, useEffect, useRef } from '../setup.js';
import {
  STORY_FIGHTS_INTRO_FRAMES,
  STORY_FIGHTS_INTRO_CROSSFADE_MS
} from '../../../data/story_fights_intro.js';

/**
 * @param {{ lang?: string, onComplete: () => void }} props
 */
export function StoryFightsIntroSequence({ lang = 'de', onComplete }) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [visible, setVisible] = useState(false);
  const completedRef = useRef(false);
  const frameIndexRef = useRef(0);
  const exitingRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const finish = () => {
    if (completedRef.current || exitingRef.current) return;
    completedRef.current = true;
    exitingRef.current = true;
    setExiting(true);
    setTimeout(() => {
      if (typeof onCompleteRef.current === 'function') {
        onCompleteRef.current();
      }
    }, 480);
  };

  const advance = () => {
    if (exitingRef.current) return;
    if (frameIndexRef.current >= STORY_FIGHTS_INTRO_FRAMES.length - 1) {
      finish();
      return;
    }
    setFrameIndex((i) => {
      const next = i + 1;
      frameIndexRef.current = next;
      return next;
    });
  };

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  // Auto-Advance pro Keyframe
  useEffect(() => {
    if (exiting) return undefined;
    const frame = STORY_FIGHTS_INTRO_FRAMES[frameIndex];
    if (!frame) {
      finish();
      return undefined;
    }
    const timer = setTimeout(() => advance(), frame.durationMs);
    return () => clearTimeout(timer);
  }, [frameIndex, exiting]);

  // Tastatur: Space/Enter = weiter, Escape = überspringen
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        finish();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Prefetch nächster Frame
  useEffect(() => {
    const next = STORY_FIGHTS_INTRO_FRAMES[frameIndex + 1];
    if (!next) return;
    const img = new Image();
    img.src = next.src;
  }, [frameIndex]);

  const frame = STORY_FIGHTS_INTRO_FRAMES[frameIndex];
  if (!frame) return null;

  const hint =
    lang === 'en'
      ? 'Click to continue · Esc to skip'
      : 'Klicken zum Weiter · Esc zum Überspringen';
  const skipLabel = lang === 'en' ? 'Skip' : 'Überspringen';
  const frameLabel =
    lang === 'en'
      ? `Scene ${frameIndex + 1} of ${STORY_FIGHTS_INTRO_FRAMES.length}`
      : `Szene ${frameIndex + 1} von ${STORY_FIGHTS_INTRO_FRAMES.length}`;

  return html`
    <div
      class=${`sfi-overlay cinematic-bars cinematic-active ${visible ? 'sfi-visible' : ''} ${exiting ? 'sfi-exit' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label=${lang === 'en' ? 'Story fights introduction' : 'Story-Kämpfe Einführung'}
      onClick=${(e) => {
        if (e.target.closest?.('.sfi-skip')) return;
        advance();
      }}
    >
      <div class="sfi-stage" aria-hidden="true">
        ${STORY_FIGHTS_INTRO_FRAMES.map((f, i) => html`
          <div
            key=${f.id}
            class=${`sfi-frame ${i === frameIndex ? 'sfi-frame-active' : ''} ${i < frameIndex ? 'sfi-frame-past' : ''}`}
            style=${`--sfi-crossfade: ${STORY_FIGHTS_INTRO_CROSSFADE_MS}ms; --sfi-hold: ${f.durationMs}ms;`}
          >
            <img class="sfi-image" src=${f.src} alt="" draggable=${false} />
          </div>
        `)}
        <div class="sfi-vignette"></div>
        <div class="sfi-grain"></div>
      </div>

      <div class="sfi-progress" aria-hidden="true">
        ${STORY_FIGHTS_INTRO_FRAMES.map((f, i) => html`
          <span
            key=${`dot-${f.id}`}
            class=${`sfi-dot ${i === frameIndex ? 'active' : ''} ${i < frameIndex ? 'done' : ''}`}
          ></span>
        `)}
      </div>

      <p class="sfi-frame-label cinzel">${frameLabel}</p>
      <p class="sfi-hint">${hint}</p>

      <button
        type="button"
        class="sfi-skip glass-btn cinzel"
        onClick=${(e) => {
          e.stopPropagation();
          finish();
        }}
      >
        ${skipLabel}
      </button>
    </div>
  `;
}
