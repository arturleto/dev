/* Общий движок сайта: дизайны, переписки, каталог ботов, бюджет, часы.
   Дизайны подключаются как window.ThemeFX[id] = { mount() { ...; return cleanup } } */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var THEMES = ['neon', 'poster', 'bento', 'lux', 'chat'];
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var narrow = window.matchMedia('(max-width: 899px)');
  var NB = ' ';
  window.ThemeFX = window.ThemeFX || {};

  function $(s, el) { return (el || doc).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(s)); }
  function rub(n) { return n ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NB) + NB + '₽' : '∞'; }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- Дизайны ---------- */
  var cleanup = null;
  function current() { return root.getAttribute('data-theme'); }
  function mountFX() {
    if (cleanup) { try { cleanup(); } catch (x) { console.error(x); } cleanup = null; }
    var fx = window.ThemeFX[current()];
    if (fx && fx.mount) { try { cleanup = fx.mount({ reduced: reduced.matches }) || null; } catch (x) { console.error(x); } }
  }
  function markSwitch() {
    $$('.switch__btn').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.setTheme === current() ? 'true' : 'false'); });
  }
  function anchorSection() {
    var hh = ($('.top') || {}).offsetHeight || 0, best = null;
    $$('main > .sec, .foot').forEach(function (s) {
      var r = s.getBoundingClientRect();
      if (r.top <= hh + 2 && r.bottom > hh + 2) best = { el: s, ratio: (hh - r.top) / Math.max(1, r.height) };
    });
    return best;
  }
  function setTheme(id, btn) {
    if (THEMES.indexOf(id) < 0 || id === current()) return;
    var a = window.scrollY > 40 ? anchorSection() : null;
    function apply() {
      root.setAttribute('data-theme', id);
      try { localStorage.setItem('design', id); } catch (x) {}
      var u = new URL(location.href); u.searchParams.set('d', String(THEMES.indexOf(id) + 1));
      history.replaceState(null, '', u.pathname + u.search + u.hash);
      markSwitch();
      mountFX();
      if (a) {
        var hh = ($('.top') || {}).offsetHeight || 0;
        window.scrollTo(0, a.el.getBoundingClientRect().top + window.scrollY - hh + a.ratio * a.el.offsetHeight);
      }
      doc.dispatchEvent(new CustomEvent('themechange', { detail: { theme: id } }));
    }
    if (doc.startViewTransition && !reduced.matches) {
      var r = btn ? btn.getBoundingClientRect() : { left: innerWidth / 2, top: 0, width: 0, height: 0 };
      var x = r.left + r.width / 2, y = r.top + r.height / 2;
      root.style.setProperty('--vt-x', x + 'px');
      root.style.setProperty('--vt-y', y + 'px');
      root.style.setProperty('--vt-r', Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 'px');
      doc.startViewTransition(apply);
    } else apply();
  }
  doc.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-set-theme]');
    if (b) { ev.preventDefault(); setTheme(b.dataset.setTheme, b); }
  });
  doc.addEventListener('keydown', function (ev) {
    if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
    var t = ev.target; if (t && (t.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(t.tagName))) return;
    var n = parseInt(ev.key, 10);
    if (n >= 1 && n <= THEMES.length) setTheme(THEMES[n - 1], $('[data-set-theme="' + THEMES[n - 1] + '"]'));
  });

  /* ---------- Переписка в телефоне ---------- */
  var ICON = {
    check: '<svg viewBox="0 0 18 10" aria-hidden="true"><path d="M1 5.5l3 3L10.5 1.5M7.5 8.5l1 0L17 1.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
    file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h8l5 5v15H6z" fill="currentColor" opacity=".9"/><path d="M14 2v5h5" fill="none" stroke="#fff" stroke-width="1.4"/></svg>',
    bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6 6 0 0 0-6 6v4l-2 3h16l-2-3V9a6 6 0 0 0-6-6zm-2 15a2 2 0 0 0 4 0z" fill="currentColor"/></svg>'
  };
  function clock(i) { var m = 4 + i; return '12:' + (m < 10 ? '0' + m : m); }

  function Chat(el) {
    this.el = el; this.feed = $('.tg__feed', el); this.status = $('.tg__status', el);
    this.run = 0; this.visible = false; this.waiters = [];
    this.loop = el.hasAttribute('data-loop');
    this.load(el.dataset.chat);
    var self = this;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        self.visible = en[0].isIntersecting;
        if (self.visible) { self.waiters.splice(0).forEach(function (f) { f(); }); if (!self.started && el.hasAttribute('data-autoplay')) self.play(); }
      }, { threshold: 0.35 }).observe(el);
    } else { this.visible = true; }
  }
  Chat.prototype.load = function (id) {
    this.id = id; this.data = (window.CHATS || {})[id];
    if (!this.data) return;
    var b = this.data.bot;
    var ava = $('.tg__ava', this.el); ava.textContent = b.letter; ava.style.setProperty('--ava', b.color);
    $('.tg__name', this.el).textContent = b.name;
    this.status.textContent = 'бот';
    this.el.dataset.chat = id;
  };
  Chat.prototype.gate = function () {
    var self = this;
    return this.visible ? Promise.resolve() : new Promise(function (r) { self.waiters.push(r); });
  };
  Chat.prototype.scroll = function () {
    var f = this.feed;
    f.scrollTo({ top: f.scrollHeight, behavior: reduced.matches ? 'auto' : 'smooth' });
  };
  Chat.prototype.add = function (node) {
    this.feed.appendChild(node); this.scroll();
    if (!reduced.matches) requestAnimationFrame(function () { node.classList.add('is-in'); }); else node.classList.add('is-in');
    return node;
  };
  Chat.prototype.msg = function (html, who, cls) {
    var d = doc.createElement('div');
    d.className = 'tg__msg tg__msg--' + who + (cls ? ' ' + cls : '');
    var meta = '<span class="tg__time">' + clock(this.n++) + (who === 'me' ? '<span class="tg__check">' + ICON.check + '</span>' : '') + '</span>';
    d.innerHTML = '<div class="tg__bubble">' + html + meta + '</div>';
    return d;
  };
  Chat.prototype.kb = function (rows) {
    var k = doc.createElement('div'); k.className = 'tg__kb';
    k.innerHTML = rows.map(function (r) {
      return '<div class="tg__kb-row">' + r.map(function (t) { return '<span class="tg__key">' + esc(t) + '</span>'; }).join('') + '</div>';
    }).join('');
    return k;
  };
  Chat.prototype.text = function (s) { return '<span class="tg__text">' + esc(s).replace(/\n/g, '<br>') + '</span>'; };
  Chat.prototype.typing = function (ms, ai) {
    var self = this, t = doc.createElement('div');
    t.className = 'tg__msg tg__msg--bot tg__typing-msg';
    t.innerHTML = '<div class="tg__bubble tg__typing"><i></i><i></i><i></i></div>';
    this.status.textContent = ai ? 'думает…' : 'печатает…';
    this.status.classList.add('is-typing');
    this.add(t);
    return wait(ms).then(function () { t.remove(); self.status.textContent = 'бот'; self.status.classList.remove('is-typing'); });
  };
  Chat.prototype.owner = function (s) {
    var n = doc.createElement('div'); n.className = 'tg__push';
    n.innerHTML = '<span class="tg__push-ico">' + ICON.bell + '</span><span class="tg__push-body"><b>Вам в Telegram</b><span>' + esc(s) + '</span></span>';
    $('.tg', this.el).appendChild(n);
    requestAnimationFrame(function () { n.classList.add('is-in'); });
    return wait(2600).then(function () { n.classList.remove('is-in'); return wait(400); }).then(function () { n.remove(); });
  };
  Chat.prototype.app = function (a) {
    var p = doc.createElement('div'); p.className = 'tg__app';
    p.innerHTML = '<div class="tg__app-head"><b>' + esc(a.title) + '</b><span>приложение</span></div><div class="tg__app-grid">' +
      a.items.map(function (it) { return '<div class="tg__app-item"><span class="tg__app-pic"></span><b>' + esc(it[0]) + '</b><span>' + esc(it[1]) + '</span><span class="tg__app-row"><span>' + esc(it[2]) + '</span><span class="tg__app-add">+</span></span></div>'; }).join('') +
      '</div><div class="tg__app-cart">' + esc(a.cart) + '</div>';
    $('.tg', this.el).appendChild(p);
    var items = $$('.tg__app-item', p);
    requestAnimationFrame(function () { p.classList.add('is-in'); });
    var chain = wait(700);
    [0, 1, 3].forEach(function (i) { chain = chain.then(function () { items[i].classList.add('is-added'); return wait(450); }); });
    return chain.then(function () { $('.tg__app-cart', p).classList.add('is-pressed'); return wait(700); })
      .then(function () { p.classList.remove('is-in'); return wait(450); }).then(function () { p.remove(); });
  };
  Chat.prototype.clear = function () {
    this.feed.innerHTML = ''; this.n = 0;
    $$('.tg__push, .tg__app', this.el).forEach(function (n) { n.remove(); });
    this.status.textContent = 'бот'; this.status.classList.remove('is-typing');
  };
  Chat.prototype.renderAll = function () {
    // Без анимации: вся переписка сразу
    var self = this; this.clear();
    (this.data.steps || []).forEach(function (s) { var n = self.build(s); if (n) { n.classList.add('is-in'); self.feed.appendChild(n); } });
    this.feed.scrollTop = this.feed.scrollHeight;
  };
  Chat.prototype.build = function (s) {
    if (s.b) { var m = this.msg(this.text(s.b), 'bot'); if (s.kb) m.appendChild(this.kb(s.kb)); return m; }
    if (s.u) return this.msg(this.text(s.u), 'me');
    if (s.tap) return s.silent ? null : this.msg(this.text(s.say || s.tap), 'me');
    if (s.voice) return this.msg('<span class="tg__voice"><span class="tg__play">' + ICON.play + '</span><span class="tg__wave">' + new Array(22).join('<i></i>') + '</span><span class="tg__dur">' + esc(s.voice) + '</span></span>' + (s.t ? '<span class="tg__transcript">' + esc(s.t) + '</span>' : ''), 'me', 'tg__msg--voice');
    if (s.card) { var c = this.msg('<span class="tg__card"><b class="tg__card-title">' + esc(s.card.title) + '</b>' + s.card.lines.map(function (l) { return '<span>' + esc(l) + '</span>'; }).join('') + '<b class="tg__card-price">' + esc(s.card.price) + '</b></span>', 'bot', 'tg__msg--card'); if (s.kb) c.appendChild(this.kb(s.kb)); return c; }
    if (s.invoice) return this.msg('<span class="tg__invoice"><b>' + esc(s.invoice.title) + '</b><span>' + esc(s.invoice.desc) + '</span><b class="tg__invoice-sum">' + esc(s.invoice.amount) + '</b><span class="tg__pay">Оплатить ' + esc(s.invoice.amount) + '</span></span>', 'bot', 'tg__msg--invoice');
    if (s.file) return this.msg('<span class="tg__file"><span class="tg__file-ico">' + ICON.file + '</span><span><b>' + esc(s.file.name) + '</b><span>' + esc(s.file.size) + '</span></span></span>', 'bot', 'tg__msg--file');
    if (s.day) { var d = doc.createElement('div'); d.className = 'tg__day'; d.innerHTML = '<span>' + esc(s.day) + '</span>'; return d; }
    return null;
  };
  Chat.prototype.press = function (label) {
    var keys = $$('.tg__key, .tg__pay', this.feed).filter(function (k) { return k.textContent.trim() === label; });
    var k = keys[keys.length - 1];
    if (!k) return wait(200);
    k.classList.add('is-pressed');
    return wait(420).then(function () { k.classList.remove('is-pressed'); });
  };
  Chat.prototype.play = function () {
    if (!this.data) return;
    this.started = true;
    if (reduced.matches) { this.renderAll(); return; }
    var self = this, run = ++this.run, steps = this.data.steps, ai = this.data.bot.ai;
    this.clear();
    var alive = function () { return run === self.run; };
    var i = 0;
    function next() {
      if (!alive()) return;
      if (i >= steps.length) {
        if (self.loop) return wait(5200).then(function () { if (alive()) { self.feed.classList.add('is-fading'); return wait(450); } })
          .then(function () { if (alive()) { self.feed.classList.remove('is-fading'); self.play(); } });
        self.el.classList.add('is-done');
        return;
      }
      var s = steps[i++];
      return self.gate().then(function () {
        if (!alive()) return;
        if (s.b || s.card || s.invoice || s.file) {
          var len = (s.b || '').length;
          var ms = s.think || Math.max(650, Math.min(1700, 380 + len * 14));
          return wait(380).then(function () { return alive() && self.typing(ms, ai); }).then(function () { if (alive()) self.add(self.build(s)); });
        }
        if (s.u || s.voice) return wait(900).then(function () { if (alive()) self.add(self.build(s)); });
        if (s.tap) return wait(900).then(function () { return alive() && self.press(s.tap); }).then(function () { var n = alive() && self.build(s); if (n) self.add(n); });
        if (s.day) return wait(700).then(function () { if (alive()) self.add(self.build(s)); });
        if (s.owner) return wait(500).then(function () { return alive() && self.owner(s.owner); });
        if (s.app) return wait(300).then(function () { return alive() && self.app(s.app); });
      }).then(function () { return wait(250); }).then(next);
    }
    this.el.classList.remove('is-done');
    next();
  };
  Chat.prototype.switchTo = function (id) { this.run++; this.load(id); this.started = false; this.play(); };

  var chats = $$('.phone[data-chat]').map(function (el) { var c = new Chat(el); el._chat = c; return c; });

  /* ---------- Каталог ботов ---------- */
  var list = $('.bots__list'), demo = $('#bots-demo'), demoHome = demo && demo.parentNode, demoPhone = $('#bots-phone');
  function placeDemo() {
    if (!demo) return;
    var on = $('.bot.is-on', list);
    if (narrow.matches && on) { if (demo.parentNode !== on) on.appendChild(demo); }
    else if (demo.parentNode !== demoHome) demoHome.appendChild(demo);
  }
  function selectBot(li, play) {
    $$('.bot', list).forEach(function (b) { var on = b === li; b.classList.toggle('is-on', on); $('.bot__btn', b).setAttribute('aria-pressed', on ? 'true' : 'false'); });
    placeDemo();
    var name = $('.bot__name', li).textContent;
    var want = $('.bots__want');
    if (want) want.href = 'https://t.me/arturleto?text=' + encodeURIComponent('Здравствуйте! Хочу бота: ' + name);
    if (demoPhone && demoPhone._chat) { if (play) demoPhone._chat.switchTo(li.dataset.bot); else demoPhone._chat.load(li.dataset.bot); }
  }
  if (list) {
    list.addEventListener('click', function (ev) {
      var btn = ev.target.closest('.bot__btn'); if (!btn) return;
      var li = btn.closest('.bot');
      selectBot(li, true);
      if (narrow.matches) setTimeout(function () { li.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' }); }, 60);
    });
    $$('.filter').forEach(function (f) {
      f.addEventListener('click', function () {
        var k = f.dataset.filter;
        $$('.filter').forEach(function (x) { var on = x === f; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        var firstShown = null;
        $$('.bot', list).forEach(function (b) {
          var show = k === 'all' || b.dataset.tags.split(' ').indexOf(k) > -1;
          b.hidden = !show; if (show && !firstShown) firstShown = b;
        });
        var on = $('.bot.is-on', list);
        if ((!on || on.hidden) && firstShown) selectBot(firstShown, true);
      });
    });
    var rep = $('.bots__replay');
    if (rep) rep.addEventListener('click', function () { demoPhone._chat.switchTo(demoPhone._chat.id); });
    narrow.addEventListener ? narrow.addEventListener('change', placeDemo) : narrow.addListener(placeDemo);
    placeDemo();
    if (demoPhone) {
      // Первый бот запускается, когда телефон показался на экране
      demoPhone.setAttribute('data-autoplay', '');
    }
  }

  /* ---------- Бюджет ---------- */
  var budget = $('.budget');
  if (budget) {
    var steps = JSON.parse(budget.dataset.steps), inf = JSON.parse(budget.dataset.infinity);
    var range = $('.budget__range', budget), out = $('.budget__value', budget);
    var head = $('.budget__head', budget), ul = $('.budget__items', budget), more = $('.budget__more', budget);
    var rows = $$('.pricelist__row').map(function (r) { return { name: $('.pricelist__name', r).textContent, price: +r.dataset.price, kind: r.dataset.kind, el: r }; });
    var upd = function () {
      var i = +range.value, v = steps[i], prev = i > 0 ? steps[i - 1] : 0;
      out.textContent = v ? rub(v) : '∞';
      range.setAttribute('aria-valuetext', v ? rub(v) : 'без ограничений');
      budget.style.setProperty('--pos', (i / (steps.length - 1)));
      budget.dataset.level = i;
      $$('.budget__scale li', budget).forEach(function (li, k) { li.classList.toggle('is-on', k === i); li.classList.toggle('is-passed', k < i); });
      var fit = rows.filter(function (r) { return v ? (r.price && r.price <= v) : true; });
      var fresh = rows.filter(function (r) { return v ? (r.price && r.price <= v && r.price > prev) : !r.price; });
      rows.forEach(function (r) { r.el.classList.toggle('is-fit', fit.indexOf(r) > -1); r.el.classList.toggle('is-fresh', fresh.indexOf(r) > -1); });
      if (!v) {
        head.textContent = inf[0];
        ul.innerHTML = fresh.map(function (r) { return '<li class="budget__item"><span>' + esc(r.name) + '</span><b>по задаче</b></li>'; }).join('');
        more.textContent = inf[1];
        return;
      }
      head.textContent = 'За ' + rub(v) + ' можно сделать';
      ul.innerHTML = fresh.map(function (r) { return '<li class="budget__item budget__item--' + r.kind + '"><span>' + esc(r.name) + '</span><b>от' + NB + rub(r.price) + '</b></li>'; }).join('');
      var rest = fit.length - fresh.length;
      more.textContent = rest ? 'И ещё ' + rest + ' ' + plural(rest, 'вариант', 'варианта', 'вариантов') + ' дешевле.' : 'Это самый простой и быстрый старт.';
    };
    range.addEventListener('input', upd);
    $$('.budget__scale li', budget).forEach(function (li, k) {
      li.addEventListener('click', function () { range.value = k; upd(); });
    });
    upd();
  }
  function plural(n, a, b, c) { var m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c); }

  /* ---------- Часы: Москва и Бали ---------- */
  function tz(offset) { var d = new Date(Date.now() + (offset * 60 + new Date().getTimezoneOffset()) * 60000); return d; }
  function hm(d) { return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function ticks() {
    var msk = tz(3), bali = tz(8);
    $$('[data-msk-time]').forEach(function (n) { n.textContent = hm(msk); });
    $$('[data-bali-time]').forEach(function (n) { n.textContent = hm(bali); });
    var items = $$('.day__item[data-time]'), now = msk.getHours() * 60 + msk.getMinutes(), next = null;
    items.forEach(function (it) {
      var p = it.dataset.time.split(':'), m = +p[0] * 60 + +p[1];
      it.classList.toggle('is-past', m <= now);
      it.classList.remove('is-next');
      if (m > now && !next) next = it;
    });
    if (!next) next = items[0];
    if (next) {
      next.classList.add('is-next');
      var n = $('[data-day-next]');
      if (n) n.textContent = 'Следующая задача в ' + next.dataset.time + ': ' + $('.day__who', next).textContent.split(',')[0] + ' ' + $('.day__what', next).textContent.toLowerCase() + '.';
    }
  }
  ticks(); setInterval(ticks, 20000);

  /* ---------- Появление при прокрутке ---------- */
  var revealSel = '.sec__head, .hero__facts .fact, .filters, .bot, .ai__item, .site, .sites__base, .demo, .case, .day, .budget, .pricelist__col, .step, .qa, .contact__pic, .contact__body, .foot__name';
  var revealEls = $$(revealSel);
  revealEls.forEach(function (el) { el.setAttribute('data-reveal', ''); });
  if ('IntersectionObserver' in window && !reduced.matches) {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('is-in'); io.unobserve(x.target); } });
    }, { rootMargin: '0px', threshold: 0 });
    revealEls.forEach(function (el, k) { el.style.setProperty('--i', k % 6); io.observe(el); });
  } else revealEls.forEach(function (el) { el.classList.add('is-in'); });

  /* ---------- Шапка и активный раздел ---------- */
  var top = $('.top');
  function onScroll() { if (top) top.classList.toggle('is-scrolled', window.scrollY > 12); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  function topH() { if (top) root.style.setProperty('--top-h', top.offsetHeight + 'px'); }
  topH(); window.addEventListener('resize', topH); doc.addEventListener('themechange', function () { requestAnimationFrame(topH); });
  if (window.ResizeObserver && top) new ResizeObserver(topH).observe(top);
  if ('IntersectionObserver' in window) {
    var links = $$('.nav__link');
    var so = new IntersectionObserver(function (en) {
      en.forEach(function (x) {
        if (!x.isIntersecting) return;
        links.forEach(function (l) { l.classList.toggle('is-on', l.getAttribute('href') === '#' + x.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main > .sec[id]').forEach(function (s) { so.observe(s); });
  }

  /* ---------- Старт ---------- */
  markSwitch();
  mountFX();
  root.classList.add('is-ready');
  window.Site = { setTheme: setTheme, themes: THEMES, chats: chats };
})();
