/* Дизайн 3 «Бенто»: декоративный слой.
   Живые мини-сцены в плитках умений ИИ, счётчик «18» с ячейками, ползунок-индикатор фильтров,
   перестройка плиток каталога (FLIP), наклон плиток под курсором, «док» у списка «Есть в каждом сайте».
   Всё снимается функцией уборки: ни узлов, ни обработчиков, ни таймеров. */
(function () {
  'use strict';
  window.ThemeFX = window.ThemeFX || {};

  window.ThemeFX.bento = {
    mount: function (ctx) {
      var reduced = !!(ctx && ctx.reduced);
      var doc = document;
      var alive = true;
      var undo = [];
      var timers = new Set();
      var rafs = new Set();
      var touched = new Set();
      var EASE = 'cubic-bezier(.16,1,.3,1)';
      var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

      function $(s, el) { return (el || doc).querySelector(s); }
      function $$(s, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(s)); }
      function on(el, ev, fn, opt) { el.addEventListener(ev, fn, opt); undo.push(function () { el.removeEventListener(ev, fn, opt); }); }
      function later(fn, ms) { var t = setTimeout(function () { timers.delete(t); if (alive) fn(); }, ms); timers.add(t); return t; }
      function frame(fn) { var id = requestAnimationFrame(function (ts) { rafs.delete(id); if (alive) fn(ts); }); rafs.add(id); return id; }
      function make(tag, cls, html) {
        var n = doc.createElement(tag);
        if (cls) n.className = cls;
        if (html != null) n.innerHTML = html;
        n.setAttribute('aria-hidden', 'true');
        n.setAttribute('data-bx', '');
        return n;
      }
      function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

      /* ---------- Видимость: мини-сцены идут только на экране и при открытой вкладке ---------- */
      var vis = new WeakMap(), sleepers = [];
      var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (en) {
        en.forEach(function (x) {
          vis.set(x.target, x.isIntersecting);
          x.target.classList.toggle('bx-run', x.isIntersecting);
          if (x.isIntersecting && x.target._bxWake) x.target._bxWake();
        });
      }, { rootMargin: '60px 0px' }) : null;
      if (io) undo.push(function () { io.disconnect(); });
      function watch(el) { if (io) io.observe(el); else { vis.set(el, true); el.classList.add('bx-run'); } }
      function seen(el) { return !!vis.get(el) && !doc.hidden; }
      function loop(el, step) {
        var asleep = false;
        el._bxWake = function () { if (asleep) { asleep = false; later(tick, 120); } };
        sleepers.push(el);
        function tick() {
          if (!seen(el)) { asleep = true; return; }
          later(tick, step());
        }
        later(tick, 400);
      }
      on(doc, 'visibilitychange', function () { if (!doc.hidden) sleepers.forEach(function (el) { if (vis.get(el) && el._bxWake) el._bxWake(); }); });

      /* ---------- Фильтры каталога: чёрная подложка едет к выбранному ---------- */
      var filters = $('.filters');
      var ind = null;
      function placeInd(instant) {
        if (!ind) return;
        var b = $('.filter.is-on', filters);
        if (!b) return;
        if (instant) ind.style.transition = 'none';
        ind.style.width = b.offsetWidth + 'px';
        ind.style.height = b.offsetHeight + 'px';
        ind.style.transform = 'translate(' + b.offsetLeft + 'px,' + b.offsetTop + 'px)';
        if (instant) { void ind.offsetWidth; ind.style.transition = ''; }
      }
      if (filters) {
        ind = make('span', 'bx-ind');
        ind.setAttribute('data-qa-ok', 'подложка под выбранным фильтром');
        filters.insertBefore(ind, filters.firstChild);
        filters.classList.add('bx-has-ind');
        placeInd(true);
        on(filters, 'click', function () { frame(function () { placeInd(false); }); });
        on(window, 'resize', function () { placeInd(true); });
        if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { if (alive) placeInd(true); });
        undo.push(function () { filters.classList.remove('bx-has-ind'); });
      }

      /* ---------- Первый экран: 18 ячеек и счёт цифр ---------- */
      var facts = $$('.hero__facts .fact');
      var cellBox = null, cellEls = [];
      if (facts[1]) {
        cellBox = make('span', 'bx-cells');
        for (var c = 0; c < 18; c++) { var ci = doc.createElement('i'); cellBox.appendChild(ci); cellEls.push(ci); }
        var n18 = $('.fact__num', facts[1]);
        if (n18) n18.insertAdjacentElement('afterend', cellBox); else facts[1].appendChild(cellBox);
      }
      function lightCells(k) { cellEls.forEach(function (e, i) { e.classList.toggle('is-lit', i < k); }); }
      function blinkCells() {
        if (!cellBox || reduced) return;
        var last = -1;
        loop(cellBox, function () {
          if (last > -1) cellEls[last].classList.remove('is-blink');
          var i; do { i = Math.floor(Math.random() * cellEls.length); } while (i === last);
          cellEls[i].classList.add('is-blink'); last = i;
          return 1700;
        });
        watch(cellBox);
      }
      facts.forEach(function (f, idx) {
        var n = $('.fact__num', f); if (!n) return;
        var orig = n.textContent, target = parseInt(orig.replace(/\s/g, ''), 10);
        var isNum = String(target) === orig.trim();
        undo.push(function () { n.textContent = orig; });
        if (!isNum) return;
        if (reduced || !io) { if (idx === 1) lightCells(18); return; }
        var o = new IntersectionObserver(function (en) {
          if (!en[0].isIntersecting) return;
          o.disconnect();
          var t0 = performance.now(), dur = target > 100 ? 1500 : 1100;
          (function fr(now) {
            var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
            n.textContent = String(Math.round(target * e));
            if (idx === 1) lightCells(Math.round(18 * e));
            if (p < 1) frame(fr); else { n.textContent = orig; if (idx === 1) { lightCells(18); blinkCells(); } }
          })(t0);
        }, { threshold: 0.35 });
        o.observe(f);
        undo.push(function () { o.disconnect(); });
      });

      /* ---------- Умения ИИ: восемь мини-сцен ---------- */
      function voice(v) {
        v.classList.add('bx-viz--voice');
        var bars = '';
        for (var k = 0; k < 30; k++) {
          var h = .22 + .78 * Math.abs(Math.sin(k * 1.73) * Math.cos(k * .57));
          bars += '<i style="--h:' + h.toFixed(2) + ';--k:' + k + '"></i>';
        }
        v.innerHTML = '<span class="bx-voice"><span class="bx-play"></span><span class="bx-wave">' + bars + '</span></span>';
      }
      function search(v) {
        v.classList.add('bx-viz--search');
        var rows = ['Прайс', 'Доставка', 'Часы работы'];
        var qs = [['сколько стоит?', 0], ['привезёте сегодня?', 1], ['открыты в воскресенье?', 2]];
        v.innerHTML = '<span class="bx-q"><b></b><i class="bx-caret"></i></span><span class="bx-hits">' + rows.map(function (r) { return '<span>' + esc(r) + '</span>'; }).join('') + '</span>';
        var out = $('b', v), hits = $$('.bx-hits span', v);
        if (reduced) { out.textContent = qs[0][0]; hits[0].classList.add('is-hit'); return; }
        var qi = 0, pos = 0, phase = 'type';
        loop(v, function () {
          var q = qs[qi][0];
          if (phase === 'type') {
            pos++; out.textContent = q.slice(0, pos);
            if (pos >= q.length) { phase = 'hit'; return 380; }
            return 70;
          }
          if (phase === 'hit') { hits[qs[qi][1]].classList.add('is-hit'); phase = 'hold'; return 1900; }
          if (phase === 'hold') { hits.forEach(function (h) { h.classList.remove('is-hit'); }); phase = 'erase'; return 200; }
          pos = Math.max(0, pos - 3); out.textContent = q.slice(0, pos);
          if (!pos) { qi = (qi + 1) % qs.length; phase = 'type'; return 420; }
          return 28;
        });
      }
      function scan(v) {
        v.classList.add('bx-viz--scan');
        v.innerHTML = '<span class="bx-doc"><i></i><i></i><i></i><i></i><i></i><span class="bx-scan"></span></span><span class="bx-read"><span>Чек прочитан</span><span>Записал в таблицу</span></span>';
      }
      function memory(v) {
        v.classList.add('bx-viz--chat');
        v.innerHTML = '<span class="bx-msg bx-msg--me">Я по вчерашнему вопросу</span><span class="bx-msg bx-msg--bot">Про запись на вторник? Помню</span>';
      }
      function typing(v) {
        v.classList.add('bx-viz--type');
        var lines = ['Новинка недели уже в каталоге', 'Спасибо за заказ! Привезём завтра', 'Лёгкое льняное платье на лето'];
        v.innerHTML = '<span class="bx-type"><b></b><i class="bx-caret"></i></span>';
        var out = $('b', v);
        if (reduced) { out.textContent = lines[0]; return; }
        var li = 0, pos = 0, phase = 'type';
        loop(v, function () {
          var s = lines[li];
          if (phase === 'type') { pos++; out.textContent = s.slice(0, pos); if (pos >= s.length) { phase = 'hold'; return 1700; } return 48 + Math.random() * 50; }
          if (phase === 'hold') { phase = 'erase'; return 60; }
          pos = Math.max(0, pos - 2); out.textContent = s.slice(0, pos);
          if (!pos) { li = (li + 1) % lines.length; phase = 'type'; return 380; }
          return 22;
        });
      }
      function pixels(v) {
        v.classList.add('bx-viz--px');
        var S = 'var(--bx-tile)', O = 'var(--bx-accent)', D = 'var(--bx-dark-2)', I = 'var(--bx-ink)';
        var map = [
          'SSSSSSSSOOSS',
          'SSSSSSSOOOOS',
          'SSSSSSSSOOSS',
          'DDDDDDDDOODD',
          'IIIIIIIIIOII'
        ];
        var col = { S: S, O: O, D: D, I: I }, html = '';
        map.forEach(function (row, y) {
          for (var x = 0; x < row.length; x++) {
            var r = Math.abs(Math.sin((x + 1) * 12.9898 + (y + 1) * 78.233) * 43758.5453) % 1;
            html += '<i style="--c:' + col[row[x]] + ';--d:' + (r * 1.5).toFixed(2) + 's"></i>';
          }
        });
        v.innerHTML = '<span class="bx-px">' + html + '</span>';
      }
      function words(v) {
        v.classList.add('bx-viz--words');
        var list = ['Hello', 'Bonjour', 'Hola', 'Guten Tag', 'Merhaba', 'Ciao'];
        v.innerHTML = '<span class="bx-from">Здравствуйте</span><span class="bx-swap"></span><span class="bx-roll"><ul>' +
          list.concat(list[0]).map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul></span>';
        if (reduced) return;
        var ul = $('ul', v), i = 0;
        loop(v, function () {
          i++;
          ul.style.transition = '';
          ul.style.transform = 'translateY(' + (-i * 40) + 'px)';
          if (i === list.length) {
            later(function () { ul.style.transition = 'none'; ul.style.transform = 'translateY(0)'; void ul.offsetWidth; i = 0; }, 760);
          }
          return 1700;
        });
      }
      function push(v) {
        v.classList.add('bx-viz--push');
        v.innerHTML = '<span class="bx-push"><i></i><span><b>Вам в Telegram</b><small>Клиент просит живого человека</small></span></span>';
      }
      var scenes = [voice, search, scan, memory, typing, pixels, words, push];
      $$('.ai__item').forEach(function (item, i) {
        var build = scenes[i]; if (!build) return;
        var v = make('div', 'bx-viz');
        item.appendChild(v);
        build(v);
        watch(v);
      });

      /* ---------- Шаги: полоска из четырёх отрезков вместо номера ---------- */
      $$('.steps .step').forEach(function (st, i) {
        var s = make('span', 'bx-seg');
        for (var k = 0; k < 4; k++) { var e = doc.createElement('i'); if (k <= i) { e.className = 'is-on'; e.style.setProperty('--n', String(k)); } s.appendChild(e); }
        st.insertBefore(s, st.firstChild);
      });

      /* ---------- Наклон плиток под курсором ---------- */
      var cur = null, rect = null;
      function leave(t) {
        if (!t) return;
        t.classList.remove('bx-hover');
        t.style.setProperty('--bx-rx', '0deg');
        t.style.setProperty('--bx-ry', '0deg');
      }
      if (fine && !reduced) {
        var tiltSel = '.hero__stage, .fact, .bot:not(.is-on), .ai__title, .ai__item, .ai__models, .site, .sites__base, .demo, .case, .step, .contact__pic, .pricelist__col, .prices__note';
        var enter = function (t) { touched.add(t); t.classList.add('bx-tilt', 'bx-hover'); rect = t.getBoundingClientRect(); };
        on(doc, 'pointermove', function (e) {
          var t = e.target && e.target.closest ? e.target.closest(tiltSel) : null;
          if (t && t.matches('[data-reveal]:not(.is-in)')) t = null;
          if (t !== cur) { leave(cur); cur = t; if (t) enter(t); }
          if (!cur || !rect) return;
          var px = (e.clientX - rect.left) / rect.width - .5;
          var py = (e.clientY - rect.top) / rect.height - .5;
          var max = Math.max(1.1, Math.min(4.5, 1000 / Math.max(rect.width, rect.height)));
          cur.style.setProperty('--bx-ry', (px * max * 2).toFixed(2) + 'deg');
          cur.style.setProperty('--bx-rx', (-py * max * 2).toFixed(2) + 'deg');
        }, { passive: true });
        on(doc, 'mouseout', function (e) { if (!e.relatedTarget) { leave(cur); cur = null; } });
        on(window, 'scroll', function () { if (cur) rect = cur.getBoundingClientRect(); }, { passive: true });
        undo.push(function () {
          touched.forEach(function (t) { t.classList.remove('bx-tilt', 'bx-hover'); t.style.removeProperty('--bx-rx'); t.style.removeProperty('--bx-ry'); });
        });
      }

      /* ---------- Каталог: плитки плавно перестраиваются ---------- */
      var list = $('.bots__list');
      var narrow = window.matchMedia('(max-width: 899px)');
      function snap() {
        var m = new Map();
        $$('.bot', list).forEach(function (b) { if (!b.hidden) m.set(b, b.getBoundingClientRect()); });
        return m;
      }
      function settle(before) {
        frame(function () {
          $$('.bot', list).forEach(function (b) {
            if (b.hidden || !b.animate) return;
            var r = b.getBoundingClientRect(), o = before.get(b);
            if (!o) { b.animate([{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 460, easing: EASE }); return; }
            var dx = o.left - r.left, dy = o.top - r.top;
            if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
            b.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: 600, easing: EASE });
          });
        });
      }
      if (list && !reduced) {
        on(list, 'click', function (e) {
          if (narrow.matches || !e.target.closest('.bot__btn')) return;
          var li = e.target.closest('.bot');
          if (li && li.classList.contains('is-on')) return;
          leave(cur); cur = null;
          settle(snap());
        }, true);
        if (filters) on(filters, 'click', function (e) {
          if (narrow.matches || !e.target.closest('.filter')) return;
          leave(cur); cur = null;
          settle(snap());
        }, true);
      }

      /* ---------- «Есть в каждом сайте»: пункты растут под курсором, как док ---------- */
      var dock = $('.sites__base-list');
      if (dock && fine && !reduced) {
        var chips = $$('li', dock), centers = [];
        on(dock, 'pointerenter', function () { centers = chips.map(function (c) { var r = c.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); });
        on(dock, 'pointermove', function (e) {
          if (!centers.length) return;
          chips.forEach(function (c, i) {
            var d = Math.hypot(e.clientX - centers[i][0], (e.clientY - centers[i][1]) * 1.8);
            var s = 1 + .14 * Math.max(0, 1 - d / 150);
            c.style.transform = 'scale(' + s.toFixed(3) + ')';
          });
        }, { passive: true });
        on(dock, 'pointerleave', function () { chips.forEach(function (c) { c.style.transform = ''; }); centers = []; });
        undo.push(function () { chips.forEach(function (c) { c.style.transform = ''; }); });
      }

      /* ---------- Бюджет: цифра откликается на ползунок ---------- */
      var range = $('.budget__range'), val = $('.budget__value');
      if (range && val && !reduced) {
        var pop = function () { val.classList.remove('bx-pop'); void val.offsetWidth; val.classList.add('bx-pop'); };
        on(range, 'input', pop);
        var scale = $('.budget__scale');
        if (scale) on(scale, 'click', pop);
        undo.push(function () { val.classList.remove('bx-pop'); });
      }

      /* ---------- Уборка ---------- */
      return function () {
        alive = false;
        timers.forEach(clearTimeout); timers.clear();
        rafs.forEach(cancelAnimationFrame); rafs.clear();
        for (var i = undo.length - 1; i >= 0; i--) { try { undo[i](); } catch (x) {} }
        $$('[data-bx]').forEach(function (n) { n.remove(); });
        $$('.bx-run').forEach(function (n) { n.classList.remove('bx-run'); });
        sleepers.forEach(function (el) { delete el._bxWake; });
      };
    }
  };
})();
