/* Дизайн №2 «Плакат»: декоративный слой.
   1) Заголовок первого экрана: строки на всю ширину, выезжают из-под своей линии, буквы тянутся как резинка.
   2) Бегущие строки между плакатами (тексты берутся со страницы).
   3) Цифра бюджета ставится как печать. 4) Имя в подвале на всю ширину.
   Всё снимается при переключении на другой дизайн. */
(function () {
  'use strict';
  window.ThemeFX = window.ThemeFX || {};

  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="12,1 13.8,7.8 19.8,4.2 16.2,10.2 23,12 16.2,13.8 19.8,19.8 13.8,16.2 12,23 10.2,16.2 4.2,19.8 7.8,13.8 1,12 7.8,10.2 4.2,4.2 10.2,7.8"/></svg>';

  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function txt(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim(); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  window.ThemeFX.poster = {
    mount: function (ctx) {
      var reduced = !!(ctx && ctx.reduced);
      var offs = [], observers = [], timers = [], raf = 0, alive = true;
      var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      var phoneMq = window.matchMedia('(max-width: 599px)');
      function on(el, ev, fn, opt) { if (!el) return; el.addEventListener(ev, fn, opt); offs.push(function () { el.removeEventListener(ev, fn, opt); }); }
      function later(fn, ms) { var t = setTimeout(function () { if (alive) fn(); }, ms); timers.push(t); return t; }

      /* ---------- 1. Заголовок-плакат ---------- */
      var h1 = $('.hero__title'), h1Html = h1 ? h1.innerHTML : '', rows = [], groups = [], chars = [];
      if (h1) {
        var full = txt(h1);
        // Слова; слово через дефис рвём после дефиса; короткие предлоги («и», «в») липнут к следующему слову
        var parts = [];
        full.split(' ').forEach(function (w) {
          var m = w.match(/^(.+-)(.+)$/);
          if (m && w.length > 9) { parts.push(m[1]); parts.push(m[2]); } else parts.push(w);
        });
        var gs = [];
        for (var i = 0; i < parts.length; i++) {
          if (parts[i].length <= 2 && i + 1 < parts.length) { gs.push(parts[i] + ' ' + parts[i + 1]); i++; } else gs.push(parts[i]);
        }
        // Две строки с самым ровным числом букв
        var best = 1, bestD = 1e9;
        for (var s = 1; s < gs.length; s++) {
          var a = gs.slice(0, s).join(' ').length, b = gs.slice(s).join(' ').length, d = Math.abs(a - b);
          if (d < bestD) { bestD = d; best = s; }
        }
        var k = 0;
        var html = [gs.slice(0, best), gs.slice(best)].map(function (row) {
          return '<span class="px-row">' + row.map(function (g) {
            var inner = Array.prototype.map.call(g, function (ch) { return ch === ' ' ? ' ' : '<span class="px-c">' + esc(ch) + '</span>'; }).join('');
            return '<span class="px-g"><span class="px-in" style="--k:' + (k++) + '">' + inner + '</span></span>';
          }).join(' ') + '</span>';
        }).join('');
        h1.setAttribute('aria-label', full);
        h1.innerHTML = '<span class="px-h" aria-hidden="true">' + html + '</span>';
        h1.classList.add('px-split');
        if (!reduced) h1.classList.add('px-wait');
        rows = $$('.px-row', h1); groups = $$('.px-g', h1);
        chars = $$('.px-c', h1).map(function (el) { return { el: el, x: 0, y: 0, s: 1, v: 0, t: 1 }; });
      }

      // Каждая строка подгоняется по ширине колонки, как набор на плакате
      function fit() {
        if (!h1 || !rows.length) return;
        var W = h1.clientWidth; if (!W) return;
        var lines = phoneMq.matches ? groups : rows, other = phoneMq.matches ? rows : groups;
        var max = phoneMq.matches ? 112 : 220;
        other.forEach(function (el) { el.style.fontSize = ''; });
        lines.forEach(function (el) { el.style.fontSize = '100px'; });
        var widths = lines.map(function (el) { return el.getBoundingClientRect().width; });
        lines.forEach(function (el, i) { if (widths[i]) el.style.fontSize = Math.min(max, Math.floor(100 * W * 0.995 / widths[i] * 2) / 2) + 'px'; });
        measure();
      }
      function measure() {
        chars.forEach(function (c) { var r = c.el.getBoundingClientRect(); c.x = r.left + r.width / 2 + window.scrollX; c.y = r.top + r.height / 2 + window.scrollY; c.h = r.height; });
      }

      var fontsReady = (document.fonts && document.fonts.load) ? Promise.race([
        Promise.all([document.fonts.load('400 100px "Poster Dela"', 'ДЕЛАЮTelegram'), document.fonts.load('800 100px "Poster Golos"', '₽')]),
        new Promise(function (r) { setTimeout(r, 350); })
      ]) : Promise.resolve();
      fontsReady.then(function () {
        if (!alive || !h1) return;
        fit();
        if (reduced) { h1.classList.add('px-done'); return; }
        h1.classList.remove('px-wait'); h1.classList.add('px-go');
        later(function () { h1.classList.add('px-done'); measure(); wave(); }, 120 + groups.length * 110 + 800);
      });
      if (document.fonts && document.fonts.addEventListener) {
        var onFonts = function () { fit(); };
        document.fonts.addEventListener('loadingdone', onFonts);
        offs.push(function () { document.fonts.removeEventListener('loadingdone', onFonts); });
      }
      var fitTimer = 0;
      var onResize = function () { clearTimeout(fitTimer); fitTimer = setTimeout(function () { if (alive) { fit(); fitFoot(); } }, 80); };
      on(window, 'resize', onResize);
      offs.push(function () { clearTimeout(fitTimer); });

      // Резиновые буквы: под курсором тянутся вверх и пружинят обратно
      var px = -9999, py = -9999, waveX = null;
      function tick() {
        raf = 0;
        var moving = false, lift = 0.34, sx = 70;
        chars.forEach(function (c) {
          var target = 1;
          if (waveX !== null) {
            var dw = c.x - waveX; target = 1 + lift * Math.exp(-(dw * dw) / (2 * sx * sx));
          } else if (px > -9000) {
            var dx = c.x - px, dy = (c.y - py) / Math.max(40, c.h * 0.7);
            target = 1 + lift * Math.exp(-(dx * dx) / (2 * sx * sx)) * Math.exp(-(dy * dy) / 2);
          }
          c.v = c.v * 0.74 + (target - c.s) * 0.2;
          c.s += c.v;
          if (Math.abs(c.v) > 0.0006 || Math.abs(target - c.s) > 0.0006) moving = true;
          else { c.s = target; }
          c.el.style.transform = Math.abs(c.s - 1) < 0.0008 ? '' : 'scale(' + (1 / Math.sqrt(c.s)).toFixed(4) + ',' + c.s.toFixed(4) + ')';
        });
        if (moving || waveX !== null) raf = requestAnimationFrame(tick);
      }
      function kick() { if (!raf && alive) raf = requestAnimationFrame(tick); }
      function wave() {
        if (reduced || !chars.length) return;
        var r = h1.getBoundingClientRect(), x0 = r.left + window.scrollX - 120, x1 = r.right + window.scrollX + 120, t0 = performance.now(), dur = 1300;
        (function step(now) {
          if (!alive) return;
          var p = Math.min(1, (now - t0) / dur);
          waveX = x0 + (x1 - x0) * p;
          kick();
          if (p < 1) requestAnimationFrame(step); else { waveX = null; kick(); }
        })(t0);
      }
      if (h1 && !reduced) {
        if (finePointer) {
          on(h1, 'pointerenter', function () { measure(); });
          on(h1, 'pointermove', function (e) { if (!h1.classList.contains('px-done')) return; px = e.pageX; py = e.pageY; kick(); });
          on(h1, 'pointerleave', function () { px = -9999; py = -9999; kick(); });
        } else {
          on(h1, 'pointerdown', function () { if (h1.classList.contains('px-done') && waveX === null) { measure(); wave(); } });
        }
      }

      /* ---------- 2. Бегущие строки ---------- */
      var bands = [];
      function band(slotName, items, opts) {
        var slot = $('[data-slot="' + slotName + '"]');
        if (!slot || !items.length) return;
        var one = items.map(function (t) { return '<span class="px-band__item">' + esc(t) + STAR + '</span>'; }).join('');
        slot.innerHTML = '<div class="px-band"><div class="px-band__track"><div class="px-band__copy" style="display:flex">' + one + '</div></div></div>';
        var el = $('.px-band', slot), track = $('.px-band__track', slot), copy = $('.px-band__copy', slot);
        Object.keys(opts).forEach(function (k) { el.style.setProperty('--band-' + k, opts[k]); });
        // Копия длиннее экрана, потом вторая такая же для бесшовного круга
        var guard = 0;
        while (copy.getBoundingClientRect().width < window.innerWidth + 200 && guard++ < 8) copy.insertAdjacentHTML('beforeend', one);
        track.appendChild(copy.cloneNode(true));
        var w = copy.getBoundingClientRect().width || 2000;
        el.style.setProperty('--band-dur', Math.round(w / 70) + 's');
        bands.push({ slot: slot, el: el });
      }
      band('bots-art', $$('.bot__name').map(txt), { bg: '#111111', ink: '#FFE236', star: '#FF9AD0', tilt: '-1.4deg', dir: 'normal' });
      band('demos-art', $$('.site__name').map(txt), { bg: '#FFE236', ink: '#111111', star: '#D6231A', tilt: '1.2deg', dir: 'reverse' });
      band('prices-art', $$('.pricelist__row').map(function (r) { return txt($('.pricelist__name', r)) + ' ' + txt($('.pricelist__price', r)); }), { bg: '#111111', ink: '#FFFFFF', star: '#FFE236', tilt: '-1deg', dir: 'normal' });
      var cta = [$('.contact__title'), $('.contact__cta'), $('.contact__card a')].filter(Boolean).map(txt);
      band('contact-art', cta, { bg: '#FF9AD0', ink: '#111111', star: '#111111', tilt: '1.4deg', dir: 'reverse' });

      // Крутятся только видимые строки и стикер
      var hero = $('.hero');
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (en) {
          en.forEach(function (x) {
            if (x.target === hero) hero.classList.toggle('px-idle', !x.isIntersecting);
            else x.target.classList.toggle('is-run', x.isIntersecting && !reduced && !document.hidden);
          });
        }, { rootMargin: '80px 0px' });
        bands.forEach(function (b) { io.observe(b.el); });
        if (hero) io.observe(hero);
        observers.push(io);
      }
      on(document, 'visibilitychange', function () {
        bands.forEach(function (b) { if (document.hidden) b.el.classList.remove('is-run'); });
        if (!document.hidden) bands.forEach(function (b) { var r = b.el.getBoundingClientRect(); if (r.bottom > -80 && r.top < innerHeight + 80 && !reduced) b.el.classList.add('is-run'); });
      });

      /* ---------- 3. Печать бюджета ---------- */
      var val = $('.budget__value');
      if (val && 'MutationObserver' in window && !reduced) {
        var last = val.textContent;
        var mo = new MutationObserver(function () {
          if (val.textContent === last) return; last = val.textContent;
          val.classList.remove('px-stamp'); void val.offsetWidth; val.classList.add('px-stamp');
        });
        mo.observe(val, { childList: true, characterData: true, subtree: true });
        observers.push(mo);
      }

      /* ---------- 4. Имя в подвале на всю ширину ---------- */
      var foot = $('.foot__name');
      function fitFoot() {
        if (!foot) return;
        var wrap = foot.parentElement, cs = getComputedStyle(wrap);
        var W = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        foot.style.fontSize = '100px';
        foot.style.width = 'max-content';
        var w = foot.getBoundingClientRect().width;
        foot.style.width = '';
        if (w) foot.style.fontSize = Math.min(220, Math.floor(100 * W * 0.99 / w)) + 'px';
      }
      fontsReady.then(function () { if (alive) fitFoot(); });

      /* ---------- 5. Проекты на телефоне листаются вбок: показываем все сразу ---------- */
      function showCases() { if (phoneMq.matches) $$('.work__list .case').forEach(function (c) { c.classList.add('is-in'); }); }
      showCases();
      on(phoneMq, 'change', function () { showCases(); fit(); });

      /* ---------- 6. Шаги раздаются веером все вместе, когда ряд показался ---------- */
      var steps = $('.steps');
      if (steps && 'IntersectionObserver' in window && !reduced) {
        var sio = new IntersectionObserver(function (en) {
          if (en[0].isIntersecting) { $$('.step', steps).forEach(function (st) { st.classList.add('is-in'); }); sio.disconnect(); }
        }, { threshold: 0.2 });
        sio.observe(steps);
        observers.push(sio);
      }

      /* ---------- Уборка ---------- */
      return function cleanup() {
        alive = false;
        if (raf) cancelAnimationFrame(raf);
        timers.forEach(clearTimeout);
        offs.forEach(function (f) { f(); });
        observers.forEach(function (o) { o.disconnect(); });
        bands.forEach(function (b) { b.slot.innerHTML = ''; });
        if (hero) hero.classList.remove('px-idle');
        if (h1) {
          h1.innerHTML = h1Html;
          h1.removeAttribute('aria-label');
          h1.classList.remove('px-split', 'px-wait', 'px-go', 'px-done');
        }
        if (foot) { foot.style.fontSize = ''; foot.style.width = ''; }
        if (val) val.classList.remove('px-stamp');
      };
    }
  };
})();
