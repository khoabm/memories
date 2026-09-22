/* =========================================================
   WEEK 2 — Căn phòng kí ức
   Sub-step 8B: State + Unlock + Render room
   ========================================================= */

(function () {
  ('use strict');

  /* =========================================================
     CONFIG
     ========================================================= */
  const WEEK2_UNLOCK = new Date('2026-09-26T00:00:00+07:00');
  const STORAGE_KEY = 'memories.week2.progress';
  const ANSWER_SHEET_URL = "https://script.google.com/macros/s/AKfycbwVB3tFsz8Xk0jt0hdn9-1i9uVvibft6PSFDQGgD2rT8z6E71WQzfIOxjFXEVK_ln2y/exec";

  // 3 lá thư — tạm placeholder, sẽ điền nội dung ở 8D
  const WEEK2_LETTERS = [
    {
      id: 1,
      hint: 'Có những điều chúng ta không muốn nhắc...',
      messages: [
        { text: 'Chúng ta đã nói vấn đề này nhiều lần rồi mà...', time: '18/09 18:40' },
        { text: 'Vì sao chúng ta không thực hiện điều mình hứa?', time: '18/09 18:43' },
        { text: 'Chúng ta đã cố gắng để rồi cũng cãi vã thì cố gắng làm gì?', time: '18/09 18:50' },
        { text: 'Có những thứ thật đơn giản nhưng sao mãi vẫn cứ sai', time: '18/09 18:57' },
      ],
    },
    {
      id: 2,
      hint: 'Có điều chúng ta đã cố quên...',
      messages: [
        { text: 'Sao chúng ta không du di cho nhau?', time: '19/09 14:00' },
        { text: 'Lúc nào chúng ta không tính toán trước cho hành động của mình.', time: '19/09 14:12' },
        { text: 'Đã bao giờ chúng ta vì nhau mà cố gắng chưa?.', time: '19/09 14:14' },
        { text: 'Nếu không nghĩ cho tương lai, thì liệu có tương lai nào để tiếp tục.', time: '19/09 14:17' },
      ],
    },
    {
      id: 3,
      hint: 'Có điều chúng ta cần nhớ lại...',
      messages: [
        { text: 'Nhưng anh vẫn ở đây.', time: '22/09 13:05' },
        { text: 'Nhưng em vẫn ở đây.', time: '22/09 13:11' },
        { text: 'Chúng ta là những mảnh ghép không hoàn thiện của nhau.', time: '22/09 13:12' },
        { text: 'Tuy ai cũng có cái lý của mình nhưng chỉ cần chúng ta cố gắng vì nhau.', time: '22/09 13:15' },
        { text: 'Anh chưa bao giờ muốn ai đúng ai sai.', time: '22/09 13:18' },
        { text: 'Nhưng rồi chúng ta cũng sẽ cần chọn giữa niềm vui bản thân hoặc niềm vui của chung.', time: '22/09 13:22' },
        { text: 'Anh cũng sẽ muốn đi tiếp một cuộc sống có em bên cạnh.', time: '22/09 13:30' },
        { text: 'Em sẽ muốn chúng ta như nào?.', time: '22/09 13:38' },
      ],
      choices: [
        'Chúng ta cần xóa bỏ sự khác biệt của nhau.',
        'Chúng ta nên tập chấp nhận khác biệt của nhau.'
      ],
    },
  ];

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =========================================================
     STATE
     ========================================================= */
  function defaultState() {
    return {
      phase: 1, // 1 / 2 / 3 (đang chơi thư mấy)
      lettersRead: [false, false, false],
      userAnswer: null, // 0 / 1 / 2 (lựa chọn ở thư 3)
      isReplayMode: false, // true khi đã xong, đang đọc lại
      completedAt: null,
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();

      const parsed = JSON.parse(raw);

      // Validate cơ bản
      if (typeof parsed.phase !== 'number' || parsed.phase < 1 || parsed.phase > 3) {
        return defaultState();
      }

      const state = {
        phase: parsed.phase,
        lettersRead:
          Array.isArray(parsed.lettersRead) && parsed.lettersRead.length === 3
            ? parsed.lettersRead.map(Boolean)
            : [false, false, false],
        userAnswer: typeof parsed.userAnswer === 'number' ? parsed.userAnswer : null,
        isReplayMode: !!parsed.isReplayMode,
        completedAt: parsed.completedAt || null,
      };

      // ✅ Nếu đã có completedAt + userAnswer → force replay
      if (state.completedAt && state.userAnswer !== null) {
        state.isReplayMode = true;
      }

      return state;
    } catch (err) {
      console.warn('[week2] Không load được state, dùng mặc định.', err);
      return defaultState();
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('[week2] Không lưu được state.', err);
    }
  }

  /* =========================================================
     HELPERS
     ========================================================= */
  const section = document.getElementById('week-2');
  /* =========================================================
   POINTER STATE
   ========================================================= */
  let pointerState = {
    isPointerDown: false,
    lastX: 50, // % trong khung
    lastY: 50,
    bound: false, // đã bind sự kiện chưa
  };

  const LIGHT_RADIUS_PERCENT = 20; // % bán kính vùng sáng để tính "gần thư"
  const MOBILE_OFFSET_Y = 80; // px offset cho mobile

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

  /* =========================================================
     TRẠNG THÁI 1: LOCKED
     ========================================================= */
  let lockedTimerId = null;

  function renderLocked() {
    if (!section) return;
    clearSection();

    const clone = cloneTemplate('week2-locked-template');
    if (!clone) return;

    section.appendChild(clone);
    startLockedCountdown();
  }

  function updateLockedCountdown() {
    const diff = WEEK2_UNLOCK.getTime() - Date.now();

    const setVal = (key, value) => {
      const el = section.querySelector(`.week2-cd-num[data-cd="${key}"]`);
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

  /* =========================================================
     TRẠNG THÁI 2: ROOM (chơi / đọc lại)
     ========================================================= */
  function renderRoom(state) {
    if (!section) return;
    clearSection();

    // ✅ Reset pointer state khi đổi màn
    pointerState.bound = false;
    pointerState.isPointerDown = false;

    const clone = cloneTemplate('week2-room-template');
    if (!clone) return;

    section.appendChild(clone);

    // ✅ Nếu đang ở chế độ đọc lại → setup giao diện khác
    if (state.isReplayMode) {
      setupReplayMode(state);
      return;
    }

    // ===== CHẾ ĐỘ CHƠI BÌNH THƯỜNG =====
    const frame = section.querySelector('.week2-room-frame');
    // Chế độ chơi — thêm class để ẩn con trỏ
    if (frame) frame.classList.add('is-playing');
    // Set hint
    const hint = section.querySelector('[data-week2-hint]');
    const letterIndex = state.phase - 1;
    if (hint && WEEK2_LETTERS[letterIndex]) {
      hint.textContent = WEEK2_LETTERS[letterIndex].hint;
    }

    // Set vùng sáng ở giữa
    setLightPosition(50, 50);

    // Render lá thư hiện tại
    renderActiveLetter(state);

    // ✅ Bind pointer events
    bindPointerEvents();

    // Cập nhật progress
    updateProgress(state);

    // Nút đọc lại — ẩn
    // updateReplayButton(state);
  }

  /* =========================================================
   CHẾ ĐỘ ĐỌC LẠI — Sau khi chơi xong
   - Phòng sáng hoàn toàn
   - Tắt vùng sáng
   - Bỏ bụi
   - Bỏ text hint
   - Bỏ progress
   - Render 3 thư ở vị trí cố định
   ========================================================= */
  function setupReplayMode(state) {
    // 1. Tắt vùng sáng — darkness opacity 0 → phòng sáng hoàn toàn
    const darkness = section.querySelector('[data-room-darkness]');
    if (darkness) {
      darkness.style.opacity = '0';
      darkness.style.pointerEvents = 'none';
    }

    // ✅ 1.5. Kích hoạt ánh sáng từ cửa sổ
    const frame = section.querySelector('.week2-room-frame');
    if (frame) {
      frame.classList.add('is-fully-lit');
    }

    // ✅ Bỏ chấm sáng (không cần khi phòng đã sáng)
    const dot = section.querySelector('[data-room-light-dot]');
    if (dot) dot.remove();

    // 2. Bỏ bụi
    const dust = section.querySelector('.room-dust');
    if (dust) dust.remove();

    // 3. Bỏ text hint
    const hint = section.querySelector('[data-week2-hint]');
    hint.textContent = 'Qua tất cả cơn bão rồi trời cũng sẽ sáng lại!';
    // if (hint) hint.remove();

    // 4. Bỏ progress
    const progress = section.querySelector('[data-week2-progress]');
    if (progress) progress.remove();

    // 5. Đồ đạc hiện rõ — bỏ blur
    const props = section.querySelector('.room-props');
    if (props) {
      props.style.filter = 'none';
      props.style.transition = 'none';
    }

    // 6. Render 3 thư ở vị trí cố định
    renderReplayLetters(state);

    // 7. Nút đọc lại — ẩn (vì giờ đã ở chế độ đọc lại, không cần nút)
    const replayBtn = section.querySelector('[data-replay]');
    if (replayBtn) replayBtn.remove();

    // 8. Không cần con trỏ ẩn — user dùng chuột bình thường
    if (frame) frame.style.cursor = '';
  }

  function setLightPosition(xPercent, yPercent) {
    const darkness = section.querySelector('[data-room-darkness]');
    const dust = section.querySelector('.room-dust');
    const dot = section.querySelector('[data-room-light-dot]');
    if (!darkness) return;

    const x = xPercent + '%';
    const y = yPercent + '%';

    darkness.style.setProperty('--light-x', x);
    darkness.style.setProperty('--light-y', y);

    if (dust) {
      dust.style.setProperty('--light-x', x);
      dust.style.setProperty('--light-y', y);
    }

    if (dot) {
      dot.style.setProperty('--light-x', x);
      dot.style.setProperty('--light-y', y);
    }
  }

  /* =========================================================
   POINTER — Di chuyển vùng sáng theo chuột/ngón tay
   ========================================================= */
  function bindPointerEvents() {
    const frame = section.querySelector('.week2-room-frame');
    if (!frame) return;

    if (pointerState.bound) return;
    pointerState.bound = true;

    const isMobile = navigator.userAgentData.mobile;

    // ✅ Throttle bằng rAF
    let pendingClientX = null;
    let pendingClientY = null;
    let rafId = null;

    function scheduleUpdate(clientX, clientY) {
      pendingClientX = clientX;
      pendingClientY = clientY;

      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (pendingClientX === null) return;

        const x = pendingClientX;
        const y = pendingClientY;
        pendingClientX = null;
        pendingClientY = null;

        applyLightFromClient(x, y);
      });
    }

    // Áp dụng vùng sáng từ tọa độ client (dùng cho desktop)
    function applyLightFromClient(clientX, clientY) {
      const rect = frame.getBoundingClientRect();

      const localX = clientX - rect.left;
      const localY = clientY - rect.top;

      let xPercent = (localX / rect.width) * 100;
      let yPercent = (localY / rect.height) * 100;

      xPercent = Math.max(0, Math.min(100, xPercent));
      yPercent = Math.max(0, Math.min(100, yPercent));

      applyLightFromPercent(xPercent, yPercent);
    }

    // Áp dụng trực tiếp từ % (dùng cho mobile kéo)
    function applyLightFromPercent(xPercent, yPercent) {
      pointerState.lastX = xPercent;
      pointerState.lastY = yPercent;

      setLightPosition(xPercent, yPercent);
      checkLetterProximity(xPercent, yPercent);
    }

    // ---- Desktop: pointermove ----
    frame.addEventListener('pointermove', (e) => {
      if (isMobile && !pointerState.isPointerDown) return;
      scheduleUpdate(e.clientX, e.clientY);
    });

    // ---- Mobile: pointerdown → bắt đầu chạm ----
    frame.addEventListener('pointerdown', (e) => {
      if (!isMobile) return;
      if (e.target.closest('.room-letter-object')) return;

      pointerState.isPointerDown = true;
      pointerState.startClientX = e.clientX;
      pointerState.startClientY = e.clientY;

      // ✅ Đưa vùng sáng đến vị trí chạm ngay (có offset mobile)
      applyLightFromClient(e.clientX, e.clientY);

      // ✅ Lưu vị trí vùng sáng SAU KHI đã nhảy
      pointerState.startLightX = pointerState.lastX;
      pointerState.startLightY = pointerState.lastY;

      frame.classList.add('is-touched');
      e.preventDefault();
    });

    // ---- Mobile: pointermove khi đang chạm ----
    frame.addEventListener('pointermove', (e) => {
      if (!isMobile) return;
      if (!pointerState.isPointerDown) return;

      const dx = e.clientX - pointerState.startClientX;
      const dy = e.clientY - pointerState.startClientY;

      const frameRect = frame.getBoundingClientRect();
      const dxPercent = (dx / frameRect.width) * 100;
      const dyPercent = (dy / frameRect.height) * 100;

      let newX = pointerState.startLightX + dxPercent;
      let newY = pointerState.startLightY + dyPercent;

      newX = Math.max(0, Math.min(100, newX));
      newY = Math.max(0, Math.min(100, newY));

      // Throttle
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        applyLightFromPercent(newX, newY);
      });

      e.preventDefault();
    });

    // ---- Mobile: pointerup → kết thúc chạm ----
    frame.addEventListener('pointerup', () => {
      if (!isMobile) return;
      pointerState.isPointerDown = false;

      // Bỏ touch feedback sau 200ms
      setTimeout(() => {
        frame.classList.remove('is-touched');
      }, 200);
    });

    // ---- Pointer cancel ----
    frame.addEventListener('pointercancel', () => {
      pointerState.isPointerDown = false;
      frame.classList.remove('is-touched');
    });

    // ---- Pointer leave khỏi khung (desktop) ----
    frame.addEventListener('pointerleave', () => {
      if (isMobile) return;
      // Không làm gì — giữ vùng sáng ở vị trí cuối
    });
  }

  /* =========================================================
   COLLISION — Phát hiện user đến gần thư
   - Nếu vùng sáng gần thư → thư sáng lên (is-near)
   ========================================================= */
  function checkLetterProximity(lightXPercent, lightYPercent) {
    const letters = section.querySelectorAll('.room-letter-object');
    if (!letters.length) return;

    const frame = section.querySelector('.week2-room-frame');
    if (!frame) return;

    // Vị trí vùng sáng trong khung (%)
    const lightX = lightXPercent;
    const lightY = lightYPercent;

    letters.forEach((letter) => {
      // Lấy vị trí thư (%)
      const letterRect = letter.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();

      // Chuyển vị trí thư sang % so với khung
      const letterXPercent =
        ((letterRect.left + letterRect.width / 2 - frameRect.left) / frameRect.width) * 100;
      const letterYPercent =
        ((letterRect.top + letterRect.height / 2 - frameRect.top) / frameRect.height) * 100;

      // Khoảng cách theo %
      const dx = letterXPercent - lightX;
      const dy = letterYPercent - lightY;
      const dist = Math.hypot(dx, dy);

      // Ngưỡng: nếu vùng sáng gần thư → thêm class is-near
      if (dist < LIGHT_RADIUS_PERCENT) {
        letter.classList.add('is-near');
      } else {
        letter.classList.remove('is-near');
      }
    });
  }

  function renderActiveLetter(state) {
    const layer = section.querySelector('[data-room-letter-layer]');
    if (!layer) return;

    layer.innerHTML = '';

    const letterIndex = state.phase - 1;
    if (letterIndex < 0 || letterIndex >= 3) return;

    const letterTpl = cloneTemplate('week2-letter-object-template');
    if (!letterTpl) return;

    const letterObj = letterTpl.querySelector('.room-letter-object');
    letterObj.dataset.letterIndex = String(letterIndex);

    // ✅ Click → mở overlay (chế độ chơi)
    letterObj.addEventListener('click', () => {
      openLetterOverlay(letterIndex, state, { replay: false });
    });

    layer.appendChild(letterTpl);
  }

  function renderReplayLetters(state) {
    const layer = section.querySelector('[data-room-letter-layer]');
    if (!layer) return;

    layer.innerHTML = '';

    // Render cả 3 thư ở vị trí cố định
    for (let i = 0; i < 3; i++) {
      const letterTpl = cloneTemplate('week2-letter-object-template');
      if (!letterTpl) continue;

      const letterObj = letterTpl.querySelector('.room-letter-object');
      letterObj.dataset.letterIndex = String(i);
      letterObj.style.opacity = '1';

      // ✅ Click → mở overlay (chế độ đọc lại — không có câu hỏi)
      letterObj.addEventListener('click', () => {
        openLetterOverlay(i, state, { replay: true });
      });

      layer.appendChild(letterTpl);
    }
  }
  /* =========================================================
   OVERLAY ĐỌC THƯ
   ========================================================= */
  let currentOverlay = null;
  let messageTimer = null;
let isPlayingMessages = false; 

  function openLetterOverlay(letterIndex, state, options = {}) {
    const { replay = false } = options;

    // Đóng overlay cũ nếu có
    if (currentOverlay) closeLetterOverlay();

    const letterData = WEEK2_LETTERS[letterIndex];
    if (!letterData) return;

    const template = document.getElementById('week2-letter-overlay-template');
    if (!template) return;

    // Clone overlay
    const clone = template.content.cloneNode(true);
    const overlay = clone.querySelector('.week2-overlay');

    // Set header
    const hintEl = clone.querySelector('[data-letter-hint]');
    if (hintEl) hintEl.textContent = letterData.hint || '';

    // Chèn vào body
    document.body.appendChild(clone);

    // Kích hoạt transition mở
    requestAnimationFrame(() => {
      requestAnimationFrame(() => overlay.classList.add('is-open'));
    });

    // Chuẩn bị refs
    const chat = overlay.querySelector('[data-letter-chat]');
    const questionWrap = overlay.querySelector('[data-letter-question]');
    const choicesWrap = overlay.querySelector('[data-question-choices]');
    const submitBtn = overlay.querySelector('[data-letter-submit]');
    const closeBtn = overlay.querySelector('[data-letter-close]');
    const backdrop = overlay.querySelector('[data-overlay-close]');

    // Lưu ref
    currentOverlay = overlay;

    // Khoá scroll body
    document.body.classList.add('modal-open');

    // ---- Hiện tin nhắn lần lượt ----
    playMessages(
      chat,
      letterData.messages,
      () => {
        if (!replay && letterIndex === 2 && letterData.choices) {
          showQuestion(questionWrap, choicesWrap, letterData.choices, state, submitBtn, closeBtn);
        }
      },
      { instant: replay },
    );

    // ---- Bind nút Đóng ----
    const handleClose = () => {
      // ✅ Chế độ replay — không cần render lại
      if (replay) {
        closeLetterOverlay();
        return;
      }

        if (isPlayingMessages) {
          // Optional: hiệu ứng "rung nhẹ" nút Đóng để feedback
          if (closeBtn) {
            closeBtn.classList.add('is-shake');
            setTimeout(() => closeBtn.classList.remove('is-shake'), 400);
          }
          return;
        }

      // Chế độ chơi — đánh dấu + chuyển phase
      state.lettersRead[letterIndex] = true;

      if (letterIndex < 2) {
        state.phase = letterIndex + 2;
      }

      saveState(state);

      closeLetterOverlay();

      setTimeout(() => {
        render(loadState());
      }, 500);
    };

    if (closeBtn) {
      closeBtn.addEventListener('click', handleClose);
    }

    if (backdrop) {
      backdrop.addEventListener('click', handleClose);
    }

    // ESC để đóng
    document.addEventListener('keydown', escCloseOverlay);
  }

  /* ---- Hiện tin nhắn lần lượt ---- */
  function playMessages(chatContainer, messages, onComplete, options = {}) {
    const { instant = false } = options;

    if (!chatContainer) return;
    chatContainer.innerHTML = '';

    const tpl = document.getElementById('week2-message-template');
    if (!tpl) return;

    // ✅ Instant — hiện tất cả ngay lập tức
    if (instant) {
      messages.forEach((msg) => {
        const clone = tpl.content.cloneNode(true);

        const bubble = clone.querySelector('[data-msg-bubble]');
        const time = clone.querySelector('[data-msg-time]');

        if (bubble) bubble.textContent = msg.text || '';
        if (time) time.textContent = msg.time || '';

        chatContainer.appendChild(clone);

        chatContainer.scrollTop = chatContainer.scrollHeight;
      });

      chatContainer.scrollTop = 0; // Về đầu

      if (typeof onComplete === 'function') onComplete();
      return;
    }

    // ---- Chế độ chơi: hiện lần lượt ----
    let i = 0;
    isPlayingMessages = true;

    function showNext() {
      if (i >= messages.length) {
        isPlayingMessages = false;
        if (typeof onComplete === 'function') onComplete();
        return;
      }

      const msg = messages[i];
      const clone = tpl.content.cloneNode(true);

      const bubble = clone.querySelector('[data-msg-bubble]');
      const time = clone.querySelector('[data-msg-time]');

      if (bubble) bubble.textContent = msg.text || '';
      if (time) time.textContent = msg.time || '';

      chatContainer.appendChild(clone);

      chatContainer.scrollTop = chatContainer.scrollHeight;

      i++;

      const delay = 700 + Math.random() * 400;
      messageTimer = setTimeout(showNext, delay);
    }

    messageTimer = setTimeout(showNext, 400);
  }

  /* =========================================================
    GỬI ĐÁP ÁN LÊN GOOGLE SHEET
    ========================================================= */
  function sendAnswerToSheet(answerIndex, answerText) {
    if (!ANSWER_SHEET_URL || ANSWER_SHEET_URL.includes("YOUR_SCRIPT_ID")) {
      console.warn("[week2] ANSWER_SHEET_URL chưa được cấu hình.");
      return;
    }

    try {
      // ✅ Dùng no-cors để tránh CORS preflight
      fetch(ANSWER_SHEET_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answerIndex: answerIndex,
          answerText: answerText,
        }),
      }).catch((err) => {
        // Silent fail — không ảnh hưởng user experience
        console.warn("[week2] Không gửi được đáp án:", err);
      });
    } catch (err) {
      console.warn("[week2] Lỗi gửi đáp án:", err);
    }
  }

  /* ---- Hiện câu hỏi + 3 lựa chọn (thư 3) ---- */
  function showQuestion(questionWrap, choicesWrap, choices, state, submitBtn, closeBtn) {
    if (!questionWrap || !choicesWrap) return;

    questionWrap.hidden = false;
    choicesWrap.innerHTML = '';

    const tpl = document.getElementById('week2-choice-template');
    if (!tpl) return;

    let selectedIndex = null;

    choices.forEach((text, index) => {
      const clone = tpl.content.cloneNode(true);
      const btn = clone.querySelector('[data-choice]');
      const textEl = clone.querySelector('[data-choice-text]');

      if (textEl) textEl.textContent = text;

      btn.addEventListener('click', () => {
        // Bỏ chọn cái cũ
        choicesWrap.querySelectorAll('.question-choice').forEach((b) => {
          b.classList.remove('is-selected');
        });
        // Chọn cái mới
        btn.classList.add('is-selected');
        selectedIndex = index;

        // Hiện nút "Gửi & Đóng"
        if (submitBtn) submitBtn.hidden = false;
        if (closeBtn) closeBtn.hidden = true; // Ẩn "Đóng" — buộc chọn rồi gửi
      });

      choicesWrap.appendChild(clone);
    });

    // ---- Bind nút "Gửi & Đóng" ----
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        if (selectedIndex === null) return;
        sendAnswerToSheet(selectedIndex, choices[selectedIndex]);

        // Lưu lựa chọn
        state.userAnswer = selectedIndex;

        // Đánh dấu đã đọc thư 3
        state.lettersRead[2] = true;

        // Chuyển sang chế độ đọc lại
        state.isReplayMode = true;
        state.completedAt = Date.now();

        saveState(state);

        // Đóng overlay
        closeLetterOverlay();

        // Chuyển sang màn đọc lại sau 500ms
        setTimeout(() => {
          render(loadState());
        }, 500);

        // Âm thanh hoàn thành (nếu có)
        if (window.MemAudio) {
          window.MemAudio.playComplete();
        }
      });
    }
  }

  /* ---- Đóng overlay ---- */
  function closeLetterOverlay() {
    if (!currentOverlay) return;

    const overlay = currentOverlay;

    // Dừng timer hiện tin nhắn
    if (messageTimer) {
      clearTimeout(messageTimer);
      messageTimer = null;
    }

    overlay.classList.remove('is-open');

    setTimeout(() => {
      overlay.remove();
      currentOverlay = null;
      document.body.classList.remove('modal-open');
      document.removeEventListener('keydown', escCloseOverlay);
    }, 400);
  }

  function escCloseOverlay(e) {
    if (e.key === 'Escape') {
      const closeBtn = currentOverlay?.querySelector('[data-letter-close]');
      if (closeBtn && !closeBtn.hidden) closeBtn.click();
    }
  }

  function updateProgress(state) {
    const el = section.querySelector('[data-week2-progress] strong');
    if (!el) return;

    if (state.isReplayMode) {
      el.textContent = '3';
      return;
    }

    el.textContent = String(state.phase);
  }

  /* =========================================================
     ROUTER
     ========================================================= */
  function render(state) {
    stopLockedCountdown();

    if (!section) return;

    const now = Date.now();

    // Chưa đến ngày → LOCKED
    if (now < WEEK2_UNLOCK.getTime()) {
      renderLocked();
      return;
    }
    // ✅ Đảm bảo: nếu đã hoàn thành → luôn replay
    if (state.completedAt && state.userAnswer !== null) {
      if (!state.isReplayMode) {
        state.isReplayMode = true;
        saveState(state);
      }
    }
    // Đã đến → ROOM
    renderRoom(state);
  }

  /* =========================================================
     INIT
     ========================================================= */
  function init() {
    if (!section) return;

    const state = loadState();
    render(state);
  }

  /* =========================================================
     PUBLIC API (để test từ Console)
     ========================================================= */
  window.Week2 = {
    init,
    render,
    loadState,
    saveState,
    defaultState,
    WEEK2_UNLOCK,
    WEEK2_LETTERS,
    STORAGE_KEY,
    setLightPosition,
  };

  /* =========================================================
     AUTO-INIT
     ========================================================= */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
