/* =========================================================
   AUDIO — Web Audio API
   Tạo âm thanh bằng code, không cần file .mp3
   ========================================================= */

(function () {
  "use strict";

  const STORAGE_KEY = "memories.audio.enabled";

  let audioCtx = null;
  let enabled = true;

  /* =========================================================
     Khởi tạo AudioContext (lazy)
     ========================================================= */
  function ensureCtx() {
    if (audioCtx) return audioCtx;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
      return audioCtx;
    } catch (err) {
      console.warn("[audio] Không tạo được AudioContext.", err);
      return null;
    }
  }

  /* =========================================================
     Unlock — gọi sau tương tác đầu tiên của user
     (Chrome/Safari chặn audio cho đến khi có user gesture)
     ========================================================= */
  function unlock() {
    const ctx = ensureCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => { /* ignore */ });
    }
  }

  /* =========================================================
     Play 1 nốt đơn giản
     @param {number} freq      - tần số (Hz)
     @param {number} duration  - thời lượng (giây)
     @param {number} startTime - thời điểm bắt đầu (giây, so với now)
     @param {string} type      - loại sóng: sine / triangle / square
     @param {number} gainPeak  - âm lượng đỉnh (0–1)
     ========================================================= */
  function playTone(freq, duration, startTime = 0, type = "sine", gainPeak = 0.18) {
    if (!enabled) return;

    const ctx = ensureCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => { /* ignore */ });
    }

    const t0 = ctx.currentTime + startTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);

    // Envelope: attack nhanh → giữ → release
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(gainPeak, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  /* =========================================================
     Âm thanh: ghép đúng 1 mảnh
     - 2 nốt: C6 (1046 Hz) → E6 (1318 Hz), nhanh
     ========================================================= */
  function playCorrect() {
    playTone(1046.5, 0.12, 0,    "sine",     0.20);
    playTone(1318.5, 0.16, 0.06, "triangle", 0.14);
  }

  /* =========================================================
     Âm thanh: thả sai
     - 1 nốt trầm, ngắn, không khó chịu
     ========================================================= */
  function playWrong() {
    playTone(220, 0.14, 0, "sine", 0.12);
  }

  /* =========================================================
     Âm thanh: hoàn thành 1 ảnh
     - 3 nốt: C5 (523) → E5 (659) → G5 (784), tăng dần
     ========================================================= */
  function playComplete() {
    playTone(523.25, 0.14, 0,    "sine",     0.18);
    playTone(659.25, 0.14, 0.13, "sine",     0.18);
    playTone(783.99, 0.30, 0.26, "triangle", 0.20);
  }

  /* =========================================================
     Bật / tắt âm thanh (lưu vào localStorage)
     ========================================================= */
  function isEnabled() {
    return enabled;
  }

  function setEnabled(value) {
    enabled = !!value;
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    } catch (err) { /* ignore */ }
  }

  // Load lúc khởi động
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "0") enabled = false;
  } catch (err) { /* ignore */ }

  /* =========================================================
     PUBLIC API
     ========================================================= */
  window.MemAudio = {
    unlock,
    isEnabled,
    setEnabled,
    playCorrect,
    playWrong,
    playComplete,
  };
})();