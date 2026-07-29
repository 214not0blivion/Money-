/* ==========================================================================
   Mendez Stone — live shop status
   ==========================================================================
   Reads status.json and shows customers whether we can pick up right now.

   The whole design assumes one thing: a status that is wrong is worse than no
   status at all. So it fails safe in three ways.

   1. AUTO-EXPIRY. A "busy" status carries an `until` time. Once that time
      passes, the bar flips back to available on its own. Forgetting to clear
      it costs nothing.
   2. STALENESS. If status.json has not been touched in STALE_DAYS, the bar
      stops making claims and shows a neutral "call or text anytime" instead
      of insisting we are available.
   3. SILENCE ON FAILURE. If the file is missing or unreachable, the bar hides
      itself completely rather than showing a broken or misleading state.
   ========================================================================== */

(function () {
  var STALE_DAYS = 4;
  var REFRESH_MS = 5 * 60 * 1000;  // re-check every five minutes on open tabs

  var STATES = {
    available: {
      cls: 'is-available',
      dot: '●',
      title: 'Available right now',
      body: 'Call or text and we will pick up.'
    },
    busy: {
      cls: 'is-busy',
      dot: '●',
      title: 'On a job right now',
      body: 'Text is the surest way to reach us — we reply as soon as we are off site.'
    },
    away: {
      cls: 'is-away',
      dot: '●',
      title: 'Out for now',
      body: 'Send a text or book online and we will get back to you.'
    },
    unknown: {
      cls: 'is-unknown',
      dot: '●',
      title: 'Call or text anytime',
      body: 'We answer as soon as we are free.'
    }
  };

  function parseDate(value) {
    if (!value) return null;
    var d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  function formatTime(date) {
    try {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  }

  // Decide what to show, given the file contents and the current time.
  // Exposed for testing; the logic here is the whole feature.
  function resolve(data, now) {
    now = now || new Date();
    if (!data || typeof data !== 'object') return { key: 'unknown' };

    var updated = parseDate(data.updated);
    if (updated) {
      var ageDays = (now - updated) / 86400000;
      if (ageDays > STALE_DAYS) return { key: 'unknown', stale: true };
    }

    var key = String(data.state || '').toLowerCase();
    if (!STATES[key]) return { key: 'unknown' };

    // A busy/away window that has already ended means we are free again.
    var until = parseDate(data.until);
    if (key !== 'available' && until && until <= now) {
      return { key: 'available', expired: true };
    }

    return {
      key: key,
      message: (data.message || '').trim(),
      until: (key !== 'available' && until && until > now) ? until : null
    };
  }

  function render(el, resolved) {
    var spec = STATES[resolved.key] || STATES.unknown;

    var headline = spec.title;
    if (resolved.until) {
      headline += ' — back around ' + formatTime(resolved.until);
    }

    var detail = resolved.message || spec.body;

    el.className = 'status-bar ' + spec.cls;
    el.innerHTML =
      '<div class="container status-inner">' +
        '<span class="status-dot" aria-hidden="true">' + spec.dot + '</span>' +
        '<span class="status-text">' +
          '<strong>' + headline + '</strong>' +
          '<span class="status-detail">' + escapeHtml(detail) + '</span>' +
        '</span>' +
      '</div>';
    el.hidden = false;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function load(el) {
    // Cache-bust so a status change is visible immediately rather than after
    // the host's cache expires.
    fetch('status.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('status ' + res.status);
        return res.json();
      })
      .then(function (data) {
        render(el, resolve(data, new Date()));
      })
      .catch(function () {
        // Missing file, offline, or opened via file:// — say nothing.
        el.hidden = true;
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var el = document.getElementById('shop-status');
    if (!el) return;
    load(el);
    setInterval(function () { load(el); }, REFRESH_MS);
  });

  // Expose for the status editor page and for tests.
  window.MS_STATUS = { resolve: resolve, STATES: STATES, STALE_DAYS: STALE_DAYS };
})();
