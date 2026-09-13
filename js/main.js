/* =========================================================
   MEMORIES — M1 + M2 + M3
   - Countdown 09/10/2026
   - Parallax 3 lớp
   - Timeline auto-unlock khi countdown = 0
   - Smooth scroll + active nav
   ========================================================= */

(function () {
  'use strict';

  /* ---------- Config ---------- */
  const TARGET_DATE = new Date('2026-10-09T00:00:00+07:00');

  /* ---------- Elements ---------- */
  const el = {
    days: document.getElementById('cd-days'),
    hours: document.getElementById('cd-hours'),
    mins: document.getElementById('cd-mins'),
    secs: document.getElementById('cd-secs'),
    note: document.getElementById('countdown-note'),
    year: document.getElementById('year'),
    timeline: document.getElementById('timeline'),
    navTimeline: document.querySelector('.nav-timeline'),
    header: document.querySelector('.site-header'),
    scroller: document.getElementById('timelineScroller'),
    progress: document.getElementById('tlProgressBar'),
    prevBtn: document.querySelector('.tl-nav-prev'),
    nextBtn: document.querySelector('.tl-nav-next'),
  };
  const videoPosterCache = new Map();
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pad2 = (n) => String(n).padStart(2, '0');

  /* =========================================================
     COUNTDOWN + AUTO-UNLOCK TIMELINE
     ========================================================= */
  let unlocked = false;
  let timerId = null;

  function unlockTimeline() {
    if (unlocked) return;
    unlocked = true;

    /* ---- 1. Render nav link "Kỉ niệm" (đã bàn ở bước 1) ---- */
    const navTemplate = document.getElementById('nav-timeline-template');
    const navContainer = document.querySelector('.site-nav');
    if (navTemplate && navContainer) {
      navContainer.appendChild(navTemplate.content.cloneNode(true));
    }
    /* ---- 2. Xoá placeholder "chưa mở khóa" ---- */
    const lockedEl = document.getElementById('timeline-locked');
    if (lockedEl) lockedEl.remove();

    /* ---- 3. Render timeline vào DOM ---- */
    const tlTemplate = document.getElementById('timeline-template');
    const footer = document.querySelector('.site-footer');

    if (tlTemplate && footer) {
      const tlClone = tlTemplate.content.cloneNode(true);
      const tlSection = tlClone.querySelector('.timeline-section');

      // Trạng thái ban đầu: chưa hiện
      tlSection.classList.add('is-appearing');

      // Chèn trước footer
      footer.parentNode.insertBefore(tlClone, footer);

      // Sau 1 frame → chuyển sang trạng thái hiện (kích hoạt transition)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          tlSection.classList.remove('is-appearing');
          tlSection.classList.add('is-revealed');
        });
      });

      /* ---- 4. Gắn sự kiện cho các phần tử timeline mới render ---- */
      bindTimelineEvents();
    }
    /* =========================================================
   Trích 1 frame từ video → data URL (dùng làm poster)
   @param {string} url     - đường dẫn video
   @param {number} timeSec - thời điểm (giây) cần trích
   @returns {Promise<string>} dataURL hoặc "" nếu lỗi
   ========================================================= */
    function extractVideoFrame(url, timeSec = 0.1) {
      return new Promise((resolve) => {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous'; // cần nếu video khác domain
        video.muted = true; // tránh autoplay policy
        video.preload = 'metadata';
        video.playsInline = true;
        video.src = url;

        // Timeout để không treo vô hạn
        const timeout = setTimeout(() => {
          cleanup();
          resolve('');
        }, 8000);

        function cleanup() {
          clearTimeout(timeout);
          video.removeAttribute('src');
          video.load();
          video.remove();
        }

        video.addEventListener('error', () => {
          cleanup();
          resolve('');
        });

        video.addEventListener('loadedmetadata', () => {
          // Đảm bảo timeSec không vượt quá duration
          const safeTime = Math.min(timeSec, video.duration - 0.05);
          video.currentTime = Math.max(0, safeTime);
        });

        video.addEventListener('seeked', () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Xuất JPEG chất lượng 0.82 — cân bằng size/chất lượng
            const dataURL = canvas.toDataURL('image/jpeg', 0.82);

            cleanup();
            resolve(dataURL);
          } catch (err) {
            // Lỗi CORS: canvas bị "tainted" → không xuất được
            cleanup();
            resolve('');
          }
        });
      });
    }
    /* =========================================================
   VIDEO MODAL
   ========================================================= */
    /* =========================================================
   VIDEO POSTER CACHE
   - Tránh trích cùng 1 video nhiều lần
   - Key: videoUrl → Value: Promise<dataURL>
   ========================================================= */
    function getVideoPoster(url, timeSec = 0.1) {
      if (!url) return Promise.resolve('');
      if (videoPosterCache.has(url)) {
        return videoPosterCache.get(url);
      }
      const promise = extractVideoFrame(url, timeSec);
      videoPosterCache.set(url, promise);
      return promise;
    }
    /* =========================================================
   Trích 1 frame từ video → data URL (dùng làm poster)
   @param {string} url     - đường dẫn video
   @param {number} timeSec - thời điểm (giây) cần trích
   @returns {Promise<string>} dataURL hoặc "" nếu lỗi
   ========================================================= */
    function extractVideoFrame(url, timeSec = 0.1) {
      return new Promise((resolve) => {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous'; // cần nếu video khác domain
        video.muted = true; // tránh autoplay policy
        video.preload = 'metadata';
        video.playsInline = true;
        video.src = url;

        // Timeout để không treo vô hạn
        const timeout = setTimeout(() => {
          cleanup();
          resolve('');
        }, 8000);

        function cleanup() {
          clearTimeout(timeout);
          video.removeAttribute('src');
          video.load();
          video.remove();
        }

        video.addEventListener('error', () => {
          cleanup();
          resolve('');
        });

        video.addEventListener('loadedmetadata', () => {
          // Đảm bảo timeSec không vượt quá duration
          const safeTime = Math.min(timeSec, video.duration - 0.05);
          video.currentTime = Math.max(0, safeTime);
        });

        video.addEventListener('seeked', () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Xuất JPEG chất lượng 0.82 — cân bằng size/chất lượng
            const dataURL = canvas.toDataURL('image/jpeg', 0.82);

            cleanup();
            resolve(dataURL);
          } catch (err) {
            // Lỗi CORS: canvas bị "tainted" → không xuất được
            cleanup();
            resolve('');
          }
        });
      });
    }
    let activeVideoModal = null;

    function openVideoModal(videoUrl, posterUrl) {
      // Nếu modal đã tồn tại → đóng trước
      if (activeVideoModal) closeVideoModal();

      const template = document.getElementById('video-modal-template');
      if (!template) return;

      // Clone modal
      const clone = template.content.cloneNode(true);
      const modal = clone.querySelector('.video-modal');
      const video = clone.querySelector('#videoModalPlayer');

      // Gán src + poster
      if (videoUrl) {
        video.src = videoUrl;
        video.volume = 0.5;

        if (posterUrl) {
          // Có poster thủ công → dùng luôn
          video.poster = posterUrl;
        } else {
          // Không có → dùng cache / trích frame
          getVideoPoster(videoUrl, 0.1).then((dataURL) => {
            if (dataURL && video.isConnected) {
              video.poster = dataURL;
            }
          });
        }
      }

      // Chèn vào body
      document.body.appendChild(clone);

      // Khoá scroll
      document.body.classList.add('modal-open');

      // Kích hoạt transition mở
      requestAnimationFrame(() => {
        requestAnimationFrame(() => modal.classList.add('is-open'));
      });

      // Bind sự kiện đóng
      modal.querySelectorAll('[data-close]').forEach((el) => {
        el.addEventListener('click', closeVideoModal);
      });

      // Lưu ref
      activeVideoModal = modal;

      // ESC để đóng
      document.addEventListener('keydown', escCloseVideoModal);
    }

    function closeVideoModal() {
      if (!activeVideoModal) return;
      const modal = activeVideoModal;
      const video = modal.querySelector('video');

      // Dừng video + reset
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }

      // Animation đóng
      modal.classList.remove('is-open');

      // Xoá sau khi transition xong
      setTimeout(() => {
        modal.remove();
        activeVideoModal = null;
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', escCloseVideoModal);
      }, 420);
    }

    function escCloseVideoModal(e) {
      if (e.key === 'Escape') closeVideoModal();
    }
    /* =========================================================
   Thay ảnh thumbnail của card video bằng frame đầu video
   - Chạy 1 lần khi timeline render
   - Dùng cache → không trích lại khi mở modal
   ========================================================= */
    function hydrateVideoThumbnails() {
      const cards = document.querySelectorAll('.tl-card--video');
      if (!cards.length) return;

      cards.forEach((card) => {
        const videoUrl = card.dataset.video;
        if (!videoUrl) return;

        const img = card.querySelector('.tl-photo img');
        if (!img) return;

        // Nếu card có poster thủ công → ưu tiên dùng
        const manualPoster = card.dataset.videoPoster;
        if (manualPoster) {
          img.src = manualPoster;
          return;
        }

        // Trích frame đầu video → gán làm ảnh
        getVideoPoster(videoUrl, 0.1).then((dataURL) => {
          if (dataURL && img.isConnected) {
            img.src = dataURL;
          }
          // Nếu lỗi (CORS, video hỏng...) → giữ nguyên ảnh placeholder cũ
        });
      });
    }
    /* =========================================================
   Bind sự kiện cho các card video
   - PC (hover): single click mở modal
   - Mobile: tap 1 = toggle info, tap 2 (double tap) = mở modal
   ========================================================= */
    function bindVideoCards() {
      const isMobile = navigator.userAgentData.mobile;

      const cards = document.querySelectorAll('.tl-card--video');

      cards.forEach((card) => {
        const videoUrl = card.dataset.video;
        const posterUrl = card.dataset.videoPoster;

        if (!videoUrl) return;

        if (!isMobile) {
          /* ---------- PC: single click mở modal ---------- */
          card.addEventListener('click', (e) => {
            // Bỏ qua nếu click vào link / nút bên trong
            if (e.target.closest('a, button')) return;
            e.preventDefault();
            openVideoModal(videoUrl, posterUrl);
          });

          // Enter / Space để mở khi focus bằng keyboard
          card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openVideoModal(videoUrl, posterUrl);
            }
          });
        } else {
          /* ---------- Mobile: tap 1 = info, tap 2 = modal ---------- */
          let tapCount = 0;
          let tapTimer = null;

          card.addEventListener('click', (e) => {
            if (e.target.closest('a, button')) return;

            tapCount++;

            if (tapCount === 1) {
              // Tap đầu: chỉ đánh dấu (info đã hiện qua :hover giả do touch)
              tapTimer = setTimeout(() => {
                tapCount = 0;
              }, 320);
            } else if (tapCount === 2) {
              // Double tap → mở modal
              clearTimeout(tapTimer);
              tapCount = 0;
              e.preventDefault();
              openVideoModal(videoUrl, posterUrl);
            }
          });
        }
      });
    }

    /* =========================================================
   TIMELINE — bind sự kiện sau khi render
   (element chưa tồn tại lúc load → phải bind sau)
   ========================================================= */
    function bindTimelineEvents() {
      const scroller = document.getElementById('timelineScroller');
      const progress = document.getElementById('tlProgressBar');
      const prevBtn = document.querySelector('.tl-nav-prev');
      const nextBtn = document.querySelector('.tl-nav-next');

      /* --- Nút cuộn trái/phải --- */
      const scrollByDir = (dir) => {
        if (!scroller) return;
        const amount = Math.min(scroller.clientWidth * 0.8, 480);
        scroller.scrollBy({ left: dir * amount, behavior: 'smooth' });
      };
      if (prevBtn) prevBtn.addEventListener('click', () => scrollByDir(-1));
      if (nextBtn) nextBtn.addEventListener('click', () => scrollByDir(1));

      /* --- Progress bar --- */
      const updateProgress = () => {
        if (!scroller || !progress) return;
        const max = scroller.scrollWidth - scroller.clientWidth;
        const ratio = max > 0 ? scroller.scrollLeft / max : 0;
        progress.style.width = (ratio * 100).toFixed(2) + '%';
      };
      if (scroller) {
        scroller.addEventListener('scroll', updateProgress, { passive: true });
        updateProgress();
      }

      /* --- Best wishes button --- */
      const bestBtn = document.getElementById('bestWishesBtn');
      if (bestBtn) {
        bestBtn.addEventListener('click', (e) => {
          const href = bestBtn.getAttribute('href');
          // Nếu href rỗng hoặc "#" → chặn (chưa cấu hình)
          if (!href || href === '#') {
            e.preventDefault();
            console.warn('[Memories] bestWishesBtn chưa có href hợp lệ.');
            return;
          }
          // Còn lại để browser tự chuyển trang (href="./wishes.html")
        });
      }
      hydrateVideoThumbnails();
      bindVideoCards();
    }
    /* ---- 4. Đổi note countdown ---- */
    if (el.note) {
      el.note.innerHTML =
        'Chúc mưng sinh nhật Bé— <strong>Hãy xem những điều anh gửi em nhé</strong> ✦';
    }
    document.body.classList.add('unlocked');

    /* ---- 5. Cập nhật active nav (đã bàn ở bước 1) ---- */
    requestAnimationFrame(updateActiveNav);
  }

  function updateCountdown() {
    const diff = TARGET_DATE.getTime() - Date.now();

    if (diff <= 0) {
      el.days.textContent = '00';
      el.hours.textContent = '00';
      el.mins.textContent = '00';
      el.secs.textContent = '00';
      unlockTimeline();
      if (timerId) clearInterval(timerId);
      return;
    }

    const totalSec = Math.floor(diff / 1000);
    el.days.textContent = pad2(Math.floor(totalSec / 86400));
    el.hours.textContent = pad2(Math.floor((totalSec % 86400) / 3600));
    el.mins.textContent = pad2(Math.floor((totalSec % 3600) / 60));
    el.secs.textContent = pad2(totalSec % 60);
    document.querySelectorAll('[data-locked]').forEach((n) => {
      n.style.display = 'none';
    });
  }

  updateCountdown();
  timerId = setInterval(updateCountdown, 1000);

  /* =========================================================
     REVEAL HERO ON LOAD
     ========================================================= */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );
    reveals.forEach((n) => io.observe(n));
  } else {
    reveals.forEach((n) => n.classList.add('is-visible'));
  }

  /* =========================================================
   PARALLAX — 3 STAGES (mỗi stage 1 ảnh nền riêng)
   ========================================================= */
  const stages = document.querySelectorAll('.parallax-stage');
  let ticking = false;

  function applyParallax() {
    ticking = false;
    if (prefersReduced || !stages.length) return;

    const viewportH = window.innerHeight;

    stages.forEach((stage) => {
      const bg = stage.querySelector('.stage-bg');
      if (!bg) return;

      const rect = stage.getBoundingClientRect();

      if (rect.bottom < -100 || rect.top > viewportH + 100) return;

      const ratio = Math.min(Math.max(-rect.top / (rect.height + viewportH), 0), 1);

      const speed = parseFloat(bg.dataset.speed || '0.25');
      const y = (ratio - 0.5) * speed * viewportH * 2;
      bg.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
      const stageRect = stage.getBoundingClientRect();
      const entered = viewportH - stageRect.top; // số px stage đã lọt vào viewport
      const triggerPoint = viewportH * 0.5; // ngưỡng: 50% màn hình

      if (entered >= triggerPoint) {
        stage.classList.add('is-in');
      } else if (entered < 0) {
        // Cuộn ngược lên trên stage → ẩn lại
        stage.classList.remove('is-in');
      }
    });
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      applyParallax();
      updateHeaderState();
      updateActiveNav();
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener(
    'resize',
    () => {
      applyParallax();
    },
    { passive: true },
  );
  applyParallax();

  /* =========================================================
     HEADER STATE
     ========================================================= */
  function updateHeaderState() {
    if (!el.header) return;
    if (window.scrollY > 24) el.header.classList.add('is-scrolled');
    else el.header.classList.remove('is-scrolled');
  }
  updateHeaderState();

  /* =========================================================
   ACTIVE NAV — query lại mỗi lần scroll
   → tự động bao gồm cả link động (Kỉ niệm) sau khi unlock
   ========================================================= */
  function updateActiveNav() {
    // 1. Lấy TẤT CẢ link nav có data-nav (tĩnh + động)
    const links = document.querySelectorAll('.site-nav a[data-nav]');
    if (!links.length) return;

    // 2. Probe: điểm so sánh = 35% từ đỉnh viewport
    const probe = window.innerHeight * 0.35;

    // 3. Tìm link active: link cuối cùng có section.top <= probe
    let activeLink = null;

    links.forEach((link) => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;

      const section = document.querySelector(href);
      if (!section) return;

      const rect = section.getBoundingClientRect();
      if (rect.top <= probe) {
        activeLink = link;
      }
    });

    // 4. Cập nhật class
    links.forEach((link) => link.classList.remove('is-active'));
    if (activeLink) activeLink.classList.add('is-active');
  }
  updateActiveNav();

  /* =========================================================
     TIMELINE HORIZONTAL SCROLL
     ========================================================= */
  function scrollTimeline(dir) {
    if (!el.scroller) return;
    const amount = Math.min(el.scroller.clientWidth * 0.8, 480);
    el.scroller.scrollBy({ left: dir * amount, behavior: 'smooth' });
  }
  if (el.prevBtn) el.prevBtn.addEventListener('click', () => scrollTimeline(-1));
  if (el.nextBtn) el.nextBtn.addEventListener('click', () => scrollTimeline(1));

  function updateTimelineProgress() {
    if (!el.scroller || !el.progress) return;
    const max = el.scroller.scrollWidth - el.scroller.clientWidth;
    const ratio = max > 0 ? el.scroller.scrollLeft / max : 0;
    el.progress.style.width = (ratio * 100).toFixed(2) + '%';
  }
  if (el.scroller) {
    el.scroller.addEventListener('scroll', updateTimelineProgress, { passive: true });
    updateTimelineProgress();
  }

  /* =========================================================
     SMOOTH SCROLL (fallback cho Safari cũ)
     ========================================================= */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const headerH = el.header ? el.header.offsetHeight : 0;
      const y = target.getBoundingClientRect().top + window.scrollY - headerH - 8;
      window.scrollTo({ top: y, behavior: prefersReduced ? 'auto' : 'smooth' });
    });
  });

  /* =========================================================
     YEAR
     ========================================================= */
  if (el.year) el.year.textContent = new Date().getFullYear();
})();
