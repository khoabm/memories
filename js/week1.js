/* =========================================================
   WEEK 1 — Khởi tạo + Render state
   - Trạng thái 1: LOCKED (chưa đến 20/09/2025)
   - Trạng thái 2: QUEUE (đã đến, chưa xong 3 ảnh)
   - Trạng thái 3: PUZZLE (đang chơi 1 ảnh)
   ========================================================= */

(function () {
  'use strict';

  /* =========================================================
       CONFIG
       ========================================================= */
  const WEEK1_UNLOCK = new Date('2025-09-20T00:00:00+07:00');
  const STORAGE_KEY = 'memories.week1.puzzle';
  const THRESHOLD_RATIO = 0.4; // khoảng cách tâm < 40% tile-size

  // Danh sách 3 ảnh — thay src sau
  const WEEK1_IMAGES = [
    {
      id: 1,
      label: 'Đà Lạt 2025',
      src: './assets/images/puzzle/puzzle1.jpg',
      date: '15/08/2025',
      correctOrder: 0, // 0 = quá khứ
    },
    {
      id: 2,
      label: 'Xuân 2026',
      src: './assets/images/puzzle/puzzle2.jpg',
      date: '11/02/2026',
      correctOrder: 1,
    },
    {
      id: 3,
      label: 'Hè 2026',
      src: './assets/images/puzzle/puzzle3.jpg',
      date: '18/07/2026',
      correctOrder: 2,
    },
  ];

  /* =========================================================
       STATE
       ========================================================= */
  // Trạng thái mặc định
  function defaultState() {
    return {
      completed: [false, false, false],
      inProgress: null,
      poolOrder: null,
      placed: null,
      sortPool: null, // mảng imageIndex theo thứ tự pool (xáo)
      sortPlaced: null, // mảng 3 phần tử: [imageIndex, null, null] — vị trí đã đặt
      sortDone: false, // đã sắp xếp xong chưa
    };
  }

  // Load từ localStorage
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();

      const parsed = JSON.parse(raw);

      // Validate cơ bản
      if (!Array.isArray(parsed.completed) || parsed.completed.length !== 3) {
        return defaultState();
      }

      const state = {
        completed: parsed.completed.map(Boolean),
        inProgress: typeof parsed.inProgress === 'number' ? parsed.inProgress : null,
        poolOrder:
          Array.isArray(parsed.poolOrder) && parsed.poolOrder.length === TILE_COUNT
            ? parsed.poolOrder
            : null,
        placed:
          Array.isArray(parsed.placed) && parsed.placed.length === TILE_COUNT
            ? parsed.placed.map(Boolean)
            : null,
        sortPool:
          Array.isArray(parsed.sortPool) && parsed.sortPool.length === 3 ? parsed.sortPool : null,
        sortPlaced:
          Array.isArray(parsed.sortPlaced) && parsed.sortPlaced.length === 3
            ? parsed.sortPlaced
            : null,
        sortDone: !!parsed.sortDone,
      };
      return state;
    } catch (err) {
      console.warn('[week1] Không load được state, dùng mặc định.', err);
      return defaultState();
    }
  }

  // Lưu vào localStorage
  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('[week1] Không lưu được state.', err);
    }
  }

  /* =========================================================
       RENDER HELPERS
       ========================================================= */
  const section = document.getElementById('week-1');

  function clearSection() {
    if (!section) return;
    section.innerHTML = '';
  }

  function cloneTemplate(id) {
    const tpl = document.getElementById(id);
    if (!tpl) return null;
    return tpl.content.cloneNode(true);
  }

  /* =========================================================
       TRẠNG THÁI 1: LOCKED
       ========================================================= */
  function renderLocked() {
    if (!section) return;
    clearSection();

    const clone = cloneTemplate('week1-locked-template');
    if (!clone) return;

    section.appendChild(clone);

    // Khởi động countdown realtime
    startLockedCountdown();
  }

  /* =========================================================
    COUNTDOWN REALTIME (trạng thái LOCKED)
    ========================================================= */
  let lockedTimerId = null;

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function updateLockedCountdown() {
    const diff = WEEK1_UNLOCK.getTime() - Date.now();

    const setVal = (key, value) => {
      const el = section.querySelector(`[data-cd="${key}"]`);
      if (el) el.textContent = pad2(value);
    };

    if (diff <= 0) {
      // Đã đến ngày → dừng countdown + render lại state
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
       TRẠNG THÁI 2: QUEUE
       ========================================================= */
  function renderQueue(state) {
    if (!section) return;
    clearSection();

    const clone = cloneTemplate('week1-queue-template');
    if (!clone) return;

    section.appendChild(clone);

    const slotsContainer = section.querySelector('#weekSlots');
    if (!slotsContainer) return;

    WEEK1_IMAGES.forEach((img, index) => {
      const isDone = state.completed[index];
      const slotEl = buildSlot(img, index, isDone);
      if (!slotEl) return;

      // Chỉ bind click khi slot chưa xong
      if (!isDone) {
        slotEl.addEventListener('click', () => startPuzzle(index, state));
      }

      slotsContainer.appendChild(slotEl);
    });

    updateQueueProgress(state);
  }
  /* =========================================================
   PHASE 2 — SẮP XẾP
   ========================================================= */
  function renderSort(state) {
    if (!section) return;
    clearSection();

    const clone = cloneTemplate('week1-sort-template');
    if (!clone) return;

    section.appendChild(clone);

    // Khởi tạo state sort nếu chưa có
    if (
      !Array.isArray(state.sortPool) ||
      state.sortPool.length !== 3 ||
      !Array.isArray(state.sortPlaced) ||
      state.sortPlaced.length !== 3
    ) {
      // Pool: xáo trộn [0,1,2]
      state.sortPool = shuffleArray([0, 1, 2]);
      // Placed: 3 slot trống
      state.sortPlaced = [null, null, null];
      saveState(state);
    }

    renderSortPool(state);
    renderSortSlots(state);
    updateSortPoolUI(state);
    bindSortDragDrop(state);
  }

  /* ---------- Render pool ảnh ---------- */
  function renderSortPool(state) {
    const pool = section.querySelector('#sortPool');
    if (!pool) return;
    pool.innerHTML = '';

    // Chỉ render ảnh CHƯA vào slot (chưa placed)
    state.sortPool.forEach((imageIndex) => {
      // Nếu imageIndex đã có trong sortPlaced → bỏ qua
      if (state.sortPlaced.includes(imageIndex)) return;

      const item = buildSortItem(imageIndex);
      if (item) pool.appendChild(item);
    });

    // Rỗng?
    if (pool.children.length === 0) {
      pool.classList.add('is-empty');
    } else {
      pool.classList.remove('is-empty');
    }
  }

  function buildSortItem(imageIndex) {
    const clone = cloneTemplate('week1-sort-item-template');
    if (!clone) return null;

    const item = clone.querySelector('.week-sort-item');
    const img = clone.querySelector('img');
    const imageData = WEEK1_IMAGES[imageIndex];

    if (!item || !img || !imageData) return null;

    img.src = imageData.src;
    img.alt = imageData.label;
    item.dataset.imageIndex = String(imageIndex);

    return item;
  }

  /* ---------- Render slots ---------- */
  function renderSortSlots(state) {
    const container = section.querySelector('#sortSlots');
    if (!container) return;
    container.innerHTML = '';

    for (let slotIndex = 0; slotIndex < 3; slotIndex++) {
      const slot = buildSortSlot(slotIndex, state.sortPlaced[slotIndex]);
      if (slot) container.appendChild(slot);
    }
  }

  function buildSortSlot(slotIndex, imageIndex) {
    const clone = cloneTemplate('week1-sort-slot-template');
    if (!clone) return null;

    const slot = clone.querySelector('.week-sort-slot');
    const img = clone.querySelector('[data-sort-slot-img]');
    const dateEl = clone.querySelector('[data-sort-slot-date]');
    const placeholder = clone.querySelector('.week-sort-slot-date-placeholder');

    if (!slot || !img || !dateEl) return null;

    slot.dataset.slotIndex = String(slotIndex);

    // Nếu slot đã có ảnh (từ state)
    if (imageIndex !== null) {
      const imageData = WEEK1_IMAGES[imageIndex];
      img.src = imageData.src;
      img.alt = imageData.label;
    //   img.hidden = false;
      slot.classList.add('is-filled');

      // Điền ngày tháng
      if (placeholder) placeholder.remove();
      const dateText = document.createTextNode(imageData.date || '');
      dateEl.innerHTML = '';
      dateEl.appendChild(dateText);
    }

    return slot;
  }

  /* ---------- Update pool UI ---------- */
  function updateSortPoolUI(state) {
    const pool = section.querySelector('#sortPool');
    if (!pool) return;

    if (pool.children.length === 0) {
      pool.classList.add('is-empty');
    } else {
      pool.classList.remove('is-empty');
    }
  }

  /* =========================================================
   DRAG & DROP — Phase 2
   ========================================================= */
  function bindSortDragDrop(state) {
    const pool = section.querySelector('#sortPool');
    if (!pool) return;

    let sortDragState = null;

    // ---- Pointer down trên pool ----
    pool.addEventListener('pointerdown', (e) => {
      const item = e.target.closest('.week-sort-item');
      if (!item) return;

      if (window.MemAudio) window.MemAudio.unlock();

      e.preventDefault();

      const rect = item.getBoundingClientRect();

      sortDragState = {
        item,
        clone: null,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        rect,
        moved: false,
      };

      window.addEventListener('pointermove', onSortDragMove);
      window.addEventListener('pointerup', onSortDragEnd);
      window.addEventListener('pointercancel', onSortDragCancel);
    });

    function onSortDragMove(e) {
      if (!sortDragState) return;

      const dx = e.clientX - sortDragState.startX;
      const dy = e.clientY - sortDragState.startY;

      if (!sortDragState.moved) {
        if (Math.hypot(dx, dy) < DRAG_START_PX) return;
        sortDragState.moved = true;
        startSortDragVisual();
      }

      if (sortDragState.clone) {
        sortDragState.clone.style.left = e.clientX - sortDragState.offsetX + 'px';
        sortDragState.clone.style.top = e.clientY - sortDragState.offsetY + 'px';
      }

      // Highlight slot dưới tâm clone
      if (sortDragState.clone) {
        const r = sortDragState.clone.getBoundingClientRect();
        highlightSortSlot(r.left + r.width / 2, r.top + r.height / 2);
      }
    }

    function startSortDragVisual() {
      const { item, rect } = sortDragState;

      const clone = item.cloneNode(true);
      clone.classList.remove('is-dragging-source');
      clone.classList.add('is-dragging-clone');
      clone.style.position = 'fixed';
      clone.style.left = rect.left + 'px';
      clone.style.top = rect.top + 'px';
      clone.style.width = rect.width + 'px';
      clone.style.height = rect.height + 'px';
      clone.style.margin = '0';
      clone.style.visibility = 'visible';
      clone.style.opacity = '1';
      clone.style.transform = 'rotate(0deg) scale(1.06)';

      document.body.appendChild(clone);
      sortDragState.clone = clone;

      item.classList.add('is-dragging-source');
      item.style.visibility = 'hidden';
    }

    function onSortDragEnd(e) {
      if (!sortDragState) return;

      const wasMoved = sortDragState.moved;
      const item = sortDragState.item;
      const clone = sortDragState.clone;

      window.removeEventListener('pointermove', onSortDragMove);
      window.removeEventListener('pointerup', onSortDragEnd);
      window.removeEventListener('pointercancel', onSortDragCancel);

      if (!wasMoved) {
        cleanupSortDrag();
        return;
      }

      // Tâm clone
      let tileCenterX = e.clientX;
      let tileCenterY = e.clientY;
      let tileSize = sortDragState.rect.width;
      if (clone) {
        const r = clone.getBoundingClientRect();
        tileCenterX = r.left + r.width / 2;
        tileCenterY = r.top + r.height / 2;
      }

      const dropInfo = findSortSlotAt(tileCenterX, tileCenterY, tileSize);

      if (dropInfo && dropInfo.valid) {
        const imageIndex = parseInt(item.dataset.imageIndex, 10);
        const slotIndex = parseInt(dropInfo.slot.dataset.slotIndex, 10);

        // Đúng nếu imageIndex.correctOrder === slotIndex
        const imageData = WEEK1_IMAGES[imageIndex];
        if (imageData && imageData.correctOrder === slotIndex) {
          // Đúng → commit
          commitSortItem(item, dropInfo.slot, imageIndex, state);
          cleanupSortDrag();
        } else {
          // Sai → về pool
          if (window.MemAudio) window.MemAudio.playWrong();
          animateSortReturn(item, sortDragState.rect);
          cleanupSortDrag({ keepClone: true, keepTile: true });
        }
      } else {
        // Không có slot
        if (window.MemAudio) window.MemAudio.playWrong();
        animateSortReturn(item, sortDragState.rect);
        cleanupSortDrag({ keepClone: true, keepTile: true });
      }

      clearSortSlotHighlight();
    }

    function onSortDragCancel() {
      if (!sortDragState) return;

      window.removeEventListener('pointermove', onSortDragMove);
      window.removeEventListener('pointerup', onSortDragEnd);
      window.removeEventListener('pointercancel', onSortDragCancel);

      if (sortDragState.moved) {
        animateSortReturn(sortDragState.item, sortDragState.rect);
        cleanupSortDrag({ keepClone: true, keepTile: true });
      } else {
        cleanupSortDrag();
      }
      clearSortSlotHighlight();
    }

    function cleanupSortDrag(options = {}) {
      if (!sortDragState) return;
      const { keepClone = false, keepTile = false } = options;

      if (!keepClone && sortDragState.clone) {
        sortDragState.clone.remove();
      }
      if (!keepTile && sortDragState.item) {
        sortDragState.item.classList.remove('is-dragging-source');
        sortDragState.item.style.visibility = '';
      }
      sortDragState = null;
    }

    // Expose để dùng ở ngoài
    window.__sortDragState = () => sortDragState;
  }

  /* ---------- Highlight slot ---------- */
  function highlightSortSlot(x, y) {
    clearSortSlotHighlight();
    const slot = findSortSlotAt(x, y, 160);
    if (slot.valid && slot.slot) {
      slot.slot.classList.add('is-hover-target');
    }
  }

  function clearSortSlotHighlight() {
    section.querySelectorAll('.week-sort-slot.is-hover-target').forEach((s) => {
      s.classList.remove('is-hover-target');
    });
  }

  function findSortSlotAt(x, y, tileSize) {
    const slots = section.querySelectorAll('.week-sort-slot:not(.is-filled)');
    if (!slots.length) return { valid: false };

    let bestSlot = null;
    let bestDist = Infinity;

    slots.forEach((slot) => {
      const inner = slot.querySelector('.week-sort-slot-inner');
      if (!inner) return;
      const rect = inner.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(x - cx, y - cy);
      if (dist < bestDist) {
        bestDist = dist;
        bestSlot = slot;
      }
    });

    if (!bestSlot) return { valid: false };

    const threshold = tileSize * THRESHOLD_RATIO;
    if (bestDist > threshold) return { valid: false };

    return { valid: true, slot: bestSlot };
  }

  /* ---------- Commit ảnh vào slot ---------- */
  function commitSortItem(item, slot, imageIndex, state) {
    const slotIndex = parseInt(slot.dataset.slotIndex, 10);

    // Cập nhật state
    state.sortPlaced[slotIndex] = imageIndex;
    saveState(state);

    // Xóa item khỏi pool (không chỉ ẩn — xóa luôn)
    item.remove();

    // Điền ảnh vào slot
    const img = slot.querySelector('[data-sort-slot-img]');
    const dateEl = slot.querySelector('[data-sort-slot-date]');
    const placeholder = slot.querySelector('.week-sort-slot-date-placeholder');
    const imageData = WEEK1_IMAGES[imageIndex];

    if (img) {
      img.src = imageData.src;
      img.alt = imageData.label;
    //   img.hidden = false;
    }
    slot.classList.add('is-filled');

    if (dateEl) {
      if (placeholder) placeholder.remove();
      dateEl.textContent = imageData.date || '';
    }

    // Âm thanh
    if (window.MemAudio) window.MemAudio.playCorrect();

    // Update pool UI
    updateSortPoolUI(state);

    // Check hoàn thành
    checkSortCompletion(state);
  }

  /* ---------- Animation bay về pool ---------- */
  function animateSortReturn(item, startRect) {
    const s = window.__sortDragState ? window.__sortDragState() : null;
    const clone = s && s.clone;

    if (!clone || !startRect) {
      if (item) {
        item.style.visibility = '';
        item.classList.remove('is-dragging-source');
      }
      return;
    }

    const fromRect = clone.getBoundingClientRect();
    const dx = startRect.left - fromRect.left;
    const dy = startRect.top - fromRect.top;

    clone.style.transition = 'transform .4s cubic-bezier(0.22, 1, 0.36, 1), opacity .4s ease-out';
    clone.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(0deg) scale(1)`;
    clone.style.opacity = '0.6';

    setTimeout(() => {
      if (clone && clone.parentNode) clone.remove();
      if (item) {
        item.style.visibility = '';
        item.classList.remove('is-dragging-source');
      }
    }, 420);
  }

  /* ---------- Kiểm tra hoàn thành Phase 2 ---------- */
  function checkSortCompletion(state) {
    const allPlaced = state.sortPlaced.every((v) => v !== null);
    if (!allPlaced) return;

    // Kiểm tra tất cả đúng vị trí
    const allCorrect = state.sortPlaced.every((imageIndex, slotIndex) => {
      const imageData = WEEK1_IMAGES[imageIndex];
      return imageData && imageData.correctOrder === slotIndex;
    });

    if (!allCorrect) return;

    // Đánh dấu hoàn thành
    state.sortDone = true;
    saveState(state);

    if (window.MemAudio) window.MemAudio.playComplete();

    // Tự động chuyển Phase 3 sau 1.8s
    setTimeout(() => {
      render(loadState());
    }, 1800);
  }
  /* =========================================================
       Bắt đầu 1 puzzle — chuyển từ queue sang puzzle state
       ========================================================= */
  function startPuzzle(imageIndex, state) {
    if (state.completed[imageIndex]) return;

    // ✅ Unlock audio ngay trong user gesture (click)
    if (window.MemAudio) {
      window.MemAudio.unlock();
    }

    state.inProgress = imageIndex;
    state.poolOrder = shuffleArray(Array.from({ length: TILE_COUNT }, (_, i) => i));
    state.placed = Array(TILE_COUNT).fill(false);

    saveState(state);
    render(state);
  }

  function buildSlot(imageData, index, isDone) {
    const clone = cloneTemplate('week1-slot-template');
    if (!clone) return null;

    const slot = clone.querySelector('.week-slot');
    const img = clone.querySelector('img');

    if (!slot || !img) return null;

    // Set ảnh
    img.src = imageData.src;
    img.alt = imageData.label;

    // Set class trạng thái
    slot.classList.add(isDone ? 'is-done' : 'is-locked');

    // Lưu index để bind sự kiện sau
    slot.dataset.index = String(index);

    return slot;
  }

  function updateQueueProgress(state) {
    const el = section.querySelector('#weekProgress strong');
    if (!el) return;

    const done = state.completed.filter(Boolean).length;
    el.textContent = `${done}/3`;
  }
  /* =========================================================
    PUZZLE — Helpers
    ========================================================= */
  const PUZZLE_SIZE = 3; // 3×3
  const TILE_COUNT = PUZZLE_SIZE * PUZZLE_SIZE; // 9

  /**
   * Fisher-Yates shuffle — xáo trộn mảng không trùng vị trí ban đầu.
   * @param {number[]} arr
   * @returns {number[]} mảng mới đã xáo trộn
   */
  function shuffleArray(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  /* =========================================================
       TRẠNG THÁI 3: PUZZLE
       (Chưa có logic — chỉ render khung trống)
       ========================================================= */
  /* =========================================================
       Nút "Quay lại" — thoát puzzle, về queue
       ========================================================= */
  function bindPuzzleBackButton(state) {
    const backBtn = section.querySelector('[data-back]');
    if (!backBtn) return;

    backBtn.addEventListener('click', () => {
      // Reset trạng thái puzzle hiện tại
      state.inProgress = null;
      state.poolOrder = null;
      state.placed = null;

      saveState(state);
      render(state);
    });
  }
  /* =========================================================
       Nút bật/tắt âm thanh
       ========================================================= */
  function bindAudioToggle() {
    const btn = section.querySelector('[data-audio-toggle]');
    if (!btn) return;
    if (!window.MemAudio) return;

    // Đồng bộ trạng thái ban đầu
    syncAudioToggleUI(btn);

    btn.addEventListener('click', () => {
      const newState = !window.MemAudio.isEnabled();
      window.MemAudio.setEnabled(newState);

      // Nếu vừa bật → unlock + phát 1 ting nhỏ để feedback
      if (newState) {
        window.MemAudio.unlock();
        window.MemAudio.playCorrect();
      }

      syncAudioToggleUI(btn);
    });
  }

  function syncAudioToggleUI(btn) {
    if (!btn || !window.MemAudio) return;
    const enabled = window.MemAudio.isEnabled();
    btn.classList.toggle('is-on', enabled);
    btn.classList.toggle('is-off', !enabled);
    btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    btn.setAttribute('aria-label', enabled ? 'Tắt âm thanh' : 'Bật âm thanh');
  }
  function renderPuzzle(state) {
    if (!section || state.inProgress === null) return;
    clearSection();

    const clone = cloneTemplate('week1-puzzle-template');
    if (!clone) return;

    section.appendChild(clone);

    const index = state.inProgress;
    const imageData = WEEK1_IMAGES[index];

    const label = section.querySelector('[data-image-label]');
    if (label && imageData) {
      label.textContent = imageData.label;
    }

    // Nếu chưa có state → tạo mới
    if (
      !Array.isArray(state.poolOrder) ||
      state.poolOrder.length !== TILE_COUNT ||
      !Array.isArray(state.placed) ||
      state.placed.length !== TILE_COUNT
    ) {
      state.poolOrder = shuffleArray(Array.from({ length: TILE_COUNT }, (_, i) => i));
      state.placed = Array(TILE_COUNT).fill(false);
      saveState(state);
    }

    renderPuzzleBoard(state, imageData);
    updatePuzzleProgress(state);
    updateBoardTileSize();

    // Bind drag-drop
    bindPuzzleDragDrop(state, imageData);

    // ✅ Bind nút "Quay lại"
    bindPuzzleBackButton(state);
    bindAudioToggle();
  }
  /* =========================================================
       PUZZLE — Render board
       ========================================================= */
  function renderPuzzleBoard(state, imageData) {
    const board = section.querySelector('#puzzleBoard');
    const pool = section.querySelector('#puzzlePool');
    if (!board || !pool) return;

    board.innerHTML = '';
    pool.innerHTML = '';

    const tileBgSize = `${PUZZLE_SIZE * 100}% ${PUZZLE_SIZE * 100}%`;

    // ---- 1. Board: 9 ô, ô nào placed[i]=true thì chèn mảnh i ----
    for (let i = 0; i < TILE_COUNT; i++) {
      const slot = document.createElement('div');
      slot.className = 'puzzle-slot';
      slot.dataset.slotIndex = String(i);

      if (state.placed[i]) {
        const tile = createTile(i, imageData, tileBgSize);
        tile.classList.add('is-placed');
        slot.classList.add('is-filled');
        slot.appendChild(tile);
      }

      board.appendChild(slot);
    }

    // ---- 2. Pool: các mảnh chưa đặt, theo thứ tự poolOrder ----
    state.poolOrder.forEach((tileIndex) => {
      if (state.placed[tileIndex]) return;
      const tile = createTile(tileIndex, imageData, tileBgSize);
      pool.appendChild(tile);
    });

    // ---- 3. Pool rỗng? ----
    if (pool.children.length === 0) {
      pool.classList.add('is-empty');
    } else {
      pool.classList.remove('is-empty');
    }
  }

  function createTile(tileIndex, imageData, tileBgSize) {
    // Guard: nếu imageData không hợp lệ → log lỗi rõ ràng + return tile trống
    if (!imageData || !imageData.src) {
      console.error('[week1] createTile: imageData không hợp lệ.', {
        tileIndex,
        imageData,
      });
    }

    const tile = document.createElement('div');
    tile.className = 'puzzle-tile';
    tile.dataset.tileIndex = String(tileIndex);

    const col = tileIndex % PUZZLE_SIZE;
    const row = Math.floor(tileIndex / PUZZLE_SIZE);
    const bgPosX = (col / (PUZZLE_SIZE - 1)) * 100;
    const bgPosY = (row / (PUZZLE_SIZE - 1)) * 100;

    const src = imageData && imageData.src ? imageData.src : '';
    tile.style.backgroundImage = src ? `url("${src}")` : '';
    tile.style.backgroundSize = tileBgSize;
    tile.style.backgroundPosition = `${bgPosX}% ${bgPosY}%`;

    return tile;
  }
  /* =========================================================
       PUZZLE — Drag & Drop (Pointer Events)
       ========================================================= */
  /* =========================================================
       PUZZLE — Drag & Drop (Pointer Events) — v2
       ========================================================= */
  const DRAG_START_PX = 5; // ngưỡng phân biệt click vs drag

  let dragState = null; // { tile, clone, offsetX, offsetY, startX, startY }

  function bindPuzzleDragDrop(state, imageData) {
    const pool = section.querySelector('#puzzlePool');
    const board = section.querySelector('#puzzleBoard');
    if (!pool || !board) return;

    // ---- Pointer down trên pool ----
    pool.addEventListener('pointerdown', (e) => {
      if (window.MemAudio) window.MemAudio.unlock();
      const tile = e.target.closest('.puzzle-tile');
      if (!tile) return;
      if (tile.classList.contains('is-placed')) return;

      // ✅ Unlock audio nhân dịp user gesture
      if (window.MemAudio) window.MemAudio.unlock();

      e.preventDefault();

      const rect = tile.getBoundingClientRect();

      dragState = {
        tile,
        clone: null,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        rect,
        moved: false,
      };

      // Bind move + up trên window để không miss sự kiện
      window.addEventListener('pointermove', onDragMove);
      window.addEventListener('pointerup', onDragEnd);
      window.addEventListener('pointercancel', onDragCancel);
    });

    // ---- Pointer move ----
    function onDragMove(e) {
      if (!dragState) return;

      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;

      // Chưa vượt ngưỡng → chưa bắt đầu drag
      if (!dragState.moved) {
        if (Math.hypot(dx, dy) < DRAG_START_PX) return;
        dragState.moved = true;
        startDragVisual();
      }

      // Cập nhật vị trí clone
      if (dragState.clone) {
        dragState.clone.style.left = e.clientX - dragState.offsetX + 'px';
        dragState.clone.style.top = e.clientY - dragState.offsetY + 'px';
      }

      // Highlight slot dưới con trỏ
      // Dùng tâm clone để highlight chính xác
      if (dragState.clone) {
        const r = dragState.clone.getBoundingClientRect();
        highlightSlotUnder(r.left + r.width / 2, r.top + r.height / 2);
      }
    }

    // ---- Bắt đầu visual drag ----
    function startDragVisual() {
      const { tile, rect } = dragState;

      // 1. Tạo clone TRƯỚC
      const clone = tile.cloneNode(true);

      // 2. Xóa class có thể gây ẩn (phòng trường hợp tile gốc đã có class)
      clone.classList.remove('is-dragging-source', 'is-dragging');

      // 3. Thêm class clone
      clone.classList.add('is-dragging-clone');

      // 4. Style inline cho clone
      clone.style.position = 'fixed';
      clone.style.left = rect.left + 'px';
      clone.style.top = rect.top + 'px';
      clone.style.width = rect.width + 'px';
      clone.style.height = rect.height + 'px';
      clone.style.margin = '0';
      clone.style.zIndex = '9999';
      clone.style.pointerEvents = 'none';
      clone.style.visibility = 'visible'; // ← Đảm bảo visible
      clone.style.opacity = '1'; // ← Đảm bảo opacity
      clone.style.transform = 'rotate(0deg) scale(1.1)';
      clone.style.transition = 'transform .15s ease-out';

      document.body.appendChild(clone);
      dragState.clone = clone;

      // 5. SAU khi clone xong → mới ẩn tile gốc
      tile.classList.add('is-dragging-source');
      tile.style.visibility = 'hidden';
    }

    // ---- Pointer up ----
    function onDragEnd(e) {
      if (!dragState) return;

      const wasMoved = dragState.moved;
      const tile = dragState.tile;
      const clone = dragState.clone;

      window.removeEventListener('pointermove', onDragMove);
      window.removeEventListener('pointerup', onDragEnd);
      window.removeEventListener('pointercancel', onDragCancel);

      if (!wasMoved) {
        cleanupDrag();
        return;
      }

      // ✅ Tính tâm mảnh từ CLONE (vị trí hiện tại)
      let tileCenterX = e.clientX;
      let tileCenterY = e.clientY;
      let tileSize = dragState.rect.width;

      if (clone) {
        const cloneRect = clone.getBoundingClientRect();
        tileCenterX = cloneRect.left + cloneRect.width / 2;
        tileCenterY = cloneRect.top + cloneRect.height / 2;
        tileSize = cloneRect.width;
      }

      const dropInfo = findDropSlotAt(tileCenterX, tileCenterY, tileSize);
      // ✅ Tìm slot dưới TÂM mảnh (không phải con trỏ)
      if (dropInfo && dropInfo.valid) {
        const tileIndex = parseInt(tile.dataset.tileIndex, 10);
        const slotIndex = parseInt(dropInfo.slot.dataset.slotIndex, 10);

        if (tileIndex === slotIndex) {
          // Đúng → commit, cleanup bình thường
          commitTileToBoard(tile, dropInfo.slot, state);
          cleanupDrag();
        } else {
          // Sai → animate, cleanup giữ clone + tile
          if (window.MemAudio) window.MemAudio.playWrong();
          animateReturn(tile, dragState.rect);
          cleanupDrag({ keepClone: true, keepTile: true });
        }
      } else {
        // Không tìm thấy slot → animate, cleanup giữ clone + tile
        if (window.MemAudio) window.MemAudio.playWrong();
        animateReturn(tile, dragState.rect);
        cleanupDrag({ keepClone: true, keepTile: true });
      }

      clearSlotHighlight();
    }

    // ---- Pointer cancel ----
    function onDragCancel() {
      if (!dragState) return;

      window.removeEventListener('pointermove', onDragMove);
      window.removeEventListener('pointerup', onDragEnd);
      window.removeEventListener('pointercancel', onDragCancel);

      if (dragState.moved) {
        animateReturn(dragState.tile, dragState.rect);
        cleanupDrag({ keepClone: true, keepTile: true });
      } else {
        cleanupDrag();
      }
      clearSlotHighlight();
    }

    // ---- Cleanup state ----
    function cleanupDrag(options = {}) {
      if (!dragState) return;

      const { keepClone = false, keepTile = false } = options;

      if (!keepClone && dragState.clone) {
        dragState.clone.remove();
      }

      const tile = dragState.tile;
      if (!keepTile && tile) {
        tile.classList.remove('is-dragging-source');
        tile.style.visibility = '';
      }

      dragState = null;
    }
  }

  /* =========================================================
       Đặt mảnh vào board (đúng vị trí)
       ========================================================= */
  function commitTileToBoard(tile, slot, state) {
    const tileIndex = parseInt(tile.dataset.tileIndex, 10);

    state.placed[tileIndex] = true;
    saveState(state);

    tile.style.visibility = '';
    tile.style.position = '';
    tile.style.left = '';
    tile.style.top = '';
    tile.style.width = '';
    tile.style.height = '';
    tile.style.margin = '';
    tile.style.transform = '';
    tile.classList.remove('is-dragging-source');

    slot.appendChild(tile);
    slot.classList.add('is-filled');
    tile.classList.add('is-placed');

    // ✅ Âm thanh ghép đúng
    if (window.MemAudio) {
      window.MemAudio.playCorrect();
    }

    // ✅ Animation pulse xanh (sẽ dùng ở 4C-3)
    tile.classList.add('just-correct');
    setTimeout(() => tile.classList.remove('just-correct'), 600);

    updatePuzzleProgress(state);
    checkImageCompletion(state);
  }

  /* =========================================================
       Animation bay về pool
       ========================================================= */
  /* =========================================================
       Animation bay về pool
       - Clone bay từ vị trí hiện tại về vị trí cũ trong pool
       - Mảnh gốc hiện lại sau khi clone biến mất
       ========================================================= */
  function animateReturn(tile, startRect) {
    const clone = dragState && dragState.clone;

    if (!clone || !startRect) {
      // Fallback: hiện ngay
      if (tile) {
        tile.style.visibility = '';
        tile.classList.remove('is-dragging-source');
      }
      return;
    }

    // Lấy vị trí hiện tại của clone (đang ở vị trí con trỏ)
    const fromRect = clone.getBoundingClientRect();

    // Target: vị trí cũ trong pool (startRect)
    const dx = startRect.left - fromRect.left;
    const dy = startRect.top - fromRect.top;

    // Animate clone về vị trí cũ
    clone.style.transition =
      'transform .4s cubic-bezier(0.22, 1, 0.36, 1), ' + 'opacity .4s ease-out';
    clone.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(1)`;
    clone.style.opacity = '0.6';

    // Sau khi animation xong → xóa clone, hiện mảnh gốc
    setTimeout(() => {
      if (clone && clone.parentNode) {
        clone.remove();
      }
      if (tile) {
        tile.style.visibility = '';
        tile.classList.remove('is-dragging-source');
      }
    }, 420);
  }

  /* =========================================================
       Highlight + tìm slot
       ========================================================= */
  function highlightSlotUnder(x, y) {
    clearSlotHighlight();
    const result = findDropSlotAt(x, y, dragState?.rect?.width || 100);
    if (result.valid && result.slot) {
      result.slot.classList.add('is-hover-target');
    }
  }

  function clearSlotHighlight() {
    section.querySelectorAll('.puzzle-slot.is-hover-target').forEach((s) => {
      s.classList.remove('is-hover-target');
    });
  }

  // function slotAtPoint(x, y) {
  //     const el = document.elementFromPoint(x, y);
  //     if (!el) return null;
  //     return el.closest(".puzzle-slot");
  // }

  /* =========================================================
       Kiểm tra drop
       ========================================================= */
  /**
   * Tìm slot phù hợp dưới 1 điểm (thường là tâm mảnh đang kéo).
   * @param {number} x        - tọa độ X của điểm cần kiểm tra
   * @param {number} y        - tọa độ Y của điểm cần kiểm tra
   * @param {number} tileSize - kích thước mảnh (px) để tính threshold
   */
  function findDropSlotAt(x, y, tileSize) {
    // ✅ Duyệt tất cả slot chưa filled, tìm slot gần tâm mảnh nhất
    const slots = section.querySelectorAll('.puzzle-slot:not(.is-filled)');
    if (!slots.length) return { valid: false };

    let bestSlot = null;
    let bestDist = Infinity;

    slots.forEach((slot) => {
      const rect = slot.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(x - cx, y - cy);

      if (dist < bestDist) {
        bestDist = dist;
        bestSlot = slot;
      }
    });

    if (!bestSlot) return { valid: false };

    // ✅ Ngưỡng: 40% kích thước mảnh
    const threshold = tileSize * THRESHOLD_RATIO;

    if (bestDist > threshold) return { valid: false };

    return { valid: true, slot: bestSlot };
  }

  /* ---- Kiểm tra hoàn thành 1 ảnh ---- */
  function checkImageCompletion(state) {
    const allPlaced = state.placed.every(Boolean);
    if (!allPlaced) return;

    state.completed[state.inProgress] = true;
    state.inProgress = null;
    state.poolOrder = null;
    state.placed = null;
    saveState(state);

    // ✅ Âm thanh hoàn thành
    if (window.MemAudio) {
      window.MemAudio.playComplete();
    }

    // ✅ Flash board
    const board = section.querySelector('#puzzleBoard');
    if (board) {
      board.classList.add('is-flashing');
      setTimeout(() => board.classList.remove('is-flashing'), 1100);
    }

    // Delay để user nghe hết 3 nốt + thấy flash
    setTimeout(() => {
      render(loadState());
    }, 1800);
  }
  /* Tạo 1 mảnh ghép */
  // function createTile(tileIndex, placedSlot, imageData, tileBgSize) {
  //     const tile = document.createElement("div");
  //     tile.className = "puzzle-tile";
  //     tile.dataset.tileIndex = String(tileIndex);

  //     // Vị trí mảnh trong ảnh gốc
  //     const col = tileIndex % PUZZLE_SIZE;
  //     const row = Math.floor(tileIndex / PUZZLE_SIZE);
  //     const bgPosX = (col / (PUZZLE_SIZE - 1)) * 100;
  //     const bgPosY = (row / (PUZZLE_SIZE - 1)) * 100;

  //     tile.style.backgroundImage = `url("${imageData.src}")`;
  //     tile.style.backgroundSize = tileBgSize;
  //     tile.style.backgroundPosition = `${bgPosX}% ${bgPosY}%`;

  //     return tile;
  // }

  function updatePuzzleProgress(state) {
    const el = section.querySelector('#puzzleProgress strong');
    if (!el) return;

    const correct = state.placed.filter(Boolean).length;
    el.textContent = `${correct}/${TILE_COUNT}`;
  }

  function updateBoardTileSize() {
    const stage = section.querySelector('.week-puzzle-stage');
    if (!stage) return;

    const w = window.innerWidth;
    let size = 100;
    if (w < 400) size = 62;
    else if (w < 768) size = 72;
    else if (w < 1024) size = 85;

    stage.style.setProperty('--tile-size', size + 'px');
  }

  // Update khi resize
  window.addEventListener('resize', () => {
    if (section.querySelector('#puzzleBoard')) {
      updateBoardTileSize();
    }
  });
  /* =========================================================
       ROUTER — quyết định render trạng thái nào
       ========================================================= */
  function render(state) {
    stopLockedCountdown();

    const now = Date.now();

    if (now < WEEK1_UNLOCK.getTime()) {
      renderLocked();
      return;
    }

    // Đang chơi 1 puzzle
    if (state.inProgress !== null) {
      renderPuzzle(state);
      return;
    }

    // Đã ghép xong cả 3 ảnh → Phase 2
    const allCompleted = state.completed.every(Boolean);
    if (allCompleted && !state.sortDone) {
      renderSort(state);
      return;
    }

    // Đã sắp xếp xong → Phase 3 (sẽ làm sau)
    if (allCompleted && state.sortDone) {
      // Tạm thời render queue như placeholder
      renderQueue(state);
      return;
    }

    renderQueue(state);
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
       PUBLIC API (dùng cho main.js hoặc console test)
       ========================================================= */
  window.Week1 = {
    init,
    render,
    loadState,
    saveState,
    defaultState,
    WEEK1_UNLOCK,
    WEEK1_IMAGES,
    STORAGE_KEY,
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
