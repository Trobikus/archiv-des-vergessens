// --- START OF FILE particles.js ---
export default function initParticles() {
    const bgCanvas = document.getElementById('bg-canvas');
    const fxCanvas = document.getElementById('fx-canvas');
    if (!bgCanvas || !fxCanvas) return;

    const bgCtx = bgCanvas.getContext('2d', { alpha: false });
    const fxCtx = fxCanvas.getContext('2d');

    let width, height;
    let bgParticles = [];
    let fxParticles = [];

    const mouse = { x: -1000, y: -1000 };
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    }, { passive: true });

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        bgCanvas.width = width;
        bgCanvas.height = height;
        fxCanvas.width = width;
        fxCanvas.height = height;
    }

    window.addEventListener('resize', resize, { passive: true });
    resize();

    // Dark Fantasy Embers & Ash
    class BgParticle {
        constructor() {
            this.reset(true);
        }

        reset(randomY = false) {
            this.x = Math.random() * width;
            this.y = randomY ? Math.random() * height : height + Math.random() * 100;

            const type = Math.random();
            if (type < 0.15) {
                // Bright Ember
                this.size = 1.5 + Math.random() * 2;
                this.speed = 0.8 + Math.random() * 1.5;
                this.color = '255, 120, 30'; // Fiery orange
                this.maxAlpha = 0.9;
                this.wobbleSpeed = 0.05;
            } else if (type < 0.4) {
            // Dim Ember / Gold Dust
                this.size = 1 + Math.random() * 1.5;
                this.speed = 0.4 + Math.random() * 0.8;
                this.color = '197, 160, 89'; // Tarnished Gold
                this.maxAlpha = 0.6;
                this.wobbleSpeed = 0.02;
            } else {
                // Dark Ash
                this.size = 2 + Math.random() * 3;
                this.speed = 0.2 + Math.random() * 0.5;
                this.color = '40, 40, 45'; // Dark grey
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

            // Mouse interaction (wind effect)
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < 30000) { // Radius
                const dist = Math.sqrt(distSq);
                const force = (173 - dist) / 173;
                this.baseX -= (dx / dist) * force * 3;
                this.y -= (dy / dist) * force * 3;
            }

            if (this.alpha < this.maxAlpha) this.alpha += 0.005;
            if (this.y < -50 || this.x < -50 || this.x > width + 50) this.reset();
        }

        draw(ctx) {
            ctx.fillStyle = `rgba(${this.color}, ${this.alpha})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();

            // Glow for bright embers
            if (this.maxAlpha > 0.8) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = `rgba(255, 80, 0, ${this.alpha})`;
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
    }

    // 120 Particles for dense atmosphere
    for (let i = 0; i < 120; i++) {
        bgParticles.push(new BgParticle());
    }

    // Magical Burst on Click
    window.spawnClickParticles = (x, y) => {
        const colors = ['#c5a059', '#ff781e', '#ffffff'];
        const count = 20 + Math.floor(Math.random() * 15);

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 10 + 2;
            fxParticles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 3 + 1,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 1.0,
                decay: Math.random() * 0.03 + 0.02
            });
        }
    };

    function loop() {
        // Deep Abyssal Background
        bgCtx.fillStyle = '#050507';
        bgCtx.fillRect(0, 0, width, height);

        const optParticles = document.getElementById('opt-particles');
        if (!optParticles || optParticles.checked) {
            for (let i = 0; i < bgParticles.length; i++) {
                bgParticles[i].update();
                bgParticles[i].draw(bgCtx);
            }
        }

        // FX Particles (Sparks)
        fxCtx.clearRect(0, 0, width, height);
        fxCtx.globalCompositeOperation = 'screen';

        for (let i = fxParticles.length - 1; i >= 0; i--) {
            let p = fxParticles[i];
            p.vx *= 0.90; // Friction
            p.vy *= 0.90;
            p.vy -= 0.5; // Sparks fly upwards!

            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;

            if (p.life <= 0) {
                fxParticles.splice(i, 1);
                continue;
            }

            fxCtx.globalAlpha = p.life;
            fxCtx.fillStyle = p.color;
            fxCtx.shadowBlur = 15;
            fxCtx.shadowColor = p.color;

            fxCtx.beginPath();
            fxCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            fxCtx.fill();
        }

        fxCtx.globalCompositeOperation = 'source-over';
        fxCtx.globalAlpha = 1.0;
        fxCtx.shadowBlur = 0;

        requestAnimationFrame(loop);
    }

    loop();
}