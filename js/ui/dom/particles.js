/**
 * ============================================================
 * FILE: ui/dom/particles.js – Hintergrundpartikel (Canvas)
 * ============================================================
 */

export function initParticles() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return { setEnabled: () => {}, destroy: () => {} };

  const ctx = canvas.getContext('2d', { alpha: false });
  let width, height;
  let particles = [];
  const particleCount = 120;
  let enabled = true;
  let animationId = null;

  const mouse = { x: -1000, y: -1000 };
  const onMouseMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
  document.addEventListener('mousemove', onMouseMove, { passive: true });

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  class Particle {
    constructor() {
      this.reset(true);
    }

    reset(randomY = false) {
      this.x = Math.random() * width;
      this.y = randomY ? Math.random() * height : height + Math.random() * 100;
      const type = Math.random();
      if (type < 0.15) {
        this.size = 1.5 + Math.random() * 2;
        this.speed = 0.8 + Math.random() * 1.5;
        this.color = '255, 120, 30';
        this.maxAlpha = 0.9;
        this.wobbleSpeed = 0.05;
      } else if (type < 0.4) {
        this.size = 1 + Math.random() * 1.5;
        this.speed = 0.4 + Math.random() * 0.8;
        this.color = '197, 160, 89';
        this.maxAlpha = 0.6;
        this.wobbleSpeed = 0.02;
      } else {
        this.size = 2 + Math.random() * 3;
        this.speed = 0.2 + Math.random() * 0.5;
        this.color = '40, 40, 45';
        this.maxAlpha = 0.4;
        this.wobbleSpeed = 0.01;
      }
      this.wobble = Math.random() * Math.PI * 2;
      this.baseX = this.x;
      this.alpha = 0;
    }

    update() {
      this.y -= this.speed;
      this.wobble += this.wobbleSpeed;
      this.x = this.baseX + Math.sin(this.wobble) * 15;

      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < 30000) {
        const dist = Math.sqrt(distSq);
        const force = (173 - dist) / 173;
        this.baseX -= (dx / dist) * force * 3;
        this.y -= (dy / dist) * force * 3;
      }

      if (this.alpha < this.maxAlpha) this.alpha += 0.005;
      if (this.y < -50 || this.x < -50 || this.x > width + 50) this.reset();
    }

    draw() {
      ctx.fillStyle = `rgba(${this.color}, ${this.alpha})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      if (this.maxAlpha > 0.8) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = `rgba(255, 80, 0, ${this.alpha})`;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }

  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  function loop() {
    if (!enabled) {
      ctx.fillStyle = '#050507';
      ctx.fillRect(0, 0, width, height);
      animationId = requestAnimationFrame(loop);
      return;
    }

    ctx.fillStyle = '#050507';
    ctx.fillRect(0, 0, width, height);

    for (const p of particles) {
      p.update();
      p.draw();
    }

    animationId = requestAnimationFrame(loop);
  }

  loop();

  return {
    setEnabled: (value) => { enabled = value; },
    destroy: () => {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      document.removeEventListener('mousemove', onMouseMove);
    }
  };
}