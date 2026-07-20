/**
 * ============================================================
 * FILE: ui/dom/particles.js – Hintergrundpartikel (Canvas)
 * ============================================================
 *
 * PERFORMANCE (v2.0):
 * - OffscreenCanvas-Stamps: shadowBlur einmalig beim Bake, 0 GPU-Blur pro Frame
 * - TypedArray-Pool: kein Heap-Alloc im Hot-Loop
 * - Batch-Rendering: alle Partikel eines Typs in einem drawImage-Pass
 * - RAF echte Pause wenn disabled (kein Idle-Blit)
 * - Maus-Repulsion: squared-distance Frühausstieg (kein sqrt wenn weit weg)
 */

export function initParticles() {
  const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('bg-canvas'));
  if (!canvas) return { setEnabled: () => {}, destroy: () => {} };

  const ctx = canvas.getContext('2d', { alpha: false });
  let width, height;
  let enabled = true;
  let animationId = null;

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

  // ---- Pre-render Stamps (shadowBlur einmalig beim Bake) ----
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

  // 3 Partikel-Typen: ember (orange/gold), dust (gold, langsam), dark (dunkle Ascheflocken)
  const ST = {
    ember: mkStamp('rgba(255,120,30,0.95)',  'rgba(255,80,0,0.45)',     1.8, 10),
    dust:  mkStamp('rgba(197,160,89,0.9)',   'rgba(197,160,89,0.3)',    1.2,  7),
    dark:  mkStamp('rgba(40,40,45,0.85)',    'rgba(30,30,35,0.2)',      2.0,  8),
  };

  // ---- TypedArray-Partikel-Pool (kein GC im Hot-Loop) ----
  const COUNT = 120;
  const px       = new Float32Array(COUNT);
  const py       = new Float32Array(COUNT);
  const pvx      = new Float32Array(COUNT);
  const pvy      = new Float32Array(COUNT);
  const psc      = new Float32Array(COUNT);  // scale für drawImage
  const palpha   = new Float32Array(COUNT);
  const pmaxA    = new Float32Array(COUNT);
  const pwob     = new Float32Array(COUNT);  // Wackel-Phase
  const pwobS    = new Float32Array(COUNT);  // Wackel-Speed
  const pbaseX   = new Float32Array(COUNT);  // Basis-X für Sinusbewegung
  const ptype    = new Uint8Array(COUNT);    // 0=ember 1=dust 2=dark

  // Initialisierung: Typ verteilen (15% ember, 25% dust, 60% dark)
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
      // Ember: schnell, orange glow
      pvy[i]   = -(0.8 + Math.random() * 1.5);
      pvx[i]   = (Math.random() - 0.5) * 0.3;
      psc[i]   = 0.6 + Math.random() * 0.8;
      pmaxA[i] = 0.7 + Math.random() * 0.2;
      pwobS[i] = 0.04 + Math.random() * 0.02;
    } else if (t === 1) {
      // Dust: langsam, gold
      pvy[i]   = -(0.4 + Math.random() * 0.8);
      pvx[i]   = (Math.random() - 0.5) * 0.2;
      psc[i]   = 0.7 + Math.random() * 0.6;
      pmaxA[i] = 0.4 + Math.random() * 0.2;
      pwobS[i] = 0.015 + Math.random() * 0.015;
    } else {
      // Dark: sehr langsam, groß, dunkel
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

    // Hintergrund (alpha:false → fillRect ist schnell, kein Compositing)
    ctx.fillStyle = '#050507';
    ctx.fillRect(0, 0, width, height);

    const mx = mouse.x;
    const my = mouse.y;

    // Update alle Partikel
    for (let i = 0; i < COUNT; i++) {
      // Maus-Repulsion: squared-distance Frühausstieg (kein Math.sqrt wenn weit)
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
      pwob[i] += pwobS[i];
      px[i]    = pbaseX[i] + Math.sin(pwob[i]) * 15 + pvx[i];
      py[i]   += pvy[i];

      // Fade-in
      if (palpha[i] < pmaxA[i]) palpha[i] = Math.min(pmaxA[i], palpha[i] + 0.005);

      // Reset wenn außerhalb
      if (py[i] < -50 || px[i] < -50 || px[i] > width + 50) {
        _resetParticle(i, false);
      }
    }

    // ---- Batch-Rendering: je Typ ein globalAlpha-Block ----
    // Typ 0: Ember
    for (let i = 0; i < COUNT; i++) {
      if (ptype[i] !== 0 || palpha[i] < 0.01) continue;
      const st = ST.ember;
      const sc = psc[i];
      const w  = st.img.width  * sc;
      const h  = st.img.height * sc;
      ctx.globalAlpha = palpha[i];
      ctx.drawImage(st.img, px[i] - w * 0.5, py[i] - h * 0.5, w, h);
    }

    // Typ 1: Dust
    for (let i = 0; i < COUNT; i++) {
      if (ptype[i] !== 1 || palpha[i] < 0.01) continue;
      const st = ST.dust;
      const sc = psc[i];
      const w  = st.img.width  * sc;
      const h  = st.img.height * sc;
      ctx.globalAlpha = palpha[i];
      ctx.drawImage(st.img, px[i] - w * 0.5, py[i] - h * 0.5, w, h);
    }

    // Typ 2: Dark
    for (let i = 0; i < COUNT; i++) {
      if (ptype[i] !== 2 || palpha[i] < 0.01) continue;
      const st = ST.dark;
      const sc = psc[i];
      const w  = st.img.width  * sc;
      const h  = st.img.height * sc;
      ctx.globalAlpha = palpha[i];
      ctx.drawImage(st.img, px[i] - w * 0.5, py[i] - h * 0.5, w, h);
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
      document.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', resize);
    }
  };
}