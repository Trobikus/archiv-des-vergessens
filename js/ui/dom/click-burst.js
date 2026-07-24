import { calculateAlignment } from './particles.js';

export function initClickBurst(stateManager) {
  const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('fx-canvas'));
  if (!canvas) return { destroy: () => {} };

  const ctx = canvas.getContext('2d', { alpha: true });
  let width = window.innerWidth;
  let height = window.innerHeight;
  
  canvas.width = width;
  canvas.height = height;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
  }
  window.addEventListener('resize', resize, { passive: true });

  let animationId = null;
  let particles = [];

  // --- Stamps creation ---
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

  const stAethel = mkGeometricStamp('rgba(255,230,120,1.0)', 'rgba(255,200,50,0.6)', 3, 15);
  const stLethe = mkStamp('rgba(190,80,255,0.9)', 'rgba(120,20,200,0.5)', 4, 20);
  const stNeutral = mkStamp('rgba(200,200,200,0.9)', 'rgba(150,150,150,0.4)', 2, 10);

  function spawnBurst(x, y, alignment) {
    const total = alignment.aethel + alignment.lethe;
    let type = 'neutral';
    
    if (total > 0) {
      if (alignment.aethel > alignment.lethe) type = 'aethel';
      else if (alignment.lethe > alignment.aethel) type = 'lethe';
      else type = Math.random() > 0.5 ? 'aethel' : 'lethe';
    }

    const count = 10 + Math.floor(Math.random() * 6); // 10 to 15
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      let speed, life, size;
      let stamp;

      if (type === 'aethel') {
        speed = 2 + Math.random() * 4;
        life = 0.5 + Math.random() * 0.5;
        size = 0.5 + Math.random() * 1.0;
        stamp = stAethel;
      } else if (type === 'lethe') {
        speed = 1 + Math.random() * 2.5;
        life = 0.8 + Math.random() * 0.8;
        size = 0.8 + Math.random() * 1.5;
        stamp = stLethe;
      } else {
        speed = 1.5 + Math.random() * 3;
        life = 0.4 + Math.random() * 0.4;
        size = 0.6 + Math.random() * 0.8;
        stamp = stNeutral;
      }

      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size,
        type,
        stamp,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: (Math.random() - 0.5) * 0.2
      });
    }

    if (!animationId) {
      animationId = requestAnimationFrame(loop);
    }
  }

  function loop() {
    ctx.clearRect(0, 0, width, height);

    if (particles.length === 0) {
      animationId = null;
      return;
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      let p = particles[i];
      p.life -= 0.016; // approx 60fps

      if (p.life <= 0) {
        particles[i] = particles[particles.length - 1];
        particles.pop();
        continue;
      }

      p.x += p.vx;
      p.y += p.vy;

      if (p.type === 'lethe') {
        p.wobble += p.wobbleSpeed;
        p.x += Math.sin(p.wobble) * 0.5;
        p.vy -= 0.02; // slight float up
      } else if (p.type === 'aethel') {
        p.vy += 0.05; // slight gravity
      }

      const alpha = Math.max(0, p.life / p.maxLife);
      const s = p.size;
      const w = p.stamp.img.width * s;
      const h = p.stamp.img.height * s;

      ctx.globalAlpha = alpha;
      ctx.drawImage(p.stamp.img, p.x - w * 0.5, p.y - h * 0.5, w, h);
    }
    ctx.globalAlpha = 1.0;

    if (particles.length > 0) {
      animationId = requestAnimationFrame(loop);
    } else {
      ctx.clearRect(0, 0, width, height);
      animationId = null;
    }
  }

  const onClick = (e) => {
    let state = stateManager ? stateManager.getState() : null;
    let alignment = { aethel: 0, lethe: 0 };
    if (state) {
      alignment = calculateAlignment(state);
    }
    spawnBurst(e.clientX, e.clientY, alignment);
  };

  document.addEventListener('click', onClick, { passive: true });

  return {
    destroy: () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('resize', resize);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    }
  };
}
