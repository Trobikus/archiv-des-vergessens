/**
 * ============================================================
 * FILE: ui/dom/particles.js – Hintergrundpartikel (Canvas)
 * ============================================================
 *
 * PERFORMANCE (v2.0):
 * - OffscreenCanvas-Stamps: shadowBlur einmalig beim Bake, 0 GPU-Blur pro Frame
 * - TypedArray-Pool: kein Heap-Alloc im Hot-Loop
 * - Dynamische Profile: Aethel, Lethe, Neutral (angepasst an Story-Pfad)
 */

import { selectDominantPath } from '../../core/state/selectors.js';

export function initParticles(stateManager = null, eventBus = null) {
  const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('bg-canvas'));
  if (!canvas) return { setEnabled: () => {}, destroy: () => {} };

  const ctx = canvas.getContext('2d', { alpha: false });
  let width, height;
  let enabled = true;
  let animationId = null;

  // Profil-Steuerung
  let currentPath = 'neutral';
  let targetBg = { r: 5, g: 5, b: 7 };
  let currentBg = { r: 5, g: 5, b: 7 };
  let subId = null;

  const updatePath = (path) => {
    currentPath = path;

    if (path === 'aethel') {
      targetBg = { r: 15, g: 12, b: 5 }; // Warmer Glow
    } else if (path === 'lethe') {
      targetBg = { r: 10, g: 3, b: 15 }; // Dunklerer, violetter Glow
    } else {
      targetBg = { r: 5, g: 5, b: 7 };   // Desaturiert
    }
  };

  if (stateManager) {
    subId = stateManager.subscribe((state) => {
      const newPath = selectDominantPath(state);
      if (newPath !== currentPath) {
        updatePath(newPath);
      }
    });
    // Initiale Zuweisung
    updatePath(selectDominantPath(stateManager.getState()));
  }

  const mouse = { x: -1000, y: -1000 };
  const onMouseMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
  document.addEventListener('mousemove', onMouseMove, { passive: true });

  function resize() {
    width  = window.innerWidth;
    height = window.innerHeight;
    canvas.width  = width;
    canvas.height = height;
    if (!enabled) {
      ctx.fillStyle = '#050507';
      ctx.fillRect(0, 0, width, height);
    }
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  // ---- Pre-render Stamps ----
  const mkStamp = (coreRgb, glowRgb, coreR, haloR) => {
    const dim  = Math.ceil(haloR * 2 + 2);
    const half = dim / 2;
    const oc   = new OffscreenCanvas(dim, dim);
    const c    = oc.getContext('2d');
    const g    = c.createRadialGradient(half, half, coreR * 0.3, half, half, haloR);
    g.addColorStop(0, glowRgb);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(half, half, haloR, 0, 6.283); c.fill();
    c.fillStyle = coreRgb;
    c.beginPath(); c.arc(half, half, coreR,  0, 6.283); c.fill();
    return { img: oc, half };
  };

  const mkGeometricStamp = (coreRgb, glowRgb, coreR, haloR) => {
    const dim  = Math.ceil(haloR * 2 + 2);
    const half = dim / 2;
    const oc   = new OffscreenCanvas(dim, dim);
    const c    = oc.getContext('2d');
    const g    = c.createRadialGradient(half, half, coreR * 0.3, half, half, haloR);
    g.addColorStop(0, glowRgb);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(half, half, haloR, 0, 6.283); c.fill();
    c.fillStyle = coreRgb;
    c.beginPath();
    c.moveTo(half, half - coreR);
    c.lineTo(half + coreR * 0.75, half);
    c.lineTo(half, half + coreR);
    c.lineTo(half - coreR * 0.75, half);
    c.closePath();
    c.fill();
    return { img: oc, half };
  };

  // Profile-Stamps
  const ST_NEUTRAL = {
    ember: mkStamp('rgba(200,200,200,0.95)',  'rgba(150,150,150,0.45)',     1.8, 10), // Asche
    dust:  mkStamp('rgba(169,169,179,0.9)',   'rgba(169,169,179,0.3)',      1.2,  7),
    dark:  mkStamp('rgba(40,40,45,0.85)',     'rgba(30,30,35,0.2)',         2.0,  8),
  };

  const ST_AETHEL = {
    ember: mkGeometricStamp('rgba(255,223,100,1.0)', 'rgba(212,175,55,0.5)',   2.2, 12),
    dust:  mkGeometricStamp('rgba(230,190,110,0.9)', 'rgba(230,190,110,0.35)', 1.5,  9),
    dark:  mkGeometricStamp('rgba(255,245,200,0.8)', 'rgba(255,215,0,0.15)',   2.0, 10),
  };

  const ST_LETHE = {
    ember: mkStamp('rgba(180,50,255,0.95)',  'rgba(130,0,255,0.45)',    2.2, 15),
    dust:  mkStamp('rgba(140,80,240,0.9)',   'rgba(100,30,200,0.35)',   1.8, 12),
    dark:  mkStamp('rgba(75,0,130,0.8)',     'rgba(50,0,100,0.2)',      2.5, 14),
  };

  const getStampForParticle = (i, typeKey, path) => {
    if (path === 'aethel') return ST_AETHEL[typeKey];
    if (path === 'lethe') return ST_LETHE[typeKey];
    
    // Neutral Path: Desaturierte Asche, occasional gold/purple sparks
    if (path === 'neutral') {
      if (typeKey === 'ember') {
        const r = (i * 17) % 100;
        if (r < 15) return ST_AETHEL.ember; // occasional gold spark
        if (r > 85) return ST_LETHE.ember;  // occasional purple spark
      }
      return ST_NEUTRAL[typeKey];
    }
    return ST_NEUTRAL[typeKey];
  };

  // ---- TypedArray-Partikel-Pool ----
  const COUNT = 120;
  const px       = new Float32Array(COUNT);
  const py       = new Float32Array(COUNT);
  const pvx      = new Float32Array(COUNT);
  const pvy      = new Float32Array(COUNT);
  const psc      = new Float32Array(COUNT);
  const palpha   = new Float32Array(COUNT);
  const pmaxA    = new Float32Array(COUNT);
  const pwob     = new Float32Array(COUNT);
  const pwobS    = new Float32Array(COUNT);
  const pbaseX   = new Float32Array(COUNT);
  const ptype    = new Uint8Array(COUNT);    // 0=ember 1=dust 2=dark
  const TYPE_KEYS = ['ember', 'dust', 'dark'];

  for (let i = 0; i < COUNT; i++) {
    const r = Math.random();
    if (r < 0.15)       ptype[i] = 0; // ember
    else if (r < 0.40)  ptype[i] = 1; // dust
    else                ptype[i] = 2; // dark

    _resetParticle(i, true);
  }

  function _resetParticle(i, randomY = false) {
    px[i] = Math.random() * width;
    py[i] = randomY ? Math.random() * height : height + Math.random() * 100;
    pbaseX[i] = px[i];
    pwob[i]   = Math.random() * 6.283;

    const t = ptype[i];
    if (t === 0) {
      pvy[i]   = -(0.8 + Math.random() * 1.5);
      pvx[i]   = (Math.random() - 0.5) * 0.3;
      psc[i]   = 0.6 + Math.random() * 0.8;
      pmaxA[i] = 0.7 + Math.random() * 0.2;
      pwobS[i] = 0.04 + Math.random() * 0.02;
    } else if (t === 1) {
      pvy[i]   = -(0.4 + Math.random() * 0.8);
      pvx[i]   = (Math.random() - 0.5) * 0.2;
      psc[i]   = 0.7 + Math.random() * 0.6;
      pmaxA[i] = 0.4 + Math.random() * 0.2;
      pwobS[i] = 0.015 + Math.random() * 0.015;
    } else {
      pvy[i]   = -(0.2 + Math.random() * 0.5);
      pvx[i]   = (Math.random() - 0.5) * 0.15;
      psc[i]   = 0.8 + Math.random() * 1.0;
      pmaxA[i] = 0.25 + Math.random() * 0.15;
      pwobS[i] = 0.008 + Math.random() * 0.006;
    }

    palpha[i] = 0;
  }

  // ---- Zentraler Render-Loop ----
  function loop() {
    if (!enabled) {
      animationId = null;
      return;
    }
    animationId = requestAnimationFrame(loop);

    // Lerp background color
    currentBg.r += (targetBg.r - currentBg.r) * 0.02;
    currentBg.g += (targetBg.g - currentBg.g) * 0.02;
    currentBg.b += (targetBg.b - currentBg.b) * 0.02;

    ctx.fillStyle = `rgb(${Math.floor(currentBg.r)}, ${Math.floor(currentBg.g)}, ${Math.floor(currentBg.b)})`;
    ctx.fillRect(0, 0, width, height);

    const mx = mouse.x;
    const my = mouse.y;

    // Profil-Eigenschaften (Geschwindigkeit und Bewegung)
    let speedFactor = 0.8;
    let waveAmpMultiplier = 1.0;
    
    if (currentPath === 'aethel') {
      speedFactor = 0.4; // Langsame, würdige Bewegung
      waveAmpMultiplier = 0.3; // Sehr geradlinig
    } else if (currentPath === 'lethe') {
      speedFactor = 1.4; // Unruhig, schnell
      waveAmpMultiplier = 2.5; // Organisch, rauchig
    }

    for (let i = 0; i < COUNT; i++) {
      // Maus-Repulsion
      const dx = mx - px[i];
      const dy = my - py[i];
      const distSq = dx * dx + dy * dy;
      if (distSq < 30000) {
        const dist = Math.sqrt(distSq);
        const force = (173 - dist) / 173;
        pbaseX[i] -= (dx / dist) * force * 3;
        py[i]     -= (dy / dist) * force * 3;
      }

      // Bewegung
      pwob[i] += pwobS[i] * waveAmpMultiplier;
      const waveAmp = (ptype[i] === 0 ? 10 : (ptype[i] === 1 ? 15 : 20)) * waveAmpMultiplier;
      
      px[i]    = pbaseX[i] + Math.sin(pwob[i]) * waveAmp + pvx[i];
      py[i]   += pvy[i] * speedFactor;

      // Fade-in
      if (palpha[i] < pmaxA[i]) palpha[i] = Math.min(pmaxA[i], palpha[i] + 0.005);

      // Reset
      if (py[i] < -50 || px[i] < -50 || px[i] > width + 50) {
        _resetParticle(i, false);
      }

      // Render
      if (palpha[i] >= 0.01) {
        const st = getStampForParticle(i, TYPE_KEYS[ptype[i]], currentPath);
        const sc = psc[i];
        const w  = st.img.width  * sc;
        const h  = st.img.height * sc;
        ctx.globalAlpha = palpha[i];
        ctx.drawImage(st.img, px[i] - w * 0.5, py[i] - h * 0.5, w, h);
      }
    }

    ctx.globalAlpha = 1;
  }

  loop();

  return {
    setEnabled: (value) => {
      if (enabled === value) return;
      enabled = value;
      if (enabled) {
        if (animationId === null) {
          animationId = requestAnimationFrame(loop);
        }
      } else {
        if (animationId !== null) {
          cancelAnimationFrame(animationId);
          animationId = null;
        }
        ctx.fillStyle = '#050507';
        ctx.fillRect(0, 0, width, height);
      }
    },
    destroy: () => {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      if (stateManager && subId !== null) {
        stateManager.unsubscribe(subId);
      }
      document.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', resize);
    }
  };
}