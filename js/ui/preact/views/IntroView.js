import { h, html, useEffect, useState, useRef } from '../setup.js';
import { EVENTS } from '../../../core/events/definitions.js';

export function IntroView({ eventBus, services }) {
  const [loadingPct, setLoadingPct] = useState(0);
  const [loadingText, setLoadingText] = useState('');
  const [opacity, setOpacity] = useState(1);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  
  useEffect(() => {
    let animFrameId = null;
    let stopped = false;
    let introTimeoutId = null;
    let stopParticles = null;
    let introFinished = false;

    const finishIntro = () => {
      if (introFinished) return;
      introFinished = true;

      if (stopParticles) stopParticles();
      
      setOpacity(0);
      
      setTimeout(() => {
        // Transition to login/menu
        if (eventBus) {
          eventBus.publish(EVENTS.AUTH_SHOW_LOGIN);
        }
      }, 800);
    };

    // --- Particle System Logic ---
    const _startIntroParticles = () => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const ctx = canvas.getContext('2d', { alpha: true });
      if (!ctx) return null;

      let lastTS = -1;

      const resize = () => {
        const targetW = containerRef.current ? containerRef.current.clientWidth : window.innerWidth;
        const targetH = containerRef.current ? containerRef.current.clientHeight : window.innerHeight;
        canvas.width = targetW;
        canvas.height = targetH;
        ctx.globalCompositeOperation = 'screen';
      };
      resize();
      window.addEventListener('resize', resize, { passive: true });

      const RUNE_GLYPHS = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᛁ', 'ᛃ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛊ', 'ᛏ'];
      const MAX_PARTICLES = 90;

      const createParticle = (type, isInit = false) => {
        const W = canvas.width;
        const H = canvas.height;
        const cx = W * 0.5;
        const cy = H * 0.5;

        const p = {
          type,
          x: 0, y: 0, vx: 0, vy: 0,
          scale: 1, alpha: 0, maxAlpha: 0.5,
          life: 0, maxLife: 100,
          wobble: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.01,
          colorType: Math.random() > 0.5 ? 'gold' : 'purple',
          rune: RUNE_GLYPHS[Math.floor(Math.random() * RUNE_GLYPHS.length)],
          prevX: 0, prevY: 0
        };

        if (type === 'ember') {
          const a = Math.random() * Math.PI * 2;
          const d = 50 + Math.random() * 110;
          p.x = cx + Math.cos(a) * d;
          p.y = isInit ? cy + Math.random() * H * 0.5 : cy + 20 + Math.random() * 70;
          p.vx = (Math.random() - 0.5) * 0.5;
          p.vy = -(0.35 + Math.random() * 0.7);
          p.scale = 0.5 + Math.random() * 0.9;
          p.maxAlpha = 0.4 + Math.random() * 0.5;
          p.maxLife = 110 + Math.random() * 160;
          p.wobbleSpeed = 0.022 + Math.random() * 0.025;
          p.colorType = Math.random() > 0.4 ? 'gold' : 'bright';
        } else if (type === 'dust') {
          p.x = Math.random() * W;
          p.y = isInit ? Math.random() * H : H + 5;
          p.vx = (Math.random() - 0.5) * 0.2;
          p.vy = -(0.07 + Math.random() * 0.17);
          p.scale = 0.4 + Math.random() * 0.75;
          p.maxAlpha = 0.08 + Math.random() * 0.18;
          p.maxLife = 280 + Math.random() * 320;
          p.wobbleSpeed = 0.007 + Math.random() * 0.012;
          p.colorType = Math.random() > 0.55 ? 'purple' : 'gold';
        } else if (type === 'rune') {
          const a = Math.random() * Math.PI * 2;
          const d = 75 + Math.random() * (Math.min(W, H) * 0.28);
          p.x = cx + Math.cos(a) * d;
          p.y = cy + Math.sin(a) * d;
          p.vx = Math.cos(a) * 0.1;
          p.vy = Math.sin(a) * 0.1;
          p.scale = Math.random() > 0.5 ? 1 : 0.7;
          p.maxAlpha = 0.12 + Math.random() * 0.22;
          p.maxLife = 170 + Math.random() * 200;
          p.wobbleSpeed = 0.012;
        } else if (type === 'spark') {
          const a = Math.random() * Math.PI * 2;
          p.x = cx + (Math.random() - 0.5) * 55;
          p.y = cy + (Math.random() - 0.5) * 55;
          p.prevX = p.x;
          p.prevY = p.y;
          p.vx = Math.cos(a) * (1.4 + Math.random() * 1.9);
          p.vy = Math.sin(a) * (1.4 + Math.random() * 1.9);
          p.scale = 0.7 + Math.random() * 0.7;
          p.maxAlpha = 0.7 + Math.random() * 0.3;
          p.maxLife = 22 + Math.random() * 38;
          p.wobbleSpeed = 0;
        } else if (type === 'orb') {
          p.x = cx + (Math.random() - 0.5) * W * 0.5;
          p.y = cy + (Math.random() - 0.5) * H * 0.5;
          p.vx = (Math.random() - 0.5) * 0.15;
          p.vy = (Math.random() - 0.5) * 0.15;
          p.scale = 0.6 + Math.random() * 0.9;
          p.maxAlpha = 0.12 + Math.random() * 0.18;
          p.maxLife = 340 + Math.random() * 400;
          p.wobbleSpeed = 0.004 + Math.random() * 0.005;
          p.colorType = Math.random() > 0.5 ? 'gold' : 'purple';
        }

        if (isInit) {
          p.life = Math.random() * p.maxLife;
        }

        return p;
      };

      const particles = [];
      const initTypes = [
        ...Array(5).fill('orb'),
        ...Array(22).fill('dust'),
        ...Array(32).fill('ember'),
        ...Array(8).fill('rune')
      ];

      for (const t of initTypes) {
        particles.push(createParticle(t, true));
      }

      ctx.globalCompositeOperation = 'screen';
      let sparkCooldown = 65;

      const tick = (now) => {
        if (stopped) return;
        animFrameId = requestAnimationFrame(tick);
        if (lastTS < 0) {
          lastTS = now;
          return;
        }
        const dt = Math.min((now - lastTS) / 16.667, 2.5);
        lastTS = now;

        const W = canvas.width;
        const H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        sparkCooldown -= dt;
        if (sparkCooldown <= 0 && particles.length < MAX_PARTICLES - 6) {
          const count = 2 + Math.floor(Math.random() * 4);
          for (let b = 0; b < count && particles.length < MAX_PARTICLES; b++) {
            particles.push(createParticle('spark', false));
          }
          sparkCooldown = 65 + Math.random() * 75;
        }

        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.life += dt;
          p.wobble += p.wobbleSpeed * dt;

          const lt = p.life / p.maxLife;
          p.alpha = lt < 0.2 ? (lt / 0.2) * p.maxAlpha : lt > 0.7 ? ((1 - lt) / 0.3) * p.maxAlpha : p.maxAlpha;

          if (p.type === 'orb') {
            p.x += (p.vx + Math.cos(p.wobble) * 0.28) * dt;
            p.y += (p.vy + Math.sin(p.wobble * 0.7) * 0.22) * dt;
            if (p.alpha > 0.004) {
              const radius = 25 * p.scale;
              const grad = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, radius);
              const color = p.colorType === 'purple' ? '130,80,200' : '197,160,89';
              grad.addColorStop(0, `rgba(${color}, ${p.alpha * 0.6})`);
              grad.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = grad;
              ctx.beginPath();
              ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (p.type === 'dust') {
            p.x += (p.vx + Math.sin(p.wobble) * 0.22) * dt;
            p.y += p.vy * dt;
            if (p.alpha > 0.004) {
              ctx.globalAlpha = p.alpha;
              ctx.fillStyle = p.colorType === 'purple' ? 'rgba(130,80,200,0.9)' : 'rgba(197,160,89,0.9)';
              ctx.beginPath();
              ctx.arc(p.x, p.y, 1.2 * p.scale, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (p.type === 'ember') {
            p.x += (p.vx + Math.sin(p.wobble) * 0.28) * dt;
            p.y += p.vy * dt;
            if (p.alpha > 0.004) {
              ctx.globalAlpha = p.alpha;
              ctx.fillStyle = p.colorType === 'bright' ? '#fff8c0' : '#ebd576';
              ctx.beginPath();
              ctx.arc(p.x, p.y, 1.8 * p.scale, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (p.type === 'rune') {
            p.x += p.vx * dt;
            p.y += (p.vy + Math.sin(p.wobble) * 0.18) * dt;
            if (p.alpha > 0.004) {
              ctx.globalAlpha = p.alpha;
              ctx.font = `${p.scale > 0.8 ? 14 : 9}px serif`;
              ctx.fillStyle = '#c5a059';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(p.rune, p.x, p.y);
            }
          } else if (p.type === 'spark') {
            p.prevX = p.x;
            p.prevY = p.y;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.alpha > 0.02) {
              ctx.globalAlpha = p.alpha;
              ctx.strokeStyle = '#ebd576';
              ctx.lineWidth = p.scale;
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(p.prevX, p.prevY);
              ctx.lineTo(p.x, p.y);
              ctx.stroke();
            }
          }

          if (p.life >= p.maxLife) {
            if (p.type === 'spark') {
              particles.splice(i, 1);
            } else {
              particles[i] = createParticle(p.type, false);
            }
          }
        }
        ctx.globalAlpha = 1;
      };

      requestAnimationFrame(() => {
        lastTS = performance.now();
        requestAnimationFrame(tick);
      });

      return () => {
        stopped = true;
        if (animFrameId) cancelAnimationFrame(animFrameId);
        window.removeEventListener('resize', resize);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      };
    };

    stopParticles = _startIntroParticles();

    // Loading Bar Sequence
    const steps = [
      { pct: 15, text: 'Initialisiere Archiv-Kern...', delay: 200 },
      { pct: 35, text: 'Sammle Mneme-Partikel...', delay: 600 },
      { pct: 60, text: 'Lade Chroniken & Relikte...', delay: 1200 },
      { pct: 85, text: 'Entsiegele Weltenzustand...', delay: 1800 },
      { pct: 100, text: 'Das Archiv ist bereit.', delay: 2400 }
    ];

    steps.forEach(({ pct, text, delay }) => {
      setTimeout(() => {
        if (introFinished) return;
        setLoadingPct(pct);
        setLoadingText(text);
      }, delay);
    });

    introTimeoutId = setTimeout(finishIntro, 7000);

    const handleClick = () => {

      if (introTimeoutId) clearTimeout(introTimeoutId);
      finishIntro();
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('click', handleClick);
    }

    return () => {
      if (stopParticles) stopParticles();
      if (introTimeoutId) clearTimeout(introTimeoutId);
      if (container) container.removeEventListener('click', handleClick);
    };
  }, [eventBus]);

  return html`
    <section ref=${containerRef} id="intro-container" class="center-layout" role="region" aria-label="Studio Intro" style="display: flex; opacity: ${opacity}; transition: opacity 0.8s ease; cursor: pointer;">
      <canvas ref=${canvasRef} id="intro-particle-canvas" aria-hidden="true"></canvas>
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
        <div class="intro-loading-bar manual-progress" style="width: ${loadingPct}%;"></div>
        <div class="intro-loading-text" style="color: var(--color-gold); font-family: 'Inter', sans-serif; font-size: 0.7rem; letter-spacing: 2px; text-transform: uppercase; margin-top: 10px; text-align: center; opacity: ${loadingText ? 1 : 0}; transition: opacity 0.3s ease;">${loadingText || 'Initialisiere Archiv...'}</div>
      </div>
    </section>
  `;
}
export default IntroView;
