/* Дизайн 4 «Люкс»: декоративный слой.
   Зерно плёнки, заголовки маской по строкам, жалюзи на снимках работ, кольцо-курсор у кнопок,
   имя в подвале по ширине страницы, мягкий отклик суммы бюджета. Всё убирается в cleanup. */
(function () {
  'use strict';
  window.ThemeFX = window.ThemeFX || {};

  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* Зерно: маленький квадрат шума, рисуем один раз и кешируем */
  var grainURL = null;
  function grain() {
    if (grainURL) return grainURL;
    var n = 180, c = document.createElement('canvas'); c.width = c.height = n;
    var g = c.getContext('2d'), img = g.createImageData(n, n), d = img.data;
    for (var i = 0; i < d.length; i += 4) { var v = Math.random() * 255 | 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = Math.random() < .5 ? 0 : 90 + (Math.random() * 120 | 0); }
    g.putImageData(img, 0, 0);
    try { grainURL = c.toDataURL('image/png'); } catch (x) { grainURL = ''; }
    return grainURL;
  }

  /* Разбить заголовок на строки по факту вёрстки. Возвращает исходный HTML для восстановления. */
  function splitLines(el) {
    var orig = el.innerHTML, text = el.textContent.replace(/\s+/g, ' ').trim();
    var parts = [];
    text.split(' ').forEach(function (w) {
      var bits = w.split(/(?<=-)/);
      bits.forEach(function (b, k) { parts.push({ t: b, sp: k === bits.length - 1 }); });
    });
    el.innerHTML = parts.map(function (p) { return '<span class="lx-wd">' + esc(p.t) + '</span>' + (p.sp ? ' ' : ''); }).join('');
    var lines = [], top = null;
    $$('.lx-wd', el).forEach(function (s, i) {
      var t = s.offsetTop;
      if (top === null || Math.abs(t - top) > 6) { lines.push([]); top = t; }
      lines[lines.length - 1].push(parts[i]);
    });
    el.innerHTML = lines.map(function (ln, i) {
      return '<span class="lx-ln"><span class="lx-li" style="--l:' + i + '">' + ln.map(function (p, k) { return esc(p.t) + (p.sp && k < ln.length - 1 ? ' ' : ''); }).join('') + '</span></span>';
    }).join('');
    return orig;
  }

  window.ThemeFX.lux = {
    mount: function (ctx) {
      var reduced = ctx && ctx.reduced;
      var off = [], timers = [], observers = [], raf = 0;
      function on(t, e, f, o) { t.addEventListener(e, f, o); off.push(function () { t.removeEventListener(e, f, o); }); }
      function later(f, ms) { var id = setTimeout(f, ms); timers.push(id); return id; }

      /* 1. Зерно плёнки в слое фона */
      var bg = document.querySelector('[data-slot="page-bg"]');
      var grainEl = null;
      if (bg) {
        grainEl = document.createElement('div');
        grainEl.className = 'lx-grain';
        var u = grain(); if (u) grainEl.style.backgroundImage = 'url(' + u + ')';
        bg.appendChild(grainEl);
        // Плёнка дрожит только когда вкладка видна
        on(document, 'visibilitychange', function () { if (grainEl) grainEl.style.animationPlayState = document.hidden ? 'paused' : ''; });
      }

      /* 2. Имя в подвале по ширине страницы */
      var foot = document.querySelector('.foot__name');
      function fitName() {
        if (!foot) return;
        var wrap = foot.parentElement, cs = getComputedStyle(wrap);
        var avail = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        foot.style.removeProperty('--lx-fit');
        var probe = document.createElement('span');
        probe.textContent = foot.textContent;
        probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-size:100px;letter-spacing:-.025em;font-family:' + getComputedStyle(foot).fontFamily + ';font-weight:' + getComputedStyle(foot).fontWeight;
        document.body.appendChild(probe);
        var w = probe.getBoundingClientRect().width; probe.remove();
        if (w > 0 && avail > 0) foot.style.setProperty('--lx-fit', Math.floor(100 * avail / w * 0.985 * 10) / 10 + 'px');
      }
      var ro = null;
      if (foot) {
        if (window.ResizeObserver) { ro = new ResizeObserver(function () { fitName(); }); ro.observe(foot.parentElement); }
        else on(window, 'resize', fitName);
      }

      /* 3. Заголовки: строки поднимаются из-под маски */
      var heads = $$('.hero__title, .sec__title, .ai__title, .day__title');
      var saved = new Map();
      function restore(el) {
        if (saved.has(el)) { el.innerHTML = saved.get(el); saved.delete(el); }
        el.classList.remove('lx-go', 'lx-wait');
      }
      function reveal(el) {
        try {
          saved.set(el, splitLines(el));
          el.classList.remove('lx-wait');
          void el.offsetWidth;
          requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('lx-go'); }); });
          var n = el.querySelectorAll('.lx-ln').length;
          later(function () { restore(el); }, 1200 + n * 110 + 150);
        } catch (x) { restore(el); }
      }
      if (!reduced && 'IntersectionObserver' in window) {
        heads.forEach(function (h) { h.classList.add('lx-wait'); });
        var fontsReady = (document.fonts && document.fonts.ready) ? Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 700); })]) : Promise.resolve();
        var alive = true;
        off.push(function () { alive = false; });
        fontsReady.then(function () {
          if (!alive) return;
          fitName();
          var hio = new IntersectionObserver(function (en) {
            en.forEach(function (x) { if (x.isIntersecting) { hio.unobserve(x.target); reveal(x.target); } });
          }, { rootMargin: '0px 0px -6% 0px', threshold: 0 });
          heads.forEach(function (h) { hio.observe(h); });
          observers.push(hio);
        });
        // Страховка: ничего не остаётся скрытым, если наблюдатель молчит
        later(function () {
          heads.forEach(function (h) {
            if (!h.classList.contains('lx-wait')) return;
            var r = h.getBoundingClientRect();
            if (r.top < innerHeight && r.bottom > 0) h.classList.remove('lx-wait');
          });
        }, 1600);
      } else {
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitName); else fitName();
      }
      fitName();

      /* 4. Жалюзи: тёмные планки разъезжаются через одну и открывают снимок */
      var pics = reduced ? [] : $$('.case__pic');
      pics.forEach(function (p) {
        var b = document.createElement('span');
        b.className = 'lx-blinds'; b.setAttribute('aria-hidden', 'true');
        var html = ''; for (var i = 0; i < 7; i++) html += '<i style="--b:' + i + '"></i>';
        b.innerHTML = html; p.appendChild(b);
      });
      if (pics.length) {
        if ('IntersectionObserver' in window) {
          var bio = new IntersectionObserver(function (en) {
            en.forEach(function (x) {
              if (!x.isIntersecting) return;
              bio.unobserve(x.target);
              var p = x.target; p.classList.add('lx-open');
              later(function () { var bl = p.querySelector(".lx-blinds"); if (bl) bl.remove(); }, 1300);
            });
          }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
          pics.forEach(function (p) { bio.observe(p); });
          observers.push(bio);
        } else pics.forEach(function (p) { p.classList.add('lx-open'); });
      }

      /* 5. Сумма бюджета мягко встаёт на место при каждом шаге */
      var range = document.querySelector('.budget__range'), val = document.querySelector('.budget__value');
      if (range && val && !reduced) {
        on(range, 'input', function () { val.classList.remove('lx-tick'); void val.offsetWidth; val.classList.add('lx-tick'); });
        $$('.budget__scale li').forEach(function (li) { on(li, 'click', function () { val.classList.remove('lx-tick'); void val.offsetWidth; val.classList.add('lx-tick'); }); });
      }

      /* 6. Кольцо-курсор: только мышь. У кнопок обнимает кнопку тонкой рамкой. */
      var ring = null;
      var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      if (fine && !reduced) {
        ring = document.createElement('div');
        ring.className = 'lx-ring'; ring.setAttribute('aria-hidden', 'true');
        document.body.appendChild(ring);
        var mx = -100, my = -100, x = -100, y = -100, target = null, size = 34;
        var SNAP = '.btn, .switch__btn, .filter, .budget__scale li, .demo__open, .case__link, .site__example';
        var LINK = 'a, button, summary, .bot__btn, input[type="range"], label';
        function frame() {
          raf = 0;
          var tx = mx, ty = my;
          if (target) {
            var r = target.getBoundingClientRect();
            tx = r.left + r.width / 2; ty = r.top + r.height / 2;
          }
          x += (tx - x) * 0.22; y += (ty - y) * 0.22;
          ring.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
          if (Math.abs(tx - x) > 0.3 || Math.abs(ty - y) > 0.3 || target) raf = requestAnimationFrame(frame);
        }
        function kick() { if (!raf) raf = requestAnimationFrame(frame); }
        function shape(el) {
          if (el && el.matches(SNAP)) {
            var r = el.getBoundingClientRect(), pad = 7;
            var br = getComputedStyle(el).borderRadius;
            var w = r.width + pad * 2, h = r.height + pad * 2;
            ring.style.width = w + 'px'; ring.style.height = h + 'px';
            ring.style.margin = (-h / 2) + 'px 0 0 ' + (-w / 2) + 'px';
            ring.style.borderRadius = parseFloat(br) > 0 ? '999px' : '0';
            ring.classList.add('is-snap'); target = el;
          } else {
            var s = el ? 52 : size;
            ring.style.width = ring.style.height = s + 'px';
            ring.style.margin = (-s / 2) + 'px 0 0 ' + (-s / 2) + 'px';
            ring.style.borderRadius = '50%';
            ring.classList.toggle('is-snap', !!el); target = null;
          }
        }
        var lastEl = undefined;
        on(document, 'pointermove', function (e) {
          if (e.pointerType && e.pointerType !== 'mouse') return;
          mx = e.clientX; my = e.clientY;
          ring.classList.add('is-on');
          var el = e.target && e.target.closest ? (e.target.closest(SNAP) || e.target.closest(LINK)) : null;
          if (el && el.closest('.tg')) el = null;
          if (el !== lastEl) { lastEl = el; shape(el); }
          kick();
        }, { passive: true });
        on(document, 'pointerdown', function () { ring.classList.add('is-down'); });
        on(document, 'pointerup', function () { ring.classList.remove('is-down'); });
        on(document.documentElement, 'pointerleave', function () { ring.classList.remove('is-on'); });
        on(window, 'scroll', function () { if (target) { shape(target); kick(); } }, { passive: true });
      }

      return function cleanup() {
        off.forEach(function (f) { f(); }); off = [];
        timers.forEach(clearTimeout); timers = [];
        observers.forEach(function (o) { o.disconnect(); }); observers = [];
        if (raf) cancelAnimationFrame(raf); raf = 0;
        if (ro) ro.disconnect();
        heads.forEach(restore);
        saved.clear();
        $$('.lx-blinds').forEach(function (b) { b.remove(); });
        $$('.case__pic.lx-open').forEach(function (p) { p.classList.remove('lx-open'); });
        if (foot) foot.style.removeProperty('--lx-fit');
        if (val) val.classList.remove('lx-tick');
        if (ring) ring.remove();
        if (grainEl) grainEl.remove();
      };
    }
  };
})();
