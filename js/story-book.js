/* STORY BOOK — Turn.js 4. Nội dung được giữ trong #story-book ở index.html. */
(function () {
  'use strict';
  let $book = null, isInitialized = false, resizeTimer = null;
  let isResizing = false;
  let bookEl, wrap, prevBtn, nextBtn, status;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pageLabels = [];

  function updateBinding(page) {
    const size = $book.turn('size');
    const closed = page === 1 || page === $book.turn('pages');
    const single = $book.turn('display') === 'single';
    wrap.classList.toggle('is-closed', closed);
    wrap.style.setProperty('--visible-book-width', (single || !closed ? size.width : size.width / 2) + 'px');
    wrap.style.setProperty('--book-height', size.height + 'px');
  }

  function dimensions() {
    const available = Math.floor(wrap.clientWidth);
    const single = window.innerWidth < 768 || available < 680;
    const width = Math.min(available, single ? 420 : 900);
    return { width, height: Math.round(Math.max(560, (single ? width : width / 2) * 4 / 3)), display: single ? 'single' : 'double' };
  }

  function updateControls(page) {
    const total = $book.turn('pages');
    const view = $book.turn('view', page).filter((n) => n > 0 && n <= total);
    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= total;
    status.textContent = page === 1 ? 'Bìa trước' : page === total ? 'Bìa sau' : view.map((n) => pageLabels[n - 1]).join(' · ');
    updateBinding(page);
  }

  function resizeBook() {
    if (!isInitialized) return;
    const size = dimensions();
    if (!size.width) return;
    const page = $book.turn('page');
    isResizing = true;
    try {
      $book.turn('stop');
      if ($book.turn('display') !== size.display) $book.turn('display', size.display);
      $book.turn('size', size.width, size.height);
      wrap.style.setProperty('--book-width', size.width + 'px');
      $book.turn('page', page);
      $book.turn('center');
      updateControls($book.turn('page'));
    } finally {
      isResizing = false;
    }
  }

  function turnPage(direction) {
    if (!isInitialized || $book.turn('animating')) return;
    if (direction < 0 && !prevBtn.disabled) $book.turn('previous');
    if (direction > 0 && !nextBtn.disabled) $book.turn('next');
  }

  /* Hai mép nhận thao tác lật; phần giữa vẫn dùng để cuộn trang web.
     Pointer capture giữ thao tác khi ngón tay ra ngoài quyển sách. */
  function bindTouchEdges() {
    if (!window.PointerEvent) return;
    const stage = bookEl.parentElement;
    const data = $book.turn('data');
    let gesture = null;
    // Pointer Events sở hữu luồng cảm ứng; không để touch gốc xử lý lần thứ hai.
    $book.off('touchstart', data.eventHandlers.touchStart);
    window.jQuery(document).off('touchmove', data.eventHandlers.touchMove)
      .off('touchend', data.eventHandlers.touchEnd);
    for (const side of ['left', 'right']) {
      const edge = document.createElement('div');
      edge.className = 'book-touch-edge book-touch-edge-' + side;
      edge.dataset.side = side;
      edge.setAttribute('aria-hidden', 'true');
      stage.appendChild(edge);
      for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) {
        edge.addEventListener(type, (event) => {
          if (event.cancelable) event.preventDefault();
          event.stopPropagation();
        }, { passive: false });
      }
    }

    // Chuyển tọa độ Pointer Events sang bộ xử lý lật của Turn.js.
    function relay(type, x, y) {
      const event = window.jQuery.Event(type, {
        pageX: x, pageY: y,
        originalEvent: { touches: [{ pageX: x, pageY: y }], preventDefault() {}, stopPropagation() {} },
      });
      const handler = type === 'touchstart' ? data.eventHandlers.touchStart : type === 'touchmove' ? data.eventHandlers.touchMove : data.eventHandlers.touchEnd;
      handler(event);
    }
    stage.addEventListener('pointerdown', (event) => {
      const edge = event.target.closest('.book-touch-edge');
      if (!edge || !event.isPrimary || event.button !== 0 || gesture || $book.turn('animating')) return;
      const right = edge.dataset.side === 'right';
      if ((right && nextBtn.disabled) || (!right && prevBtn.disabled)) return;
      const rect = bookEl.getBoundingClientRect();
      const top = event.clientY - rect.top < rect.height / 2;
      gesture = {
        id: event.pointerId, edge, startX: event.clientX, startY: event.clientY,
        x: rect.left + window.scrollX + (right ? rect.width - 6 : 6),
        y: rect.top + window.scrollY + (top ? 6 : rect.height - 6),
        width: $book.turn('display') === 'single' ? rect.width : rect.width / 2,
        height: rect.height, top,
      };
      if (event.cancelable) event.preventDefault();
      edge.setPointerCapture(event.pointerId);
      wrap.classList.add('is-dragging');
      relay('touchstart', gesture.x, gesture.y);
    });
    stage.addEventListener('pointermove', (event) => {
      if (!gesture || event.pointerId !== gesture.id) return;
      const dx = event.clientX - gesture.startX;
      const dy = event.clientY - gesture.startY;
      // Nâng góc giấy khi vuốt ngang, tạo nếp uốn chéo thay vì lật phẳng.
      const arc = Math.sin(Math.min(1, Math.abs(dx) / gesture.width) * Math.PI) * gesture.height * 0.18;
      relay('touchmove', gesture.x + dx, gesture.y + dy + (gesture.top ? arc : -arc));
      if (event.cancelable) event.preventDefault();
    });
    function release(event) {
      if (!gesture || event.pointerId !== gesture.id) return;
      const current = gesture;
      gesture = null;
      try {
        if (event.type === 'pointercancel' || event.type === 'lostpointercapture') {
          $book.turn('stop');
          $book.turn('peel', false);
        } else relay('touchend', current.x, current.y);
      } finally {
        if (current.edge.hasPointerCapture(current.id)) current.edge.releasePointerCapture(current.id);
        wrap.classList.remove('is-dragging');
      }
    }
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);
    stage.addEventListener('lostpointercapture', release);
  }

  function initBook() {
    if (isInitialized) { resizeBook(); return; }
    bookEl = document.getElementById('story-book');
    if (!bookEl) return;
    wrap = bookEl.closest('.story-book-wrap');
    const section = bookEl.closest('.chapter-final-book-section');
    const controls = section.querySelector('.story-book-controls');
    prevBtn = controls.querySelector('.story-book-prev');
    nextBtn = controls.querySelector('.story-book-next');
    status = controls.querySelector('.story-book-status');
    const error = section.querySelector('.story-book-error');
    if (!window.jQuery || !window.jQuery.fn.turn) { error.hidden = false; return; }
    $book = window.jQuery(bookEl);
    const size = dimensions();
    if (!size.width) return;
    pageLabels.length = 0;
    Array.from(bookEl.children).forEach((page) => {
      const number = page.dataset.page;
      pageLabels.push(number ? (number === '6' ? 'Lời kết' : 'Trang ' + number) : 'Trang lót');
    });
    wrap.style.setProperty('--book-width', size.width + 'px');
    bookEl.classList.add('is-init');
    $book.turn({
      width: size.width, height: size.height, display: size.display,
      autoCenter: true, acceleration: true, gradients: true, elevation: 110,
      turnCorners: 'bl,br',
      duration: reducedMotion.matches ? 1 : 1100,
      when: {
        turning: function (event, page) {
          updateBinding(page);
          if (!isInitialized || isResizing || !window.MemAudio) return;
          const current = $book.turn('page');
          const view = $book.turn('view');
          const source = $book.turn('display') === 'single' ? current :
            page > current ? (view[1] || view[0]) : (view[0] || view[1]);
          window.MemAudio.playPageTurn({ hard: source === 1 || source === $book.turn('pages') });
        },
        turned: function (event, page) { updateControls(page); },
      },
    });
    isInitialized = true;
    controls.hidden = false;
    error.hidden = true;
    updateControls($book.turn('page'));
    bindTouchEdges();
    section.addEventListener('pointerdown', () => {
      if (window.MemAudio && window.MemAudio.isEnabled()) window.MemAudio.unlock();
    }, { capture: true, passive: true });
    bookEl.addEventListener('selectstart', (event) => event.preventDefault());
    bookEl.addEventListener('dragstart', (event) => event.preventDefault());
    // Để kéo góc giấy mà không kích hoạt kéo ảnh của trình duyệt.
    bookEl.querySelectorAll('img').forEach((img) => { img.draggable = false; });
    prevBtn.addEventListener('click', () => turnPage(-1));
    nextBtn.addEventListener('click', () => turnPage(1));
    section.addEventListener('keydown', (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input, textarea, select, [contenteditable]')) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        turnPage(event.key === 'ArrowLeft' ? -1 : 1);
      }
    });
    const scheduleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resizeBook, 100);
    };
    window.addEventListener('resize', scheduleResize, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(scheduleResize).observe(wrap);
    reducedMotion.addEventListener('change', () => {
      $book.turn('options', { duration: reducedMotion.matches ? 1 : 1100 });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initBook);
  else initBook();
  window.StoryBook = { init: initBook, reinit: initBook };
})();
