/* Дизайн №1 «Неон»: нейросеть за телефоном (вспыхивает, когда бот думает),
   свет под курсором, магнитные кнопки, наклон телефона, отклик пульта и бюджета. */
(function () {
  'use strict';
  window.ThemeFX = window.ThemeFX || {};

  var BLUE = [56, 189, 255], LIME = [198, 255, 58];

  function sprite(c) {
    var s = document.createElement('canvas'); s.width = s.height = 64;
    var g = s.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(' + c + ',1)'); gr.addColorStop(0.22, 'rgba(' + c + ',.55)'); gr.addColorStop(1, 'rgba(' + c + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return s;
  }
  function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
  function backOut(x) { var c = 1.6; x -= 1; return 1 + (c + 1) * x * x * x + c * x * x; }

  /* ---------- Нейросеть вокруг телефона ---------- */
  function Net(slot, hero, stage, phone, reduced) {
    // Сцена режется на 4 холста вокруг телефона: под экраном переписки декора нет вовсе
    var tiles = [0, 1, 2, 3].map(function () { var c = document.createElement('canvas'); c.className = 'nfx-net'; slot.appendChild(c); return { cv: c, g: c.getContext('2d'), x: 0, y: 0, w: 0, h: 0 }; });
    var g = null, dpr = 1, OX = 0, OY = 0, side = true;
    var spB = sprite(BLUE.join(',')), spL = sprite(LIME.join(','));
    var W = 0, H = 0, nodes = [], edges = [], adj = [], sigs = [], waves = [], P = { x: 0, y: 0, w: 0, h: 0 };
    var E = 0.22, target = 0.22, born = 0, last = 0, raf = 0, seen = true, mouse = { x: -1e4, y: -1e4, on: false };
    var spawnAcc = 0;

    function placeTiles() {
      var px = Math.max(0, Math.round(P.x)), py = Math.max(0, Math.round(P.y));
      var pr = Math.min(W, Math.round(P.x + P.w)), pb = Math.min(H, Math.round(P.y + P.h));
      var rects = [[0, 0, px, H], [pr, 0, W - pr, H], [px, 0, pr - px, py], [px, pb, pr - px, H - pb]];
      tiles.forEach(function (t, i) {
        var r = rects[i]; t.x = r[0]; t.y = r[1]; t.w = Math.max(0, r[2]); t.h = Math.max(0, r[3]);
        var on = t.w > 1 && t.h > 1;
        t.cv.style.display = on ? 'block' : 'none';
        if (!on) return;
        t.cv.style.left = (OX + t.x) + 'px'; t.cv.style.top = (OY + t.y) + 'px';
        t.cv.style.width = t.w + 'px'; t.cv.style.height = t.h + 'px';
        t.cv.width = Math.round(t.w * dpr); t.cv.height = Math.round(t.h * dpr);
      });
    }

    function layout() {
      var hr = hero.getBoundingClientRect(), sr = stage.getBoundingClientRect(), pr = phone.getBoundingClientRect();
      var tx = hero.querySelector('.hero__text').getBoundingClientRect();
      var fx = hero.querySelector('.hero__facts').getBoundingClientRect();
      var L, T, R, B;
      side = sr.left >= tx.right - 4;
      if (side) { // телефон справа от текста
        L = Math.max(tx.right, fx.right) - hr.left + 28; T = 0; R = hr.width; B = hr.height;
      } else { // телефон под текстом
        var ac = hero.querySelector('.hero__actions').getBoundingClientRect();
        L = 0; R = hr.width;
        T = Math.max(ac.bottom - hr.top + 18, sr.top - hr.top - 70);
        B = Math.min(fx.top - hr.top - 18, sr.bottom - hr.top + 40);
      }
      W = Math.max(10, Math.round(R - L)); H = Math.max(10, Math.round(B - T));
      OX = Math.round(L); OY = Math.round(T);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      P ={ x: pr.left - hr.left - OX, y: pr.top - hr.top - OY, w: pr.width, h: pr.height };
      placeTiles();
      build();
    }

    function build() {
      var r = rng(20261027), r2 = rng(777), n = Math.round(Math.max(26, Math.min(96, W * H / 10500)));
      var pcx = P.x + P.w / 2, pcy = P.y + P.h / 2, maxD = Math.hypot(Math.max(pcx, W - pcx), Math.max(pcy, H - pcy));
      nodes = []; edges = []; sigs = []; waves = [];
      for (var k = 0; k < n * 40 && nodes.length < n; k++) {
        var x = 8 + r() * (W - 16), y = 8 + r() * (H - 16);
        if (x > P.x - 18 && x < P.x + P.w + 18 && y > P.y - 18 && y < P.y + P.h + 18) continue;
        var d = Math.hypot(x - pcx, y - pcy);
        if (r() > 1.15 - d / maxD) continue;
        var ok = true;
        for (var j = 0; j < nodes.length; j++) { if (Math.hypot(nodes[j].hx - x, nodes[j].hy - y) < 38) { ok = false; break; } }
        if (!ok) continue;
        nodes.push({ hx: x, hy: y, sx: r2() * W, sy: r2() * H, x: x, y: y, ph: r() * 6.28, sp: 0.4 + r() * 0.7, rad: 1.2 + r() * 1.6, f: 0, c: 0, port: false, ord: nodes.length });
      }
      // входы в телефон: точки на его рамке
      var ports = [];
      [0.16, 0.34, 0.52, 0.7, 0.86].forEach(function (f) { ports.push([P.x - 2, P.y + P.h * f]); ports.push([P.x + P.w + 2, P.y + P.h * f]); });
      [0.3, 0.7].forEach(function (f) { ports.push([P.x + P.w * f, P.y - 2]); ports.push([P.x + P.w * f, P.y + P.h + 2]); });
      var firstPort = nodes.length;
      ports.forEach(function (p) { nodes.push({ hx: p[0], hy: p[1], sx: p[0], sy: p[1], x: p[0], y: p[1], ph: 0, sp: 0, rad: 1.6, f: 0, c: 0, port: true, ord: 0 }); });
      adj = nodes.map(function () { return []; });
      var seenE = {};
      function link(a, b) { var key = a < b ? a + '_' + b : b + '_' + a; if (seenE[key]) return; seenE[key] = 1; edges.push([a, b]); adj[a].push(b); adj[b].push(a); }
      for (var i = 0; i < firstPort; i++) {
        var best = [];
        for (var q = 0; q < firstPort; q++) {
          if (q === i) continue;
          var dd = Math.hypot(nodes[i].hx - nodes[q].hx, nodes[i].hy - nodes[q].hy);
          if (dd < 175) best.push([dd, q]);
        }
        best.sort(function (a, b) { return a[0] - b[0]; });
        best.slice(0, 3).forEach(function (b) { link(i, b[1]); });
      }
      for (var p = firstPort; p < nodes.length; p++) {
        var near = [];
        for (var q2 = 0; q2 < firstPort; q2++) near.push([Math.hypot(nodes[p].hx - nodes[q2].hx, nodes[p].hy - nodes[q2].hy), q2]);
        near.sort(function (a, b) { return a[0] - b[0]; });
        near.slice(0, 2).forEach(function (b) { if (b[0] < 240) link(p, b[1]); });
      }
      if (reduced) { born = 1; draw(); }
    }

    function distP(i) { var nd = nodes[i]; return Math.hypot(nd.hx - (P.x + P.w / 2), nd.hy - (P.y + P.h / 2)); }
    function nextHop(at, from, mode) {
      var opts = adj[at].filter(function (b) { return b !== from; });
      if (!opts.length) return -1;
      if (mode === 'in') { opts.sort(function (a, b) { return distP(a) - distP(b); }); return Math.random() < 0.75 ? opts[0] : opts[Math.floor(Math.random() * opts.length)]; }
      if (mode === 'out') { opts.sort(function (a, b) { return distP(b) - distP(a); }); return Math.random() < 0.75 ? opts[0] : opts[Math.floor(Math.random() * opts.length)]; }
      return opts[Math.floor(Math.random() * opts.length)];
    }
    function spawn(mode, fromPort) {
      if (sigs.length > 70 || !edges.length) return;
      var a;
      if (fromPort) { var ps = []; nodes.forEach(function (nd, i) { if (nd.port && adj[i].length) ps.push(i); }); if (!ps.length) return; a = ps[Math.floor(Math.random() * ps.length)]; }
      else { do { a = Math.floor(Math.random() * nodes.length); } while (nodes[a].port); }
      var b = nextHop(a, -1, mode); if (b < 0) return;
      sigs.push({ a: a, b: b, t: 0, mode: mode, hops: 0, lime: mode !== 'walk' });
    }
    function burst(fromBot) {
      if (fromBot) { waves.push({ r: 0 }); for (var i = 0; i < 10; i++) spawn('out', true); }
      else { for (var j = 0; j < 12; j++) spawn('in', false); }
    }
    function setThinking(on) {
      target = on ? 1 : 0.22;
      if (on) for (var i = 0; i < 8; i++) spawn('in', false);
    }

    function update(dt, t) {
      E += (target - E) * Math.min(1, dt * 2.6);
      if (born < 1) born = Math.min(1, born + dt / 1.7);
      spawnAcc += dt * (0.9 + E * 13);
      while (spawnAcc > 1) { spawnAcc -= 1; spawn(E > 0.6 ? 'in' : 'walk', false); }
      var pcx = P.x + P.w / 2, pcy = P.y + P.h / 2;
      nodes.forEach(function (nd) {
        if (nd.port) { nd.x = nd.hx; nd.y = nd.hy; nd.f = Math.max(0, nd.f - dt * 2); return; }
        var a = Math.max(0, Math.min(1, (born - nd.ord / nodes.length * 0.45) / 0.55));
        var e = a < 1 ? backOut(a) : 1;
        var hx = nd.hx + Math.sin(t * nd.sp + nd.ph) * (3 + E * 3), hy = nd.hy + Math.cos(t * nd.sp * 0.8 + nd.ph) * (3 + E * 3);
        if (mouse.on) {
          var mdx = mouse.x - hx, mdy = mouse.y - hy, md = Math.hypot(mdx, mdy);
          if (md < 150) { var pull = (1 - md / 150) * 14; hx += mdx / (md || 1) * pull; hy += mdy / (md || 1) * pull; nd.f = Math.max(nd.f, (1 - md / 150) * 0.6); }
        }
        nd.x = nd.sx + (hx - nd.sx) * e; nd.y = nd.sy + (hy - nd.sy) * e; nd.al = a;
        nd.f = Math.max(0, nd.f - dt * 1.6);
      });
      var speed = 110 + 300 * E;
      for (var i = sigs.length - 1; i >= 0; i--) {
        var s = sigs[i], A = nodes[s.a], B = nodes[s.b], len = Math.hypot(B.x - A.x, B.y - A.y) || 1;
        s.t += dt * speed / len;
        if (s.t >= 1) {
          B.f = 1; B.c = s.lime ? 1 : 0;
          s.hops++;
          var nx = (B.port && s.mode === 'in') || s.hops > 9 ? -1 : nextHop(s.b, s.a, s.mode);
          if (nx < 0) { sigs.splice(i, 1); continue; }
          s.a = s.b; s.b = nx; s.t = 0;
        }
      }
      var maxR = Math.hypot(Math.max(pcx, W - pcx), Math.max(pcy, H - pcy));
      for (var w = waves.length - 1; w >= 0; w--) {
        var wv = waves[w]; wv.r += dt * 420;
        nodes.forEach(function (nd) { var d = Math.hypot(nd.x - pcx, nd.y - pcy); if (Math.abs(d - wv.r) < 14) { nd.f = Math.max(nd.f, 0.9); nd.c = 1; } });
        if (wv.r > maxR) waves.splice(w, 1);
      }
    }

    function draw() {
      tiles.forEach(function (t) {
        if (t.w <= 1 || t.h <= 1) return;
        g = t.g;
        g.setTransform(dpr, 0, 0, dpr, -t.x * dpr, -t.y * dpr);
        g.clearRect(t.x, t.y, t.w, t.h);
        scene();
        // мягкий край сцены там, где она не упирается в край экрана
        g.globalCompositeOperation = 'destination-out';
        var fd;
        if (side) {
          fd = g.createLinearGradient(0, 0, 180, 0); fd.addColorStop(0, 'rgba(0,0,0,1)'); fd.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = fd; g.fillRect(0, 0, 180, H);
        } else {
          fd = g.createLinearGradient(0, 0, 0, 70); fd.addColorStop(0, 'rgba(0,0,0,1)'); fd.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = fd; g.fillRect(0, 0, W, 70);
          fd = g.createLinearGradient(0, H - 70, 0, H); fd.addColorStop(0, 'rgba(0,0,0,0)'); fd.addColorStop(1, 'rgba(0,0,0,1)');
          g.fillStyle = fd; g.fillRect(0, H - 70, W, 70);
        }
        g.globalCompositeOperation = 'source-over';
      });
    }

    function scene() {
      g.globalCompositeOperation = 'lighter';
      var eIn = born * born, pcx = P.x + P.w / 2, pcy = P.y + P.h / 2;
      // связи
      g.lineWidth = 1;
      g.strokeStyle = 'rgba(56,189,255,' + ((0.06 + 0.2 * E) * eIn).toFixed(3) + ')';
      g.beginPath();
      edges.forEach(function (e) { var a = nodes[e[0]], b = nodes[e[1]]; g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); });
      g.stroke();
      // курсор как ещё один узел
      if (mouse.on && born >= 1) {
        var near = nodes.filter(function (nd) { return !nd.port && Math.hypot(nd.x - mouse.x, nd.y - mouse.y) < 170; }).slice(0, 4);
        g.strokeStyle = 'rgba(198,255,58,.28)'; g.beginPath();
        near.forEach(function (nd) { g.moveTo(mouse.x, mouse.y); g.lineTo(nd.x, nd.y); }); g.stroke();
        g.drawImage(spL, mouse.x - 12, mouse.y - 12, 24, 24);
      }
      // волна от ответа бота
      waves.forEach(function (wv) {
        var a = Math.max(0, 0.34 * (1 - wv.r / (Math.max(W, H) * 0.9)));
        g.strokeStyle = 'rgba(198,255,58,' + a.toFixed(3) + ')'; g.lineWidth = 2;
        g.beginPath(); g.ellipse(pcx, pcy, wv.r * 0.8, wv.r, 0, 0, 6.2832); g.stroke();
      });
      g.lineWidth = 1;
      // сигналы
      sigs.forEach(function (s) {
        var A = nodes[s.a], B = nodes[s.b], x = A.x + (B.x - A.x) * s.t, y = A.y + (B.y - A.y) * s.t;
        var t0 = Math.max(0, s.t - 0.35), x0 = A.x + (B.x - A.x) * t0, y0 = A.y + (B.y - A.y) * t0;
        var c = s.lime ? LIME : BLUE;
        g.strokeStyle = 'rgba(' + c.join(',') + ',.55)'; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x, y); g.stroke();
        g.drawImage(s.lime ? spL : spB, x - 9, y - 9, 18, 18);
      });
      g.lineWidth = 1;
      // узлы
      nodes.forEach(function (nd) {
        var al = nd.port ? eIn : (nd.al === undefined ? 1 : nd.al);
        if (al <= 0) return;
        var glow = nd.f + E * 0.25;
        if (glow > 0.08) { var sz = 10 + 30 * Math.min(1, glow); g.globalAlpha = Math.min(1, glow) * al; g.drawImage(nd.c ? spL : spB, nd.x - sz / 2, nd.y - sz / 2, sz, sz); g.globalAlpha = 1; }
        g.fillStyle = nd.f > 0.4 && nd.c ? 'rgba(220,255,150,' + al + ')' : 'rgba(150,215,255,' + ((0.5 + 0.5 * E) * al).toFixed(3) + ')';
        g.beginPath(); g.arc(nd.x, nd.y, nd.rad * (1 + nd.f * 0.7), 0, 6.2832); g.fill();
      });
      g.globalCompositeOperation = 'source-over';
    }

    function frame(now) {
      raf = 0;
      if (!seen || document.hidden) return;
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now;
      update(dt, now / 1000); draw();
      raf = requestAnimationFrame(frame);
    }
    function wake() { if (!raf && seen && !document.hidden && !reduced) { last = 0; raf = requestAnimationFrame(frame); } }

    layout();
    var ro = window.ResizeObserver ? new ResizeObserver(function () { layout(); }) : null;
    if (ro) ro.observe(hero);
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (en) { seen = en[0].isIntersecting; wake(); }) : null;
    if (io) io.observe(hero);
    function vis() { wake(); }
    document.addEventListener('visibilitychange', vis);

    // бот думает: статус в шапке переписки получает is-typing
    var status = phone.querySelector('.tg__status'), feed = phone.querySelector('.tg__feed'), typing = false;
    var mo = new MutationObserver(function (list) {
      var now = !!(status && status.classList.contains('is-typing'));
      if (now !== typing) { typing = now; setThinking(now); }
      list.forEach(function (m) {
        Array.prototype.forEach.call(m.addedNodes || [], function (nd) {
          if (nd.nodeType === 1 && nd.classList.contains('tg__msg') && !nd.classList.contains('tg__typing-msg')) burst(nd.classList.contains('tg__msg--bot'));
        });
      });
    });
    if (status) mo.observe(status, { attributes: true, attributeFilter: ['class'] });
    if (feed) mo.observe(feed, { childList: true });
    wake();

    return {
      pointer: function (cx, cy) {
        var r = hero.getBoundingClientRect();
        var x = cx - r.left - OX, y = cy - r.top - OY;
        mouse.on = x > -40 && y > -40 && x < W + 40 && y < H + 40; mouse.x = x; mouse.y = y;
      },
      leave: function () { mouse.on = false; },
      stop: function () {
        if (raf) cancelAnimationFrame(raf); raf = 0;
        if (ro) ro.disconnect(); if (io) io.disconnect(); mo.disconnect();
        document.removeEventListener('visibilitychange', vis);
        tiles.forEach(function (t) { t.cv.remove(); });
      }
    };
  }

  window.ThemeFX['neon'] = {
    mount: function (ctx) {
      var doc = document, offs = [], reduced = !!(ctx && ctx.reduced);
      var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      function on(el, ev, fn, opt) { el.addEventListener(ev, fn, opt); offs.push(function () { el.removeEventListener(ev, fn, opt); }); }

      // 1. Свет под курсором
      var bg = doc.querySelector('[data-slot="page-bg"]'), spot = null, sRaf = 0;
      var sx = innerWidth * 0.7, sy = innerHeight * 0.3, tx = sx, ty = sy;
      function stepSpot() {
        sx += (tx - sx) * 0.14; sy += (ty - sy) * 0.14;
        spot.style.transform = 'translate3d(' + (sx - 450).toFixed(1) + 'px,' + (sy - 450).toFixed(1) + 'px,0)';
        sRaf = Math.abs(tx - sx) + Math.abs(ty - sy) > 0.6 ? requestAnimationFrame(stepSpot) : 0;
      }
      if (bg && fine && !reduced) { spot = doc.createElement('div'); spot.className = 'nfx-spot'; bg.appendChild(spot); }

      // 2. Нейросеть за телефоном героя
      var hero = doc.querySelector('.hero'), slot = doc.querySelector('[data-slot="hero-art"]');
      var stage = doc.querySelector('.hero__stage'), phone = stage && stage.querySelector('.phone');
      var net = slot && hero && phone ? Net(slot, hero, stage, phone, reduced) : null;

      // 3. Наклон телефона за курсором
      var tiltOn = !!(phone && fine && !reduced);

      on(window, 'pointermove', function (e) {
        if (spot) { tx = e.clientX; ty = e.clientY; spot.classList.add('is-on'); if (!sRaf) sRaf = requestAnimationFrame(stepSpot); }
        if (net) net.pointer(e.clientX, e.clientY);
        if (tiltOn) {
          var r = stage.getBoundingClientRect();
          if (e.clientY > r.top - 200 && e.clientY < r.bottom + 100) {
            var ry = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / 600)) * 7;
            var rx = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / 500)) * -5;
            phone.style.transform = 'perspective(1400px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
          } else phone.style.transform = '';
        }
      }, { passive: true });
      on(doc.documentElement, 'pointerleave', function () { if (spot) spot.classList.remove('is-on'); if (net) net.leave(); if (tiltOn) phone.style.transform = ''; });

      // 4. Магнитные кнопки
      var mags = fine && !reduced ? Array.prototype.slice.call(doc.querySelectorAll('.hero__actions .btn, .top__cta, .bots__actions .btn, .contact__cta')) : [];
      mags.forEach(function (b) {
        on(b, 'pointermove', function (e) {
          var r = b.getBoundingClientRect();
          var dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
          b.style.setProperty('--mx', (dx * 8).toFixed(1) + 'px'); b.style.setProperty('--my', (dy * 6).toFixed(1) + 'px');
        });
        on(b, 'pointerleave', function () { b.style.removeProperty('--mx'); b.style.removeProperty('--my'); });
      });

      // 5. Пульт: вспышка рамки телефона при смене бота
      var list = doc.querySelector('.bots__list'), demoFrame = doc.querySelector('#bots-phone .phone__frame'), flashT = 0;
      if (list && demoFrame && !reduced) {
        on(list, 'click', function (e) {
          if (!e.target.closest('.bot__btn')) return;
          demoFrame.classList.remove('nfx-switch'); void demoFrame.offsetWidth; demoFrame.classList.add('nfx-switch');
          clearTimeout(flashT); flashT = setTimeout(function () { demoFrame.classList.remove('nfx-switch'); }, 800);
        });
      }

      // 6. Бюджет: цифра проявляется заново при каждом шаге
      var range = doc.querySelector('.budget__range'), val = doc.querySelector('.budget__value');
      if (range && val && !reduced) {
        on(range, 'input', function () { val.classList.remove('nfx-pop'); void val.offsetWidth; val.classList.add('nfx-pop'); });
        doc.querySelectorAll('.budget__scale li').forEach(function (li) { on(li, 'click', function () { val.classList.remove('nfx-pop'); void val.offsetWidth; val.classList.add('nfx-pop'); }); });
      }

      return function () {
        offs.forEach(function (f) { f(); }); offs = [];
        if (sRaf) cancelAnimationFrame(sRaf);
        if (spot) spot.remove();
        if (net) net.stop();
        if (phone) phone.style.transform = '';
        mags.forEach(function (b) { b.style.removeProperty('--mx'); b.style.removeProperty('--my'); });
        clearTimeout(flashT); if (demoFrame) demoFrame.classList.remove('nfx-switch');
        if (val) val.classList.remove('nfx-pop');
      };
    }
  };
})();
