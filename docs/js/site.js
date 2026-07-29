/* ==========================================================================
   Mendez Stone — shared page behavior
   Fills contact details from site-config.js and marks the active nav link.
   ========================================================================== */

(function () {
  var cfg = window.MENDEZ_STONE || {};

  function fillText(attr, value) {
    if (value == null) return;
    document.querySelectorAll('[data-ms="' + attr + '"]').forEach(function (el) {
      el.textContent = value;
    });
  }

  function fillHref(attr, value) {
    if (value == null) return;
    document.querySelectorAll('[data-ms-href="' + attr + '"]').forEach(function (el) {
      el.setAttribute('href', value);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    fillText('phone', cfg.phone);
    fillText('email', cfg.email);
    fillText('address1', cfg.addressLine1);
    fillText('address2', cfg.addressLine2);
    fillText('serviceArea', cfg.serviceArea);
    fillHref('phone', cfg.phoneHref);
    fillHref('sms', cfg.smsHref);
    fillHref('booksy', cfg.booksyUrl);
    fillHref('email', cfg.email ? 'mailto:' + cfg.email : null);

    // Business hours table, if the page has one.
    var hoursBody = document.querySelector('[data-ms="hours"]');
    if (hoursBody && Array.isArray(cfg.hours)) {
      hoursBody.innerHTML = cfg.hours.map(function (row) {
        return '<tr><td><strong>' + row[0] + '</strong></td><td>' + row[1] + '</td></tr>';
      }).join('');
    }

    // Optional links (Google profile, review link). An element tagged with
    // data-ms-optional="<configKey>" links to that URL when it is set, and
    // removes itself entirely when it is not — so unconfigured links never
    // show up as dead ends.
    // Booksy links open in a new tab and hide themselves if unconfigured.
    document.querySelectorAll('[data-ms-href="booksy"]').forEach(function (el) {
      if (!cfg.booksyUrl) { el.remove(); return; }
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener');
    });

    document.querySelectorAll('[data-ms-optional]').forEach(function (el) {
      var url = cfg[el.getAttribute('data-ms-optional')];
      if (!url) { el.remove(); return; }
      var anchor = el.tagName === 'A' ? el : el.querySelector('a');
      if (anchor) {
        anchor.setAttribute('href', url);
        anchor.setAttribute('target', '_blank');
        anchor.setAttribute('rel', 'noopener');
      }
    });

    // Current year in the footer.
    document.querySelectorAll('[data-ms="year"]').forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });

    // Highlight the nav link for the current page.
    var here = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach(function (a) {
      var target = a.getAttribute('href');
      if (target === here) a.classList.add('active');
    });
  });
})();
