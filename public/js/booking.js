/* ==========================================================================
   Planet Rose: booking page (VIP Room for now, tables next).

   Everything is organised by NIGHT: the calendar date is the night that
   starts at 9 PM that day. Hours after midnight are 24 (12 AM), 25 (1 AM).

   1. GET  ENGINE_URL?action=availability → free start times per night.
   2. Card on: Stripe Payment Element (deferred) → POST "intent" → Stripe
      confirms the card → POST "book" with only the SetupIntent id.
      The card number goes from the guest's browser straight to Stripe.
   3. The engine re-checks Google Calendar under a lock and creates the event.
   ========================================================================== */
(function () {
  'use strict';

  // Apps Script web app of the reservation engine (/reservas-engine)
  var ENGINE_URL = 'https://script.google.com/macros/s/AKfycbw7M9RV8-h3zKa19wny0opeJgu5JLhTr2JwaSw0uL3T09s6vLsL88tbzPmkg9cOfOfX/exec';

  var root = document.querySelector('[data-booking]');
  if (!root) return;

  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var $ = function (sel) { return root.querySelector(sel); };
  var $$ = function (sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); };

  var form = $('[data-screen="details"]');
  function F(name) { return form.elements.namedItem(name); }
  var statusEl = $('[data-status]');
  var phone = root.getAttribute('data-phone') || '';
  var resource = root.getAttribute('data-resource') || 'vip';

  var cfg = null;              // rules + keys from the engine
  var nights = [];             // [{ date, close, slots: [{ h, maxHours }] }]
  var byDate = {};
  var sel = { hours: 1, night: null, start: null };
  var view = { y: 0, m: 0 };   // month shown in the calendar
  var stripe = null, elements = null, turnstileId = null;
  var busy = false;

  /* -------------------------------------------------------------- labels */
  function parts(s) {
    var p = s.split('-').map(Number);
    return { y: p[0], m: p[1] - 1, d: p[2], wd: new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay() };
  }
  function iso(y, m, d) {
    return new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
  }
  function nextDay(s) {
    var x = parts(s);
    return iso(x.y, x.m, x.d + 1);
  }
  function nightName(s) {
    var x = parts(s);
    return DAYS_LONG[x.wd] + ' night, ' + MONTHS_LONG[x.m] + ' ' + x.d;
  }
  function timeLabel(h) {
    var x = h % 24;
    return (x % 12 || 12) + ':00 ' + (x < 12 ? 'AM' : 'PM');
  }
  function afterMidnight(s) {
    var x = parts(nextDay(s));
    return 'after midnight · early ' + DAYS[x.wd] + ' ' + MONTHS[x.m] + ' ' + x.d;
  }
  function hoursLabel(n) { return n + (n === 1 ? ' hour' : ' hours'); }
  function money(n) { return '$' + n.toLocaleString('en-US'); }

  /* ----------------------------------------------------------------- api */
  function api(method, payload, query) {
    var url = ENGINE_URL + (query ? '?' + query : '');
    var opts = method === 'POST'
      // text/plain keeps it a "simple" request: no CORS preflight to Apps Script
      ? { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) }
      : { method: 'GET' };
    return fetch(url, opts).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
  }

  var MESSAGES = {
    taken: 'Sorry, someone just booked that time. Please pick another one.',
    rate_limited: 'Too many attempts. Please wait a few minutes and try again.',
    bot_check: 'Please complete the security check and try again.',
    card_not_confirmed: 'Your card couldn\'t be verified. Please check the details or try another card.',
    expired: 'This session expired. Please try again.',
    busy: 'We\'re handling many bookings right now. Please try again in a moment.',
    invalid: 'Some details don\'t look right. Please check the form.'
  };
  function message(code) {
    return MESSAGES[code] || ('Something went wrong. Please try again' + (phone ? ' or call us at ' + phone + '.' : '.'));
  }

  function load() {
    return api('GET', null, 'action=availability&resource=' + encodeURIComponent(resource)).then(function (data) {
      if (!data.ok) throw new Error(data.code || 'server');
      cfg = data;
      nights = data.nights || [];
      byDate = {};
      nights.forEach(function (n) { byDate[n.date] = n; });
    });
  }

  /* ------------------------------------------------------------- screens */
  function screen(name) {
    $$('[data-screen]').forEach(function (s) { s.hidden = s.getAttribute('data-screen') !== name; });
    $('[data-back]').hidden = name !== 'details';
    root.setAttribute('data-view', name);
  }

  function updateInfo() {
    $('[data-meta-duration]').textContent = hoursLabel(sel.hours);
    var when = $('[data-meta-when]');
    var text = $('[data-meta-when-text]');
    if (sel.night && sel.start != null) {
      text.innerHTML = '';
      var strong = document.createElement('strong');
      strong.textContent = nightName(sel.night);
      var line = document.createElement('span');
      line.textContent = timeLabel(sel.start) + ' – ' + timeLabel(sel.start + sel.hours) +
        (sel.start >= 24 ? ' (' + afterMidnight(sel.night) + ')' : '');
      text.appendChild(strong);
      text.appendChild(line);
      when.hidden = false;
    } else {
      when.hidden = true;
    }
  }

  /* ------------------------------------------------------------ duration */
  function fits(n) {
    return n ? n.slots.filter(function (s) { return s.maxHours >= sel.hours; }) : [];
  }

  function setDuration(h) {
    sel.hours = h;
    $$('[data-duration]').forEach(function (b) {
      var on = Number(b.getAttribute('data-duration')) === h;
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.classList.toggle('is-on', on);
    });
    // keep the night/time if they still fit the new length
    if (sel.night && !fits(byDate[sel.night]).length) sel.night = null;
    if (sel.night && sel.start != null && !fits(byDate[sel.night]).some(function (s) { return s.h === sel.start; })) sel.start = null;
    if (!sel.night) sel.start = null;
    renderCalendar();
    renderTimes();
    updateInfo();
  }

  /* ------------------------------------------------------------ calendar */
  function monthHasNights(y, m) {
    var key = y + '-' + String(m + 1).padStart(2, '0');
    return nights.some(function (n) { return n.date.slice(0, 7) === key; });
  }

  function renderCalendar() {
    $('[data-month-label]').textContent = MONTHS_LONG[view.m] + ' ' + view.y;
    var prev = new Date(Date.UTC(view.y, view.m - 1, 1));
    var next = new Date(Date.UTC(view.y, view.m + 1, 1));
    $('[data-month="-1"]').disabled = !monthHasNights(prev.getUTCFullYear(), prev.getUTCMonth());
    $('[data-month="1"]').disabled = !monthHasNights(next.getUTCFullYear(), next.getUTCMonth());

    var grid = $('[data-grid]');
    $$('[data-grid] .bk-cal__day, [data-grid] .bk-cal__pad').forEach(function (el) { el.remove(); });

    var first = new Date(Date.UTC(view.y, view.m, 1)).getUTCDay();
    var days = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
    for (var i = 0; i < first; i++) {
      var pad = document.createElement('span');
      pad.className = 'bk-cal__pad';
      grid.appendChild(pad);
    }
    var now = new Date();
    var todayISO = iso(now.getFullYear(), now.getMonth(), now.getDate());

    for (var d = 1; d <= days; d++) {
      (function (date) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'bk-cal__day';
        b.textContent = String(parts(date).d);
        var open = fits(byDate[date]).length > 0;
        b.disabled = !open;
        if (date === todayISO) b.classList.add('is-today');
        if (date === sel.night) { b.classList.add('is-on'); b.setAttribute('aria-pressed', 'true'); }
        b.setAttribute('aria-label', nightName(date) + (open ? '' : byDate[date] ? ', fully booked' : ', not available'));
        b.addEventListener('click', function () { pickNight(date); });
        grid.appendChild(b);
      })(iso(view.y, view.m, d));
    }
  }

  function moveMonth(step) {
    var d = new Date(Date.UTC(view.y, view.m + step, 1));
    view.y = d.getUTCFullYear();
    view.m = d.getUTCMonth();
    renderCalendar();
  }

  function pickNight(date) {
    if (sel.night !== date) sel.start = null;
    sel.night = date;
    renderCalendar();
    renderTimes();
    updateInfo();
    if (window.matchMedia('(max-width: 760px)').matches) {
      $('[data-times-panel]').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /* --------------------------------------------------------------- times */
  function renderTimes() {
    var panel = $('[data-times-panel]');
    var list = $('[data-times]');
    if (!sel.night) { panel.hidden = true; return; }
    panel.hidden = false;
    $('[data-times-night]').textContent = nightName(sel.night);
    list.innerHTML = '';

    var slots = fits(byDate[sel.night]);
    if (!slots.length) {
      var p = document.createElement('p');
      p.className = 'bk-times__empty';
      p.textContent = 'No ' + hoursLabel(sel.hours) + ' openings this night. Try a shorter time or another night.';
      list.appendChild(p);
      return;
    }
    slots.forEach(function (s) {
      var row = document.createElement('div');
      row.className = 'bk-slot' + (s.h === sel.start ? ' is-on' : '');

      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'bk-slot__time';
      b.innerHTML = '<strong>' + timeLabel(s.h) + '</strong>' +
        '<small>' + (s.h >= 24 ? 'after midnight · ' : '') + 'until ' + timeLabel(s.h + sel.hours) + '</small>';
      b.setAttribute('aria-pressed', s.h === sel.start ? 'true' : 'false');
      b.addEventListener('click', function () {
        sel.start = s.h;
        renderTimes();
        updateInfo();
        var next = list.querySelector('.bk-slot.is-on .bk-slot__next');
        if (next) next.focus();
      });
      row.appendChild(b);

      if (s.h === sel.start) {
        var n = document.createElement('button');
        n.type = 'button';
        n.className = 'bk-slot__next';
        n.textContent = 'Next';
        n.addEventListener('click', goDetails);
        row.appendChild(n);
      }
      list.appendChild(row);
    });
  }

  function goDetails() {
    statusEl.hidden = true;
    screen('details');
    mountExtras();
    updatePrice();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(function () { F('first').focus({ preventScroll: true }); }, 50);
  }

  /* ------------------------------------------------- stripe + turnstile */
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('Could not load ' + src)); };
      document.head.appendChild(s);
    });
  }

  var extrasMounted = false;
  function mountExtras() {
    if (extrasMounted) return;
    extrasMounted = true;

    $('[data-card-box]').hidden = !cfg.cardRequired;
    if (cfg.cardRequired) {
      loadScript('https://js.stripe.com/v3/').then(function () {
        stripe = window.Stripe(cfg.stripeKey);
        elements = stripe.elements({
          mode: 'setup',
          currency: 'usd',
          paymentMethodTypes: ['card'],
          fonts: [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;600&display=swap' }],
          appearance: {
            theme: 'night',
            variables: {
              colorPrimary: '#F8001C', colorBackground: '#141414', colorText: '#F3F3F3',
              colorDanger: '#ff5a6a', fontFamily: 'Archivo, system-ui, sans-serif', borderRadius: '2px', spacingUnit: '4px'
            },
            rules: { '.Input': { border: '1.5px solid rgba(243,243,243,.26)' }, '.Label': { fontSize: '13px', fontWeight: '600' } }
          }
        });
        elements.create('payment', { layout: 'tabs', wallets: { applePay: 'never', googlePay: 'never' } })
          .mount($('[data-card-element]'));
      }).catch(function () {
        $('[data-card-error]').textContent = 'The secure card form couldn\'t load. Please refresh the page' + (phone ? ' or call us at ' + phone + '.' : '.');
      });
    }

    if (cfg.turnstileKey) {
      loadScript('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit').then(function () {
        turnstileId = window.turnstile.render($('[data-turnstile]'), { sitekey: cfg.turnstileKey, theme: 'dark' });
      }).catch(function () {});
    }
  }

  /* -------------------------------------------------------- validation */
  var rules = {
    first: function (v) { return v.trim().length >= 1 ? '' : 'Please enter your first name.'; },
    last: function (v) { return v.trim().length >= 1 ? '' : 'Please enter your last name.'; },
    email: function (v) { return EMAIL_RE.test(v.trim()) ? '' : 'Please enter a valid email.'; },
    phone: function (v) { return v.replace(/\D/g, '').length >= 10 ? '' : 'Please enter a full phone number.'; },
    guests: function (v) {
      var n = Number(v);
      return v && Number.isInteger(n) && n >= 1 && n <= cfg.rules.maxGuests ? '' : 'Enter 1 to ' + cfg.rules.maxGuests + ' guests.';
    }
  };
  function check(name) {
    var input = F(name);
    var msg = rules[name](input.value);
    var err = document.getElementById('b-' + name + '-err');
    input.closest('.field').classList.toggle('has-error', !!msg);
    err.textContent = msg;
    if (msg) { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', err.id); }
    else { input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); }
    return !msg;
  }
  Object.keys(rules).forEach(function (name) {
    var input = F(name);
    input.addEventListener('blur', function () { if (input.value) check(name); });
    input.addEventListener('input', function () {
      if (input.getAttribute('aria-invalid') === 'true') check(name);
      if (name === 'guests') updatePrice();
    });
  });

  // Live estimate in the left panel once the guest count is known
  var aboutPrice = root.querySelector('[data-about-price]');
  var aboutDefault = aboutPrice ? aboutPrice.textContent : '';
  function updatePrice() {
    if (!cfg || !aboutPrice) return;
    var g = Number(F('guests').value);
    if (!(Number.isInteger(g) && g >= 1 && g <= cfg.rules.maxGuests)) { aboutPrice.textContent = aboutDefault; return; }
    var fee = Math.max(g, cfg.rules.minGuestsCharged) * cfg.rules.pricePerPersonHour * sel.hours;
    aboutPrice.innerHTML = '';
    var s = document.createElement('strong');
    s.textContent = 'Est. room fee: ' + money(fee);
    aboutPrice.appendChild(s);
    aboutPrice.appendChild(document.createTextNode(' for ' + g + (g === 1 ? ' guest' : ' guests') + ', ' + hoursLabel(sel.hours) +
      ', plus ' + cfg.rules.gratuity + '% gratuity. Paid at the bar.'));
  }

  /* ------------------------------------------------------------ submit */
  function setBusy(on, label) {
    busy = on;
    var b = $('[data-submit]');
    b.disabled = on;
    b.textContent = on ? (label || 'Working…') : 'Confirm reservation';
  }
  function formError(text) {
    $('[data-form-error]').textContent = text || '';
  }

  function details() {
    return {
      resource: resource, night: sel.night, start: sel.start, hours: sel.hours,
      guests: Number(F('guests').value),
      name: (F('first').value.trim() + ' ' + F('last').value.trim()).trim(),
      email: F('email').value.trim(), phone: F('phone').value.trim(), notes: F('notes').value.trim(),
      policy: F('policy').checked, website: F('website').value,
      turnstile: turnstileId != null && window.turnstile ? window.turnstile.getResponse(turnstileId) : ''
    };
  }

  function fail(res) {
    setBusy(false);
    if (turnstileId != null && window.turnstile) window.turnstile.reset(turnstileId);
    if (res && res.code === 'taken') {
      // Slot gone: refresh availability and send them back to pick another time
      sel.start = null;
      load().then(function () {
        renderCalendar();
        renderTimes();
        updateInfo();
        screen('pick');
        statusEl.hidden = false;
        statusEl.textContent = message('taken');
      });
      return;
    }
    if (res && res.code === 'invalid' && res.field && rules[res.field]) check(res.field);
    formError(message(res && res.code));
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    formError('');

    var ok = true, first = null;
    Object.keys(rules).forEach(function (name) {
      if (!check(name)) { ok = false; first = first || F(name); }
    });
    var policyErr = document.getElementById('b-policy-err');
    policyErr.textContent = F('policy').checked ? '' : 'Please accept the reservation policy.';
    if (!F('policy').checked) { ok = false; first = first || F('policy'); }
    if (!ok) { first.focus(); return; }

    var d = details();

    if (!cfg.cardRequired) {
      setBusy(true, 'Booking…');
      d.action = 'book';
      api('POST', d).then(function (res) { res.ok ? done(res.booking) : fail(res); }).catch(function () { fail(null); });
      return;
    }

    if (!stripe || !elements) { formError('The secure card form is still loading. Please wait a moment.'); return; }
    setBusy(true, 'Checking card…');
    var cardErr = $('[data-card-error]');
    cardErr.textContent = '';

    elements.submit().then(function (r) {
      if (r.error) { cardErr.textContent = r.error.message; throw { handled: true }; }
      d.action = 'intent';
      return api('POST', d);
    }).then(function (res) {
      if (!res.ok) { fail(res); throw { handled: true }; }
      setBusy(true, 'Securing your card…');
      return stripe.confirmSetup({
        elements: elements,
        clientSecret: res.clientSecret,
        redirect: 'if_required',
        confirmParams: {
          return_url: window.location.origin + window.location.pathname,
          payment_method_data: { billing_details: { name: d.name, email: d.email, phone: d.phone } }
        }
      });
    }).then(function (r) {
      if (r.error) { cardErr.textContent = r.error.message; throw { handled: true }; }
      return finish(r.setupIntent.id);
    }).catch(function (err) {
      if (err && err.handled) { if (busy) setBusy(false); return; }
      fail(null);
    });
  });

  function finish(setupIntentId) {
    setBusy(true, 'Booking…');
    return api('POST', { action: 'book', setupIntent: setupIntentId }).then(function (res) {
      if (res.ok) done(res.booking); else fail(res);
    });
  }

  function done(b) {
    sel.night = b.night; sel.start = b.start; sel.hours = b.hours;
    updateInfo();
    var list = $('[data-done-list]');
    var rows = [
      ['Reference', b.ref],
      ['Night', nightName(b.night)],
      ['Time', timeLabel(b.start) + ' – ' + timeLabel(b.start + b.hours) + (b.start >= 24 ? ' (' + afterMidnight(b.night) + ')' : '')],
      ['Guests', String(b.guests)]
    ];
    if (b.card) rows.push(['Card on file', b.card.brand.toUpperCase() + ' •••• ' + b.card.last4 + ' (not charged)']);
    list.innerHTML = '';
    rows.forEach(function (r) {
      var div = document.createElement('div');
      var dt = document.createElement('dt'); dt.textContent = r[0];
      var dd = document.createElement('dd'); dd.textContent = r[1];
      div.appendChild(dt); div.appendChild(dd); list.appendChild(div);
    });
    $('[data-done-email]').textContent = b.email;
    statusEl.hidden = true;
    screen('done');
    $('[data-screen="done"]').focus();
    window.scrollTo(0, 0);
  }

  /* -------------------------------------------------------------- init */
  $$('[data-duration]').forEach(function (b) {
    b.addEventListener('click', function () { setDuration(Number(b.getAttribute('data-duration'))); });
  });
  $$('[data-month]').forEach(function (b) {
    b.addEventListener('click', function () { moveMonth(Number(b.getAttribute('data-month'))); });
  });
  $('[data-back]').addEventListener('click', function () { screen('pick'); formError(''); });

  // Room details start folded on phones so the calendar is on the first screen
  var about = document.querySelector('[data-about]');
  if (about && window.matchMedia('(max-width: 760px)').matches) about.open = false;

  function start() {
    $$('[data-fee]').forEach(function (el) { el.textContent = money(cfg.rules.noShowFee); });
    $$('[data-grace]').forEach(function (el) { el.textContent = String(cfg.rules.graceMinutes); });
    $$('[data-notice]').forEach(function (el) { el.textContent = String(cfg.rules.cancelNoticeHours || 3); });
    $$('[data-max-guests]').forEach(function (el) { el.textContent = String(cfg.rules.maxGuests); });
    $$('[data-phone-text]').forEach(function (el) { el.textContent = phone || 'us'; });
    F('guests').max = cfg.rules.maxGuests;
    $('[data-test-banner]').hidden = !cfg.testMode;
    $$('[data-duration]').forEach(function (b) { b.hidden = Number(b.getAttribute('data-duration')) > cfg.rules.maxHours; });

    // Open on the month of the first night with a free time
    var firstOpen = nights.filter(function (n) { return n.slots.length; })[0];
    var now = new Date();
    var x = parts(firstOpen ? firstOpen.date : iso(now.getFullYear(), now.getMonth(), 1));
    view.y = x.y; view.m = x.m;
    statusEl.hidden = true;
    setDuration(1);
    screen('pick');
  }

  if (!ENGINE_URL) {
    statusEl.textContent = 'Online booking is coming soon. Please call us' + (phone ? ' at ' + phone : '') + ' to reserve.';
    return;
  }

  // Back from a bank (3D Secure) check: Stripe returns with ?setup_intent=...
  var params = new URLSearchParams(window.location.search);
  var returned = params.get('setup_intent');
  if (returned) {
    history.replaceState(null, '', window.location.pathname);
    statusEl.innerHTML = '<span class="bk-spinner" aria-hidden="true"></span> Finishing your reservation…';
    load().then(function () {
      return api('POST', { action: 'book', setupIntent: returned });
    }).then(function (res) {
      if (res.ok) { done(res.booking); return; }
      start();
      statusEl.hidden = false;
      statusEl.textContent = message(res.code);
    }).catch(function () {
      statusEl.textContent = message(null);
    });
    return;
  }

  load().then(start).catch(function () {
    statusEl.textContent = 'We couldn\'t load availability. Please refresh the page' + (phone ? ' or call us at ' + phone + '.' : '.');
  });
})();
