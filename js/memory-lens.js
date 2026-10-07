/* THẤU KÍNH KÝ ỨC — Ba ký ức, SVG quang học, Pointer Events.
   Đơn vị vật lý được chuẩn hóa; tọa độ SVG thuộc viewBox 1000 × 300.
   1/f = 1/do + 1/di. Vùng bắt nét dùng khoảng cách tay kéo để dễ chơi. */
(function () {
  'use strict';
  const section = document.getElementById('memory-lens');
  if (!section) return;
  const game = section.querySelector('.memory-lens-game');
  const bench = game.querySelector('.memory-lens-bench');
  const handle = game.querySelector('.memory-lens-handle');
  const image = game.querySelector('.memory-lens-image');
  const fallback = game.querySelector('.memory-lens-image-fallback');
  const feedback = game.querySelector('.memory-lens-feedback');
  const success = game.querySelector('.memory-lens-success');
  const name = game.querySelector('.memory-lens-name');
  const ending = game.querySelector('.memory-lens-ending');
  const nextButton = game.querySelector('.memory-lens-next');
  const replayButton = game.querySelector('.memory-lens-replay');
  const fragments = Array.from(game.querySelectorAll('.memory-lens-fragments li'));
  const rays = Array.from(game.querySelectorAll('.memory-lens-rays path'));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 768px)');
  const levels = [
    { id: 'first', title: 'Khoảnh khắc đầu tiên', target: .38, initial: .95, tolerance: .055, width: 630, largeWidth: 1050,
      alt: 'Một hình ảnh trong chuyến đi của chúng ta',
      opening: 'Có những ký ức bắt đầu từ một khoảnh khắc rất nhỏ.',
      success: 'Mọi thứ đều bắt đầu từ một khoảnh khắc nào đó.' },
    { id: 'ordinary', title: 'Một ngày bình thường', target: .61, initial: .08, tolerance: .04, width: 630, largeWidth: 1050,
      alt: 'Hai bàn tay trong một kỉ niệm ở Đà Lạt',
      opening: 'Có những ngày tưởng như bình thường.',
      success: 'Và vì tất những gì góp nhặt, ký ức sẽ phát triển cùng ta.' },
    { id: 'quynh', title: 'Một hình ảnh còn ở lại', target: .47, initial: .92, tolerance: .035, width: 557, largeWidth: 929,
      alt: 'Một kỉ niệm của hai chúng ta',
      opening: 'Giữa rất nhiều những kỉ niệm đồng hành cùng ta',
      success: 'Những kỉ niệm của chúng ta sẽ là đẹp nhất.' },
  ];
  const focalLength = .17;
  let index = 0, position = levels[0].initial, state = 'intro';
  let worldLength = 1, maxOpticalError = 1, attempts = 0;
  let drag = null, frame = 0, snapFrame = 0;
  const timers = new Set();
  const clamp = (n) => Math.max(0, Math.min(1, n));
  const objectDistance = (p) => .32 + p * .30;
  const imageDistance = (distance) => focalLength * distance / (distance - focalLength);
  const sourcePath = (level, size = 840) => './assets/images/memory-lens/' + level.id + '-' + size + '.webp';
  function setState(value) { state = value; game.dataset.state = value; }
  function later(callback, delay) {
    const id = setTimeout(() => { timers.delete(id); callback(); }, delay);
    timers.add(id);
  }
  function releaseDrag() {
    if (!drag) return;
    const id = drag.id;
    drag = null;
    if (handle.hasPointerCapture(id)) handle.releasePointerCapture(id);
    handle.classList.remove('is-dragging');
  }
  function clearPending() {
    timers.forEach(clearTimeout);
    timers.clear();
    cancelAnimationFrame(snapFrame);
    releaseDrag();
  }
  function selectImage(level) {
    image.alt = level.alt;
    image.width = level.width;
    image.height = 840;
    image.srcset = mobile.matches ? '' : sourcePath(level) + ' ' + level.width + 'w, ' + sourcePath(level, 1400) + ' ' + level.largeWidth + 'w';
    image.sizes = '(max-width: 768px) 88vw, 440px';
    image.src = sourcePath(level);
    fallback.hidden = true;
    image.hidden = false;
  }
  function setupLevel(newIndex, transitioning = false) {
    index = newIndex;
    const level = levels[index];
    attempts = 0;
    position = level.initial;
    game.dataset.level = String(index + 1);
    game.classList.remove('is-focused');
    handle.classList.remove('is-pulsing');
    handle.setAttribute('aria-disabled', 'false');
    success.hidden = ending.hidden = nextButton.hidden = replayButton.hidden = true;
    if (name) name.hidden = true;
    game.querySelector('.memory-lens-level-title').textContent = level.title;
    game.querySelector('.memory-lens-opening').textContent = level.opening;
    selectImage(level);
    const targetDistance = objectDistance(level.target);
    worldLength = targetDistance + imageDistance(targetDistance);
    maxOpticalError = Math.max(...[0, 1].map((p) => {
      const distance = objectDistance(p);
      return Math.abs(imageDistance(distance) - (worldLength - distance));
    }));
    fragments.forEach((fragment, i) => {
      fragment.classList.toggle('is-collected', i < index);
      if (i === index) fragment.setAttribute('aria-current', 'step');
      else fragment.removeAttribute('aria-current');
    });
    setState(transitioning ? 'transition' : 'playing');
    render();
  }
  function render() {
    frame = 0;
    const distance = objectDistance(position);
    const lensX = 60 + distance / worldLength * 880;
    const di = imageDistance(distance);
    const focusX = lensX + di / worldLength * 880;
    const error = Math.abs(di - (worldLength - distance));
    const softness = clamp(Math.sqrt(error / Math.max(.001, maxOpticalError)));
    const focused = ['focused', 'memory-reveal', 'completed'].includes(state);
    const blur = focused ? 0 : softness * (mobile.matches ? 12 : 18);
    game.style.setProperty('--memory-blur', blur.toFixed(2) + 'px');
    game.style.setProperty('--memory-opacity', (focused ? 1 : .60 + (1 - softness) * .40).toFixed(3));
    game.style.setProperty('--memory-scale', (focused ? 1 : 1 + softness * .02).toFixed(4));
    game.style.setProperty('--lens-light', (focused ? .8 : .08 + (1 - softness) * .5).toFixed(3));
    handle.style.left = lensX / 10 + '%';
    handle.setAttribute('aria-valuenow', Math.round(position * 100));
    game.dataset.lensPosition = position.toFixed(4);
    rays.forEach((ray, i) => {
      const offset = [-65, 0, 65, -35, 35, 80][i];
      const y = 150 + offset * (940 - focusX) / (lensX - focusX);
      ray.setAttribute('d', 'M60 150 L' + lensX.toFixed(2) + ' ' + (150 + offset) + ' L940 ' + y.toFixed(2));
    });
    game.querySelector('.memory-focus-point').style.opacity = focused ? '1' : String((1 - softness) * .5);
    game.querySelector('.memory-marker-f').setAttribute('x', (lensX + focalLength / worldLength * 880).toFixed(2));
    game.querySelector('.memory-marker-2f').setAttribute('x', (lensX - 2 * focalLength / worldLength * 880).toFixed(2));
    const handError = Math.abs(position - levels[index].target);
    const message = focused ? 'Đúng tiêu điểm.' : handError < .08 ? 'Thêm một chút nữa…' : handError < .2 ? 'Gần đúng rồi…' : 'Chưa rõ…';
    if (feedback.textContent !== message) feedback.textContent = message;
    handle.setAttribute('aria-valuetext', message);
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(render); }
  function unlock() {
    if (!['playing', 'near-focus'].includes(state)) return;
    releaseDrag();
    setState('focused');
    handle.setAttribute('aria-disabled', 'true');
    game.classList.add('is-focused');
    handle.classList.add('is-pulsing');
    fragments[index].classList.add('is-collected');
    const start = position, target = levels[index].target, startTime = performance.now();
    const duration = reduced.matches ? 0 : 220;
    function snap(now) {
      const t = duration ? clamp((now - startTime) / duration) : 1;
      position = start + (target - start) * (1 - Math.pow(1 - t, 3));
      render();
      if (t < 1) snapFrame = requestAnimationFrame(snap);
    }
    snapFrame = requestAnimationFrame(snap);
    later(() => {
      setState('memory-reveal');
      success.textContent = levels[index].success;
      success.hidden = false;
    }, reduced.matches ? 80 : 500);
    if (index < levels.length - 1) {
      // Chỉ nạp trước ký ức tiếp theo sau khi mở được ký ức hiện tại.
      const preload = new Image();
      preload.src = sourcePath(levels[index + 1]);
      later(() => { nextButton.hidden = false; }, reduced.matches ? 150 : 1300);
      later(() => advanceLevel(false), 5000);
    } else {
      if (name) later(() => { name.hidden = false; }, reduced.matches ? 160 : 1100);
      later(() => {
        ending.hidden = false;
        replayButton.hidden = false;
        setState('completed');
      }, reduced.matches ? 240 : 1750);
    }
  }
  function moveTo(next) {
    if (!['playing', 'near-focus'].includes(state)) return;
    const previous = position;
    position = clamp(next);
    const target = levels[index].target;
    const tolerance = Math.min(.08, levels[index].tolerance + Math.max(0, attempts - 4) * .006);
    // Kéo vượt qua vùng nét giữa hai sự kiện vẫn được tính, không cần canh từng pixel.
    if (Math.abs(position - target) <= tolerance || (previous - target) * (position - target) < 0) {
      unlock();
    } else {
      setState(Math.abs(position - target) < .2 ? 'near-focus' : 'playing');
      schedule();
    }
  }
  handle.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0 || drag || !['playing', 'near-focus'].includes(state)) return;
    attempts++;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, position, started: false, span: bench.clientWidth * (.30 / worldLength) * .88 };
    handle.focus({ preventScroll: true });
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.started) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { releaseDrag(); return; }
      if (Math.abs(dx) < 8) return;
      drag.started = true;
      handle.classList.add('is-dragging');
    }
    const next = drag.position + dx / Math.max(1, drag.span);
    if (event.cancelable) event.preventDefault();
    moveTo(next);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) handle.addEventListener(type, (event) => {
    if (drag && event.pointerId === drag.id) releaseDrag();
  });
  handle.addEventListener('keydown', (event) => {
    const step = event.shiftKey ? .08 : .02;
    const values = { ArrowLeft: position - step, ArrowRight: position + step, Home: 0, End: 1 };
    if (!(event.key in values)) return;
    event.preventDefault();
    moveTo(values[event.key]);
  });
  function advanceLevel(manual = false) {
    if (state !== 'memory-reveal' || index >= levels.length - 1) return;
    clearPending();
    setState('transition');
    game.classList.add('is-transitioning');
    nextButton.hidden = true;
    const keepFocus = manual || game.contains(document.activeElement);
    const duration = reduced.matches ? 40 : 800;
    later(() => setupLevel(index + 1, true), duration / 2);
    later(() => {
      game.classList.remove('is-transitioning');
      setState('playing');
      if(keepFocus)handle.focus({ preventScroll: true });
    }, duration);
  }
  nextButton.addEventListener('click', () => advanceLevel(true));
  replayButton.addEventListener('click', () => {
    clearPending();
    game.classList.remove('is-transitioning');
    setupLevel(0);
    handle.focus({ preventScroll: true });
  });
  image.addEventListener('error', () => { image.hidden = true; fallback.hidden = false; });
  image.addEventListener('load', () => { image.hidden = false; fallback.hidden = true; });
  function buildDust() {
    const group = game.querySelector('.memory-lens-dust');
    group.replaceChildren();
    for (let i = 0, count = mobile.matches ? 32 : 80; i < count; i++) {
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', (Math.random() * 1000).toFixed(1));
      dot.setAttribute('cy', (Math.random() * 300).toFixed(1));
      dot.setAttribute('r', (.25 + Math.random() * .6).toFixed(2));
      dot.setAttribute('opacity', (.1 + Math.random() * .25).toFixed(2));
      group.appendChild(dot);
    }
  }
  mobile.addEventListener('change', () => { releaseDrag(); selectImage(levels[index]); buildDust(); schedule(); });
  window.addEventListener('resize', () => { releaseDrag(); schedule(); }, { passive: true });
  reduced.addEventListener('change', schedule);
  setupLevel(0);
  buildDust();
})();
