/* ==========================================================================
   Mendez Stone — procedural stone
   --------------------------------------------------------------------------
   Every stone sample on the site is drawn, not photographed and not faked
   with a CSS gradient. Each material gets a painter that works the way the
   real stone does: granite is speckle, marble is vein, quartzite is banding
   under vein, quartz is fine and even.

   Seeded, so a given slab looks the same on every visit.
   ========================================================================== */

(function () {
  'use strict';

  /* Mulberry32 — small, fast, good enough for grain. */
  function rng(seed) {
    var t = seed >>> 0;
    return function () {
      t += 0x6d2b79f5;
      var r = t;
      r = Math.imul(r ^ (r >>> 15), r | 1);
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /* ---- painters -------------------------------------------------------- */

  function speckle(ctx, w, h, rand, opts) {
    var count = Math.round(w * h * opts.density);
    for (var i = 0; i < count; i++) {
      var x = rand() * w;
      var y = rand() * h;
      var r = opts.min + rand() * (opts.max - opts.min);
      var c = opts.colors[Math.floor(rand() * opts.colors.length)];
      ctx.fillStyle = c;
      ctx.globalAlpha = opts.alpha[0] + rand() * (opts.alpha[1] - opts.alpha[0]);
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * (0.6 + rand() * 0.8), rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* A vein wanders: it drifts, forks, and thins toward its ends. */
  function vein(ctx, w, h, rand, opts) {
    var steps = 48;
    var margin = h * 0.1;
    var x = -w * 0.1;
    var y = opts.start * h;
    var angle = (rand() - 0.5) * 0.5 + opts.tilt;
    var pts = [[x, y]];
    for (var i = 0; i < steps; i++) {
      angle += (rand() - 0.5) * opts.wander;
      // Steer away from the edges rather than reflecting off them — a hard
      // bounce puts a sharp V in the vein, which no real stone has.
      if (y < margin) { angle += (margin - y) / h * 0.9; }
      if (y > h - margin) { angle -= (y - (h - margin)) / h * 0.9; }
      angle = Math.max(-0.9, Math.min(0.9, angle));
      x += (w * 1.2) / steps;
      y += Math.tan(angle) * ((w * 1.2) / steps) * 0.5;
      y = Math.max(-h * 0.05, Math.min(h * 1.05, y));
      pts.push([x, y]);
    }

    function stroke(width, color, alpha, offset) {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1] + offset);
      for (var j = 1; j < pts.length - 1; j++) {
        var xc = (pts[j][0] + pts[j + 1][0]) / 2;
        var yc = (pts[j][1] + pts[j + 1][1]) / 2 + offset;
        ctx.quadraticCurveTo(pts[j][0], pts[j][1] + offset, xc, yc);
      }
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Soft halo, then the vein, then a hairline companion — how they read.
    stroke(opts.width * 5, opts.halo, 0.16, 0);
    stroke(opts.width, opts.color, opts.alpha, 0);
    stroke(opts.width * 0.4, opts.color, opts.alpha * 0.55, opts.width * 2.4);
  }

  function bands(ctx, w, h, rand, colors) {
    var y = 0;
    while (y < h) {
      var band = h * (0.04 + rand() * 0.13);
      ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
      ctx.globalAlpha = 0.35 + rand() * 0.3;
      ctx.save();
      ctx.translate(0, y);
      ctx.rotate(-0.045);
      ctx.fillRect(-w * 0.2, 0, w * 1.5, band);
      ctx.restore();
      y += band * (0.7 + rand() * 0.6);
    }
    ctx.globalAlpha = 1;
  }

  var STONES = {
    granite: function (ctx, w, h, rand) {
      ctx.fillStyle = '#4a4741';
      ctx.fillRect(0, 0, w, h);
      speckle(ctx, w, h, rand, {
        density: 0.22, min: 0.25, max: 0.9, alpha: [0.18, 0.6],
        colors: ['#2b2925', '#6e6a61', '#9a948a', '#1b1a17', '#847d70']
      });
      speckle(ctx, w, h, rand, {
        density: 0.03, min: 0.7, max: 1.8, alpha: [0.2, 0.55],
        colors: ['#b6afa1', '#20201d', '#7d7568']
      });
      speckle(ctx, w, h, rand, {
        density: 0.0025, min: 1.6, max: 3.4, alpha: [0.18, 0.4],
        colors: ['#c9c2b4', '#151513']
      });
    },

    quartz: function (ctx, w, h, rand) {
      ctx.fillStyle = '#eae6df';
      ctx.fillRect(0, 0, w, h);
      speckle(ctx, w, h, rand, {
        density: 0.035, min: 0.4, max: 1.5, alpha: [0.12, 0.4],
        colors: ['#ffffff', '#cdc7bc', '#b6afa3']
      });
      vein(ctx, w, h, rand, { start: 0.4, tilt: 0.05, wander: 0.16, width: 1.1, color: '#b9b2a6', halo: '#d6d0c5', alpha: 0.3 });
    },

    marble: function (ctx, w, h, rand) {
      ctx.fillStyle = '#f4f2ed';
      ctx.fillRect(0, 0, w, h);
      speckle(ctx, w, h, rand, {
        density: 0.012, min: 0.5, max: 1.6, alpha: [0.05, 0.16],
        colors: ['#cfc9bd', '#e2ded4']
      });
      vein(ctx, w, h, rand, { start: 0.28, tilt: 0.16, wander: 0.34, width: 2.6, color: '#8e8677', halo: '#c9c3b6', alpha: 0.5 });
      vein(ctx, w, h, rand, { start: 0.62, tilt: 0.1, wander: 0.3, width: 1.7, color: '#a49c8d', halo: '#cdc7ba', alpha: 0.45 });
      vein(ctx, w, h, rand, { start: 0.8, tilt: -0.08, wander: 0.22, width: 0.9, color: '#c9a227', halo: '#e0cf94', alpha: 0.28 });
    },

    quartzite: function (ctx, w, h, rand) {
      ctx.fillStyle = '#ded6c7';
      ctx.fillRect(0, 0, w, h);
      bands(ctx, w, h, rand, ['#cfc5b2', '#e7e0d2', '#c2b7a1']);
      speckle(ctx, w, h, rand, {
        density: 0.02, min: 0.4, max: 1.4, alpha: [0.08, 0.25],
        colors: ['#ffffff', '#a99e88']
      });
      vein(ctx, w, h, rand, { start: 0.45, tilt: 0.12, wander: 0.26, width: 1.6, color: '#9c8f76', halo: '#cbc0a9', alpha: 0.45 });
      vein(ctx, w, h, rand, { start: 0.7, tilt: 0.05, wander: 0.2, width: 1.1, color: '#c9a227', halo: '#e3d3a0', alpha: 0.35 });
    },

    porcelain: function (ctx, w, h, rand) {
      ctx.fillStyle = '#eceef0';
      ctx.fillRect(0, 0, w, h);
      var g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, 'rgba(255,255,255,.9)');
      g.addColorStop(0.55, 'rgba(222,227,231,.75)');
      g.addColorStop(1, 'rgba(240,242,244,.9)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      vein(ctx, w, h, rand, { start: 0.35, tilt: 0.1, wander: 0.2, width: 1.3, color: '#b7bfc6', halo: '#d8dee3', alpha: 0.4 });
      speckle(ctx, w, h, rand, {
        density: 0.004, min: 0.3, max: 1, alpha: [0.05, 0.14], colors: ['#ffffff', '#aab3ba']
      });
    },

    soapstone: function (ctx, w, h, rand) {
      ctx.fillStyle = '#3b423f';
      ctx.fillRect(0, 0, w, h);
      speckle(ctx, w, h, rand, {
        density: 0.02, min: 0.5, max: 2, alpha: [0.1, 0.3],
        colors: ['#2a2f2d', '#525a56', '#6b736e']
      });
      vein(ctx, w, h, rand, { start: 0.3, tilt: 0.14, wander: 0.3, width: 1.8, color: '#c4ccc7', halo: '#8d9691', alpha: 0.4 });
      vein(ctx, w, h, rand, { start: 0.68, tilt: 0.06, wander: 0.24, width: 1.1, color: '#aab3ae', halo: '#7d8681', alpha: 0.3 });
    },

  };

  /* ---- painting -------------------------------------------------------- */

  function paint(canvas) {
    var kind = canvas.dataset.stone;
    var painter = STONES[kind];
    if (!painter) return;

    var rect = canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(rect.width));
    var h = Math.max(1, Math.round(rect.height));
    if (!w || !h) return;
    if (canvas._paintedAt === w + 'x' + h) return;   // already correct size

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;

    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    painter(ctx, w, h, rng(hash(kind + (canvas.dataset.seed || ''))));
    canvas._paintedAt = w + 'x' + h;
  }

  function paintAll() {
    document.querySelectorAll('canvas[data-stone]').forEach(paint);
  }

  document.addEventListener('DOMContentLoaded', function () {
    paintAll();
    var pending;
    window.addEventListener('resize', function () {
      clearTimeout(pending);
      pending = setTimeout(paintAll, 180);
    });
  });

  // Bundled single-file builds swap pages in and out; repaint on demand.
  window.MS_TEXTURES = { paintAll: paintAll };
})();
