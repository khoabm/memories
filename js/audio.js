/* =========================================================
   AUDIO — Web Audio API
   Tạo âm thanh bằng code, không cần file .mp3
   ========================================================= */

(function () {
  "use strict";

  const STORAGE_KEY = "memories.audio.enabled";

  let audioCtx = null;
  let enabled = true;
  let paperNoiseBuffer = null;
  let pageTurnSource = null;

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

  /* Tiếng giấy sột soạt: noise qua bộ lọc, tăng/giảm âm lượng mềm.
     Bìa da có tiếng trầm, ngắn hơn giấy; không cần tải file âm thanh. */
  function playPageTurn({ hard = false } = {}) {
    if (!enabled) return;
    const ctx = ensureCtx();
    if (!ctx || ctx.state === "closed") return;
    unlock();

    if (!paperNoiseBuffer) {
      paperNoiseBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.6), ctx.sampleRate);
      const samples = paperNoiseBuffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    }
    // Không chồng nhiều tiếng khi người dùng lật liên tiếp rất nhanh.
    if (pageTurnSource) pageTurnSource.stop();
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    const start = ctx.currentTime;
    const duration = hard ? 0.34 : 0.48;
    source.buffer = paperNoiseBuffer;
    filter.type = "bandpass";
    filter.Q.value = hard ? 0.55 : 0.7;
    filter.frequency.setValueAtTime(hard ? 550 : 1700, start);
    filter.frequency.exponentialRampToValueAtTime(hard ? 240 : 750, start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(hard ? 0.11 : 0.14, start + 0.045);
    gain.gain.linearRampToValueAtTime(hard ? 0.035 : 0.055, start + duration * 0.55);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    pageTurnSource = source;
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
      if (pageTurnSource === source) pageTurnSource = null;
    };
    source.start(start);
    source.stop(start + duration);
  }

  /* =========================================================
     Bật / tắt âm thanh (lưu vào localStorage)
     ========================================================= */
  function isEnabled() {
    return enabled;
  }

  function setEnabled(value) {
    enabled = !!value;
    if (!enabled && pageTurnSource) {
      pageTurnSource.stop();
      pageTurnSource = null;
    }
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
    playPageTurn,
  };
})();
