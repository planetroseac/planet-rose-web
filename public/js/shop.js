/* ==========================================================================
   Planet Rose: mini shop
   Product card → detail dialog (big photo, sizes) → "Request to Order" form.
   The form itself is handled by forms.js (validation + Netlify submit).
   Nothing here charges money: it's a request that the team follows up on.
   ========================================================================== */
(function () {
  'use strict';

  var dialog = document.querySelector('[data-product-dialog]');
  var cards = document.querySelectorAll('[data-product]');
  if (!dialog || !cards.length) return;

  var img = dialog.querySelector('[data-pd-img]');
  var nameEl = dialog.querySelector('[data-pd-name]');
  var priceEl = dialog.querySelector('[data-pd-price]');
  var descEl = dialog.querySelector('[data-pd-desc]');
  var sizesEl = dialog.querySelector('[data-pd-sizes]');
  var detail = dialog.querySelector('[data-pd-detail]');
  var form = dialog.querySelector('[data-pd-form]');
  var productSelect = form.querySelector('[name="product"]');
  var sizeSelect = form.querySelector('[name="size"]');
  var lastTrigger = null;
  var current = null;

  var supportsDialog = typeof dialog.showModal === 'function';

  function showStep(step) {
    var isForm = step === 'form';
    detail.hidden = isForm;
    form.hidden = !isForm;
    var focusTarget = isForm ? form.querySelector('[name="name"]') : dialog.querySelector('[data-pd-request]');
    if (focusTarget) focusTarget.focus();
  }

  // Only offer the sizes that exist for this product
  function syncSizes(sizes) {
    Array.prototype.forEach.call(sizeSelect.options, function (opt) {
      if (!opt.value && opt.textContent.indexOf('Choose') === 0) return;
      var ok = sizes.indexOf(opt.textContent) !== -1;
      opt.hidden = !ok;
      opt.disabled = !ok;
    });
    sizeSelect.value = sizes.length === 1 ? sizes[0] : '';
  }

  function open(card) {
    lastTrigger = card;
    current = {
      name: card.getAttribute('data-name'),
      price: card.getAttribute('data-price'),
      img: card.getAttribute('data-img'),
      alt: card.getAttribute('data-alt'),
      desc: card.getAttribute('data-desc'),
      sizes: (card.getAttribute('data-sizes') || '').split(',')
    };

    img.src = current.img;
    img.alt = current.alt;
    nameEl.textContent = current.name;
    priceEl.textContent = current.price;
    descEl.textContent = current.desc;

    sizesEl.innerHTML = '';
    current.sizes.forEach(function (s) {
      var li = document.createElement('li');
      li.textContent = s;
      sizesEl.appendChild(li);
    });

    productSelect.value = current.name;
    syncSizes(current.sizes);

    detail.hidden = false;
    form.hidden = true;

    if (supportsDialog) dialog.showModal();
    else dialog.setAttribute('open', '');
    document.documentElement.classList.add('has-dialog');
    dialog.querySelector('[data-pd-request]').focus();
  }

  function close() {
    if (supportsDialog && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
  }

  dialog.addEventListener('close', function () {
    document.documentElement.classList.remove('has-dialog');
    if (lastTrigger) lastTrigger.focus();
  });

  Array.prototype.forEach.call(cards, function (card) {
    card.addEventListener('click', function () { open(card); });
  });

  dialog.querySelector('[data-dialog-close]').addEventListener('click', close);
  dialog.querySelector('[data-pd-request]').addEventListener('click', function () { showStep('form'); });
  dialog.querySelector('[data-pd-back]').addEventListener('click', function () { showStep('detail'); });

  // Click on the dark backdrop closes
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) close();
  });

  // Changing product inside the form keeps the size list honest
  productSelect.addEventListener('change', function () {
    var match = Array.prototype.find.call(cards, function (c) { return c.getAttribute('data-name') === productSelect.value; });
    if (match) syncSizes((match.getAttribute('data-sizes') || '').split(','));
  });

  // forms.js fires this after a successful request
  form.addEventListener('request:sent', close);
})();
