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
    fillHref('email', cfg.email ? 'mailto:' + cfg.email : null);

    // Business hours table, if the page has one.
    var hoursBody = document.querySelector('[data-ms="hours"]');
    if (hoursBody && Array.isArray(cfg.hours)) {
      hoursBody.innerHTML = cfg.hours.map(function (row) {
        return '<tr><td><strong>' + row[0] + '</strong></td><td>' + row[1] + '</td></tr>';
      }).join('');
    }

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
