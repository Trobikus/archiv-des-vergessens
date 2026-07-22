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
 * - Dynamisches Visual Storytelling: Alignment-abhängige Farben, Physik und Geometrie
 */

/**
 * Berechnet das Alignment des Spielers basierend auf Story-Flags und aktiven Sündenpakten.
 * @param {any} state 
 * @returns {{ aethel: number, lethe: number }}
 */
export function calculateAlignment(state) {
  let aethel = 0;
  let lethe = 0;

  if (state) {
    // 1. Check story node flags
    const flags = state.storyBranch?.flags || {};
    if (flags.hero_path) aethel += 2;
    if (flags.guardian_path) aethel += 2;
    if (flags.secrets_path) aethel += 2;
    if (flags.god_path) aethel += 2;
    if (flags.seal_path) aethel += 1;
    if (flags.epic_path) aethel += 1;

    if (flags.coward_path) lethe += 2;
    if (flags.hidden_path) lethe += 2;
    if (flags.scholar_path) lethe += 2;
    if (flags.rebel_path) lethe += 2;
    if (flags.lone_wolf_path) lethe += 1;

    // 2. Check active pacts
    const activePact = state.hero?.prestige?.activePact;
    if (activePact) {
      if (activePact === 'ancient_folios' || activePact === 'scourged_bodies') {
        aethel += 2;
      } else if (activePact === 'shadowy_legions' || activePact === 'greedy_souls' || activePact === 'ruthless_greed') {
        lethe += 2;
      } else if (activePact === 'solitary_wanderer') {
        lethe += 1;
      }
    }

    // 3. Current node title/id specifically
    const currentNode = state.storyBranch?.currentNode || '';
    if (currentNode.includes('hero') || currentNode.includes('guardian') || currentNode.includes('secrets') || currentNode.includes('god') || currentNode.includes('seal') || currentNode.includes('epic') || currentNode.includes('eternal') || currentNode.includes('victory') || currentNode.includes('ruler')) {
      aethel += 1;
    }
    if (currentNode.includes('coward') || currentNode.includes('hidden') || currentNode.includes('scholar') || currentNode.includes('rebel') || currentNode.includes('lone') || currentNode.includes('void') || currentNode.includes('exile')) {
      lethe += 1;
    }
  }

  return { aethel, lethe };
}

/**
 * @param {any} [stateManager]
 * @param {any} [eventBus]
 */
export function initParticles(stateManager = null, eventBus = null) {
  const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('bg-canvas'));
  if (!canvas) return { setEnabled: () => {}, destroy: () => {} };

  const ctx = canvas.getContext('2d', { alpha: false });
  let width, height;
  let enabled = true;
  let animationId = null;

  // Alignment-Zustand (reaktiv über StateManager)
  let alignment = { aethel: 0, lethe: 0 };
  let subId = null;

  if (stateManager) {
    subId = stateManager.subscribe((state) => {
      alignment = calculateAlignment(state);
    });
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

  // Neu: Geometrische Stempel für Aethel-Mneme (Diamant / Vier-zackiger Stern)
  const mkGeometricStamp = (coreRgb, glowRgb, coreR, haloR) => {
    const dim  = Math.ceil(haloR * 2 + 2);
    const half = dim / 2;
    const oc   = new OffscreenCanvas(dim, dim);
    const c    = oc.getContext('2d');
    
    // Halo Glow (weich radial)
    const g    = c.createRadialGradient(half, half, coreR * 0.3, half, half, haloR);
    g.addColorStop(0, glowRgb);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(half, half, haloR, 0, 6.283); c.fill();
    
    // Geometrischer Kern (Scharfer Diamant)
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

  // Die 3 Stempelsätze: Neutral, Aethel (Gold-geometrisch), Lethe (Organisch-purpurn)
  const ST_NEUTRAL = {
    ember: mkStamp('rgba(255,120,30,0.95)',  'rgba(255,80,0,0.45)',     1.8, 10),
    dust:  mkStamp('rgba(197,160,89,0.9)',   'rgba(197,160,89,0.3)',    1.2,  7),
    dark:  mkStamp('rgba(40,40,45,0.85)',    'rgba(30,30,35,0.2)',      2.0,  8),
  };

  const ST_AETHEL = {
    ember: mkGeometricStamp('rgba(255,223,100,1.0)', 'rgba(212,175,55,0.5)',   2.2, 12),
    dust:  mkGeometricStamp('rgba(230,190,110,0.9)', 'rgba(230,190,110,0.35)', 1.5,  9),
    dark:  mkGeometricStamp('rgba(255,245,200,0.8)', 'rgba(255,215,0,0.15)',   2.0, 10),
  };

  const ST_LETHE = {
    ember: mkStamp('rgba(180,50,255,0.95)',  'rgba(130,0,255,0.45)',    2.2, 12),
    dust:  mkStamp('rgba(140,80,240,0.9)',   'rgba(100,30,200,0.35)',   1.5,  9),
    dark:  mkStamp('rgba(75,0,130,0.8)',     'rgba(50,0,100,0.2)',      2.5, 11),
  };

  // Hilfsfunktion zur Zuweisung des Stempels pro Partikel basierend auf der Ausrichtung
  const getStampForParticle = (i, typeKey) => {
    const total = alignment.aethel + alignment.lethe;
    if (total === 0) return ST_NEUTRAL[typeKey];

    const aethelRatio = alignment.aethel / total;
    const letheRatio = alignment.lethe / total;

    // Pseudo-zufällige aber deterministische Aufteilung anhand des Indizes i
    const val = (i % 10) / 10;

    if (val < aethelRatio) {
      return ST_AETHEL[typeKey];
    } else if (val < aethelRatio + letheRatio) {
      return ST_LETHE[typeKey];
    } else {
      return ST_NEUTRAL[typeKey];
    }
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
      // Ember: schnell, glow
      pvy[i]   = -(0.8 + Math.random() * 1.5);
      pvx[i]   = (Math.random() - 0.5) * 0.3;
      psc[i]   = 0.6 + Math.random() * 0.8;
      pmaxA[i] = 0.7 + Math.random() * 0.2;
      pwobS[i] = 0.04 + Math.random() * 0.02;
    } else if (t === 1) {
      // Dust: langsam, glanz
      pvy[i]   = -(0.4 + Math.random() * 0.8);
      pvx[i]   = (Math.random() - 0.5) * 0.2;
      psc[i]   = 0.7 + Math.random() * 0.6;
      pmaxA[i] = 0.4 + Math.random() * 0.2;
      pwobS[i] = 0.015 + Math.random() * 0.015;
    } else {
      // Dark: sehr langsam, groß
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

    // Dynamische Hintergrundfarbe: bei hoher Lethe schimmert ein tiefes Dunkelviolett durch
    let bgR = 5;
    let bgG = 5;
    let bgB = 7;

    const total = alignment.aethel + alignment.lethe;
    if (total > 0) {
      const letheRatio = alignment.lethe / total;
      bgR = Math.floor(5 + letheRatio * 11);
      bgG = Math.floor(5 - letheRatio * 2);
      bgB = Math.floor(7 + letheRatio * 16);
    }

    // Hintergrund füllen
    ctx.fillStyle = `rgb(${bgR}, ${bgG}, ${bgB})`;
    ctx.fillRect(0, 0, width, height);

    const mx = mouse.x;
    const my = mouse.y;

    // Lethe-Eigenschaften für Physik: rauchigere, wellenartigere Fließpfade
    let waveAmp = 15;
    let speedFactor = 1.0;
    if (total > 0) {
      const letheRatio = alignment.lethe / total;
      waveAmp = 15 + letheRatio * 22; // Viel breiteres, rauchigeres Driften
      speedFactor = 1.0 - letheRatio * 0.35; // Langsameres, schwebendes Steigen
    }

    // Update alle Partikel
    for (let i = 0; i < COUNT; i++) {
      // Maus-Repulsion: squared-distance Frühausstieg
      const dx = mx - px[i];
      const dy = my - py[i];
      const distSq = dx * dx + dy * dy;
      if (distSq < 30000) {
        const dist = Math.sqrt(distSq);
        const force = (173 - dist) / 173;
        pbaseX[i] -= (dx / dist) * force * 3;
        py[i]     -= (dy / dist) * force * 3;
      }

      // Bewegung (unter Berücksichtigung von Lethe-Physik)
      pwob[i] += pwobS[i];
      px[i]    = pbaseX[i] + Math.sin(pwob[i]) * waveAmp + pvx[i];
      py[i]   += pvy[i] * speedFactor;

      // Fade-in
      if (palpha[i] < pmaxA[i]) palpha[i] = Math.min(pmaxA[i], palpha[i] + 0.005);

      // Reset wenn außerhalb
      if (py[i] < -50 || px[i] < -50 || px[i] > width + 50) {
        _resetParticle(i, false);
      }
    }

    // ---- Batch-Rendering: globalAlpha-Blöcke ----
    // Typ 0: Ember
    for (let i = 0; i < COUNT; i++) {
      if (ptype[i] !== 0 || palpha[i] < 0.01) continue;
      const st = getStampForParticle(i, 'ember');
      const sc = psc[i];
      const w  = st.img.width  * sc;
      const h  = st.img.height * sc;
      ctx.globalAlpha = palpha[i];
      ctx.drawImage(st.img, px[i] - w * 0.5, py[i] - h * 0.5, w, h);
    }

    // Typ 1: Dust
    for (let i = 0; i < COUNT; i++) {
      if (ptype[i] !== 1 || palpha[i] < 0.01) continue;
      const st = getStampForParticle(i, 'dust');
      const sc = psc[i];
      const w  = st.img.width  * sc;
      const h  = st.img.height * sc;
      ctx.globalAlpha = palpha[i];
      ctx.drawImage(st.img, px[i] - w * 0.5, py[i] - h * 0.5, w, h);
    }

    // Typ 2: Dark
    for (let i = 0; i < COUNT; i++) {
      if (ptype[i] !== 2 || palpha[i] < 0.01) continue;
      const st = getStampForParticle(i, 'dark');
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
      if (stateManager && subId !== null) {
        stateManager.unsubscribe(subId);
      }
      document.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', resize);
    }
  };
}