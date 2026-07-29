/* ==========================================================================
   Mendez Stone — booking form: live estimate + request submission
   ==========================================================================
   The estimate is a ballpark only. Final pricing comes from the on-site
   template measurement.

   Submission: with no server behind this static site, the form composes a
   complete, formatted request and opens the customer's email client addressed
   to the shop. To switch to a hosted form service (Formspree, Netlify Forms,
   Basin, etc.), set FORM_ENDPOINT below to the POST URL and the form will send
   directly instead.
   ========================================================================== */

(function () {
  var FORM_ENDPOINT = ''; // e.g. 'https://formspree.io/f/xxxxxxx'

  var cfg = window.MENDEZ_STONE || {};
  var pricing = cfg.pricing || {};
  var addons = cfg.addons || {};

  function $(id) { return document.getElementById(id); }
  function num(id) {
    var el = $(id);
    if (!el) return 0;
    var v = parseFloat(el.value);
    return isNaN(v) || v < 0 ? 0 : v;
  }
  function checked(id) { var el = $(id); return !!(el && el.checked); }
  function money(n) {
    return '$' + Math.round(n).toLocaleString('en-US');
  }

  /* ---------- Live estimate ---------- */

  function computeEstimate() {
    var sqft = num('sqft');
    if (sqft <= 0) return null;

    var materialKey = ($('material') || {}).value || 'unsure';
    var band = pricing[materialKey] || pricing.unsure || { low: 45, high: 150 };

    var low = sqft * band.low;
    var high = sqft * band.high;

    var extras = 0;
    var undermount = num('sinks_undermount');
    var dropin = num('sinks_dropin');
    extras += undermount * (addons.sinkCutoutUndermount || 0);
    extras += dropin * (addons.sinkCutoutDropin || 0);
    extras += num('faucet_holes') * (addons.faucetHole || 0);
    if (checked('cooktop')) extras += addons.cooktopCutout || 0;
    if (checked('demo')) extras += sqft * (addons.demoPerSqft || 0);

    var edge = ($('edge') || {}).value || '';
    var lnft = num('edge_lnft');
    var premiumEdges = ['ogee', 'bullnose_full', 'waterfall', 'mitered'];
    if (premiumEdges.indexOf(edge) !== -1 && lnft > 0) {
      extras += lnft * (addons.edgeUpgradePerLnft || 0);
    }
    if (checked('backsplash')) {
      extras += num('backsplash_lnft') * (addons.backsplashPerLnft || 0);
    }

    low += extras;
    high += extras;

    var min = cfg.minimumJob || 0;
    if (low < min) low = min;
    if (high < low) high = low;

    return { low: low, high: high, sqft: sqft, material: band.label || materialKey };
  }

  function renderEstimate() {
    var box = $('estimate-box');
    if (!box) return;
    var est = computeEstimate();

    if (!est) {
      box.innerHTML = '<p class="form-note">Enter your approximate square footage to see a ballpark range.</p>';
      return;
    }

    var deposit = (cfg.depositPercent || 50) / 100 * est.low;
    box.innerHTML =
      '<p class="badge">Ballpark estimate</p>' +
      '<p class="estimate-figure">' + money(est.low) + ' – ' + money(est.high) + '</p>' +
      '<p class="form-note">' + est.material + ', about ' + est.sqft + ' sq ft installed, including the ' +
      'fabrication extras you selected. Deposit at template is roughly ' + money(deposit) +
      ' (' + (cfg.depositPercent || 50) + '%).</p>' +
      '<p class="form-note" style="margin-top:.5rem;"><strong>This is not a quote.</strong> ' +
      'Slab selection, layout, and site conditions move the number. We confirm final pricing ' +
      'after the on-site template.</p>';
  }

  /* ---------- Build the request summary ---------- */

  function labelFor(id) {
    var el = $(id);
    if (!el) return '';
    if (el.tagName === 'SELECT') {
      return el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : '';
    }
    return el.value;
  }

  function collect() {
    var lines = [];
    function add(label, value) {
      if (value === '' || value == null || value === 0 || value === '0') return;
      if (typeof value === 'string' && !value.trim()) return;
      lines.push(label + ': ' + value);
    }

    lines.push('=== CONTACT ===');
    add('Name', labelFor('name'));
    add('Phone', labelFor('phone'));
    add('Email', labelFor('email'));
    add('Best time to reach you', labelFor('contact_time'));
    add('Preferred contact method', labelFor('contact_method'));

    lines.push('');
    lines.push('=== JOB SITE ===');
    add('Address', labelFor('address'));
    add('City / State / ZIP', [labelFor('city'), labelFor('state'), labelFor('zip')]
      .filter(function (v) { return v && v.trim(); }).join(', '));
    add('Property type', labelFor('property_type'));
    add('Is this new construction or a replacement?', labelFor('project_type'));
    add('Stairs / elevator access notes', labelFor('access_notes'));

    lines.push('');
    lines.push('=== COUNTERTOP DETAILS ===');
    add('Areas', Array.prototype.slice.call(
      document.querySelectorAll('input[name="areas"]:checked')
    ).map(function (c) { return c.value; }).join(', '));
    add('Material', labelFor('material'));
    add('Color / slab name if known', labelFor('color'));
    add('Approximate square footage', labelFor('sqft'));
    add('Edge profile', labelFor('edge'));
    add('Edge linear feet', labelFor('edge_lnft'));
    add('Thickness', labelFor('thickness'));
    add('Finish', labelFor('finish'));

    lines.push('');
    lines.push('=== CUTOUTS & EXTRAS ===');
    add('Undermount sinks', labelFor('sinks_undermount'));
    add('Drop-in sinks', labelFor('sinks_dropin'));
    add('Faucet / accessory holes', labelFor('faucet_holes'));
    add('Cooktop cutout', checked('cooktop') ? 'Yes' : '');
    add('Cooktop type', checked('cooktop') ? labelFor('cooktop_type') : '');
    add('Backsplash', checked('backsplash') ? 'Yes — ' + labelFor('backsplash_lnft') + ' linear ft' : '');
    add('Remove & haul away existing tops', checked('demo') ? 'Yes' : '');
    add('Plumbing disconnect/reconnect needed', checked('plumbing') ? 'Yes' : '');
    add('Existing tops material (for demo)', checked('demo') ? labelFor('existing_material') : '');
    add('Cabinets already installed and level', labelFor('cabinets_ready'));
    add('Appliances on site', labelFor('appliances'));

    lines.push('');
    lines.push('=== SCHEDULING ===');
    add('Preferred template date', labelFor('template_date'));
    add('Preferred install window', labelFor('install_window'));
    add('Target completion date', labelFor('deadline'));
    add('Flexible on dates?', labelFor('flexible'));

    lines.push('');
    lines.push('=== OTHER ===');
    add('How did you hear about us?', labelFor('referral'));
    add('Notes', labelFor('notes'));

    var est = computeEstimate();
    if (est) {
      lines.push('');
      lines.push('=== SITE-CALCULATED BALLPARK ===');
      lines.push(money(est.low) + ' – ' + money(est.high) + ' (not a quote)');
    }

    return lines.join('\n');
  }

  /* ---------- Validation ---------- */

  function validate() {
    var required = ['name', 'phone', 'email', 'address', 'city', 'zip'];
    for (var i = 0; i < required.length; i++) {
      var el = $(required[i]);
      if (el && !el.value.trim()) {
        el.focus();
        return 'Please fill in the ' + (el.dataset.label || required[i]) + ' field.';
      }
    }
    var email = $('email');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
      email.focus();
      return 'That email address does not look right — please double-check it.';
    }
    var areas = document.querySelectorAll('input[name="areas"]:checked');
    if (areas.length === 0) {
      return 'Please tell us which areas need countertops.';
    }
    return null;
  }

  /* ---------- Submit ---------- */

  function showStatus(kind, html) {
    var box = $('booking-status');
    if (!box) return;
    box.className = kind;
    box.innerHTML = html;
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function onSubmit(e) {
    e.preventDefault();

    var problem = validate();
    if (problem) {
      showStatus('err', problem);
      return;
    }

    var summary = collect();
    var name = ($('name') || {}).value || 'Customer';

    // Keep a local copy so the customer does not lose their entries.
    try {
      localStorage.setItem('mendezstone_last_request', summary);
    } catch (err) { /* storage unavailable — not fatal */ }

    if (FORM_ENDPOINT) {
      fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ name: name, summary: summary })
      }).then(function (res) {
        if (!res.ok) throw new Error('bad status');
        showStatus('ok', '<strong>Request sent.</strong> Thanks, ' + escapeHtml(name) +
          '. We will confirm your template appointment within one business day.');
        $('booking-form').reset();
        renderEstimate();
      }).catch(function () {
        emailFallback(summary, name);
      });
      return;
    }

    emailFallback(summary, name);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function emailFallback(summary, name) {
    var to = cfg.bookingEmail || cfg.email || '';
    var subject = 'Installation request — ' + name;
    var href = 'mailto:' + encodeURIComponent(to) +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(summary);

    showStatus('ok',
      '<strong>Almost done — one more click.</strong><br>' +
      'Your request is ready to send. ' +
      '<a href="' + href + '" style="font-weight:600;">Click here to open it in your email app</a> ' +
      'and press send. Prefer the phone? Call <a data-ms-href="phone" href="' +
      (cfg.phoneHref || '#') + '">' + escapeHtml(cfg.phone || '') + '</a>.' +
      '<details style="margin-top:.8rem;"><summary style="cursor:pointer;">Or copy your request text</summary>' +
      '<textarea readonly style="width:100%;height:220px;margin-top:.5rem;font-family:monospace;font-size:.8rem;">' +
      escapeHtml(summary) + '</textarea></details>');
  }

  /* ---------- Wire up ---------- */

  document.addEventListener('DOMContentLoaded', function () {
    var form = $('booking-form');
    if (!form) return;

    form.addEventListener('submit', onSubmit);
    form.addEventListener('input', renderEstimate);
    form.addEventListener('change', renderEstimate);

    // Show/hide dependent fields.
    function toggleDependent(triggerId, targetId) {
      var trigger = $(triggerId), target = $(targetId);
      if (!trigger || !target) return;
      function sync() { target.style.display = trigger.checked ? '' : 'none'; }
      trigger.addEventListener('change', sync);
      sync();
    }
    toggleDependent('demo', 'demo-details');
    toggleDependent('backsplash', 'backsplash-details');
    toggleDependent('cooktop', 'cooktop-details');

    // Template date cannot be in the past; default the picker's floor to tomorrow.
    var td = $('template_date');
    if (td) {
      var t = new Date();
      t.setDate(t.getDate() + 1);
      td.min = t.toISOString().split('T')[0];
    }

    renderEstimate();
  });
})();
