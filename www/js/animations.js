// ============================================================
// animations.js — Visual effects: ripple, tilt, confetti, particles
// ============================================================

// ── Ripple touch effect on .btn ──────────────────────────────
let _rippleInit = false;
function initRipple() {
  if (_rippleInit) return;
  _rippleInit = true;
  document.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('.btn');
    if (!btn || btn.disabled) return;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    ripple.style.width  = size + 'px';
    ripple.style.height = size + 'px';
    ripple.style.left   = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top    = (e.clientY - rect.top  - size / 2) + 'px';
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  });
}

// ── 3D Tilt on role cards ────────────────────────────────────
function initTilt() {
  document.querySelectorAll('.role-card').forEach(card => {
    if (card._tiltInit) return;
    card._tiltInit = true;
    card.classList.add('tilt-card');

    function apply(nx, ny) {
      card.style.transition = 'none';
      card.style.transform  = `perspective(700px) rotateY(${nx * 14}deg) rotateX(${-ny * 10}deg) scale(1.02)`;
    }
    function reset() {
      card.style.transition = 'transform 0.5s cubic-bezier(0.22,1,0.36,1)';
      card.style.transform  = '';
    }

    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      apply((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
    });
    card.addEventListener('mouseleave', reset);
    card.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      const r = card.getBoundingClientRect();
      apply((t.clientX - r.left) / r.width - 0.5, (t.clientY - r.top) / r.height - 0.5);
    }, { passive: true });
    card.addEventListener('touchend', reset, { passive: true });
  });
}

// ── Glitch: set data-text on .glitch elements ────────────────
function initGlitch() {
  document.querySelectorAll('.glitch:not([data-text])').forEach(el => {
    el.dataset.text = el.textContent;
  });
}

// ── Confetti rain on game end ─────────────────────────────────
function showConfetti(winner) {
  const old = document.querySelector('.confetti-canvas');
  if (old) old.remove();

  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  document.body.appendChild(canvas);

  const W = canvas.width  = window.innerWidth;
  const H = canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');

  const palettes = {
    liberal:  ['#4a90a4','#a8d0dc','#e8dcc0','#c9a961','#ffffff'],
    fascist:  ['#b73a2a','#8a1f12','#e8dcc0','#c9a961','#5a0e08'],
    hitler:   ['#b73a2a','#8a1f12','#1a0808','#c9a961','#000000'],
    communist:['#b8924a','#8a6430','#e8dcc0','#c9a961','#3d2c10'],
  };
  const palette = palettes[winner] || ['#c9a961','#e8dcc0','#b73a2a','#4a90a4'];

  const shapes  = ['rect','circle','star'];
  const parts   = Array.from({ length: 100 }, () => ({
    x: Math.random() * W,
    y: Math.random() * -H * 0.5,
    vx: (Math.random() - 0.5) * 4,
    vy: Math.random() * 2 + 1.8,
    ay: 0.06,
    color: palette[Math.floor(Math.random() * palette.length)],
    size: Math.random() * 9 + 4,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.14,
    shape: shapes[Math.floor(Math.random() * shapes.length)],
  }));

  function drawStar(c, r) {
    c.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i * 4 * Math.PI / 5) - Math.PI / 2;
      c[i ? 'lineTo' : 'moveTo'](r * Math.cos(a), r * Math.sin(a));
    }
    c.closePath();
    c.fill();
  }

  const DURATION = 4200;
  const start = performance.now();

  (function animate(now) {
    const t     = now - start;
    const alpha = Math.max(0, 1 - t / DURATION);
    ctx.clearRect(0, 0, W, H);

    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.vy += p.ay; p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.55, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'star') {
        drawStar(ctx, p.size);
      } else {
        ctx.fillRect(-p.size / 2, -p.size * 0.35, p.size, p.size * 0.7);
      }
      ctx.restore();
    }

    if (t < DURATION) requestAnimationFrame(animate);
    else canvas.remove();
  })(start);
}

// ── Floating particles background (home screen) ──────────────
let _particlesRunning = false;
function initHomeParticles() {
  if (_particlesRunning) return;
  if (document.querySelector('.home-particles')) return;
  _particlesRunning = true;

  const canvas = document.createElement('canvas');
  canvas.className = 'home-particles';
  document.body.appendChild(canvas);
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');

  const pts = Array.from({ length: 28 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.4 + 0.4,
    vx: (Math.random() - 0.5) * 0.28,
    vy: (Math.random() - 0.5) * 0.28,
    gold: Math.random() > 0.45,
  }));

  (function tick() {
    const el = document.querySelector('.home-particles');
    if (!el) { _particlesRunning = false; return; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of pts) {
      p.x = (p.x + p.vx + canvas.width)  % canvas.width;
      p.y = (p.y + p.vy + canvas.height) % canvas.height;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.gold ? 'rgba(201,169,97,0.75)' : 'rgba(183,58,42,0.55)';
      ctx.fill();
    }
    requestAnimationFrame(tick);
  })();
}

function stopHomeParticles() {
  const el = document.querySelector('.home-particles');
  if (el) el.remove();
}

// ── Master init — called after each render ───────────────────
function initAnimations(screen) {
  initRipple();
  initGlitch();
  initTilt();
  if (screen === 'home') {
    initHomeParticles();
  } else {
    stopHomeParticles();
  }
}
