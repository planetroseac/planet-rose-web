/* ==========================================================================
   Planet Rose: request forms ("Plan Your Night" + shop "Request to Order")
   Client-side validation, then submission.

   Where requests go (first match wins):
   1. GOOGLE_SHEET_URL set → Google Apps Script web app: saves a row in the
      Planet Rose Google Sheet and emails the team (see /google-sheets/LEEME.md).
   2. Site served over http/https (e.g. Netlify) → Netlify Forms backup.
   3. Opened locally (file://) → nothing is sent; we only preview the flow.
   Nothing is ever described as confirmed, booked or charged.
   ========================================================================== */
(function () {
  'use strict';

  var forms = document.querySelectorAll('[data-request-form]');
  var toast = document.querySelector('[data-toast]');
  var toastMsg = document.querySelector('[data-toast-msg]');
  if (!forms.length) return;

  // Paste the Apps Script "web app" URL here (https://script.google.com/macros/s/.../exec)
  var GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbwsjJmX3psrr5Ccm3322vlN9TphllJ9TBTohEMuev38xc1LsZWvbxgJodVfeE5J63PtxQ/exec';

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var ERROR_MSG = 'Sorry, your request didn\'t go through. Please try again or call us at (609) 830-8233.';
  var canSubmit = /^https?:$/.test(window.location.protocol);

  // Earliest selectable date = today (local)
  var today = new Date();
  var todayISO = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0')
  ].join('-');
  Array.prototype.forEach.call(document.querySelectorAll('[data-request-form] input[type="date"]'), function (d) {
    d.min = todayISO;
  });

  // Rules by field name; each returns an error message or ''.
  var rules = {
    name: function (v) { return v.trim().length >= 2 ? '' : 'Please tell us your name.'; },
    email: function (v) {
      if (!v.trim()) return 'We need an email to get back to you.';
      return EMAIL_RE.test(v.trim()) ? '' : 'That email doesn\'t look right.';
    },
    phone: function (v, input) {
      if (!v.trim()) return input.required ? 'We need a phone number to reach you.' : '';
      return v.replace(/\D/g, '').length >= 10 ? '' : 'Please enter a full phone number.';
    },
    type: function (v) { return v ? '' : 'Pick what you\'re planning.'; },
    date: function (v) {
      if (!v) return 'Choose a date.';
      return v >= todayISO ? '' : 'That date has already passed.';
    },
    size: function (v) {           // party size (number input)
      var n = Number(v);
      if (!v) return 'How many people are coming?';
      if (!Number.isInteger(n) || n < 1) return 'Enter a whole number.';
      if (n > 60) return 'For groups over 60, add details in Notes and we\'ll call you.';
      return '';
    },
    product: function (v) { return v ? '' : 'Choose a product.'; },
    quantity: function (v) {
      var n = Number(v);
      return Number.isInteger(n) && n >= 1 && n <= 20 ? '' : 'Enter a quantity from 1 to 20.';
    }
  };

  // "size" means party size in Plan Your Night and garment size in the shop
  function ruleFor(input) {
    if (input.name === 'size' && input.tagName === 'SELECT') {
      return function (v) { return v ? '' : 'Choose a size.'; };
    }
    return rules[input.name];
  }

  function validateField(input) {
    var rule = ruleFor(input);
    if (!rule) return true;
    var msg = rule(input.value, input);
    var field = input.closest('.field');
    var err = document.getElementById(input.id + '-err');

    if (field) field.classList.toggle('has-error', !!msg);
    if (err) err.textContent = msg;
    if (msg) {
      input.setAttribute('aria-invalid', 'true');
      if (err) input.setAttribute('aria-describedby', err.id);
    } else {
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
    }
    return !msg;
  }

  var toastTimer;
  function showToast(text, isError) {
    if (!toast || !toastMsg) return;
    toastMsg.textContent = text;
    toast.classList.toggle('is-error', !!isError);
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-visible'); }, 7000);
  }
  if (toast) toast.addEventListener('click', function () { toast.classList.remove('is-visible'); });

  function encode(form) {
    return new URLSearchParams(new FormData(form)).toString();
  }

  Array.prototype.forEach.call(forms, function (form) {
    var fields = Array.prototype.filter.call(form.elements, function (el) {
      return el.name && ruleFor(el);
    });

    fields.forEach(function (input) {
      input.addEventListener('blur', function () { if (input.value) validateField(input); });
      ['input', 'change'].forEach(function (evt) {
        input.addEventListener(evt, function () {
          if (input.getAttribute('aria-invalid') === 'true') validateField(input);
        });
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var firstInvalid = null;
      fields.forEach(function (input) {
        if (!validateField(input) && !firstInvalid) firstInvalid = input;
      });
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      var success = form.getAttribute('data-success');
      var button = form.querySelector('[type="submit"]');
      var label = button ? button.textContent : '';

      function done() {
        form.reset();
        form.dispatchEvent(new CustomEvent('request:sent'));
        showToast(success);
      }

      if (!GOOGLE_SHEET_URL && !canSubmit) {   // local preview: nothing to send to
        done();
        return;
      }

      if (button) { button.disabled = true; button.textContent = 'Sending…'; }

      var request = GOOGLE_SHEET_URL
        // Apps Script doesn't send CORS headers, so the reply is opaque:
        // a network error still lands in .catch(), anything else means it arrived.
        ? fetch(GOOGLE_SHEET_URL, { method: 'POST', mode: 'no-cors', body: new URLSearchParams(new FormData(form)) })
        : fetch('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: encode(form)
          }).then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); });

      request
        .then(function () { done(); })
        .catch(function () { showToast(ERROR_MSG, true); })
        .then(function () {
          if (button) { button.disabled = false; button.textContent = label; }
        });
    });
  });
})();
