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

    class BgParticle {
        constructor() {
            this.reset(true);
        }

        reset(randomY = false) {
            this.x = Math.random() * width;
            this.y = randomY ? Math.random() * height : height + Math.random() * 100;

            const depth = Math.random();
            if (depth < 0.2) {
                this.size = 2 + Math.random() * 2;
                this.speed = 0.2 + Math.random() * 0.3;
                this.color = '212, 175, 55'; // Gold
                this.maxAlpha = 0.8;
            } else if (depth < 0.6) {
                this.size = 1 + Math.random() * 1.5;
                this.speed = 0.5 + Math.random() * 0.5;
                this.color = '110, 159, 203'; // Blue
                this.maxAlpha = 0.5;
            } else {
                this.size = 0.5 + Math.random() * 1;
                this.speed = 1 + Math.random() * 1;
                this.color = '255, 255, 255';
                this.maxAlpha = 0.3;
            }

            this.drift = (Math.random() - 0.5) * 0.5;
            this.alpha = 0;
        }

        update() {
            this.y -= this.speed;
            this.x += this.drift;

            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < 22500) { // 150 * 150 (Radius)
                const dist = Math.sqrt(distSq);
                const force = (150 - dist) / 150;
                this.x -= (dx / dist) * force * 2;
                this.y -= (dy / dist) * force * 2;
            }

            if (this.alpha < this.maxAlpha) this.alpha += 0.01;
            if (this.y < -50 || this.x < -50 || this.x > width + 50) this.reset();
        }

        draw(ctx) {
            ctx.fillStyle = `rgba(${this.color}, ${this.alpha})`;
            ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        }
    }

    // 80 Partikel für das Hintergrund-Netzwerk
    for (let i = 0; i < 80; i++) {
        bgParticles.push(new BgParticle());
    }

    window.spawnClickParticles = (x, y) => {
        const colors = ['#d4af37', '#ffffff', '#6e9fcb'];
        const count = 15 + Math.floor(Math.random() * 10);

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 8 + 4;
            fxParticles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 3 + 1,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 1.0,
                decay: Math.random() * 0.02 + 0.02
            });
        }
    };

    const maxDistSq = 120 * 120; // 14400

    function loop() {
        bgCtx.fillStyle = '#07070a';
        bgCtx.fillRect(0, 0, width, height);

        const optParticles = document.getElementById('opt-particles');
        if (!optParticles || optParticles.checked) {
            // Partikel-Updates & Rendering
            for (let i = 0; i < bgParticles.length; i++) {
                bgParticles[i].update();
                bgParticles[i].draw(bgCtx);
            }

            // Optimierte Linienberechnung (Konstellationsnetzwerk)
            bgCtx.lineWidth = 0.5;
            bgCtx.beginPath();

            for (let i = 0; i < bgParticles.length; i++) {
                const p1 = bgParticles[i];
                for (let j = i + 1; j < bgParticles.length; j++) {
                    const p2 = bgParticles[j];
                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const distSq = dx * dx + dy * dy;

                    if (distSq < maxDistSq) {
                        const dist = Math.sqrt(distSq);
                        const opacity = (1 - (dist / 120)) * 0.15;
                        bgCtx.strokeStyle = `rgba(212, 175, 55, ${opacity})`;
                        bgCtx.moveTo(p1.x, p1.y);
                        bgCtx.lineTo(p2.x, p2.y);
                    }
                }
            }
            bgCtx.stroke();
        }

        // FX Partikel
        fxCtx.clearRect(0, 0, width, height);
        fxCtx.globalCompositeOperation = 'lighter';

        for (let i = fxParticles.length - 1; i >= 0; i--) {
            let p = fxParticles[i];
            p.vx *= 0.92;
            p.vy *= 0.92;
            p.vy += 0.2; // Schwerkraft-Simulation

            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;

            if (p.life <= 0) {
                fxParticles.splice(i, 1);
                continue;
            }

            fxCtx.globalAlpha = p.life;
            fxCtx.fillStyle = p.color;

            fxCtx.beginPath();
            fxCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            fxCtx.fill();
        }

        fxCtx.globalCompositeOperation = 'source-over';
        fxCtx.globalAlpha = 1.0;

        requestAnimationFrame(loop);
    }

    loop();
}