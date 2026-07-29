/* ===========================================================================
   Mendez Stone — detailed booking request
   ---------------------------------------------------------------------------
   The short quote form on the home page is the front door. This is for the
   customer who has decided and wants a date: it collects everything needed to
   schedule a measure, and prices the extras the short form cannot see.

   Leads are delivered exactly the way the quote form delivers them — through
   the same FormSubmit / Web3Forms configuration in config.js — so there is one
   place to change where mail goes, not two.
   =========================================================================== */

(function () {
  'use strict';

  var CFG = window.MENDEZ_CONFIG || {};

  // Add-ons the short form has no way to know about.
  var ADDONS = {
    sinkUndermount: 250,
    sinkDropin: 100,
    cooktop: 125,
    faucetHole: 35,
    demoPerSqft: 8,
    premiumEdgePerLnft: 12,
    backsplashPerLnft: 22
  };
  var PREMIUM_EDGES = ['Full bullnose', 'Ogee', 'Mitered / built-up', 'Waterfall'];

  function $(id) { return document.getElementById(id); }
  function val(id) { var e = $(id); return e ? e.value.trim() : ''; }
  function num(id) { var v = parseFloat(val(id)); return isNaN(v) || v < 0 ? 0 : v; }
  function on(id) { var e = $(id); return !!(e && e.checked); }
  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }

  function selectedText(id) {
    var e = $(id);
    if (!e || e.selectedIndex < 0) return '';
    return e.options[e.selectedIndex].text;
  }

  /* ---- estimate ---------------------------------------------------------- */

  function estimate() {
    var sqft = num('sqft');
    if (sqft <= 0) return null;

    var band = (CFG.pricing || {})[val('material')] ||
               (CFG.pricing || {})['Not sure yet'] || { low: 45, high: 120 };

    var low = sqft * band.low;
    var high = sqft * band.high;

    var extra = 0;
    extra += num('sinks_under') * ADDONS.sinkUndermount;
    extra += num('sinks_drop') * ADDONS.sinkDropin;
    extra += num('faucet_holes') * ADDONS.faucetHole;
    if (on('cooktop')) extra += ADDONS.cooktop;
    if (on('demo')) extra += sqft * ADDONS.demoPerSqft;
    if (on('backsplash')) extra += num('backsplash_lnft') * ADDONS.backsplashPerLnft;
    if (PREMIUM_EDGES.indexOf(val('edge')) !== -1) {
      extra += num('edge_lnft') * ADDONS.premiumEdgePerLnft;
    }

    low += extra;
    high += extra;

    var min = CFG.minJob || 0;
    if (low < min) low = min;
    if (high < low) high = low;

    return { low: low, high: high, sqft: sqft, material: val('material') || 'Not sure yet' };
  }

  function renderEstimate() {
    var box = $('estBody');
    if (!box) return;
    var e = estimate();
    if (!e) {
      box.innerHTML = '<p>Enter your approximate square footage and we will show a ' +
                      'ballpark range here as you fill the form in.</p>';
      return;
    }
    box.innerHTML =
      '<span class="est-label">Ballpark</span>' +
      '<div class="est-figure">' + money(e.low) + ' – ' + money(e.high) + '</div>' +
      '<p>' + e.material + ', about ' + e.sqft + ' sq ft installed, including the extras ' +
      'you have selected.</p>' +
      '<p><strong>This is not a quote.</strong> Slab choice and site conditions move the ' +
      'number. We confirm your written price at the free measure.</p>';
  }

  /* ---- request summary --------------------------------------------------- */

  function prettyDate(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    if (!m) return v;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d.getTime()) ? v : d.toLocaleDateString('en-US',
      { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  function summary() {
    var out = [];
    function add(label, v) {
      if (!v || v === '0') return;
      out.push(label + ': ' + v);
    }
    var areas = Array.prototype.map.call(
      document.querySelectorAll('input[name="areas"]:checked'), function (c) { return c.value; }
    ).join(', ');

    out.push('=== CONTACT ===');
    add('Name', val('name'));
    add('Phone', val('phone'));
    add('Email', val('email'));
    add('Best way to reach you', selectedText('contact_method'));

    out.push('', '=== JOB SITE ===');
    add('Address', val('address'));
    add('City / ZIP', [val('city'), val('zip')].filter(Boolean).join(', '));
    add('Property type', selectedText('property'));
    add('Access notes', val('access'));

    out.push('', '=== THE WORK ===');
    add('Areas', areas);
    add('Material', val('material'));
    add('Colour / slab', val('color'));
    add('Approx. square feet', val('sqft'));
    add('Edge profile', val('edge'));
    add('Edge linear feet', val('edge_lnft'));
    add('Thickness', selectedText('thickness'));
    add('Finish', selectedText('finish'));

    out.push('', '=== CUTOUTS & EXTRAS ===');
    add('Undermount sinks', val('sinks_under'));
    add('Drop-in sinks', val('sinks_drop'));
    add('Faucet / accessory holes', val('faucet_holes'));
    add('Cooktop cutout', on('cooktop') ? 'Yes' : '');
    add('Stone backsplash', on('backsplash') ? val('backsplash_lnft') + ' linear ft' : '');
    add('Tear out & haul away old tops', on('demo') ? 'Yes' : '');
    add('Plumbing disconnect / reconnect', on('plumbing') ? 'Yes' : '');
    add('Cabinets installed and level', selectedText('cabinets'));

    out.push('', '=== SCHEDULING ===');
    add('Preferred measure date', prettyDate(val('measure_date')));
    add('Target completion', prettyDate(val('deadline')));
    add('Flexibility', selectedText('flexible'));

    add('Notes', val('notes'));

    var e = estimate();
    if (e) {
      out.push('', '=== SITE-CALCULATED BALLPARK ===',
               money(e.low) + ' – ' + money(e.high) + ' (not a quote)');
    }
    return out.join('\n');
  }

  /* ---- validation -------------------------------------------------------- */

  function validate() {
    var required = [['name', 'your name'], ['phone', 'a phone number'],
                    ['address', 'the job address'], ['city', 'the city']];
    for (var i = 0; i < required.length; i++) {
      if (!val(required[i][0])) {
        $(required[i][0]).focus();
        return 'Please add ' + required[i][1] + '.';
      }
    }
    var email = val('email');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      $('email').focus();
      return 'That email address does not look right.';
    }
    if (!document.querySelectorAll('input[name="areas"]:checked').length) {
      return 'Please tell us which areas need countertops.';
    }
    return null;
  }

  /* ---- submit ------------------------------------------------------------ */

  function status(kind, html) {
    var box = $('bookingStatus');
    box.className = 'booking-status ' + kind;
    box.innerHTML = html;
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function deliver(payload) {
    // Same delivery path as the home-page quote form, in the same order.
    if (CFG.leadEndpoint) {
      return fetch(CFG.leadEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
    if (CFG.web3formsKey) {
      return fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(Object.assign({ access_key: CFG.web3formsKey }, payload))
      });
    }
    if (CFG.leadEmail) {
      return fetch('https://formsubmit.co/ajax/' + encodeURIComponent(CFG.leadEmail), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
    }
    return Promise.reject(new Error('no delivery configured'));
  }

  function onSubmit(ev) {
    ev.preventDefault();
    var problem = validate();
    if (problem) { status('err', problem); return; }

    var btn = $('bookingSubmit');
    btn.disabled = true;
    btn.textContent = 'Sending…';

    var text = summary();
    var payload = {
      _subject: 'Installation request — ' + val('name'),
      name: val('name'),
      phone: val('phone'),
      email: val('email'),
      material: val('material'),
      sqft: val('sqft'),
      message: text
    };

    deliver(payload).then(function (res) {
      if (res && res.ok === false) throw new Error('bad status');
      status('ok', '<strong>Request sent.</strong> Thanks, ' +
        val('name').split(' ')[0] + ' — we will confirm your free measure within one ' +
        'business day. If it is urgent, text ' +
        '<a href="tel:+19729890169">(972) 989-0169</a>.');
      $('bookingForm').reset();
      renderEstimate();
    }).catch(function () {
      // Never strand a lead: fall back to the customer's mail app.
      var to = CFG.leadEmail || 'angelmanuemartinez2@gmail.com';
      var href = 'mailto:' + encodeURIComponent(to) +
        '?subject=' + encodeURIComponent('Installation request — ' + val('name')) +
        '&body=' + encodeURIComponent(text);
      status('err', '<strong>That did not send.</strong> ' +
        '<a href="' + href + '">Open it in your email app instead</a>, or text ' +
        '<a href="tel:+19729890169">(972) 989-0169</a> and we will take the details.');
    }).then(function () {
      btn.disabled = false;
      btn.textContent = 'Send my booking request';
    });
  }

  /* ---- wire up ----------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    var form = $('bookingForm');
    if (!form) return;

    form.addEventListener('submit', onSubmit);
    form.addEventListener('input', renderEstimate);
    form.addEventListener('change', renderEstimate);

    [['demo', 'demoDetail'], ['backsplash', 'backsplashDetail']].forEach(function (pair) {
      var t = $(pair[0]), d = $(pair[1]);
      if (!t || !d) return;
      var sync = function () { d.hidden = !t.checked; };
      t.addEventListener('change', sync);
      sync();
    });

    var md = $('measure_date');
    if (md) {
      var d = new Date();
      d.setDate(d.getDate() + 1);
      md.min = d.toISOString().split('T')[0];
    }

    renderEstimate();
  });
})();
