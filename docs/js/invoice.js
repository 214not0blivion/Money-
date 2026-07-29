/* ==========================================================================
   Mendez Stone — invoice builder
   --------------------------------------------------------------------------
   Follows the layout Luis already writes by hand: who it is from, the service
   address, the date, the pieces, the sinks, and a total. Nothing is uploaded —
   it renders locally and prints.

   The total is typed, not computed, because that is how the job actually works
   — the number is agreed with the customer, not derived. If line prices are
   filled in they are offered as a suggestion, never forced.
   ========================================================================== */

(function () {
  'use strict';

  var cfg = window.MENDEZ_STONE || {};

  // Who the invoice is from. Edit here to change it on every invoice.
  var FROM = {
    business: 'Mendez Stone',
    person: 'Luis Mendez',
    street: '8300 South Central Expressway',
    cityline: 'Dallas, TX 75241',
    phone: cfg.phone || '(972) 989-0169',
    email: cfg.email || ''
  };

  var SECTIONS = {
    pieces: { label: 'Piece', placeholder: 'Kitchen' },
    sinks: { label: 'Sink', placeholder: 'Kitchen' },
    extras: { label: 'Charge', placeholder: 'Tear-out & haul away' }
  };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(n) {
    return '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
  }

  /* ---- line item rows -------------------------------------------------- */

  function addRow(kind, data) {
    data = data || {};
    var spec = SECTIONS[kind];
    var host = $(kind);
    var row = document.createElement('div');
    row.className = 'line';
    row.innerHTML =
      '<div><label>' + spec.label + '</label>' +
        '<input type="text" class="li-desc" placeholder="' + esc(spec.placeholder) + '"></div>' +
      '<div><label>Qty</label>' +
        '<input type="number" class="li-qty" min="1" step="1" value="1"></div>' +
      '<div><label>Price</label>' +
        '<input type="number" class="li-amt" min="0" step="1" placeholder="—"></div>' +
      '<button type="button" class="drop" aria-label="Remove this line">×</button>';
    host.appendChild(row);

    row.querySelector('.li-desc').value = data.desc || '';
    if (data.qty) row.querySelector('.li-qty').value = data.qty;
    if (data.amt) row.querySelector('.li-amt').value = data.amt;

    row.querySelector('.drop').addEventListener('click', function () {
      row.remove();
      render();
    });
    return row;
  }

  function readRows(kind) {
    return Array.prototype.map.call($(kind).querySelectorAll('.line'), function (row) {
      return {
        desc: row.querySelector('.li-desc').value.trim(),
        qty: parseInt(row.querySelector('.li-qty').value, 10) || 1,
        amt: parseFloat(row.querySelector('.li-amt').value)
      };
    }).filter(function (r) { return r.desc; });
  }

  /* ---- rendering ------------------------------------------------------- */

  function fmtDate(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    if (!m) return '';
    return m[2] + '/' + m[3] + '/' + m[1];
  }

  function listBlock(title, rows) {
    if (!rows.length) return '';
    var body = rows.map(function (r, i) {
      return '<tr><td>' + (i + 1) + '. ' + esc(r.desc) + '</td>' +
             '<td class="qty">' + r.qty + 'x</td>' +
             '<td class="amt">' + (isNaN(r.amt) ? '' : money(r.amt)) + '</td></tr>';
    }).join('');
    return '<h2>' + esc(title) + '</h2><table><tbody>' + body + '</tbody></table>';
  }

  function lineSum(all) {
    return all.reduce(function (sum, r) {
      return sum + (isNaN(r.amt) ? 0 : r.amt * (r.qty || 1));
    }, 0);
  }

  function render() {
    var pieces = readRows('pieces');
    var sinks = readRows('sinks');
    var extras = readRows('extras');

    var svc = [
      $('svc_street').value.trim(),
      [$('svc_city').value.trim(), $('svc_state').value.trim()].filter(Boolean).join(', ') +
        ' ' + $('svc_zip').value.trim()
    ].filter(function (s) { return s && s.trim(); });

    var typed = parseFloat($('total').value);
    var summed = lineSum(pieces.concat(sinks, extras));
    var total = !isNaN(typed) ? typed : summed;
    var deposit = parseFloat($('deposit').value);
    var date = fmtDate($('inv_date').value);
    var invNo = $('inv_no').value.trim();
    var notes = $('notes').value.trim();

    // Offer the line sum, but never overwrite what was typed.
    var hint = $('total-hint');
    if (summed > 0 && isNaN(typed)) {
      hint.innerHTML = 'Line prices add up to <strong>' + money(summed) +
        '</strong> — leave this blank to use that, or type a different number.';
    } else if (summed > 0 && Math.abs(summed - typed) > 0.5) {
      hint.innerHTML = 'Line prices add up to ' + money(summed) +
        ', which does not match the total you typed. The total wins.';
    } else {
      hint.textContent = 'Type the total you are charging. Line prices are optional — ' +
        'if you fill them in, they add up here for you.';
    }

    var html =
      '<p class="inv-name">' + esc(FROM.business) + '</p>' +
      '<div class="inv-from">' +
        '<div>' + esc(FROM.person) + '</div>' +
        '<div>' + esc(FROM.street) + '</div>' +
        '<div>' + esc(FROM.cityline) + '</div>' +
        '<div>Phone: ' + esc(FROM.phone) + '</div>' +
        '<div>Email: ' + esc(FROM.email) + '</div>' +
      '</div>';

    html += '<div class="inv-meta">' +
      '<span>' + (invNo ? 'Invoice #' + esc(invNo) : '') + '</span>' +
      '<span>' + (date ? 'Date: ' + esc(date) : '') + '</span>' +
      '</div>';

    var cust = $('cust_name').value.trim();
    var phone = $('cust_phone').value.trim();
    html += '<h2>Service Address:</h2>';
    if (cust || svc.length || phone) {
      html += '<div>' +
        (cust ? '<div>' + esc(cust) + '</div>' : '') +
        svc.map(function (l) { return '<div>' + esc(l) + '</div>'; }).join('') +
        (phone ? '<div>' + esc(phone) + '</div>' : '') +
        '</div>';
    } else {
      html += '<p class="inv-empty">Add the customer and service address on the left.</p>';
    }

    html += listBlock('Installation & Fabrication Of Pieces:', pieces);
    html += listBlock('Sinks:', sinks);
    html += listBlock('Other Charges:', extras);

    if (!pieces.length && !sinks.length && !extras.length) {
      html += '<p class="inv-empty" style="margin-top:1rem">No line items yet.</p>';
    }

    html += '<div class="inv-total"><span>Total:</span><span>' + money(total) + '</span></div>';

    if (!isNaN(deposit) && deposit > 0) {
      html += '<div class="inv-sub"><span>Deposit paid</span><span>−' + money(deposit) + '</span></div>';
      html += '<div class="inv-sub" style="font-weight:700"><span>Balance due</span><span>' +
              money(Math.max(0, total - deposit)) + '</span></div>';
    }

    if (notes) {
      html += '<div class="inv-notes">' + esc(notes).replace(/\n/g, '<br>') + '</div>';
    }

    $('invoice').innerHTML = html;
    save();
  }

  /* ---- keep work across a reload --------------------------------------- */

  var KEY = 'mendezstone_invoice_draft';
  var FIELDS = ['cust_name', 'cust_phone', 'svc_street', 'svc_city', 'svc_state',
                'svc_zip', 'inv_date', 'inv_no', 'total', 'deposit', 'notes'];

  function save() {
    try {
      var d = { rows: {} };
      FIELDS.forEach(function (f) { d[f] = $(f).value; });
      Object.keys(SECTIONS).forEach(function (k) { d.rows[k] = readRows(k); });
      localStorage.setItem(KEY, JSON.stringify(d));
    } catch (e) { /* private mode — not fatal */ }
  }

  function restore() {
    var raw;
    try { raw = localStorage.getItem(KEY); } catch (e) { return false; }
    if (!raw) return false;
    try {
      var d = JSON.parse(raw);
      FIELDS.forEach(function (f) { if (d[f] != null) $(f).value = d[f]; });
      Object.keys(SECTIONS).forEach(function (k) {
        ($ (k)).innerHTML = '';
        (d.rows && d.rows[k] || []).forEach(function (r) { addRow(k, r); });
      });
      return true;
    } catch (e) { return false; }
  }

  /* ---- wire up --------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    if (!$('inv-form')) return;

    document.querySelectorAll('[data-add]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        addRow(btn.getAttribute('data-add'));
        render();
      });
    });

    if (!restore()) {
      $('inv_date').value = new Date().toISOString().split('T')[0];
      addRow('pieces', { desc: 'Kitchen', qty: 2 });
      addRow('sinks', { desc: 'Kitchen', qty: 1 });
    }

    document.addEventListener('input', render);
    document.addEventListener('change', render);

    $('print-btn').addEventListener('click', function () { window.print(); });

    $('reset-btn').addEventListener('click', function () {
      if (!confirm('Clear this invoice and start a new one?')) return;
      try { localStorage.removeItem(KEY); } catch (e) {}
      FIELDS.forEach(function (f) { $(f).value = ''; });
      $('svc_city').value = 'Dallas';
      $('svc_state').value = 'Texas';
      $('inv_date').value = new Date().toISOString().split('T')[0];
      Object.keys(SECTIONS).forEach(function (k) { $(k).innerHTML = ''; });
      addRow('pieces');
      addRow('sinks');
      render();
    });

    render();
  });
})();
