/* ===========================================================================
   Mendez Stone — front-end behavior
   - wires Booksy buttons
   - validates the lead form
   - shows an instant AI-style reply (local demo, or from your lead_agent.py)
   =========================================================================== */
(function () {
  "use strict";
  var CFG = window.MENDEZ_CONFIG || {};

  // footer year
  var yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();

  // ---- Booksy buttons -------------------------------------------------------
  var booksy = (CFG.booksyUrl || "").trim();
  document.querySelectorAll("[data-booksy]").forEach(function (a) {
    if (booksy && booksy !== "https://booksy.com/") {
      a.setAttribute("href", booksy);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
    } else {
      // No real link yet → send them to the quote form so no lead is lost.
      a.setAttribute("href", "#quote");
    }
  });

  // ---- Lead form ------------------------------------------------------------
  var form = document.getElementById("leadForm");
  if (!form) return;
  var replyBox = document.getElementById("aiReply");
  var replyBody = document.getElementById("aiReplyBody");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate(form)) return;

    var data = collect(form);
    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = "Sending…";

    showReply('<span class="typing">Mendez Stone Assistant is typing…</span>');

    submitLead(data)
      .then(function (msg) { showReply(msg); })
      .catch(function () { showReply(localReply(data)); })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = "Send & get instant pricing";
      });
  });

  // ---- helpers --------------------------------------------------------------
  function collect(f) {
    return {
      name: val(f, "name"),
      phone: val(f, "phone"),
      email: val(f, "email"),
      material: val(f, "material"),
      sqft: val(f, "sqft"),
      project: val(f, "project"),
      source: "website",
      submitted_at: new Date().toISOString()
    };
  }
  function val(f, n) { return (f.elements[n] && f.elements[n].value || "").trim(); }

  function validate(f) {
    var ok = true;
    ["name", "phone", "material"].forEach(function (n) {
      var el = f.elements[n];
      if (!el) return;
      if (!el.value.trim()) { el.classList.add("invalid"); ok = false; }
      else el.classList.remove("invalid");
    });
    return ok;
  }

  function submitLead(data) {
    var ep = (CFG.leadEndpoint || "").trim();
    if (!ep) {
      // DEMO mode — no backend. Resolve with a locally generated reply.
      return new Promise(function (res) { setTimeout(function () { res(localReply(data)); }, 900); });
    }
    return fetch(ep, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(function (r) {
      if (!r.ok) throw new Error("bad status");
      return r.json();
    }).then(function (j) { return j.reply || localReply(data); });
  }

  // Browser-side estimate so the page is fully functional with zero backend.
  function localReply(d) {
    var pricing = (CFG.pricing || {})[d.material] || { low: 45, high: 120 };
    var sqft = parseFloat(d.sqft);
    var first = (d.name || "there").split(" ")[0];
    var range;
    if (sqft && sqft > 0) {
      var min = CFG.minJob || 0;
      var lo = Math.round(sqft * pricing.low);
      var hi = Math.round(sqft * pricing.high);
      if (hi < min) {
        range = "around $" + min.toLocaleString() + " (minimum job)";
      } else {
        lo = Math.max(min, lo);
        range = "$" + lo.toLocaleString() + "–$" + hi.toLocaleString();
      }
    } else {
      range = "$" + pricing.low + "–$" + pricing.high + " / sq ft installed";
    }
    return [
      "<p>Thanks, <strong>" + esc(first) + "</strong>! Here's your instant estimate for ",
      "<strong>" + esc(d.material || "stone") + "</strong> countertops:</p>",
      '<p class="est">' + range + "</p>",
      "<p>This is a ballpark — your exact written price comes after a free laser ",
      "measure. A Mendez Stone installer will reach out to <strong>" + esc(d.phone) + "</strong> ",
      "today to confirm a time. ",
      (booksy && booksy !== "https://booksy.com/")
        ? '<a href="' + booksy + '" target="_blank" rel="noopener">Or book instantly on Booksy →</a>'
        : "",
      "</p>"
    ].join("");
  }

  function showReply(html) {
    if (!replyBox) return;
    replyBox.hidden = false;
    replyBody.innerHTML = html;
    replyBox.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
})();
