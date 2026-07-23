import { h, html } from '../setup.js';

export function IntroView() {
  if (typeof document !== 'undefined' && document.getElementById('intro-container')) {
    return null;
  }
  return html`
    <section id="intro-container" class="center-layout" role="region" aria-label="Studio Intro" style="display: flex;">
      <canvas id="intro-particle-canvas" aria-hidden="true"></canvas>
      <div class="intro-fog-layer intro-fog-layer--1" aria-hidden="true"></div>
      <div class="intro-fog-layer intro-fog-layer--2" aria-hidden="true"></div>
      <div class="intro-fog-layer intro-fog-layer--3" aria-hidden="true"></div>
      <div class="intro-rune-ring" aria-hidden="true">
        <svg viewBox="0 0 400 400" class="intro-rune-svg" aria-hidden="true">
          <circle cx="200" cy="200" r="185" fill="none" stroke="rgba(197,160,89,0.06)" stroke-width="1"/>
          <circle cx="200" cy="200" r="175" fill="none" stroke="rgba(197,160,89,0.04)" stroke-width="0.5"/>
          <text x="200" y="22" text-anchor="middle" fill="rgba(197,160,89,0.25)" font-size="11" font-family="serif" class="intro-rune-glyph" style="animation-delay:0s">ᚠ</text>
          <text x="352" y="80" text-anchor="middle" fill="rgba(197,160,89,0.25)" font-size="11" font-family="serif" class="intro-rune-glyph" style="animation-delay:0.4s">ᚢ</text>
          <text x="390" y="208" text-anchor="middle" fill="rgba(197,160,89,0.25)" font-size="11" font-family="serif" class="intro-rune-glyph" style="animation-delay:0.8s">ᚦ</text>
          <text x="348" y="335" text-anchor="middle" fill="rgba(197,160,89,0.25)" font-size="11" font-family="serif" class="intro-rune-glyph" style="animation-delay:1.2s">ᚨ</text>
          <text x="200" y="393" text-anchor="middle" fill="rgba(197,160,89,0.25)" font-size="11" font-family="serif" class="intro-rune-glyph" style="animation-delay:1.6s">ᚱ</text>
          <text x="50" y="335" text-anchor="middle" fill="rgba(197,160,89,0.25)" font-size="11" font-family="serif" class="intro-rune-glyph" style="animation-delay:2.0s">ᚲ</text>
          <text x="10" y="208" text-anchor="middle" fill="rgba(197,160,89,0.25)" font-size="11" font-family="serif" class="intro-rune-glyph" style="animation-delay:2.4s">ᚷ</text>
          <text x="52" y="80" text-anchor="middle" fill="rgba(197,160,89,0.25)" font-size="11" font-family="serif" class="intro-rune-glyph" style="animation-delay:2.8s">ᚹ</text>
          <polygon points="200,42 354,284 46,284" fill="none" stroke="rgba(197,160,89,0.05)" stroke-width="0.8"/>
          <polygon points="200,58 338,278 62,278" fill="none" stroke="rgba(197,160,89,0.04)" stroke-width="0.5"/>
          <polygon points="200,342 62,122 338,122" fill="none" stroke="rgba(197,160,89,0.04)" stroke-width="0.5"/>
        </svg>
      </div>
      <div class="intro-logo-wrapper">
        <div class="intro-magic-circle" aria-hidden="true"></div>
        <div class="intro-book-icon" aria-hidden="true">
          <svg viewBox="0 0 100 100" class="intro-svg-book">
            <path d="M 50 25 C 38 18 20 22 15 25 L 15 75 C 20 72 38 68 50 75 C 62 68 80 72 85 75 L 85 25 C 80 22 62 18 50 25 Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M 50 25 L 50 75" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M 22 35 C 30 32 40 34 45 36 M 22 45 C 30 42 40 44 45 46 M 22 55 C 30 52 40 54 45 56" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
            <path d="M 78 35 C 70 32 60 34 55 36 M 78 45 C 70 42 60 44 55 46 M 78 55 C 70 52 60 54 55 56" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
            <polygon points="50,11 52,17 58,17 53,21 55,27 50,23 45,27 47,21 42,17 48,17" fill="#c5a059" class="intro-sparkle-star"/>
          </svg>
        </div>
        <h2 class="intro-title">GRIMOIRE</h2>
        <h3 class="intro-subtitle">INTERACTIVE</h3>
      </div>
      <div class="intro-loading-bar-container" aria-hidden="true">
        <div class="intro-loading-bar"></div>
        <div class="intro-loading-text" id="intro-loading-text" style="color: var(--color-gold); font-family: 'Inter', sans-serif; font-size: 0.7rem; letter-spacing: 2px; text-transform: uppercase; margin-top: 10px; text-align: center; opacity: 0; animation: fadeInSimple 0.8s ease 1.2s forwards;">Initialisiere Archiv...</div>
      </div>
    </section>
  `;
}
export default IntroView;
