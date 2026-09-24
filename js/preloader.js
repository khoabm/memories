/* =========================================================
   PRELOADER
   - Preload font + 3 ảnh parallax
   - Cập nhật % vào loading screen
   - Chưa ẩn loading — chỉ cập nhật %
   ========================================================= */

(function () {
  "use strict";

  /* =========================================================
     CẤU HÌNH
     ========================================================= */
  const CRITICAL_IMAGES = [
    "./assets/images/parallax/para.jpg",
    "./assets/images/parallax/para1.jpg",
    "./assets/images/parallax/para2.jpg",
    "./assets/images/parallax/para4.jpg",
    "./assets/images/parallax/paraN.jpg",
  ];

  // Font cần preload (URL Google Fonts — sẽ tự động load CSS)
  const FONT_URLS = [
    "https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700&display=swap",
    "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&display=swap",
  ];

  /* =========================================================
     TRACKING
     ========================================================= */
  const totalTasks = CRITICAL_IMAGES.length + FONT_URLS.length;
  let completedTasks = 0;

  let loadingPercentEl = document.querySelector("[data-loading-percent]");
  let loadingCircleEl = document.querySelector(".loading-circle-progress");

  const CIRCUMFERENCE = 326.7;   // 2πr với r=52
  const TIMEOUT_MS = 30000;   // 30 giây
  let timeoutId = null;
  let isCompleted = false;

  /* =========================================================
     CẬP NHẬT % VÀO LOADING SCREEN
     ========================================================= */
  function updateProgress() {
    completedTasks = Math.min(completedTasks + 1, totalTasks);
    const percent = Math.round((completedTasks / totalTasks) * 100);

    // Cập nhật text %
    if (loadingPercentEl) {
      loadingPercentEl.textContent = percent + "%";
    }

    // Cập nhật vòng tròn
    if (loadingCircleEl) {
      const offset = CIRCUMFERENCE * (1 - percent / 100);
      loadingCircleEl.style.strokeDashoffset = String(offset);
    }

    return percent;
  }

  /* =========================================================
     PRELOAD 1 ẢNH
     ========================================================= */
  function preloadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();

      img.onload = () => {
        console.log(`[preloader] Ảnh đã load: ${src}`);
        resolve({ src, status: "ok" });
      };

      img.onerror = () => {
        console.warn(`[preloader] Không load được ảnh: ${src}`);
        resolve({ src, status: "error" });
      };

      img.src = src;
    });
  }

  /* =========================================================
     PRELOAD 1 FONT
     - Dùng FontFace API nếu có
     - Hoặc fallback: fetch CSS font
     ========================================================= */
  function preloadFont(url) {
    return new Promise((resolve) => {
      // Cách đơn giản: fetch URL CSS → browser tự cache
      fetch(url, { mode: "cors" })
        .then((res) => {
          if (res.ok) {
            console.log(`[preloader] Font CSS đã load: ${url}`);
            resolve({ url, status: "ok" });
          } else {
            console.warn(`[preloader] Font CSS lỗi: ${url}`);
            resolve({ url, status: "error" });
          }
        })
        .catch((err) => {
          console.warn(`[preloader] Font fetch lỗi: ${url}`, err);
          resolve({ url, status: "error" });
        });
    });
  }

  /* =========================================================
   ẨN LOADING KHI XONG
   ========================================================= */
  function hideLoadingScreen() {
    const loadingScreen = document.getElementById("loadingScreen");
    if (!loadingScreen) return;

    // ✅ Clear timeout nếu còn
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    // 1. Set 100% (nếu chưa)
    if (loadingPercentEl) loadingPercentEl.textContent = "100%";
    if (loadingCircleEl) loadingCircleEl.style.strokeDashoffset = "0";

    // 2. Delay 400ms để user thấy 100%
    setTimeout(() => {
      // 3. Fade out
      loadingScreen.classList.add("is-hidden");

      // 4. Unlock scroll
      document.body.classList.remove("is-loading");

      // 5. Xoá loading khỏi DOM sau khi fade xong
      setTimeout(() => {
        loadingScreen.remove();
        console.log("[preloader] Loading screen đã xoá.");
      }, 900);

    }, 1000);
  }

  /* =========================================================
   TIMEOUT — Sau 30s nếu chưa xong → ẩn loading luôn
   ========================================================= */
  function handleTimeout() {
    if (isCompleted) return;

    console.warn(`[preloader] Timeout sau ${TIMEOUT_MS}ms — ẩn loading bất chấp.`);

    isCompleted = true;
    hideLoadingScreen();
  }

  /* =========================================================
     CHẠY PRELOAD
     ========================================================= */
  async function runPreload() {
    const startTime = performance.now();
    console.log("[preloader] Bắt đầu preload...");

    const tasks = [
      ...FONT_URLS.map((url) => preloadFont(url)),
      ...CRITICAL_IMAGES.map((src) => preloadImage(src)),
    ];

    // Chạy song song, cập nhật % khi từng cái xong
    const wrappedTasks = tasks.map((task) =>
      task.then((result) => {
        updateProgress();
        return result;
      })
    );

    const results = await Promise.all(wrappedTasks);

    const duration = Math.round(performance.now() - startTime);
    console.log(`[preloader] Hoàn thành sau ${duration}ms`, results);

    // ✅ Dispatch event để 9C có thể lắng nghe
    window.dispatchEvent(new CustomEvent("preload:done", {
      detail: { results, duration },
    }));
  }

  /* =========================================================
     INIT
     ========================================================= */
  function init() {
    loadingPercentEl = document.querySelector("[data-loading-percent]");
    loadingCircleEl = document.querySelector(".loading-circle-progress");

    console.log("[preloader] elements:", {
      loadingPercentEl,
      loadingCircleEl,
    });

    const loadingScreen = document.getElementById("loadingScreen");
    if (!loadingScreen) {
      console.warn("[preloader] Không tìm thấy #loadingScreen → bỏ qua preload.");
      return;
    }

    document.body.classList.add("is-loading");

    // ✅ Lắng nghe event preload:done
    window.addEventListener("preload:done", () => {
      if (isCompleted) return;
      isCompleted = true;

      console.log("[preloader] Nhận event preload:done → ẩn loading.");

      // Clear timeout nếu có
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      hideLoadingScreen();
    }, { once: true });

    // ✅ Khởi động timeout 30s
    timeoutId = setTimeout(handleTimeout, TIMEOUT_MS);

    runPreload();
  }

  // Chạy ngay khi DOM sẵn sàng
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose API để debug
  window.Preloader = {
    init,
    runPreload,
    handleTimeout,
    CRITICAL_IMAGES,
  };
})();