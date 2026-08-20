// Vburger — shared site behavior (nav, reveal-on-scroll, forms)
document.addEventListener('DOMContentLoaded', () => {

  // header scroll state
  const header = document.getElementById('siteHeader');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 10);
    });
  }

  // mobile menu
  const burgerBtn = document.getElementById('burgerBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  if (burgerBtn && mobileMenu) {
    burgerBtn.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('open');
      burgerBtn.setAttribute('aria-expanded', open);
    });
    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      burgerBtn.setAttribute('aria-expanded', 'false');
    }));
  }

  // reveal on scroll
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
    }, { threshold: 0.15 });
    revealEls.forEach(el => io.observe(el));
  }

  // flow step sequential highlight
  const flowSteps = document.querySelectorAll('.flow-step');
  if (flowSteps.length) {
    const flowIo = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
    }, { threshold: 0.4 });
    flowSteps.forEach(el => flowIo.observe(el));
  }

  // hero video sound toggle (autoplay must start muted per browser policy)
  const heroVideo = document.getElementById('heroVideo');
  const heroSoundBtn = document.getElementById('heroSoundBtn');
  if (heroVideo && heroSoundBtn) {
    // ensure playback starts even if the browser paused it
    const tryPlay = () => { heroVideo.play().catch(() => {}); };
    tryPlay();
    document.addEventListener('click', tryPlay, { once: true });

    heroSoundBtn.addEventListener('click', () => {
      heroVideo.muted = !heroVideo.muted;
      const on = !heroVideo.muted;
      heroSoundBtn.setAttribute('aria-pressed', on);
      heroSoundBtn.setAttribute('aria-label', on ? '關閉聲音' : '開啟聲音');
      heroSoundBtn.querySelector('.hvs-icon').textContent = on ? '🔊' : '🔇';
      heroSoundBtn.querySelector('.hvs-text').textContent = on ? '關閉聲音' : '開啟聲音';
      if (on) heroVideo.play().catch(() => {});
    });
  }

  // Form validation.
  // AAO note: state is exposed through ARIA (aria-invalid / role="alert" /
  // role="status") so AI agents can detect failures and confirm success
  // programmatically, rather than having to read visual styling.
  document.querySelectorAll('form[data-validate]').forEach(form => {
    const msg = form.querySelector('.form-msg');

    function setFieldState(input, invalid, message) {
      const field = input.closest('.field');
      const errEl = field ? field.querySelector('.err') : null;
      input.setAttribute('aria-invalid', invalid ? 'true' : 'false');
      if (errEl) {
        errEl.style.display = invalid ? 'block' : 'none';
        if (invalid && message) errEl.textContent = message;
      }
      input.style.borderColor = invalid ? '#a13c2d' : 'var(--line)';
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let valid = true;
      let firstInvalid = null;

      form.querySelectorAll('[required]').forEach(input => {
        const empty = !input.value.trim();
        const badEmail = input.type === 'email' && input.value.trim() &&
                         !/^\S+@\S+\.\S+$/.test(input.value);
        const invalid = empty || badEmail;
        const label = form.querySelector('label[for="' + input.id + '"]');
        const fieldName = label ? label.textContent.replace(/\s*\*\s*$/, '') : '此欄位';
        setFieldState(input, invalid,
          badEmail ? '請填寫有效的 Email 格式' : '請填寫' + fieldName);
        if (invalid) { valid = false; if (!firstInvalid) firstInvalid = input; }
      });

      form.setAttribute('data-form-state', valid ? 'submitted' : 'invalid');

      if (!valid) {
        if (firstInvalid) firstInvalid.focus();
        return;
      }
      if (msg) {
        msg.style.display = 'block';
        form.reset();
        form.querySelectorAll('[aria-invalid]').forEach(i => i.setAttribute('aria-invalid', 'false'));
        msg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        msg.focus && msg.focus();
      }
    });
  });

  // menu category filter (menu page only)
  const filters = document.querySelectorAll('.menu-filter');
  const categories = document.querySelectorAll('[data-menu-category]');
  if (filters.length && categories.length) {
    filters.forEach(btn => {
      btn.addEventListener('click', () => {
        filters.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const target = btn.dataset.filter;
        categories.forEach(cat => {
          cat.style.display = (target === 'all' || cat.dataset.menuCategory === target) ? '' : 'none';
        });
      });
    });
  }

  // course-demo banner: offset the fixed header, allow dismissal
  (function () {
    var banner = document.getElementById('demoBanner');
    if (!banner) return;
    var root = document.documentElement;
    function setH() {
      root.style.setProperty('--banner-h', banner.offsetHeight + 'px');
    }
    setH();
    window.addEventListener('resize', setH);
    var closeBtn = document.getElementById('demoBannerClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        banner.style.display = 'none';
        root.style.setProperty('--banner-h', '0px');
      });
    }
  })();


  // hero video: keep a still frame visible until playback truly starts,
  // and recover when autoplay or decoding is blocked (sandboxed previews).
  (function () {
    var v = document.getElementById('heroVideo');
    var playBtn = document.getElementById('heroVideoPlay');
    var still = document.getElementById('heroVideoStill');
    if (!v) return;

    var started = false;

    function showPlay() { if (playBtn && !started) playBtn.classList.add('show'); }
    function hidePlay() { if (playBtn) playBtn.classList.remove('show'); }
    function revealVideo() {
      started = true;
      hidePlay();
      if (still) still.classList.add('hide');
    }

    function attempt() {
      if (!v.src && !v.currentSrc) { showPlay(); return; }
      v.muted = true;
      var p;
      try { p = v.play(); } catch (err) { showPlay(); return; }
      if (p && typeof p.then === 'function') {
        p.then(function () {
          // only treat as started once the clock actually advances
          setTimeout(function () {
            if (!v.paused && v.currentTime > 0) revealVideo();
            else showPlay();
          }, 350);
        }).catch(showPlay);
      }
    }

    v.addEventListener('timeupdate', function () {
      if (v.currentTime > 0 && !v.paused) revealVideo();
    });
    v.addEventListener('playing', function () {
      if (v.currentTime > 0) revealVideo();
    });
    v.addEventListener('error', showPlay);
    v.addEventListener('loadeddata', attempt);
    v.addEventListener('canplay', attempt);

    if (playBtn) {
      playBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        attempt();
      });
    }

    attempt();
    setTimeout(function () { if (v.paused || v.currentTime === 0) showPlay(); }, 1200);

    document.addEventListener('click', function once() {
      if (v.paused) attempt();
      document.removeEventListener('click', once);
    }, { once: true });
  })();

  // google map: show a fallback card if the embed is blocked (e.g. sandboxed preview)
  (function () {
    var frame = document.getElementById('mapFrame');
    var fallback = document.getElementById('mapFallback');
    if (!frame || !fallback) return;
    var loaded = false;
    frame.addEventListener('load', function () { loaded = true; });
    frame.addEventListener('error', function () { fallback.classList.add('show'); });
    setTimeout(function () {
      if (!loaded) fallback.classList.add('show');
    }, 2500);
  })();


  // franchise page feature video — click to play (no autoplay, has audio)
  (function () {
    var v = document.getElementById('frVideo');
    var btn = document.getElementById('frVideoPlay');
    var still = document.getElementById('frVideoStill');
    if (!v || !btn) return;

    function reveal() {
      btn.classList.remove('show');
      if (still) still.classList.add('hide');
    }
    function showBtn() {
      btn.classList.add('show');
      if (still) still.classList.remove('hide');
    }

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      v.muted = false;
      var p = v.play();
      if (p && typeof p.then === 'function') {
        p.then(function () {
          setTimeout(function () {
            if (!v.paused && v.currentTime > 0) reveal(); else showBtn();
          }, 300);
        }).catch(function () {
          // some browsers block unmuted playback — retry muted
          v.muted = true;
          v.play().then(reveal).catch(showBtn);
        });
      }
    });

    v.addEventListener('timeupdate', function () {
      if (v.currentTime > 0 && !v.paused) reveal();
    });
    v.addEventListener('pause', showBtn);
    v.addEventListener('error', showBtn);
    v.addEventListener('click', function () { if (!v.paused) v.pause(); });
  })();


});
