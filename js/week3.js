/* =========================================================
   WEEK 3 — 7 ngày chuẩn bị
   Sub-step 10B: Ngày 1 — Mặt trăng → Mặt trời
   ========================================================= */

(function () {
  ('use strict');

  /* =========================================================
     CONFIG
     ========================================================= */
  const WEEK3_UNLOCK = new Date('2025-10-02T00:00:00+07:00');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =========================================================
   ROUTER STATE — trong memory, không localStorage
   ========================================================= */
  const routerState = {
    view: 'calendar', // "calendar" | "day"
    dayIndex: null, // 0-6 (Ngày 1-7)
    playedDays: [false, false, false, false, false, false, false],
  };

  // Ngày bắt đầu 7 ngày (2/10/2026)
  const WEEK3_START_DAY = 2; // Ngày 2/10
  const WEEK3_END_DAY = 8; // Ngày 8/10

  // Map ngày → hàm render
  const DAY_RENDERERS = [
    renderDay1,
    renderDay2,
    renderDay3,
    renderDay4,
    renderDay5,
    renderDay6,
    renderDay7,
  ];

  const DAY_LABELS = ['Ngày 1', 'Ngày 2', 'Ngày 3', 'Ngày 4', 'Ngày 5', 'Ngày 6', 'Ngày 7'];
  const DAY_ICONS = ['🌙', '🎫', '🧩', '🎴', '✋', '🔤', '🎁'];

  // Ngày 1 config
  const DAY1_STEPS = 15;
  const DAY1_TIMEOUT_MS = 500;

  // Message random cho Ngày 1
  const DAY1_MESSAGES = [
    'Bình minh của Bí Bi là Bé Be.',
    'Đêm dài rồi cũng qua. Và bình minh — luôn đến.',
    'Có những điều chỉ sáng lên khi ta kiên nhẫn chờ.',
    'Có những khoảng u tối. Chỉ sáng lên khi — có em.',
  ];
  // Ngày 2 config
  const DAY2_MESSAGES = [
    'Có những điều ta chỉ nhận ra khi gỡ bỏ đi lớp ngăn cách.',
    'Không phải mọi thứ đều rõ ràng. Nhưng ta đã học cách nhìn.',
    'Điều bị che giấu — đôi khi là điều cần thấy nhất.',
    'Có những sự thật ta chỉ dám đối diện khi đã sẵn sàng.',
  ];
  const DAY2_THRESHOLD = 0.85; // 70% → auto xóa hết
  const DAY2_SCRATCH_RADIUS = 25; // px
  // Ngày 3 config
  const DAY3_QUESTIONS = [
    {
      words: ['Yêu', 'không', 'phải', 'là', 'hoàn hảo'],
      fullText: 'Yêu không phải là hoàn hảo.',
    },
    {
      words: ['Chúng', 'ta', 'đi', 'cùng', 'nhau'],
      fullText: 'Chúng ta đi cùng nhau.',
    },
    {
      words: ['Và', 'vẫn', 'chọn', 'nhau', 'mỗi ngày'],
      fullText: 'Và vẫn chọn nhau mỗi ngày.',
    },
  ];

  const DAY3_MESSAGES = [
    'Ba câu — ba điều điều dành cho chúng ta.',
    'Có những điều đơn giản — nhưng cần được nói ra.',
    'Tuy khó khăn nhưng không phải là không thể.',
  ];

  // Ngày 4 config
  const DAY4_PAIRS = [
    {
      left: 'Điều anh muốn thấy ở em',
      right: 'là nụ cười của em.',
    },
    {
      left: 'Điều anh nhớ nhất',
      right: 'là những kỉ niệm của chúng ta.',
    },
    {
      left: 'Điều anh sợ nhất',
      right: 'là không được đồng hành cùng em.',
    },
  ];

  const DAY4_MESSAGES = [
    'Ký ức không phải là điều đã qua — mà là điều còn ở lại.',
    'Có những điều anh không muốn quên — dù thời gian trôi.',
    'Những điều anh luôn muốn làm vì em.',
  ];

  // Ngày 5 config
  const DAY5_MESSAGES = [
    'Có những điều ta chỉ thấy rõ — khi đã đủ kiên nhẫn.',
    'Không phải mọi thứ đều hiện ra ngay. Và điều đó — ổn.',
    'Ta học cách chờ. Và ta học cách nhìn.',
  ];

  const DAY5_WIPE_SPEED = 0.35; // Tốc độ lau (progress/giây)
  const DAY5_COMPLETE_THRESHOLD = 0.92; // Đủ 92% → hoàn thành
  const DAY5_RECOVER_SPEED = 1.2; // Tốc độ sương quay lại khi thả
  const DAY5_WIPE_RADIUS = 45; // Bán kính miếng bọt (px)

  // Ngày 6 config
  const DAY6_QUESTIONS = [
    {
      question: 'Điều tôi thích nhất ở em là gì?',
      choices: [
        'Nụ cười — vì nó làm mọi thứ nhẹ đi.',
        'Sự kiên nhẫn — vì em luôn chờ anh.',
        'Đôi mắt — vì em luôn nhìn anh tin tưởng.',
      ],
      correctIndex: 0,
      feedbackCorrect:
        'Đúng rồi. Nụ cười của em — thật ra anh thích nhất là khi em cười vì anh. Không phải vì anh đùa hay, mà vì em thật sự vui.',
      feedbackWrong:
        'Gần đúng rồi... nhưng thật ra — điều anh thích nhất là nụ cười của em. Khi em cười — mọi thứ nhẹ đi.',
    },
    {
      question: 'Điều tôi nhớ nhất về chúng ta là gì?',
      choices: [
        'Chuyến đi xa đầu tiên — khi ta cùng một chuyến xe.',
        'Những chuyến đi cuối tuần — khi ta dành thời gian.',
        'Buổi tối bình yên — khi chúng ta không nói gì cả.',
      ],
      correctIndex: 1,
      feedbackCorrect:
        'Đúng rồi. Những chuyến đi cuối tuần. Anh rất trân trọng từng thời gian bên em.',
      feedbackWrong:
        'Không hẳn... điều anh nhớ nhất là những chuyến đi cuối tuần. Khi em cười — anh biết là anh làm em hạnh phúc.',
    },
    {
      question: 'Điều tôi sợ nhất là gì?',
      choices: ['Sợ mình không đủ tốt.', 'Sợ thời gian trôi quá nhanh.', 'Sợ mất em.'],
      correctIndex: 2,
      feedbackCorrect:
        'Đúng rồi. Sợ mất em — vì em là điều quan trọng nhất. Và anh sẽ không muốn điều đó xảy ra.',
      feedbackWrong:
        'Gần đúng... nhưng điều anh sợ nhất là mất em. Mọi thứ khác — anh có thể đối mặt. Nhưng mất em — anh không biết phải làm sao.',
    },
  ];

  const DAY6_MESSAGES = [
    'Và cả ba điều — đều là em.',
    'Có những điều tôi không nói ra — nhưng tôi đã nghĩ rất nhiều.',
    'Có những điều anh chưa thể hiện ra bên ngoài.',
  ];

  // Ngày 7 config
  const DAY7_MESSAGES = ['Và đây là điều quan trọng: Tất cả mọi điều là cho em và chúng ta.'];

  /* =========================================================
     SECTION + HELPERS
     ========================================================= */
  const section = document.getElementById('week-3');

  function clearSection() {
    if (!section) return;
    section.innerHTML = '';
  }

  function cloneTemplate(id) {
    const tpl = document.getElementById(id);
    if (!tpl) return null;
    return tpl.content.cloneNode(true);
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /* =========================================================
     NGÀY 1 — MẶT TRĂNG → MẶT TRỜI
     ========================================================= */
  function renderDay1() {
    if (!section) return;
    clearSection();

    const clone = cloneTemplate('week3-day1-template');
    if (!clone) return;

    section.appendChild(clone);

    // Lấy refs
    const day1El = section.querySelector('[data-day1]');
    const stage = section.querySelector('[data-day1-stage]');
    const celestial = section.querySelector('[data-day1-celestial]');
    const trail = section.querySelector('[data-day1-trail]');
    const moonEl = section.querySelector('.celestial-moon');
    const sunEl = section.querySelector('.celestial-sun');
    const skyEl = section.querySelector('[data-day1-sky]');
    const starsEl = section.querySelector('[data-day1-stars]');
    const landscapeEl = section.querySelector('[data-day1-landscape]');
    const progressBar = section.querySelector('[data-day1-progress-bar]');
    const contentEl = section.querySelector('[data-day1-content]');
    const messageEl = section.querySelector('[data-day1-message]');

    if (!day1El || !stage || !celestial) return;

    // ---- STATE ----
    let step = 0;
    let currentProgress = 0;
    let targetProgress = 0;
    let timeoutId = null;
    let rafId = null;
    let done = false;

    // ---- VỊ TRÍ THEO CUNG (phẳng hơn) ----
    function getPositionFromProgress(progress) {
      const angleDeg = 180 - progress * 135; // 180° → 45°
      const angleRad = (angleDeg * Math.PI) / 180;

      const centerXPercent = 50;
      const centerYPercent = 90;
      const radiusXPercent = 42;
      const radiusYPercent = 50;

      const x = centerXPercent + radiusXPercent * Math.cos(angleRad);
      const y = centerYPercent - radiusYPercent * Math.sin(angleRad);

      return { x, y };
    }

    // ---- HELPER: NỘI SUY MÀU ----
    function lerpColor(a, b, t) {
      t = Math.max(0, Math.min(1, t));
      return {
        r: Math.round(a.r + (b.r - a.r) * t),
        g: Math.round(a.g + (b.g - a.g) * t),
        b: Math.round(a.b + (b.b - a.b) * t),
      };
    }

    function rgbStr(c) {
      return `rgb(${c.r}, ${c.g}, ${c.b})`;
    }

    // ---- CẬP NHẬT VISUAL ----
    function updateVisuals(progress) {
      // 1. Vị trí thiên thể
      const { x, y } = getPositionFromProgress(progress);
      celestial.style.left = x + '%';
      celestial.style.top = y + '%';
      celestial.style.transform = 'translate(-50%, -50%)';

      // 2. Trail
      if (trail) {
        const trailProgress = Math.max(0, progress - 0.02);
        const trailPos = getPositionFromProgress(trailProgress);
        trail.style.left = trailPos.x + '%';
        trail.style.top = trailPos.y + '%';

        const speed = Math.abs(targetProgress - currentProgress);
        trail.style.opacity = String(Math.min(1, speed * 6));
      }

      // 3. Chuyển màu trăng → trời (mượt hơn)
      if (moonEl) {
        const moonOpacity = Math.max(0, 1 - (progress - 0.25) / 0.75);
        moonEl.style.opacity = String(moonOpacity);
      }
      if (sunEl) {
        const sunOpacity = Math.max(0, (progress - 0.25) / 0.75);
        sunEl.style.opacity = String(Math.min(1, sunOpacity));
      }

      // 4. Trail đổi màu
      if (trail) {
        if (progress < 0.5) {
          trail.classList.add('is-moon');
          trail.classList.remove('is-sun');
        } else {
          trail.classList.add('is-sun');
          trail.classList.remove('is-moon');
        }
      }

      // 5. Bầu trời — nội suy nhiều mốc màu
      if (skyEl) {
        // Palette: đêm → bình minh → sáng
        const nightTop = { r: 5, g: 6, b: 15 };
        const nightMid = { r: 10, g: 13, b: 31 };
        const nightBot = { r: 20, g: 18, b: 42 };

        const dawnTop = { r: 58, g: 48, b: 80 };
        const dawnMid = { r: 140, g: 100, b: 120 };
        const dawnBot = { r: 220, g: 150, b: 130 };

        const dayTop = { r: 250, g: 220, b: 160 };
        const dayMid = { r: 240, g: 195, b: 120 };
        const dayBot = { r: 210, g: 150, b: 100 };

        let topColor, midColor, botColor;

        if (progress < 0.5) {
          const t = progress / 0.5;
          topColor = lerpColor(nightTop, dawnTop, t);
          midColor = lerpColor(nightMid, dawnMid, t);
          botColor = lerpColor(nightBot, dawnBot, t);
        } else {
          const t = (progress - 0.5) / 0.5;
          topColor = lerpColor(dawnTop, dayTop, t);
          midColor = lerpColor(dawnMid, dayMid, t);
          botColor = lerpColor(dawnBot, dayBot, t);
        }

        skyEl.style.background = `linear-gradient(180deg,
        ${rgbStr(topColor)} 0%,
        ${rgbStr(midColor)} 50%,
        ${rgbStr(botColor)} 100%)`;
      }

      // 6. Sao mờ dần
      if (starsEl) {
        starsEl.style.opacity = String(Math.max(0, 1 - progress * 1.5));
      }

      // 7. Cảnh vật — đổi màu theo progress
      if (landscapeEl) {
        // Từ đen tuyền → xanh đêm → xanh bình minh
        const darkMountains = { r: 10, g: 10, b: 24 };
        const darkHills = { r: 6, g: 6, b: 16 };
        const darkTrees = { r: 3, g: 3, b: 8 };

        const dawnMountains = { r: 80, g: 60, b: 90 };
        const dawnHills = { r: 60, g: 45, b: 75 };
        const dawnTrees = { r: 40, g: 30, b: 55 };

        const dayMountains = { r: 120, g: 100, b: 110 };
        const dayHills = { r: 90, g: 80, b: 100 };
        const dayTrees = { r: 60, g: 55, b: 80 };

        let mountainColor, hillColor, treeColor;

        if (progress < 0.5) {
          const t = progress / 0.5;
          mountainColor = lerpColor(darkMountains, dawnMountains, t);
          hillColor = lerpColor(darkHills, dawnHills, t);
          treeColor = lerpColor(darkTrees, dawnTrees, t);
        } else {
          const t = (progress - 0.5) / 0.5;
          mountainColor = lerpColor(dawnMountains, dayMountains, t);
          hillColor = lerpColor(dawnHills, dayHills, t);
          treeColor = lerpColor(dawnTrees, dayTrees, t);
        }

        const mountains = landscapeEl.querySelector('.landscape-mountains');
        const hills = landscapeEl.querySelector('.landscape-hills');
        const trees = landscapeEl.querySelector('.landscape-trees');

        if (mountains) mountains.style.color = rgbStr(mountainColor);
        if (hills) hills.style.color = rgbStr(hillColor);
        if (trees) trees.style.color = rgbStr(treeColor);
      }

      // 8. Progress bar
      if (progressBar) {
        progressBar.style.width = progress * 100 + '%';
      }
    }

    // ---- ANIMATION LOOP ----
    let lastFrameTime = performance.now();

    function animate() {
      const now = performance.now();
      const dt = Math.min((now - lastFrameTime) / 1000, 0.05);
      lastFrameTime = now;

      const diff = targetProgress - currentProgress;

      if (Math.abs(diff) > 0.0005) {
        // Easing mượt — dùng exponential smoothing
        const smoothing = 1 - Math.pow(0.001, dt); // ~0.109 mỗi frame ở 60fps
        currentProgress += diff * smoothing;
      } else {
        currentProgress = targetProgress;
      }

      updateVisuals(currentProgress);
      rafId = requestAnimationFrame(animate);
    }

    // ---- CLICK ----
    function handleStep() {
      if (done) return;

      step = Math.min(step + 1, DAY1_STEPS);
      targetProgress = step / DAY1_STEPS;

      if (!day1El.classList.contains('is-active')) {
        day1El.classList.add('is-active');
      }

      if (timeoutId) clearTimeout(timeoutId);

      if (step < DAY1_STEPS) {
        timeoutId = setTimeout(() => {
          if (done) return;
          handleTimeoutTick();
        }, DAY1_TIMEOUT_MS);
      } else {
        completeDay1();
      }
    }

    function handleTimeoutTick() {
      if (done || step === 0) return;

      step = Math.max(step - 1, 0);
      targetProgress = step / DAY1_STEPS;

      if (step === 0) {
        day1El.classList.remove('is-active');
      } else {
        timeoutId = setTimeout(handleTimeoutTick, DAY1_TIMEOUT_MS);
      }
    }

    function completeDay1() {
      if (done) return;
      done = true;

      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      day1El.classList.add('is-done');
      day1El.classList.remove('is-active', 'is-transforming');

      if (messageEl) {
        messageEl.textContent = randomFrom(DAY1_MESSAGES);
      }
      if (contentEl) {
        contentEl.hidden = false;
      }
    }

    // ---- BIND ----
    stage.addEventListener('click', handleStep);
    stage.addEventListener(
      'touchstart',
      (e) => {
        if (e.cancelable) e.preventDefault();
        handleStep();
      },
      { passive: false },
    );

    // ---- INIT ----
    currentProgress = 0;
    targetProgress = 0;
    updateVisuals(0);
    rafId = requestAnimationFrame(animate);
  }

  /* =========================================================
   NGÀY 2 — CÀO THẺ
   ========================================================= */
  function renderDay2() {
    if (!section) return;
    clearSection();

    const clone = cloneTemplate('week3-day2-template');
    if (!clone) return;

    section.appendChild(clone);

    // Refs
    const day2El = section.querySelector('[data-day2]');
    const card = section.querySelector('[data-day2-card]');
    const canvas = section.querySelector('[data-day2-canvas]');
    const progressBar = section.querySelector('[data-day2-progress-bar]');
    const messageEl = section.querySelector('[data-day2-message]');

    if (!day2El || !card || !canvas) return;

    // Set message random ngay (vì user chưa thấy — sẽ thấy khi cào)
    if (messageEl) {
      messageEl.textContent = randomFrom(DAY2_MESSAGES);
    }

    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let done = false;
    let lastX = null;
    let lastY = null;

    // Set canvas size — chờ layout xong
    function setupCanvas() {
      const rect = card.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        requestAnimationFrame(setupCanvas);
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Vẽ lớp phủ bạc
      drawSilverCover(rect.width, rect.height);
    }

    function drawSilverCover(w, h) {
      // Gradient bạc
      const gradient = ctx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, '#c8c8cc');
      gradient.addColorStop(0.3, '#e0d8c0');
      gradient.addColorStop(0.5, '#d8c8a8');
      gradient.addColorStop(0.7, '#e8d4a0');
      gradient.addColorStop(1, '#b8a880');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      // Texture nhẹ — noise dots
      ctx.globalAlpha = 0.15;
      for (let i = 0; i < 300; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = Math.random() * 1.5 + 0.5;
        ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#808080';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Chữ "CÀO ĐỂ MỞ" in chìm
      ctx.save();
      ctx.font = `600 ${Math.max(20, w * 0.04)}px 'Be Vietnam Pro', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(60, 40, 20, 0.18)';
      ctx.translate(w / 2, h / 2);
      ctx.rotate(-0.08);
      ctx.fillText('CÀO ĐỂ MỞ', 0, 0);
      ctx.restore();

      // Lớp highlight — bóng sáng
      ctx.save();
      const hl = ctx.createRadialGradient(w * 0.3, h * 0.2, 0, w * 0.3, h * 0.2, w * 0.6);
      hl.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
      hl.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = hl;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // ---- SCRATCH ----
    function scratch(x, y) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, DAY2_SCRATCH_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    function scratchLine(x1, y1, x2, y2) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = DAY2_SCRATCH_RADIUS * 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // ---- ĐO % ĐÃ CÀO ----
    function checkScratchPercent() {
      const w = canvas.width;
      const h = canvas.height;
      const imageData = ctx.getImageData(0, 0, w, h);
      const pixels = imageData.data;
      const total = pixels.length / 4;
      let cleared = 0;

      // Sample mỗi 16 pixel để nhanh hơn (thay vì đếm hết)
      for (let i = 3; i < pixels.length; i += 4 * 16) {
        if (pixels[i] === 0) cleared++;
      }

      const sampled = Math.floor(total / 16);
      const percent = cleared / sampled;

      if (progressBar) {
        progressBar.style.width = Math.min(100, (percent * 100) / DAY2_THRESHOLD) + '%';
      }

      if (percent >= DAY2_THRESHOLD && !done) {
        completeDay2();
      }
    }

    let checkThrottle = null;
    function throttledCheck() {
      if (checkThrottle) return;
      checkThrottle = setTimeout(() => {
        checkThrottle = null;
        checkScratchPercent();
      }, 120);
    }

    // ---- COMPLETE ----
    function completeDay2() {
      if (done) return;
      done = true;

      // Fade canvas ra
      canvas.style.transition = 'opacity 0.8s ease-out';
      canvas.style.opacity = '0';

      day2El.classList.add('is-done');
      day2El.classList.remove('is-scratching');

      // Ẩn progress
      if (progressBar) {
        progressBar.style.width = '100%';
      }
    }

    // ---- POINTER EVENTS ----
    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }

    canvas.addEventListener('pointerdown', (e) => {
      if (done) return;
      isDrawing = true;
      day2El.classList.add('is-scratching');

      const pos = getPos(e);
      lastX = pos.x;
      lastY = pos.y;
      scratch(pos.x, pos.y);
      canvas.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!isDrawing || done) return;

      const pos = getPos(e);
      if (lastX !== null) {
        scratchLine(lastX, lastY, pos.x, pos.y);
      } else {
        scratch(pos.x, pos.y);
      }
      lastX = pos.x;
      lastY = pos.y;

      throttledCheck();
      e.preventDefault();
    });

    canvas.addEventListener('pointerup', () => {
      isDrawing = false;
      lastX = null;
      lastY = null;
      checkScratchPercent();
    });

    canvas.addEventListener('pointercancel', () => {
      isDrawing = false;
      lastX = null;
      lastY = null;
    });

    canvas.addEventListener('pointerleave', () => {
      isDrawing = false;
      lastX = null;
      lastY = null;
    });

    // ---- INIT ----
    setupCanvas();
  }

  /* =========================================================
     NGÀY 3 — NỐI TỪ (3 CÂU)
     ========================================================= */
  function renderDay3() {
    if (!section) return;
    clearSection();

    const clone = cloneTemplate('week3-day3-template');
    if (!clone) return;

    section.appendChild(clone);

    // Refs
    const completedWrap = section.querySelector('[data-day3-completed]');
    const currentWrap = section.querySelector('[data-day3-current]');
    const contentEl = section.querySelector('[data-day3-content]');
    const messageEl = section.querySelector('[data-day3-message]');

    if (!completedWrap || !currentWrap) return;

    const totalQuestions = DAY3_QUESTIONS.length;
    let currentIndex = 0;

    // Lưu DOM câu đã xong
    const completedLines = [];

    // ---- RENDER CÂU HIỆN TẠI ----
    function renderCurrentQuestion() {
      currentWrap.innerHTML = '';

      const question = DAY3_QUESTIONS[currentIndex];
      if (!question) return;

      const correctWords = question.words;
      const totalWords = correctWords.length;

      // Label
      const label = document.createElement('p');
      label.className = 'week3-day3-label';
      label.textContent = `Câu ${currentIndex + 1}/${totalQuestions}`;
      currentWrap.appendChild(label);

      // Slots
      const slotsWrap = document.createElement('div');
      slotsWrap.className = 'week3-day3-slots';
      currentWrap.appendChild(slotsWrap);

      // Words
      const wordsWrap = document.createElement('div');
      wordsWrap.className = 'week3-day3-words';
      currentWrap.appendChild(wordsWrap);

      // Render slots
      const slotTpl = document.getElementById('week3-day3-slot-template');
      const slotEls = [];
      correctWords.forEach((_, i) => {
        const sClone = slotTpl.content.cloneNode(true);
        const slot = sClone.querySelector('.week3-slot');
        slot.dataset.slotIndex = String(i);
        slotsWrap.appendChild(sClone);
        slotEls.push(slot);
      });

      // Render words (xáo trộn)
      const wordTpl = document.getElementById('week3-day3-word-template');
      const indices = [...Array(totalWords).keys()];
      const shuffled = shuffleArray(indices);
      const wordEls = [];

      shuffled.forEach((originalIndex) => {
        const wClone = wordTpl.content.cloneNode(true);
        const wordBtn = wClone.querySelector('.week3-word');
        const wordText = wClone.querySelector('[data-word-text]');

        wordText.textContent = correctWords[originalIndex];
        wordBtn.dataset.wordIndex = String(originalIndex);

        wordsWrap.appendChild(wClone);
        wordEls.push(wordBtn);
      });

      // State cho câu hiện tại
      let currentSlot = 0;

      // Click handler
      function handleWordClick(e) {
        const wordBtn = e.currentTarget;
        if (!wordBtn) return;
        if (wordBtn.classList.contains('is-used')) return;

        const wordIndex = parseInt(wordBtn.dataset.wordIndex, 10);

        if (wordIndex === currentSlot) {
          // Đúng
          const slot = slotEls[currentSlot];
          const slotText = slot.querySelector('[data-slot-text]');
          slotText.textContent = correctWords[wordIndex];
          slot.classList.add('is-filled');
          wordBtn.classList.add('is-used');
          currentSlot++;

          if (currentSlot >= totalWords) {
            // Câu xong
            setTimeout(() => completeCurrentQuestion(), 400);
          }
        } else {
          // Sai — rung
          wordBtn.classList.add('is-wrong');
          setTimeout(() => wordBtn.classList.remove('is-wrong'), 500);
        }
      }

      wordEls.forEach((el) => el.addEventListener('click', handleWordClick));
    }

    // ---- HOÀN THÀNH 1 CÂU ----
    function completeCurrentQuestion() {
      const question = DAY3_QUESTIONS[currentIndex];
      if (!question) return;

      // Thêm dòng "đã xong" vào completedWrap
      const line = document.createElement('div');
      line.className = 'week3-completed-line';
      line.textContent = question.fullText;
      completedWrap.appendChild(line);
      completedLines.push(line);

      // Chuyển sang câu tiếp
      currentIndex++;

      if (currentIndex >= totalQuestions) {
        // Hết 3 câu
        currentWrap.innerHTML = '';
        completeDay3();
      } else {
        // Render câu tiếp
        renderCurrentQuestion();
      }
    }

    // ---- HOÀN THÀNH CẢ 3 CÂU ----
    function completeDay3() {
      setTimeout(() => {
        if (messageEl) {
          messageEl.textContent = randomFrom(DAY3_MESSAGES);
        }
        if (contentEl) {
          contentEl.hidden = false;
        }
      }, 400);
    }

    // ---- INIT ----
    renderCurrentQuestion();
  }

  /* =========================================================
   NGÀY 4 — LẬT TÌM CẶP
   ========================================================= */
  function renderDay4() {
    if (!section) return;
    clearSection();

    const clone = cloneTemplate('week3-day4-template');
    if (!clone) return;

    section.appendChild(clone);

    // Refs
    const grid = section.querySelector('[data-day4-grid]');
    const contentEl = section.querySelector('[data-day4-content]');
    const messageEl = section.querySelector('[data-day4-message]');

    if (!grid) return;

    // ---- TẠO 6 THẺ ----
    // Mỗi cặp → 2 thẻ: left + right
    const cards = [];
    DAY4_PAIRS.forEach((pair, pairIndex) => {
      cards.push({
        pairIndex,
        side: 'left',
        text: pair.left,
      });
      cards.push({
        pairIndex,
        side: 'right',
        text: pair.right,
      });
    });

    // Xáo trộn
    const shuffled = shuffleArray(cards);

    // Render
    const cardTpl = document.getElementById('week3-day4-card-template');
    if (!cardTpl) return;

    const cardEls = [];

    shuffled.forEach((card, i) => {
      const clone = cardTpl.content.cloneNode(true);
      const cardBtn = clone.querySelector('.week3-card');
      const cardText = clone.querySelector('[data-card-text]');

      cardBtn.dataset.cardIndex = String(i);
      cardBtn.dataset.pairIndex = String(card.pairIndex);
      cardBtn.dataset.side = card.side;

      cardText.textContent = card.text;

      grid.appendChild(clone);
      cardEls.push(cardBtn);
    });

    // ---- STATE ----
    let firstFlipped = null;
    let secondFlipped = null;
    let isLocked = false;
    let matchedCount = 0;
    const totalPairs = DAY4_PAIRS.length;

    // ---- HANDLE CLICK ----
    function handleCardClick(e) {
      if (isLocked) return;

      const card = e.currentTarget;
      if (!card) return;

      // Đã lật hoặc đã khớp → bỏ qua
      if (card.classList.contains('is-flipped')) return;
      if (card.classList.contains('is-matched')) return;

      // Lật thẻ
      card.classList.add('is-flipped');

      if (!firstFlipped) {
        // Thẻ đầu tiên
        firstFlipped = card;
        return;
      }

      // Thẻ thứ 2
      secondFlipped = card;
      isLocked = true;

      // Kiểm tra cặp
      const firstPair = firstFlipped.dataset.pairIndex;
      const secondPair = secondFlipped.dataset.pairIndex;
      const firstSide = firstFlipped.dataset.side;
      const secondSide = secondFlipped.dataset.side;

      const isMatch = firstPair === secondPair && firstSide !== secondSide;

      if (isMatch) {
        setTimeout(() => {
          firstFlipped.classList.add('is-matched', 'just-matched');
          secondFlipped.classList.add('is-matched', 'just-matched');

          setTimeout(() => {
            firstFlipped?.classList.remove('just-matched');
            secondFlipped?.classList.remove('just-matched');
          }, 800);

          firstFlipped = null;
          secondFlipped = null;
          isLocked = false;
          matchedCount++;

          if (matchedCount >= totalPairs) {
            completeDay4();
          }
        }, 400);
      } else {
        // Không khớp — rung + úp lại
        firstFlipped.classList.add('is-wrong');
        secondFlipped.classList.add('is-wrong');

        setTimeout(() => {
          firstFlipped.classList.remove('is-flipped', 'is-wrong');
          secondFlipped.classList.remove('is-flipped', 'is-wrong');

          firstFlipped = null;
          secondFlipped = null;
          isLocked = false;
        }, 900);
      }
    }

    cardEls.forEach((el) => {
      el.addEventListener('click', handleCardClick);
    });

    // ---- COMPLETE ----
    function completeDay4() {
      setTimeout(() => {
        if (messageEl) {
          messageEl.textContent = randomFrom(DAY4_MESSAGES);
        }
        if (contentEl) {
          contentEl.hidden = false;
        }
      }, 600);
    }
  }

  /* =========================================================
   NGÀY 5 — LAU KÍNH
   ========================================================= */
  function renderDay5() {
    if (!section) return;
    clearSection();

    const clone = cloneTemplate('week3-day5-template');
    if (!clone) return;

    section.appendChild(clone);

    // Refs
    const day5El = section.querySelector('[data-day5]');
    const stage = section.querySelector('[data-day5-stage]');
    const canvas = section.querySelector('[data-day5-canvas]');
    const contentEl = section.querySelector('[data-day5-content]');
    const messageEl = section.querySelector('[data-day5-message]');

    if (!day5El || !stage || !canvas) return;

    const ctx = canvas.getContext('2d');

    // State
    let isHolding = false;
    let progress = 0; // 0 → 1 — % đã lau
    let targetProgress = 0; // Đích progress (tăng khi giữ, giảm khi thả)
    let wipeT = 0; // Tham số đường lau (0 → 1)
    let rafId = null;
    let done = false;
    let lastTime = performance.now();

    // Canvas setup
    function setupCanvas() {
      const rect = stage.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        requestAnimationFrame(setupCanvas);
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Vẽ lớp sương ban đầu
      drawFog(rect.width, rect.height);
      console.log('[week3-day5] Canvas setup:', rect.width, 'x', rect.height);
    }

    // Vẽ lớp sương mờ
    function drawFog(w, h) {
      // Nền sương
      const gradient = ctx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, '#c8d0e0');
      gradient.addColorStop(0.4, '#d8dce8');
      gradient.addColorStop(0.7, '#ccd4e4');
      gradient.addColorStop(1, '#bcc4d8');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      // Texture sương — nhiều chấm nhỏ
      ctx.globalAlpha = 0.4;
      for (let i = 0; i < 800; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = Math.random() * 3 + 1;
        const alpha = Math.random() * 0.4 + 0.2;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Vài vệt mờ lớn (như hơi nước đọng)
      for (let i = 0; i < 15; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = Math.random() * 60 + 40;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }

    // ---- MIẾNG BỌT CHÙI KÍNH ----
    function drawWipeSponge(x, y) {
      // Xóa sương — dùng destination-out
      ctx.globalCompositeOperation = 'destination-out';

      // Vẽ miếng bọt — hình oval/kén
      const w = DAY5_WIPE_RADIUS * 1.6;
      const h = DAY5_WIPE_RADIUS * 0.9;

      // Vẽ nhiều lớp để có cạnh mờ tự nhiên
      for (let i = 0; i < 3; i++) {
        const scale = 1 - i * 0.15;
        const alpha = 1 - i * 0.25;

        ctx.beginPath();
        ctx.ellipse(x, y, w * scale, h * scale, 0, 0, Math.PI * 2);
        ctx.globalAlpha = alpha;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // ---- ĐƯỜNG LAU — ZIG-ZAG XÉO ----
    function getWipePosition(t) {
      // t: 0 → 1
      // Đường zig-zag xéo từ trên xuống
      const rect = stage.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;

      // Số lần zig-zag
      const passes = 5;

      // Vị trí trong pass
      const passIndex = Math.floor(t * passes);
      const passT = (t * passes) % 1; // 0 → 1 trong mỗi pass

      // Chiều ngang: pass chẵn → trái sang phải, lẻ → phải sang trái
      const leftToRight = passIndex % 2 === 0;
      const xRatio = leftToRight ? passT : 1 - passT;

      // Thêm chút chéo — x lệch theo y
      const xBase = 0.05 + xRatio * 0.9;
      const xDrift = (passT - 0.5) * 0.04; // Nhẹ
      const x = (xBase + xDrift) * W;

      // Chiều dọc: tăng đều theo pass
      const yBase = 0.15 + (passIndex / passes) * 0.7;
      // Thêm chéo nhỏ — y lệch theo x
      const yDrift = (xRatio - 0.5) * 0.05;
      const y = (yBase + yDrift) * H;

      return { x, y };
    }

    /* =========================================================
   VẼ 1 ĐOẠN VỆT LAU — dùng lineWidth
   - Nhanh, liên tục, không đứt
   - lineCap: round → đầu/cuối tròn
   ========================================================= */
    function drawWipeSegment(fromX, fromY, toX, toY) {
      ctx.globalCompositeOperation = 'destination-out';

      // Bề rộng vệt lau = 2 × radius
      ctx.lineWidth = DAY5_WIPE_RADIUS * 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();

      ctx.globalCompositeOperation = 'source-over';
    }

    // ---- ANIMATION LOOP ----
    function animate() {
      if (done) return;

      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const rect = stage.getBoundingClientRect();

      // Cập nhật progress
      if (isHolding) {
        // Lưu progress cũ
        const prevProgress = targetProgress;

        // Tăng progress
        targetProgress = Math.min(1, targetProgress + DAY5_WIPE_SPEED * dt);

        // Lấy vị trí cũ + mới
        const prevPos = getWipePosition(prevProgress);
        const newPos = getWipePosition(targetProgress);

        // ✅ Vẽ đoạn mới (increment)
        drawWipeSegment(prevPos.x, prevPos.y, newPos.x, newPos.y);
      } else {
        // Thả — progress giảm dần về 0
        if (targetProgress > 0) {
          // ✅ Vẽ sương trở lại — chỉ vẽ vùng giữa (đơn giản hóa)
          const recoverAmount = DAY5_RECOVER_SPEED * dt;

          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = recoverAmount;

          const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
          gradient.addColorStop(0, '#c8d0e0');
          gradient.addColorStop(0.4, '#d8dce8');
          gradient.addColorStop(0.7, '#ccd4e4');
          gradient.addColorStop(1, '#bcc4d8');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, rect.width, rect.height);

          ctx.globalAlpha = 1;

          targetProgress = Math.max(0, targetProgress - DAY5_RECOVER_SPEED * dt);

          // Nếu về 0 → reset hoàn toàn
          if (targetProgress === 0) {
            ctx.clearRect(0, 0, rect.width, rect.height);
            drawFog(rect.width, rect.height);
          }
        }
      }

      progress = targetProgress;

      // Kiểm tra hoàn thành
      if (progress >= DAY5_COMPLETE_THRESHOLD && !done) {
        completeDay5();
      }

      rafId = requestAnimationFrame(animate);
    }

    // ---- HOÀN THÀNH ----
    function completeDay5() {
      done = true;
      isHolding = false;
      day5El.classList.add('is-done');
      day5El.classList.remove('is-active');

      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      // Canvas fade out (CSS đã có transition)
      canvas.style.opacity = '0';

      // Hiện text
      setTimeout(() => {
        if (messageEl) {
          messageEl.textContent = randomFrom(DAY5_MESSAGES);
        }
        if (contentEl) {
          contentEl.hidden = false;
        }
      }, 400);
    }

    // ---- POINTER EVENTS ----
    function onPointerDown(e) {
      if (done) return;
      isHolding = true;
      day5El.classList.add('is-active');
      lastTime = performance.now();
      e.preventDefault();
    }

    function onPointerUp(e) {
      isHolding = false;
      if (!done) {
        day5El.classList.remove('is-active');
      }
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerUp);

    // Touch fallback
    canvas.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        onPointerDown(e);
      },
      { passive: false },
    );

    canvas.addEventListener(
      'touchend',
      (e) => {
        e.preventDefault();
        onPointerUp(e);
      },
      { passive: false },
    );

    // ---- INIT ----
    setupCanvas();

    // Bắt đầu animation loop
    lastTime = performance.now();
    rafId = requestAnimationFrame(animate);
  }

  /* =========================================================
   NGÀY 6 — ĐOÁN ĐÁP ÁN
   ========================================================= */
  function renderDay6() {
    if (!section) return;
    clearSection();

    const clone = cloneTemplate('week3-day6-template');
    if (!clone) return;

    section.appendChild(clone);

    // Refs
    const questionWrap = section.querySelector('[data-day6-question]');
    const summaryWrap = section.querySelector('[data-day6-summary]');
    const summaryList = section.querySelector('[data-day6-summary-list]');
    const messageEl = section.querySelector('[data-day6-message]');

    if (!questionWrap) return;

    const totalQ = DAY6_QUESTIONS.length;
    let currentIndex = 0;
    const answers = []; // Lưu đáp án user đã chọn

    // ---- RENDER CÂU HỎI HIỆN TẠI ----
    function renderQuestion() {
      questionWrap.innerHTML = '';

      const q = DAY6_QUESTIONS[currentIndex];
      if (!q) return;

      const tpl = document.getElementById('week3-day6-question-template');
      if (!tpl) return;

      const qClone = tpl.content.cloneNode(true);

      const labelEl = qClone.querySelector('[data-q-label]');
      const textEl = qClone.querySelector('[data-q-text]');
      const choicesWrap = qClone.querySelector('[data-q-choices]');
      const feedbackEl = qClone.querySelector('[data-q-feedback]');
      const feedbackTitle = qClone.querySelector('[data-q-feedback-title]');
      const feedbackText = qClone.querySelector('[data-q-feedback-text]');

      labelEl.textContent = `Câu ${currentIndex + 1}/${totalQ}`;
      textEl.textContent = q.question;

      // Render 3 đáp án
      const choiceTpl = document.getElementById('week3-day6-choice-template');
      const choiceEls = [];

      q.choices.forEach((text, i) => {
        const cClone = choiceTpl.content.cloneNode(true);
        const btn = cClone.querySelector('[data-choice]');
        const cText = cClone.querySelector('[data-choice-text]');

        cText.textContent = text;
        btn.dataset.choiceIndex = String(i);

        btn.addEventListener('click', () => handleChoice(i, btn, q));
        choicesWrap.appendChild(cClone);
        choiceEls.push(btn);
      });

      questionWrap.appendChild(qClone);
      questionWrap._choiceEls = choiceEls;
      questionWrap._feedbackEl = feedbackEl;
      questionWrap._feedbackTitle = feedbackTitle;
      questionWrap._feedbackText = feedbackText;
    }

    // ---- XỬ LÝ CHỌN ĐÁP ÁN ----
    function handleChoice(selectedIndex, selectedBtn, q) {
      const choiceEls = questionWrap._choiceEls || [];
      const feedbackEl = questionWrap._feedbackEl;
      const feedbackTitle = questionWrap._feedbackTitle;
      const feedbackText = questionWrap._feedbackText;

      // Disable tất cả
      choiceEls.forEach((btn) => btn.classList.add('is-disabled'));

      // Đánh dấu user chọn
      selectedBtn.classList.add('is-selected');

      const isCorrect = selectedIndex === q.correctIndex;

      // Lưu đáp án
      answers.push({
        question: q.question,
        correctAnswer: q.choices[q.correctIndex],
        userChoice: q.choices[selectedIndex],
        isCorrect,
      });

      if (isCorrect) {
        selectedBtn.classList.add('is-correct');
        feedbackTitle.textContent = '✓ Đúng rồi!';
        feedbackText.textContent = q.feedbackCorrect;
        feedbackEl.classList.add('is-correct');
      } else {
        selectedBtn.classList.add('is-wrong');

        // Highlight đáp án đúng
        const correctBtn = choiceEls[q.correctIndex];
        if (correctBtn) correctBtn.classList.add('is-correct');

        feedbackTitle.textContent = 'Chưa đúng...';
        feedbackText.textContent = q.feedbackWrong;
        feedbackEl.classList.add('is-wrong');
      }

      // Hiện feedback
      feedbackEl.hidden = false;

      // Tự động chuyển sau 2.5s
      setTimeout(() => {
        currentIndex++;
        if (currentIndex >= totalQ) {
          completeDay6();
        } else {
          renderQuestion();
        }
      }, 2500);
    }

    // ---- HOÀN THÀNH CẢ 3 CÂU ----
    function completeDay6() {
      questionWrap.innerHTML = '';

      // Render tổng kết
      answers.forEach((a) => {
        const item = document.createElement('div');
        item.className = 'week3-summary-item';

        const qEl = document.createElement('p');
        qEl.className = 'week3-summary-q';
        qEl.textContent = a.question;

        const aEl = document.createElement('p');
        aEl.className = 'week3-summary-a';
        aEl.textContent = a.correctAnswer;

        item.appendChild(qEl);
        item.appendChild(aEl);
        summaryList.appendChild(item);
      });

      messageEl.textContent = randomFrom(DAY6_MESSAGES);
      summaryWrap.hidden = false;
    }

    // ---- INIT ----
    renderQuestion();
  }

  /* =========================================================
   NGÀY 7 — GỠ RUY-BĂNG
   Phase 2: Kéo nơ + bung + mở nắp
   ========================================================= */
  function renderDay7() {
    if (!section) return;
    clearSection();

    const clone = cloneTemplate('week3-day7-template');
    if (!clone) return;

    section.appendChild(clone);

    // Refs
    const day7El = section.querySelector('[data-day7]');
    const stage = section.querySelector('[data-day7-stage]');
    const giftSvg = section.querySelector('.week3-day7-gift');
    const bowEl = section.querySelector('[data-gift-bow]');
    const lidEl = section.querySelector('[data-gift-lid]');

    if (!day7El || !stage || !bowEl || !lidEl) return;

    // ---- STATE ----
    let isDragging = false;
    let startX = 0; // Vị trí con trỏ khi bắt đầu
    let currentOffsetX = 0; // Khoảng cách kéo hiện tại
    let isOpened = false;

    const MAX_DRAG = 200; // Kéo tối đa 200px
    const UNLOCK_THRESHOLD = 120; // Kéo đủ 120px → bung

    // ---- IDLE ANIMATION ----
    day7El.classList.add('is-idle');

    setTimeout(() => {
      day7El.classList.add('is-hint-active');
    }, 3000);

    // ---- POINTER EVENTS ----
    function onPointerDown(e) {
      if (isOpened) return;

      isDragging = true;
      startX = e.clientX - currentOffsetX;

      bowEl.style.cursor = 'grabbing';
      day7El.classList.remove('is-idle');

      if (e.preventDefault) e.preventDefault();
    }

    function onPointerMove(e) {
      if (!isDragging || isOpened) return;

      // Tính khoảng cách kéo
      let offsetX = e.clientX - startX;

      // Chỉ cho kéo sang PHẢI
      if (offsetX < 0) offsetX = 0;

      // Giới hạn
      if (offsetX > MAX_DRAG) offsetX = MAX_DRAG;

      currentOffsetX = offsetX;

      // Cập nhật vị trí nơ
      updateBowPosition(offsetX);

      if (e.preventDefault) e.preventDefault();
    }

    function onPointerUp(e) {
      if (!isDragging) return;
      isDragging = false;
      bowEl.style.cursor = 'grab';

      if (currentOffsetX >= UNLOCK_THRESHOLD && !isOpened) {
        openGift();
      }

      if (e.preventDefault) e.preventDefault();
    }

    // ---- CẬP NHẬT VỊ TRÍ NƠ ----
    function updateBowPosition(offsetX) {
      // Xoay nơ nhẹ theo hướng kéo (nghiêng)
      const rotation = Math.min(offsetX / 10, 15);

      // Scale nơ nhẹ khi kéo (cảm giác căng)
      const scale = 1 + Math.min(offsetX / 800, 0.1);

      bowEl.style.transform = `
      translate(${offsetX}px, 0)
      rotate(${rotation}deg)
      scale(${scale})
    `;
      bowEl.style.transformOrigin = '150px 105px'; // Tâm nút thắt
    }

    // ---- MỞ QUÀ ----
    function openGift() {
      isOpened = true;
      day7El.classList.remove('is-idle', 'is-hint-active');
      day7El.classList.add('is-opening');

      // 1. Nơ bay lên + ra khỏi màn hình
      bowEl.style.transition = 'transform 0.9s cubic-bezier(0.4, 0, 0.6, 1), opacity 0.9s ease-out';
      bowEl.style.transform = `
      translate(${currentOffsetX + 80}px, -80px)
      rotate(25deg)
      scale(1.1)
    `;
      bowEl.style.opacity = '0';

      // 2. Nắp hộp mở lên sau 200ms
      setTimeout(() => {
        lidEl.style.transition = 'transform 0.8s cubic-bezier(0.34, 1.2, 0.64, 1)';
        lidEl.style.transform = 'translate(-30px, -50px) rotate(-18deg)';
        lidEl.style.transformOrigin = '100px 130px';
      }, 200);

      // 3. Hiện text + trigger hiệu ứng
      setTimeout(() => {
        const messageEl = section.querySelector('[data-day7-message]');
        const outerEl = section.querySelector('[data-day7-content-outer]');
        const contentEl = section.querySelector('[data-day7-content]');

        if (messageEl) {
          messageEl.textContent = randomFrom(DAY7_MESSAGES) || 'Vì em — chỉ vì em.';

          // ✅ Reset toàn bộ style message
          messageEl.style.cssText = `
      margin: 0;
      padding: 0;
      text-align: center;
      width: 100%;
      display: block;
      box-sizing: border-box;
      font-family: var(--font-serif);
      font-style: italic;
      font-size: clamp(1rem, 2.2vw, 1.3rem);
      line-height: 1.65;
      color: var(--c-accent);
      letter-spacing: 0.01em;
      word-wrap: break-word;
      overflow-wrap: break-word;
    `;
        }

        if (outerEl) {
          outerEl.hidden = false;
          outerEl.removeAttribute('hidden');

          // ✅ Wrapper — căn giữa ngang bằng flex
          outerEl.style.cssText = `
      position: absolute;
      left: 0;
      right: 0;
      top: 55%;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      pointer-events: none;
      z-index: 5;
      transition: top 1.1s cubic-bezier(0.34, 1.4, 0.64, 1) 0.1s;
    `;
        }

        if (contentEl) {
          // ✅ Content box
          contentEl.style.cssText = `
      width: 100%;
      padding: 20px 28px;
      background: linear-gradient(165deg,
        rgba(231, 183, 160, 0.15),
        rgba(185, 167, 255, 0.08));
      border: 1px solid rgba(231, 183, 160, 0.3);
      border-radius: 16px;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      box-shadow: 0 16px 40px -16px rgba(0, 0, 0, 0.6);
      text-align: center;
      box-sizing: border-box;
      opacity: 0;
      transform: scale(0.5);
      transform-origin: center center;
      transition: opacity 0.7s ease-out 0.4s, transform 1.1s cubic-bezier(0.34, 1.4, 0.64, 1) 0.1s;
    `;
        }

        // ✅ Trigger animation
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (outerEl) outerEl.style.top = '82%';
            if (contentEl) {
              contentEl.style.opacity = '1';
              contentEl.style.transform = 'scale(1)';
            }
          });
        });

        day7El.classList.add('is-opened');
        runCelebration();
        window.dispatchEvent(new CustomEvent('day7:opened'));
      }, 900);
    }

    /* =========================================================
     HIỆU ỨNG — CONFETTI + PHÁO HOA + TIM
     ========================================================= */
    function runCelebration() {
      const canvas = section.querySelector('[data-day7-fx]');
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const rect = stage.getBoundingClientRect();

      // Setup canvas
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const W = rect.width;
      const H = rect.height;

      // ---- STATE ----
      const particles = []; // Confetti + tim
      const fireworks = []; // Pháo hoa
      let lastTime = performance.now();
      let elapsed = 0;
      let rafId = null;
      let stopped = false;

      // Màu confetti
      const COLORS = [
        '#e7b7a0', // Đào
        '#b9a7ff', // Tím mơ
        '#ffe8b8', // Vàng kem
        '#f5f3ee', // Kem
        '#d4a080', // Nâu đào
        '#c4b4ff', // Tím nhạt
      ];

      // ---- TẠO CONFETTI ----
      function spawnConfetti(count) {
        for (let i = 0; i < count; i++) {
          particles.push({
            type: 'confetti',
            x: Math.random() * W,
            y: -20 - Math.random() * 50,
            vx: (Math.random() - 0.5) * 3,
            vy: 2 + Math.random() * 3,
            size: 4 + Math.random() * 6,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.3,
            opacity: 1,
            gravity: 0.15,
            life: 0,
            maxLife: 5 + Math.random() * 3,
          });
        }
      }

      // ---- TẠO TIM ----
      function spawnHeart(x, y) {
        particles.push({
          type: 'heart',
          x: x + (Math.random() - 0.5) * 30,
          y: y,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -1.5 - Math.random() * 1.5,
          size: 10 + Math.random() * 10,
          color: '#e7b7a0',
          rotation: (Math.random() - 0.5) * 0.4,
          rotationSpeed: (Math.random() - 0.5) * 0.05,
          opacity: 1,
          gravity: -0.03,
          life: 0,
          maxLife: 3 + Math.random() * 2,
        });
      }

      // ---- TẠO PHÁO HOA ----
      function spawnFirework(x, y) {
        fireworks.push({
          x,
          y,
          time: 0,
          maxTime: 0.15,
        });
      }

      function explodeFirework(x, y) {
        const count = 30 + Math.floor(Math.random() * 20);
        const baseColor = COLORS[Math.floor(Math.random() * COLORS.length)];

        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
          const speed = 2 + Math.random() * 4;

          particles.push({
            type: 'firework',
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 2 + Math.random() * 2,
            color: baseColor,
            opacity: 1,
            gravity: 0.05,
            life: 0,
            maxLife: 1 + Math.random() * 0.8,
            fadeSpeed: 0.8 + Math.random() * 0.5,
          });
        }
      }

      // ---- VẼ CONFETTI ----
      function drawConfetti(p) {
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }

      // ---- VẼ TIM ----
      function drawHeart(p) {
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;

        // Vẽ hình tim
        const s = p.size;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.3);
        ctx.bezierCurveTo(s * 0.5, -s * 0.3, s * 0.9, s * 0.2, 0, s);
        ctx.bezierCurveTo(-s * 0.9, s * 0.2, -s * 0.5, -s * 0.3, 0, s * 0.3);
        ctx.fill();

        ctx.restore();
      }

      // ---- VẼ PHÁO HOA ----
      function drawFirework(p) {
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Glow
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();
      }

      // ---- SPAWN SEQUENCE ----
      function spawnSequence(dt) {
        // Confetti: spawn đều mỗi 0.1s, tổng ~1.5s
        if (elapsed < 1.5 && Math.floor(elapsed / 0.1) > Math.floor((elapsed - dt) / 0.1)) {
          spawnConfetti(8);
        }

        // Tim: spawn mỗi 0.2s
        if (elapsed < 2 && Math.floor(elapsed / 0.2) > Math.floor((elapsed - dt) / 0.2)) {
          spawnHeart(W / 2, H + 20);
        }

        // Pháo hoa: 2 lần
        if (Math.floor(elapsed / 0.4) > Math.floor((elapsed - dt) / 0.4) && elapsed < 1.5) {
          const x = Math.random() * W * 0.8 + W * 0.1;
          const y = Math.random() * H * 0.4 + H * 0.1;
          spawnFirework(x, y);
        }
      }

      // ---- UPDATE + RENDER ----
      function animate() {
        if (stopped) return;

        const now = performance.now();
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        elapsed += dt;

        // Clear
        ctx.clearRect(0, 0, W, H);

        // Spawn
        spawnSequence(dt);

        // Update particles
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.life += dt;

          // Physics
          p.x += p.vx * 60 * dt;
          p.y += p.vy * 60 * dt;
          p.vy += p.gravity * 60 * dt;
          if (p.rotationSpeed) p.rotation += p.rotationSpeed * 60 * dt;

          // Fade
          if (p.life > p.maxLife) {
            p.opacity -= 2 * dt;
          }

          // Remove
          if (p.opacity <= 0 || p.y > H + 50 || p.y < -100) {
            particles.splice(i, 1);
            continue;
          }

          // Draw
          if (p.type === 'confetti') {
            drawConfetti(p);
          } else if (p.type === 'heart') {
            drawHeart(p);
          } else if (p.type === 'firework') {
            drawFirework(p);
          }
        }

        // Update fireworks (đang bay lên)
        for (let i = fireworks.length - 1; i >= 0; i--) {
          const f = fireworks[i];
          f.time += dt;

          if (f.time >= f.maxTime) {
            explodeFirework(f.x, f.y);
            fireworks.splice(i, 1);
          }
        }

        // Dừng sau 8s
        if (elapsed > 8) {
          stopped = true;
          return;
        }

        rafId = requestAnimationFrame(animate);
      }

      // ---- BẮT ĐẦU ----
      lastTime = performance.now();
      rafId = requestAnimationFrame(animate);
    }

    // ---- BIND EVENTS ----
    bowEl.addEventListener('pointerdown', onPointerDown);

    // Window events để không mất pointer khi kéo ra ngoài SVG
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    // Touch fallback
    // Touch fallback — chỉ xử lý khi ĐANG KÉO NƠ
    bowEl.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length > 0) {
          const t = e.touches[0];
          onPointerDown({
            clientX: t.clientX,
            clientY: t.clientY,
            preventDefault: () => e.preventDefault(),
          });
        }
        if (e.cancelable) e.preventDefault();
      },
      { passive: false },
    );

    window.addEventListener(
      'touchmove',
      (e) => {
        // ✅ CHỈ preventDefault khi ĐANG KÉO
        if (!isDragging) return;
        if (e.touches.length > 0) {
          const t = e.touches[0];
          onPointerMove({
            clientX: t.clientX,
            clientY: t.clientY,
            preventDefault: () => e.preventDefault(),
          });
        }
        if (e.cancelable) e.preventDefault();
      },
      { passive: false },
    );

    window.addEventListener(
      'touchend',
      (e) => {
        // ✅ CHỈ xử lý khi ĐANG KÉO
        if (!isDragging) return;

        onPointerUp({
          preventDefault: () => e.preventDefault(),
        });
        if (e.cancelable) e.preventDefault();
      },
      { passive: false },
    );
  }

  /* =========================================================
     PLACEHOLDER ROUTER — sẽ mở rộng ở 10C+
     ========================================================= */
  function renderPlaceholder() {
    if (!section) return;
    clearSection();
    section.innerHTML = `
      <div style="padding: 40px; text-align: center; color: #a0a0b0;">
        <p>Week 3 — đang phát triển</p>
      </div>
    `;
  }

  function shuffleArray(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  /* =========================================================
     PUBLIC API
     ========================================================= */
  window.Week3 = {
    // Router
    init,
    route,
    goToCalendar,
    goToDay,
    isDayUnlocked,

    // Render từng ngày (cho test)
    renderDay1,
    renderDay2,
    renderDay3,
    renderDay4,
    renderDay5,
    renderDay6,
    renderDay7,

    // Config
    WEEK3_UNLOCK,
    routerState,

    // Messages
    DAY1_MESSAGES,
    DAY2_MESSAGES,
    DAY3_QUESTIONS,
    DAY3_MESSAGES,
    DAY4_PAIRS,
    DAY4_MESSAGES,
    DAY5_MESSAGES,
    DAY6_QUESTIONS,
    DAY6_MESSAGES,
    DAY7_MESSAGES,
  };

  /* =========================================================
   ROUTER — điều hướng view
   ========================================================= */
  function route() {
    if (!section) return;

    switch (routerState.view) {
      case 'calendar':
        renderCalendarView();
        break;
      case 'day':
        renderDayView(routerState.dayIndex);
        break;
    }
  }

  /* Chuyển về lịch */
  function goToCalendar() {
    routerState.view = 'calendar';
    routerState.dayIndex = null;
    route();
  }

  /* Chuyển vào 1 ngày */
  function goToDay(dayIndex) {
    // ✅ Kiểm tra ngày đã đến chưa
    if (!isDayUnlocked(dayIndex)) {
      console.warn(`[week3] Ngày ${dayIndex + 1} chưa đến.`);
      goToCalendar();
      return;
    }

    routerState.view = 'day';
    routerState.dayIndex = dayIndex;
    route();
  }

  /* ✅ Kiểm tra ngày đã unlock chưa */
  function isDayUnlocked(dayIndex) {
    if (dayIndex < 0 || dayIndex > 6) return false;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11
    const day = now.getDate();

    // Ngày mở khoá: 2/10 + dayIndex
    const unlockDay = WEEK3_START_DAY + dayIndex;

    // Trước tháng 10 → chưa unlock
    if (year < 2026) return false;
    if (year === 2026 && month < 9) return false; // < tháng 10
    if (year === 2026 && month === 9 && day < unlockDay) return false;
    if (year === 2026 && month === 9 && day >= unlockDay) return true;

    // Sau tháng 10/2026 → tất cả unlock
    if (year > 2026) return true;
    if (year === 2026 && month > 9) return true;

    return false;
  }

  /* ✅ Lấy ngày mở khoá (để hiển thị) */
  function getUnlockDate(dayIndex) {
    const day = WEEK3_START_DAY + dayIndex;
    return `${day} · 10`;
  }

  /* Đánh dấu ngày đã chơi */
  function markDayPlayed(dayIndex) {
    if (dayIndex >= 0 && dayIndex < 7) {
      routerState.playedDays[dayIndex] = true;
    }
  }

  /* Đếm số ngày đã chơi */
  function countPlayed() {
    return routerState.playedDays.filter(Boolean).length;
  }

  /* =========================================================
   RENDER — LỊCH
   ========================================================= */
  function renderCalendarView() {
    if (!section) return;
    clearSection();

    const clone = cloneTemplate('week3-calendar-template');
    if (!clone) return;

    section.appendChild(clone);

    renderCalendarGrid();
    updateCalendarProgress();
  }

  /* Render grid 31 ngày */
  function renderCalendarGrid() {
    const grid = section.querySelector('[data-calendar]');
    if (!grid) return;

    const dayTpl = document.getElementById('week3-day-template');
    if (!dayTpl) return;

    const YEAR = 2026;
    const MONTH = 9; // JS: 0-11, tháng 10 = 9

    const now = new Date();
    const isCurrentMonth = now.getFullYear() === YEAR && now.getMonth() === MONTH;
    const todayDate = isCurrentMonth ? now.getDate() : null;

    for (let d = 1; d <= 31; d++) {
      const clone = dayTpl.content.cloneNode(true);
      const dayBtn = clone.querySelector('.week3-day');
      const dayNum = clone.querySelector('[data-day-num]');
      const dayIcon = clone.querySelector('[data-day-icon]');

      dayNum.textContent = d;

      // Ngày hôm nay
      if (d === todayDate) {
        dayBtn.classList.add('is-today');
      }

      // Ngày 9 — trọng đại
      if (d === 9) {
        dayBtn.classList.add('is-special');
        dayBtn.classList.add('is-normal'); // Không click
      }

      // Ngày chơi (2-8)
      if (d >= WEEK3_START_DAY && d <= WEEK3_END_DAY) {
        const dayIndex = d - WEEK3_START_DAY; // 0-6

        dayBtn.classList.add('is-active');
        dayIcon.textContent = DAY_ICONS[dayIndex];

        // Đã chơi chưa?
        if (routerState.playedDays[dayIndex]) {
          dayBtn.classList.add('is-played');
        }

        // ✅ Kiểm tra đã unlock chưa
        if (!isDayUnlocked(dayIndex)) {
          dayBtn.classList.add('is-locked');
          // Thêm text ngày mở khoá
          const unlockText = document.createElement('span');
          unlockText.className = 'week3-day-unlock';
          unlockText.textContent = getUnlockDate(dayIndex);
          dayBtn.appendChild(unlockText);
        } else {
          // Click → vào ngày (chỉ khi đã unlock)
          dayBtn.addEventListener('click', () => {
            goToDay(dayIndex);
          });
        }
      } else if (d !== 9) {
        dayBtn.classList.add('is-normal');
      }

      grid.appendChild(dayBtn);
    }
  }

  /* Update progress */
  function updateCalendarProgress() {
    const el = section.querySelector('[data-calendar-progress] strong');
    if (!el) return;
    el.textContent = String(countPlayed());
  }

  /* =========================================================
   RENDER — 1 NGÀY
   ========================================================= */
  function renderDayView(dayIndex) {
    if (dayIndex < 0 || dayIndex >= 7) {
      goToCalendar();
      return;
    }

    const renderFn = DAY_RENDERERS[dayIndex];
    if (typeof renderFn !== 'function') {
      console.warn(`[week3] Không có renderer cho ngày ${dayIndex + 1}`);
      goToCalendar();
      return;
    }

    // Gọi renderer của ngày — họ tự clearSection + render
    renderFn();

    // Sau khi render xong → thêm nút quay về
    // (Cần delay 1 chút vì renderer có thể tự render lại DOM)
    requestAnimationFrame(() => {
      attachBackButton(dayIndex);
    });
  }

  /* Thêm nút quay về vào section */
  function attachBackButton(dayIndex) {
    if (!section) return;

    if (section.querySelector('[data-back-to-calendar]')) return;

    const tpl = document.getElementById('week3-back-button-template');
    if (!tpl) return;

    const clone = tpl.content.cloneNode(true);
    const btn = clone.querySelector('[data-back-to-calendar]');

    if (!btn) return;

    btn.addEventListener('click', () => {
      // Đánh dấu ngày đã chơi
      markDayPlayed(dayIndex);

      // Quay về lịch
      goToCalendar();
    });

    section.appendChild(clone);
  }

  /* =========================================================
     TRẠNG THÁI : LOCKED
     ========================================================= */
  let lockedTimerId = null;
  function renderLocked() {
    if (!section) return;
    clearSection();

    const clone = cloneTemplate('week3-locked-template');
    if (!clone) return;

    section.appendChild(clone);
    startLockedCountdown();
  }

  function startLockedCountdown() {
    stopLockedCountdown();
    updateLockedCountdown();
    lockedTimerId = setInterval(updateLockedCountdown, 1000);
  }

  function stopLockedCountdown() {
    if (lockedTimerId) {
      clearInterval(lockedTimerId);
      lockedTimerId = null;
    }
  }

  function updateLockedCountdown() {
    const diff = WEEK3_UNLOCK.getTime() - Date.now();

    const setVal = (key, value) => {
      const el = section.querySelector(`.week3-cd-num[data-cd="${key}"]`);
      if (el) el.textContent = pad2(value);
    };

    if (diff <= 0) {
      stopLockedCountdown();
      render(loadState());
      return;
    }

    const totalSec = Math.floor(diff / 1000);
    setVal('days', Math.floor(totalSec / 86400));
    setVal('hours', Math.floor((totalSec % 86400) / 3600));
    setVal('mins', Math.floor((totalSec % 3600) / 60));
    setVal('secs', totalSec % 60);
  }

  /* =========================================================
   INIT
   ========================================================= */
  function init() {
    const now = Date.now();

    // Chưa đến ngày → LOCKED
    if (now < WEEK3_UNLOCK.getTime()) {
      renderLocked();
      return;
    }
    if (!section) return;

    // Bắt đầu từ lịch
    routerState.view = 'calendar';
    routerState.dayIndex = null;

    route();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
