/* =========================================================
   WISHES PAGE — Typewriter + Floating particles
   ========================================================= */

(function () {
  'use strict';

  /* ---------- Config ---------- */
  const TYPE_SPEED = 40; // ms / ký tự
  const PAUSE_BETWEEN = 700; // ms giữa các đoạn
  const PAUSE_START = 900; // ms trước khi bắt đầu đoạn đầu

  /* ---------- Elements ---------- */
  const lines = Array.from(document.querySelectorAll('.wishes-line'));
  const floatingLayer = document.getElementById('floatingLayer');

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =========================================================
     TYPEWRITER
     ========================================================= */
  let cancelled = false;
  let currentIndex = 0;

  function typeLine(el, text, speed) {
    return new Promise((resolve) => {
      el.textContent = '';
      el.classList.add('is-typing');
      let i = 0;

      function step() {
        if (cancelled) return resolve();

        if (i >= text.length) {
          el.classList.remove('is-typing');
          el.classList.add('is-done');
          if (currentIndex === lines.length - 1) {
            el.classList.add('is-done-last');
          }
          return resolve();
        }

        el.textContent += text.charAt(i);
        i++;
        setTimeout(step, speed);
      }
      step();
    });
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function runTypewriter() {
    cancelled = false;
    currentIndex = 0;

    // Reset tất cả
    lines.forEach((el) => {
      el.textContent = '';
      el.classList.remove('is-typing', 'is-done', 'is-done-last');
    });

    await wait(PAUSE_START);

    for (let i = 0; i < lines.length; i++) {
      if (cancelled) break;
      currentIndex = i;
      const el = lines[i];
      const text = el.dataset.text || '';
      await typeLine(el, text, TYPE_SPEED);
      if (cancelled) break;
      if (i < lines.length - 1) await wait(PAUSE_BETWEEN);
    }
  }

  /* =========================================================
     FLOATING PARTICLES — tim / sao bay nhẹ
     ========================================================= */
  const HEART = '♥';
  const STAR = '✦';

  function spawnParticle() {
    if (prefersReduced) return;

    const p = document.createElement('span');
    p.className = 'floating-particle';

    // 60% tim, 40% sao
    const isHeart = Math.random() < 0.6;
    p.textContent = isHeart ? HEART : STAR;
    if (!isHeart) p.classList.add('is-star');

    // Vị trí xuất phát ngẫu nhiên theo chiều ngang
    p.style.left = Math.random() * 100 + 'vw';

    // Kích thước ngẫu nhiên
    const size = 10 + Math.random() * 10;
    p.style.fontSize = size + 'px';

    // Thời gian bay
    const duration = 8 + Math.random() * 6; // 8–14s
    p.style.animationDuration = duration + 's';

    // Độ trôi ngang + góc xoay
    p.style.setProperty('--drift', Math.random() * 80 - 40 + 'px');
    p.style.setProperty('--rot', Math.random() * 60 - 30 + 'deg');

    // Delay nhỏ đầu
    p.style.animationDelay = Math.random() * 1.2 + 's';

    floatingLayer.appendChild(p);

    // Xóa sau khi bay xong
    p.addEventListener('animationend', () => p.remove());
  }

  function startParticles() {
    if (prefersReduced) return;

    // Sinh đều đặn
    setInterval(spawnParticle, 700);

    // Bắn một loạt đầu trang cho sinh động
    for (let i = 0; i < 5; i++) {
      setTimeout(spawnParticle, i * 220);
    }
  }

  /* =========================================================
     INIT
     ========================================================= */
  function init() {
    if (prefersReduced) {
      // Không chạy typewriter nếu user không thích chuyển động
      lines.forEach((el, idx) => {
        el.textContent = el.dataset.text || '';
        el.classList.add('is-done');
        if (idx === lines.length - 1) el.classList.add('is-done-last');
      });
      return;
    }

    runTypewriter();
    startParticles();
  }

  // Đợi DOM + font sẵn sàng để chiều cao không nhảy
  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);
})();
