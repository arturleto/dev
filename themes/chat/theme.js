/* Дизайн №5 «Чат». Сайт одет как переписка в Telegram.
   Здесь только то, что делает тему живой: список чатов слева (разделы сайта), профиль справа,
   живой поиск по ботам, сайтам и вопросам, статус «печатает…» в шапке, время в пузырях,
   буквы-аватары в уведомлениях ботов, первый вопрос с ответом. Всё убирается при смене дизайна. */
(function () {
  'use strict';
  window.ThemeFX = window.ThemeFX || {};
  var doc = document, root = doc.documentElement;

  function $(s, el) { return (el || doc).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(s)); }
  function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
  function txt(el) { return el ? clean(el.textContent) : ''; }
  function norm(s) { return clean(s).toLowerCase().replace(/ё/g, 'е'); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // Разделы сайта как диалоги. Названия и превью берутся из самой страницы.
  var DIALOGS = [
    { id: 'hero', ico: '', c: '#3d8fd6', pin: true },
    { id: 'bots', ico: 'robot', c: '#4f9fd9', count: '.bots__list > .bot' },
    { id: 'sites', ico: 'window', c: '#e0845f', count: '.sites__list > .site' },
    { id: 'demos', ico: 'grid', c: '#d46d97', count: '.demos__list > .demo' },
    { id: 'work', ico: 'rocket', c: '#4aa894', count: '.work__list > .case' },
    { id: 'day', ico: 'clock', c: '#dc9a3e', count: '.day__list > .day__item' },
    { id: 'prices', ico: 'receipt', c: '#5fa552' },
    { id: 'process', ico: 'route', c: '#3f9cbf', count: '.steps > .step' },
    { id: 'faq', ico: 'question', c: '#dd6b6b', count: '.faq__list > .qa' },
    { id: 'contact', ico: 'plane', c: '#3d8fd6' }
  ];
  var AVA = ['#e17076', '#e0905a', '#5fa552', '#4f9fd9', '#3fa7ad', '#d46d97', '#3d8fd6', '#c98a2e'];
  function colorFor(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return AVA[h % AVA.length]; }

  function dialogText(id) {
    var s = doc.getElementById(id); if (!s) return null;
    if (id === 'hero') return { name: txt($('.brand__name')), prev: txt($('.hero__title')) };
    if (id === 'day') return { name: txt($('.day__title', s)), prev: txt($('.day__lead', s)) };
    return { name: txt($('.sec__title', s)), prev: txt($('.sec__lead', s)) };
  }

  window.ThemeFX.chat = {
    mount: function (ctx) {
      var reduced = !!(ctx && ctx.reduced);
      var smooth = reduced ? 'auto' : 'smooth';
      var wide = window.matchMedia('(min-width: 1100px)');
      var offs = [], timers = [], touched = [], made = [];
      function on(el, ev, fn, opt) { el.addEventListener(ev, fn, opt); offs.push(function () { el.removeEventListener(ev, fn, opt); }); }
      function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }

      /* Время в пузырях: часы посетителя, как будто Артур только что написал */
      function stamp() { var d = new Date(); root.style.setProperty('--chat-now', '"' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + '"'); }
      stamp();
      var clockTimer = setInterval(stamp, 30000);

      /* Статус в шапке: «печатает…», пока появляется новое сообщение */
      var brand = $('.brand'), typingT = 0;
      function typing(ms) {
        if (reduced || !brand) return;
        brand.setAttribute('data-chat-typing', '');
        clearTimeout(typingT);
        typingT = setTimeout(function () { brand.removeAttribute('data-chat-typing'); }, ms || 760);
      }
      var seen = typeof WeakSet === 'function' ? new WeakSet() : null;
      var mo = null;
      if (window.MutationObserver && !reduced) {
        mo = new MutationObserver(function (list) {
          list.forEach(function (m) {
            var el = m.target;
            if (!el.classList.contains('is-in') || (seen && seen.has(el))) return;
            if (seen) seen.add(el);
            typing(760);
          });
        });
        $$('.sec__head, .day, .budget').forEach(function (el) { if (!el.classList.contains('is-in')) mo.observe(el, { attributes: true, attributeFilter: ['class'] }); });
      }

      /* Появление пузырей. Пузыри мелкие, и при быстрой прокрутке ядро может пропустить те,
         что целиком лежат в нижних 8% экрана. Своё наблюдение без отступа: показался хоть край, пузырь всплывает. */
      var rio = null;
      if ('IntersectionObserver' in window) {
        rio = new IntersectionObserver(function (en) {
          en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('is-in'); rio.unobserve(x.target); } });
        }, { rootMargin: '0px', threshold: 0 });
        $$('[data-reveal]:not(.is-in)').forEach(function (el) { rio.observe(el); });
      }

      /* Вопросы: первый уже с ответом, остальные открываются по нажатию */
      var faq = $('.faq__list'), openedByMe = null;
      if (faq) {
        var first = $('.qa', faq);
        if (first && !first.open) { first.open = true; openedByMe = first; }
        on(faq, 'toggle', function (e) { if (e.target.open) typing(760); }, true);
      }

      /* Уведомления ботов: аватар с первой буквой имени бота */
      $$('.day__item').forEach(function (it) {
        var who = txt($('.day__who', it)).split(',')[0];
        if (!who) return;
        it.style.setProperty('--chat-l', '"' + who.charAt(0).toUpperCase().replace(/"/g, '') + '"');
        it.style.setProperty('--chat-c', colorFor(who));
        touched.push(it);
      });

      /* ---------- Список чатов слева ---------- */
      var side = doc.createElement('aside');
      side.className = 'chat-side';
      side.setAttribute('aria-label', 'Разделы сайта и поиск');
      var mark = txt($('.brand__mark')) || 'АЛ';
      var h = '<div class="chat-side__top"><span class="chat-side__menu" aria-hidden="true"></span>' +
        '<label class="chat-side__search"><span class="vh">Поиск по ботам, сайтам и вопросам</span>' +
        '<input class="chat-side__input" type="search" autocomplete="off" spellcheck="false" placeholder="Поиск"></label></div>' +
        '<nav class="chat-side__list" aria-label="Разделы">';
      DIALOGS.forEach(function (d) {
        var t = dialogText(d.id); if (!t || !t.name) return;
        var n = d.count ? $$(d.count).length : 0;
        h += '<a class="chat-dlg" href="#' + d.id + '" data-dlg="' + d.id + '">' +
          '<span class="chat-dlg__ava"' + (d.ico ? ' data-ico="' + d.ico + '"' : '') + ' style="--c:' + d.c + '" aria-hidden="true">' + (d.ico ? '' : esc(mark)) + '</span>' +
          '<span class="chat-dlg__body"><span class="chat-dlg__name">' + esc(t.name) + '</span><span class="chat-dlg__prev">' + esc(t.prev) + '</span></span>' +
          (d.pin ? '<span class="chat-dlg__pin" aria-hidden="true"></span>' : (n ? '<span class="chat-dlg__badge">' + n + '</span>' : '<span></span>')) +
          '</a>';
      });
      h += '</nav><div class="chat-side__res" hidden></div>';
      side.innerHTML = h;
      doc.body.appendChild(side); made.push(side);

      var input = $('.chat-side__input', side), listEl = $('.chat-side__list', side), resEl = $('.chat-side__res', side);
      var dlgs = $$('.chat-dlg', side).map(function (a) { return { a: a, el: doc.getElementById(a.dataset.dlg) }; }).filter(function (x) { return x.el; });

      // Активный раздел и прочитанные: значок непрочитанных исчезает, когда раздел показался
      var spyRaf = 0;
      function spy() {
        spyRaf = 0;
        var y = window.innerHeight * 0.42, cur = null;
        dlgs.forEach(function (d) { var r = d.el.getBoundingClientRect(); if (r.top <= y && r.bottom > y) cur = d; if (r.top < y) d.a.classList.add('is-read'); });
        if (window.innerHeight + window.scrollY >= root.scrollHeight - 4) cur = dlgs[dlgs.length - 1];
        dlgs.forEach(function (d) {
          var isOn = d === cur;
          if (d.a.classList.contains('is-on') !== isOn) {
            d.a.classList.toggle('is-on', isOn);
            if (isOn) { d.a.setAttribute('aria-current', 'true'); if (wide.matches && listEl.scrollHeight > listEl.clientHeight) d.a.scrollIntoView({ block: 'nearest' }); }
            else d.a.removeAttribute('aria-current');
          }
        });
      }
      function onScroll() { if (!spyRaf) spyRaf = requestAnimationFrame(spy); }
      on(window, 'scroll', onScroll, { passive: true });
      on(window, 'resize', onScroll);
      spy();

      // Живой поиск: по ботам, сайтам и вопросам
      var items = [];
      $$('.bots__list > .bot').forEach(function (li) { items.push({ kind: 'bot', el: li, name: txt($('.bot__name', li)), sub: txt($('.bot__who', li)), price: txt($('.bot__price', li)), hay: norm(li.textContent) }); });
      $$('.sites__list > .site').forEach(function (li) { items.push({ kind: 'site', el: li, name: txt($('.site__name', li)), sub: txt($('.site__who', li)), price: txt($('.site__price', li)), hay: norm(li.textContent) }); });
      $$('.faq__list > .qa').forEach(function (d) { items.push({ kind: 'qa', el: d, name: txt($('.qa__q', d)), sub: txt($('.qa__a', d)), price: '', hay: norm(d.textContent) }); });
      var GROUP = { bot: ['Боты', 'robot', '#4f9fd9'], site: ['Сайты', 'window', '#e0845f'], qa: ['Вопросы', 'question', '#dd6b6b'] };
      var hits = [];
      function mark1(name, words) {
        var low = norm(name), out = '', i = 0, best = -1, len = 0;
        words.forEach(function (w) { var k = low.indexOf(w); if (k > -1 && (best < 0 || k < best)) { best = k; len = w.length; } });
        if (best < 0) return esc(name);
        out = esc(name.slice(0, best)) + '<mark>' + esc(name.slice(best, best + len)) + '</mark>' + esc(name.slice(best + len));
        return out;
      }
      function render() {
        var q = norm(input.value);
        if (!q) { resEl.hidden = true; listEl.hidden = false; resEl.innerHTML = ''; return; }
        var words = q.split(' ').filter(Boolean);
        hits = items.filter(function (it) { return words.every(function (w) { return it.hay.indexOf(w) > -1; }); });
        var html = '';
        ['bot', 'site', 'qa'].forEach(function (k) {
          var g = hits.filter(function (x) { return x.kind === k; });
          if (!g.length) return;
          html += '<p class="chat-side__group">' + GROUP[k][0] + '</p>';
          g.forEach(function (it) {
            html += '<button type="button" class="chat-hit" data-k="' + hits.indexOf(it) + '">' +
              '<span class="chat-hit__ava" data-ico="' + GROUP[k][1] + '" style="--c:' + GROUP[k][2] + '" aria-hidden="true"></span>' +
              '<span class="chat-hit__body"><span class="chat-hit__name">' + mark1(it.name, words) + '</span>' + (it.sub ? '<span class="chat-hit__sub">' + esc(it.sub) + '</span>' : '') + '</span>' +
              '<span class="chat-hit__price">' + esc(it.price) + '</span></button>';
          });
        });
        if (!hits.length) {
          html = '<p class="chat-side__empty">Ничего не нашлось.</p><a class="chat-side__ask" href="https://t.me/arturleto?text=' +
            encodeURIComponent('Здравствуйте! Мне нужно: ' + clean(input.value)) + '" target="_blank" rel="noopener">Спросить Артура в Telegram</a>';
        }
        resEl.innerHTML = html; resEl.hidden = false; listEl.hidden = true;
      }
      function flash(el) { el.classList.remove('chat-flash'); void el.offsetWidth; el.classList.add('chat-flash'); later(function () { el.classList.remove('chat-flash'); }, 1700); }
      function go(it) {
        if (it.kind === 'bot') {
          if (it.el.hidden) { var all = $('.filter[data-filter="all"]'); if (all) all.click(); }
          var b = $('.bot__btn', it.el);
          if (b && !it.el.classList.contains('is-on')) b.click();
          it.el.scrollIntoView({ behavior: smooth, block: 'center' });
          flash($('.bot__btn', it.el));
        } else if (it.kind === 'site') {
          it.el.scrollIntoView({ behavior: smooth, block: 'center' }); flash(it.el);
        } else {
          it.el.open = true; it.el.scrollIntoView({ behavior: smooth, block: 'center' });
        }
      }
      on(input, 'input', render);
      on(input, 'keydown', function (e) {
        if (e.key === 'Escape') { input.value = ''; render(); }
        if (e.key === 'Enter' && hits.length) { e.preventDefault(); go(hits[0]); }
      });
      on(resEl, 'click', function (e) { var b = e.target.closest('.chat-hit'); if (b && hits[+b.dataset.k]) go(hits[+b.dataset.k]); });

      // Подсказка в поиске сама печатает примеры запросов, пока поле пустое
      var PH = ['запись клиентов', 'оплата', 'ИИ', 'магазин', 'квиз', 'визитка'], phI = 0, phT = 0, phStop = false;
      function phLoop() {
        if (phStop) return;
        if (reduced || doc.hidden || !wide.matches || doc.activeElement === input || input.value) { input.placeholder = 'Поиск'; phT = setTimeout(phLoop, 1500); return; }
        var word = PH[phI % PH.length], k = 0;
        (function type() {
          if (phStop) return;
          if (doc.activeElement === input || input.value) { input.placeholder = 'Поиск'; phT = setTimeout(phLoop, 1500); return; }
          k++; input.placeholder = word.slice(0, k);
          if (k < word.length) { phT = setTimeout(type, 85); return; }
          phT = setTimeout(function erase() {
            if (phStop) return;
            k--; input.placeholder = k > 0 ? word.slice(0, k) : 'Поиск';
            if (k > 0) phT = setTimeout(erase, 35); else { phI++; phT = setTimeout(phLoop, 1600); }
          }, 1500);
        })();
      }
      phT = setTimeout(phLoop, 2200);

      /* ---------- Профиль справа ---------- */
      var info = doc.createElement('aside');
      info.className = 'chat-info';
      info.setAttribute('aria-label', 'Об Артуре');
      var photo = $('.contact__pic img');
      var ih = '<div class="chat-info__head">Информация</div><div class="chat-info__scroll">';
      if (photo) ih += '<figure class="chat-info__pic"><img src="' + esc(photo.getAttribute('src')) + '" width="960" height="1280" alt="' + esc(photo.getAttribute('alt') || '') + '" loading="lazy"></figure>';
      ih += '<div class="chat-info__who"><b>' + esc(txt($('.brand__name'))) + '</b><span>в сети</span></div><ul class="chat-info__rows">';
      var role = txt($('.foot__role'));
      if (role) ih += '<li class="chat-info__row" data-ico="info"><span class="chat-info__val">' + esc(role) + '</span><span class="chat-info__lab">О себе</span></li>';
      $$('.contact__row').forEach(function (r) {
        var dt = txt($('dt', r)), dd = $('dd', r); if (!dd) return;
        var ico = /telegram/i.test(dt) ? 'at' : /instagram/i.test(dt) ? 'insta' : /бали/i.test(dt) ? 'clock' : 'globe';
        var a = $('a', dd), val;
        if (a) val = '<a href="' + esc(a.getAttribute('href')) + '" target="_blank" rel="noopener">' + esc(txt(a)) + '</a>';
        else val = esc(txt(dd));
        ih += '<li class="chat-info__row" data-ico="' + ico + '"><span class="chat-info__val"' + (dd.hasAttribute('data-bali-time') ? ' data-bali-time' : '') + '>' + val + '</span><span class="chat-info__lab">' + esc(dt) + '</span></li>';
      });
      ih += '</ul>';
      var cases = $$('.work__list > .case');
      if (cases.length) {
        ih += '<p class="chat-info__mtitle">Медиа: ' + cases.length + '</p><div class="chat-info__grid">';
        cases.slice(0, 8).forEach(function (c, i) {
          var img = $('img', c); if (!img) return;
          var src = img.getAttribute('src').replace('_34.', '_sq.');
          ih += '<button type="button" class="chat-info__m" data-case="' + i + '" aria-label="' + esc(img.getAttribute('alt') || txt($('.case__name', c))) + '"><img src="' + esc(src) + '" width="900" height="900" alt="" loading="lazy"></button>';
        });
        ih += '</div>';
      }
      ih += '</div>';
      info.innerHTML = ih;
      doc.body.appendChild(info); made.push(info);
      on(info, 'click', function (e) {
        var b = e.target.closest('.chat-info__m'); if (!b) return;
        var c = cases[+b.dataset.case]; if (!c) return;
        c.scrollIntoView({ behavior: smooth, block: 'center' }); flash(c);
      });

      return function cleanup() {
        phStop = true; clearTimeout(phT); clearTimeout(typingT); clearInterval(clockTimer);
        timers.forEach(clearTimeout);
        if (spyRaf) cancelAnimationFrame(spyRaf);
        if (mo) mo.disconnect();
        if (rio) rio.disconnect();
        offs.forEach(function (f) { f(); });
        made.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
        touched.forEach(function (it) { it.style.removeProperty('--chat-l'); it.style.removeProperty('--chat-c'); });
        $$('.chat-flash').forEach(function (n) { n.classList.remove('chat-flash'); });
        if (brand) brand.removeAttribute('data-chat-typing');
        if (openedByMe) openedByMe.open = false;
        root.style.removeProperty('--chat-now');
      };
    }
  };
})();
