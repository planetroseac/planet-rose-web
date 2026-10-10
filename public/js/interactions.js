/* ==========================================================================
   Planet Rose: interactions
   nav state · mobile menu · smooth anchors · song cycle · scroll-reveal · parallax · scroll-spy
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- nav: scrolled state + mobile toggle ---------------- */
  var nav = document.querySelector('[data-nav]');
  var toggle = document.querySelector('[data-nav-toggle]');

  function onScroll() {
    if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 24);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  function setMenu(open) {
    if (!nav || !toggle) return;
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.sr-only').textContent = open ? 'Close menu' : 'Open menu';
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setMenu(false);
        toggle.focus();
      }
    });
  }

  /* ---------------- smooth in-page anchors ---------------- */
  // Links from other pages (e.g. /?type=table#plan) pre-select the request type too
  var typeParam = new URLSearchParams(window.location.search).get('type');
  if (typeParam) {
    var typeSelect = document.getElementById('f-type');
    if (typeSelect && typeSelect.querySelector('option[value="' + typeParam.replace(/[^a-z]/g, '') + '"]')) typeSelect.value = typeParam;
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href^="#"]');
    if (!link) return;
    var id = link.getAttribute('href');
    if (id.length < 2) return;
    var target = document.querySelector(id);
    if (!target) return;

    e.preventDefault();
    setMenu(false);

    // "Request the VIP Room" etc. pre-select the request type
    var preset = link.getAttribute('data-request-type');
    if (preset) {
      var select = document.getElementById('f-type');
      if (select) select.value = preset;
    }

    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    if (history.pushState) history.pushState(null, '', id);

    // move focus for keyboard + screen reader users without re-scrolling
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  /* ---------------- mic: cycle sample songs ---------------- */
  var SONGS = [
    ["Don't Stop Believin'", 'Journey'],
    ["Livin' on a Prayer", 'Bon Jovi'],
    ['I Wanna Dance with Somebody', 'Whitney Houston'],
    ['Mr. Brightside', 'The Killers'],
    ['Dancing Queen', 'ABBA'],
    ['Sweet Caroline', 'Neil Diamond'],
    ['Bohemian Rhapsody', 'Queen'],
    ['Total Eclipse of the Heart', 'Bonnie Tyler'],
    ['Wannabe', 'Spice Girls'],
    ['Friends in Low Places', 'Garth Brooks'],
    ['Valerie', 'Amy Winehouse'],
    ['Shallow', 'Lady Gaga & Bradley Cooper']
  ];

  var micBtn = document.querySelector('[data-mic]');
  var titleEl = document.querySelector('[data-song-title]');
  var artistEl = document.querySelector('[data-song-artist]');
  var queueEl = document.querySelector('[data-song-queue]');
  var nowPlaying = document.getElementById('now-playing');
  var songIndex = 0;
  var slip = 7;

  if (micBtn && titleEl && artistEl) {
    micBtn.addEventListener('click', function () {
      songIndex = (songIndex + 1) % SONGS.length;
      slip += 1;

      titleEl.textContent = SONGS[songIndex][0];
      artistEl.textContent = SONGS[songIndex][1];
      if (queueEl) queueEl.textContent = '#' + String(slip).padStart(2, '0');

      if (nowPlaying) {
        nowPlaying.classList.remove('is-swapping');
        void nowPlaying.offsetWidth; // restart animation
        nowPlaying.classList.add('is-swapping');
      }

      micBtn.classList.remove('is-tapped');
      void micBtn.offsetWidth;
      micBtn.classList.add('is-tapped');

      micBtn.dispatchEvent(new CustomEvent('mic:tap'));
    });
  }

  /* ---------------- scroll-reveal ---------------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));

  if (!reduceMotion && 'IntersectionObserver' in window && revealEls.length) {
    var vh = window.innerHeight;

    // Only hide what is below the fold, so nothing visible ever flashes out.
    revealEls.forEach(function (el) {
      if (el.getBoundingClientRect().top > vh * 0.92) el.classList.add('is-pending');
    });

    // Stagger siblings that enter together
    var io = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (en) { return en.isIntersecting; });
      batch.forEach(function (en, i) {
        var el = en.target;
        el.style.setProperty('--reveal-delay', (i * 80) + 'ms');
        el.classList.add('is-revealed');
        el.classList.remove('is-pending');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    revealEls.forEach(function (el) {
      if (el.classList.contains('is-pending')) io.observe(el);
    });
  }

  /* ---------------- parallax between sections ----------------
     Elements with data-parallax="speed" drift relative to their parent as it
     crosses the viewport. Uses the CSS `translate` property so it never fights
     hover/reveal transforms. Images are pre-scaled in CSS and clamped here so
     no edge ever shows. Off entirely with prefers-reduced-motion. */
  var pEls = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));

  if (!reduceMotion && pEls.length) {
    document.documentElement.classList.add('has-parallax');
    var pTicking = false;

    var updateParallax = function () {
      pTicking = false;
      var vh = window.innerHeight;
      pEls.forEach(function (el) {
        var box = el.parentElement.getBoundingClientRect();
        if (box.bottom < -200 || box.top > vh + 200) return;
        var speed = parseFloat(el.getAttribute('data-parallax')) || 0.05;
        var offset = -(box.top + box.height / 2 - vh / 2) * speed;
        if (el.tagName === 'IMG') {
          var limit = el.offsetHeight * 0.065;   // matches scale: 1.14 in CSS
          offset = Math.max(-limit, Math.min(limit, offset));
        }
        el.style.setProperty('--py', offset.toFixed(1) + 'px');
      });
    };

    window.addEventListener('scroll', function () {
      if (!pTicking) { pTicking = true; requestAnimationFrame(updateParallax); }
    }, { passive: true });
    window.addEventListener('resize', updateParallax);
    updateParallax();
  }

  /* ---------------- nav: highlight the section in view ---------------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav__links a[href^="#"]'));
  var spyTargets = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && spyTargets.length) {
    var visibleSections = {};
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visibleSections[en.target.id] = en.isIntersecting; });
      // the first section (in page order) that is currently in the middle band wins
      var activeId = null;
      spyTargets.some(function (t) {
        if (visibleSections[t.id]) { activeId = t.id; return true; }
        return false;
      });
      navLinks.forEach(function (a) {
        var on = a.getAttribute('href') === '#' + activeId;
        a.classList.toggle('is-active', on);
        if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    spyTargets.forEach(function (t) { spy.observe(t); });
  }

  /* ---------------- footer year ---------------- */
  var yearEl = document.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
