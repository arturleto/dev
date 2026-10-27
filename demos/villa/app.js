/* Samudra Villas: подбор виллы, галереи, сцены прокрутки, бронь. Без библиотек. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Данные вилл ---------- */
  const VILLAS = [
    { id: 'ombak', name: 'Ombak', area: 'canggu', areaName: 'Чангу', price: 270, guests: 4, beds: 2, busy: [['2026-12-20', '2027-01-04']] },
    { id: 'tebing', name: 'Tebing', area: 'uluwatu', areaName: 'Улувату', price: 420, guests: 6, beds: 3, busy: [['2026-11-28', '2026-12-08']] },
    { id: 'sawah', name: 'Sawah', area: 'ubud', areaName: 'Убуд', price: 190, guests: 4, beds: 2, busy: [['2027-01-10', '2027-01-24']] },
    { id: 'senja', name: 'Senja', area: 'seminyak', areaName: 'Семиньяк', price: 560, guests: 8, beds: 4, busy: [['2026-12-24', '2027-01-08']] },
  ];
  const byId = Object.fromEntries(VILLAS.map((v) => [v.id, v]));
  const AREA_IN = { canggu: 'в Чангу', uluwatu: 'в Улувату', ubud: 'в Убуде', seminyak: 'в Семиньяке', any: '' };

  /* ---------- Помощники ---------- */
  const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const plural = (n, one, few, many) => { const a = Math.abs(n) % 100, b = a % 10; if (a > 10 && a < 20) return many; if (b > 1 && b < 5) return few; if (b === 1) return one; return many; };
  const nightsWord = (n) => plural(n, 'ночь', 'ночи', 'ночей');
  const guestsWord = (n) => plural(n, 'гость', 'гостя', 'гостей');
  const money = (n) => Math.round(n).toLocaleString('ru-RU').replace(/\s/g, ' ') + ' $';
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parse = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const diffDays = (a, b) => Math.round((b - a) / 86400000);
  const dayMonth = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  const range = (a, b) => (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear() ? `с ${a.getDate()} по ${dayMonth(b)}` : `с ${dayMonth(a)} по ${dayMonth(b)}`);
  const ARROW = '<svg class="row__arrow" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h12M11 5l5 5-5 5"/></svg>';

  function quote(v, ci, co) {
    const nights = diffDays(ci, co);
    const base = nights * v.price;
    const disc = nights >= 14 ? Math.round(base * 0.1) : 0;
    const busy = v.busy.map(([s, e]) => [parse(s), parse(e)]).find(([s, e]) => ci < e && co > s);
    return { nights, base, disc, total: base - disc, busy };
  }

  /* ---------- Ссылка «Хочу такой сайт» ---------- */
  const tg = 'https://t.me/arturleto?text=' + encodeURIComponent('Здравствуйте! Хочу сайт как демо «Samudra Villas»');
  $$('[data-tg]').forEach((a) => { a.href = tg; a.target = '_blank'; a.rel = 'noopener'; });

  /* ---------- Шапка и меню ---------- */
  const bar = $('#top-bar');
  const menu = $('#menu');
  const menuBtn = $('.top__menu');
  const onScrollBar = () => bar.classList.toggle('is-solid', scrollY > innerHeight * 0.8 || !menu.hidden);
  addEventListener('scroll', onScrollBar, { passive: true });
  onScrollBar();
  const setMenu = (open) => {
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    onScrollBar();
    if (open) { $$('.menu__nav a').forEach((a, i) => a.style.setProperty('--i', i)); $('.menu__nav a').focus(); } else menuBtn.focus({ preventScroll: true });
  };
  menuBtn.addEventListener('click', () => setMenu(menu.hidden));
  $('.menu__close').addEventListener('click', () => setMenu(false));
  $$('.menu__nav a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) setMenu(false); });

  /* ---------- Первый экран ---------- */
  $$('.ln__in').forEach((el) => {
    const done = () => el.parentElement.classList.add('is-done');
    if (reduce.matches || !getComputedStyle(el).animationName || getComputedStyle(el).animationName === 'none') done();
    else el.addEventListener('animationend', done, { once: true });
  });
  const video = $('.hero__video');
  if (video) {
    if (reduce.matches) { video.removeAttribute('autoplay'); video.pause(); }
    else {
      const play = () => { const p = video.play(); if (p && p.catch) p.catch(() => {}); };
      new IntersectionObserver(([e]) => (e.isIntersecting ? play() : video.pause()), { threshold: 0.05 }).observe(video);
    }
  }

  /* ---------- Появление по прокрутке ----------
     Скрываем блок только когда он на подходе (экран ниже), и сразу показываем при входе. */
  const reveals = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduce.matches) {
    const show = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in')));
      show.unobserve(el); pre.unobserve(el);
    }), { rootMargin: '0px 0px -6% 0px', threshold: 0.01 });
    const pre = new IntersectionObserver((es) => es.forEach((e) => {
      const el = e.target;
      if (el.classList.contains('is-in')) return;
      const r = e.boundingClientRect;
      if (e.isIntersecting && r.top > innerHeight * 0.94) el.classList.add('is-pre');
    }), { rootMargin: '0px 0px 110% 0px' });
    reveals.forEach((el) => { pre.observe(el); show.observe(el); });
  } else reveals.forEach((el) => el.classList.add('is-in'));

  /* ---------- Виллы: горизонтальный ход при прокрутке ---------- */
  const villas = $('.villas');
  const track = $('.villas__track');
  const wide = matchMedia('(min-width: 901px) and (prefers-reduced-motion: no-preference)');
  let dx = 0, queued = false;
  const place = () => {
    queued = false;
    if (!villas.classList.contains('is-pinned')) return;
    const p = Math.min(1, Math.max(0, -villas.getBoundingClientRect().top / dx));
    track.style.transform = `translate3d(${(-p * dx).toFixed(1)}px,0,0)`;
  };
  const measure = () => {
    villas.classList.add('is-pinned');
    track.style.transform = '';
    dx = track.scrollWidth - track.parentElement.clientWidth;
    const pin = wide.matches && dx > 0 && dx < innerHeight * 3.2;
    villas.classList.toggle('is-pinned', pin);
    villas.style.height = pin ? `${innerHeight + dx}px` : '';
    if (!pin) track.style.transform = '';
    place();
  };
  track.addEventListener('focusin', (e) => {
    if (!villas.classList.contains('is-pinned')) return;
    const item = e.target.closest('.villa, .villas__intro'); if (!item) return;
    const x = Math.min(dx, Math.max(0, item.offsetLeft - parseFloat(getComputedStyle(track).paddingLeft)));
    scrollTo({ top: villas.getBoundingClientRect().top + scrollY + x, behavior: 'instant' });
  });
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(place); } }, { passive: true });
  addEventListener('resize', measure);
  addEventListener('load', measure);
  wide.addEventListener('change', measure);
  measure();

  /* Галереи вилл */
  $$('[data-gallery]').forEach((g) => {
    const shots = $$('.villa__shot', g), btns = $$('.villa__thumbs button', g), cap = $('.villa__cap', g);
    let cur = 0;
    const show = (i) => {
      cur = (i + shots.length) % shots.length;
      shots.forEach((s, k) => s.classList.toggle('is-on', k === cur));
      btns.forEach((b, k) => b.setAttribute('aria-pressed', String(k === cur)));
      cap.textContent = shots[cur].dataset.cap;
    };
    btns.forEach((b, k) => b.addEventListener('click', () => show(k)));
    let sx = null;
    g.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') sx = e.clientX; });
    g.addEventListener('pointerup', (e) => { if (sx == null) return; const d = e.clientX - sx; sx = null; if (Math.abs(d) > 44) show(cur + (d < 0 ? 1 : -1)); });
    g.addEventListener('pointercancel', () => { sx = null; });
  });

  /* ---------- Подбор по датам ---------- */
  const pick = $('#pick');
  const pIn = $('#pick-in'), pOut = $('#pick-out'), pG = $('#pick-guests');
  const rowsEl = $('#pick-rows'), sumEl = $('#pick-summary'), hintEl = $('#pick-hint');
  const stepBtns = $$('.stepper__btn');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = addDays(today, 21);
  let guests = 2;
  pIn.min = iso(addDays(today, 1));
  pIn.value = iso(start);
  pOut.value = iso(addDays(start, 10));
  pOut.min = iso(addDays(start, 1));
  const area = () => ($('input[name="area"]:checked') || {}).value || 'any';

  const tweens = new WeakMap();
  const roll = (el, to) => {
    const from = parseFloat(el.dataset.v || '0');
    el.dataset.v = to;
    if (reduce.matches || !from || from === to) { el.textContent = money(to); return; }
    cancelAnimationFrame(tweens.get(el));
    const t0 = performance.now(), dur = 420;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
      el.textContent = money(from + (to - from) * e);
      if (k < 1) tweens.set(el, requestAnimationFrame(step));
    };
    tweens.set(el, requestAnimationFrame(step));
  };

  const prevTotals = {};
  function renderPick() {
    const ci = parse(pIn.value), co = parse(pOut.value), a = area();
    stepBtns[0].disabled = guests <= 1;
    stepBtns[1].disabled = guests >= 8;
    pG.textContent = guests;
    if (ci) pOut.min = iso(addDays(ci, 1));
    hintEl.textContent = '';
    if (!ci || !co) { sumEl.textContent = 'Выберите даты заезда и выезда'; rowsEl.innerHTML = ''; return; }
    const nights = diffDays(ci, co);
    if (ci < today) { sumEl.textContent = 'Дата заезда уже прошла. Выберите дату позже.'; rowsEl.innerHTML = ''; return; }
    if (nights < 1) { sumEl.textContent = 'Выезд должен быть позже заезда'; rowsEl.innerHTML = ''; return; }
    if (nights < 3) { sumEl.textContent = `${nights} ${nightsWord(nights)} мало: бронируем от 3 ночей`; rowsEl.innerHTML = ''; return; }
    sumEl.textContent = `${nights} ${nightsWord(nights)}, ${range(ci, co)}, ${guests} ${guestsWord(guests)}`;

    const inArea = VILLAS.filter((v) => a === 'any' || v.area === a);
    const fit = inArea.filter((v) => v.guests >= guests).sort((x, y) => x.price - y.price);
    const tooSmall = inArea.filter((v) => v.guests < guests);
    rowsEl.innerHTML = '';
    if (!fit.length) {
      const li = document.createElement('li');
      li.className = 'pick__empty';
      const alt = VILLAS.filter((v) => v.guests >= guests).map((v) => `${v.name} ${AREA_IN[v.area]}`);
      const here = tooSmall[0] ? `${AREA_IN[a].replace(/^в/, 'В')} вилла на ${tooSmall[0].guests} ${guestsWord(tooSmall[0].guests)}. ` : '';
      li.textContent = `${here}На ${guests} ${guestsWord(guests)} ${alt.length > 1 ? 'подойдут' : 'подойдёт'} ${alt.join(' или ')}. Выберите «Любой» район.`;
      rowsEl.append(li);
    }
    for (const v of fit) {
      const q = quote(v, ci, co);
      const li = document.createElement('li');
      const el = document.createElement(q.busy ? 'div' : 'a');
      el.className = 'row' + (q.busy ? ' is-busy' : '');
      if (!q.busy) { el.href = '#book'; el.dataset.villa = v.id; }
      const notes = [];
      if (q.busy) notes.push(`Занята ${range(q.busy[0], q.busy[1])}. Свободна с ${dayMonth(q.busy[1])}.`);
      else {
        notes.push(`${q.nights} ${nightsWord(q.nights)} по ${money(v.price)}`);
        if (q.disc) notes.push(`скидка 10%: −${money(q.disc)}`);
        if (q.nights >= 7) notes.push('трансфер и день с гидом включены');
      }
      const note = notes.join(', ').replace(/^./, (c) => c.toUpperCase());
      el.innerHTML = `<span class="row__kind">${v.areaName}</span><span class="row__name">${v.name}, ${v.beds} ${plural(v.beds, 'спальня', 'спальни', 'спален')}</span><span class="row__total"></span>${q.busy ? '<span></span>' : ARROW}<span class="row__note">${note}</span>`;
      const tot = $('.row__total', el);
      if (q.busy) tot.textContent = 'занята';
      else { tot.dataset.v = prevTotals[v.id] || 0; roll(tot, q.total); prevTotals[v.id] = q.total; }
      li.append(el);
      rowsEl.append(li);
    }
    const hints = [];
    if (nights < 7) hints.push(`Ещё ${7 - nights} ${nightsWord(7 - nights)}, и трансфер с гидом будут бесплатными.`);
    else if (nights < 14) hints.push(`Ещё ${14 - nights} ${nightsWord(14 - nights)}, и будет скидка 10%.`);
    else hints.push('Скидка 10% уже в итоге.');
    if (tooSmall.length && fit.length) hints.push(`${tooSmall.map((v) => v.name).join(' и ')} ${tooSmall.length > 1 ? 'вмещают' : 'вмещает'} до ${tooSmall[0].guests} гостей.`);
    hintEl.textContent = hints.join(' ');
  }
  [pIn, pOut].forEach((el) => el.addEventListener('change', () => {
    const ci = parse(pIn.value), co = parse(pOut.value);
    if (el === pIn && ci && co && co <= ci) pOut.value = iso(addDays(ci, Math.max(3, diffDays(ci, co) > 0 ? diffDays(ci, co) : 7)));
    renderPick();
  }));
  stepBtns.forEach((b) => b.addEventListener('click', () => { guests = Math.min(8, Math.max(1, guests + +b.dataset.step)); renderPick(); }));
  $$('input[name="area"]').forEach((r) => r.addEventListener('change', renderPick));
  rowsEl.addEventListener('click', (e) => {
    const row = e.target.closest('a.row'); if (!row) return;
    fillBooking(row.dataset.villa, pIn.value, pOut.value, guests);
  });
  $$('.villa__go').forEach((a) => a.addEventListener('click', () => {
    const r = $(`input[name="area"][value="${a.dataset.area}"]`);
    if (r) { r.checked = true; renderPick(); }
  }));
  renderPick();

  /* ---------- Что входит: шаги ---------- */
  const incl = $('#included');
  const items = $$('.incl__item', incl), pics = $$('.incl__pic', incl), more = $('#incl-more');
  const setStep = (i) => {
    items.forEach((el, k) => el.classList.toggle('is-active', k === i));
    pics.forEach((p) => p.classList.toggle('is-on', +p.dataset.for === i));
    more.textContent = items[i].dataset.more;
  };
  if ('IntersectionObserver' in window) {
    const marks = $$('.incl__marks span', incl);
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setStep(marks.indexOf(e.target)); }), { rootMargin: '-50% 0px -50% 0px' });
    marks.forEach((m) => io.observe(m));
  }
  setStep(0);

  /* ---------- Районы на карте ---------- */
  const pins = $$('.pin'), areas = $$('.area');
  const setArea = (a) => {
    pins.forEach((p) => p.classList.toggle('is-on', p.dataset.area === a));
    areas.forEach((el) => el.classList.toggle('is-on', el.dataset.area === a));
  };
  pins.forEach((p) => {
    p.addEventListener('click', () => setArea(p.dataset.area));
    p.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setArea(p.dataset.area); } });
    p.addEventListener('mouseenter', () => setArea(p.dataset.area));
  });
  areas.forEach((el) => {
    $('.area__btn', el).addEventListener('click', () => setArea(el.dataset.area));
    el.addEventListener('mouseenter', () => setArea(el.dataset.area));
    el.addEventListener('focusin', () => setArea(el.dataset.area));
  });
  setArea('canggu');
  const map = $('#map');
  const phone = matchMedia('(max-width: 620px)');
  const sea = $$('.map__sea text', map);
  const fitMap = () => {
    if (phone.matches) {
      map.setAttribute('viewBox', '392 300 366 400');
      sea[0].setAttribute('x', '404'); sea[0].setAttribute('y', '652');
      sea[1].setAttribute('x', '404'); sea[1].setAttribute('y', '680');
    } else {
      map.setAttribute('viewBox', '-10 30 1020 620');
      sea[0].setAttribute('x', '150'); sea[0].setAttribute('y', '540');
      sea[1].setAttribute('x', '150'); sea[1].setAttribute('y', '574');
    }
  };
  phone.addEventListener('change', fitMap);
  fitMap();

  /* ---------- Бронь ---------- */
  const bForm = $('#book-form'), bVilla = $('#book-villa'), bIn = $('#book-in'), bOut = $('#book-out'), bG = $('#book-guests');
  const bSum = $('#book-sum'), bErr = $('#book-err');
  bIn.min = pIn.min;
  bIn.value = pIn.value; bOut.value = pOut.value;
  function fillBooking(id, ci, co, g) {
    if (id) bVilla.value = id;
    if (ci) bIn.value = ci;
    if (co) bOut.value = co;
    if (g) bG.value = String(g);
    renderBook();
  }
  function renderBook() {
    const v = byId[bVilla.value], ci = parse(bIn.value), co = parse(bOut.value), g = +bG.value;
    bErr.textContent = '';
    if (!ci || !co || diffDays(ci, co) < 1) { bSum.textContent = ''; return null; }
    const q = quote(v, ci, co);
    if (q.nights < 3) { bSum.textContent = 'Бронируем от 3 ночей.'; return null; }
    if (q.busy) { bSum.textContent = `${v.name} занята ${range(q.busy[0], q.busy[1])}.`; return null; }
    if (g > v.guests) { bSum.textContent = `В ${v.name} до ${v.guests} гостей.`; return null; }
    bSum.textContent = `${v.name}, ${q.nights} ${nightsWord(q.nights)}: ${money(q.total)}${q.disc ? ', со скидкой 10%' : ''}`;
    return q;
  }
  [bVilla, bIn, bOut, bG].forEach((el) => el.addEventListener('change', renderBook));
  renderBook();

  const dlg = $('#demo-dialog');
  const openDemo = () => { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); };
  const closeDemo = () => { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); };
  bForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = renderBook();
    const name = bForm.elements.name.value.trim(), contact = bForm.elements.contact.value.trim();
    let err = '';
    if (!parse(bIn.value) || !parse(bOut.value)) err = 'Укажите даты заезда и выезда.';
    else if (!q) err = bSum.textContent ? `${bSum.textContent} Поменяйте даты, гостей или виллу.` : 'Проверьте даты.';
    else if (!name) err = 'Напишите, как к вам обращаться.';
    else if (contact.replace(/[^\w@+]/g, '').length < 4) err = 'Оставьте Telegram или телефон, чтобы мы могли ответить.';
    if (err) {
      bErr.textContent = err;
      const bad = !q ? bIn : !name ? bForm.elements.name : bForm.elements.contact;
      bad.focus();
      return;
    }
    openDemo();
    bForm.reset();
    fillBooking(null, pIn.value, pOut.value, guests);
  });
  $$('[data-demo]').forEach((b) => b.addEventListener('click', openDemo));
  $$('[data-close]', dlg).forEach((b) => b.addEventListener('click', closeDemo));
  dlg.addEventListener('click', (e) => { if (e.target === dlg) closeDemo(); });

  /* ---------- Плашка демо ---------- */
  const badge = $('#demo-badge');
  const KEY = 'samudra-demo-min';
  const setMin = (m) => { badge.classList.toggle('is-min', m); try { sessionStorage.setItem(KEY, m ? '1' : ''); } catch (e) { /* приватный режим */ } };
  try { if (sessionStorage.getItem(KEY)) badge.classList.add('is-min'); } catch (e) { /* приватный режим */ }
  $('.demo__x', badge).addEventListener('click', () => { setMin(true); $('.demo__mini', badge).focus(); });
  $('.demo__mini', badge).addEventListener('click', () => { setMin(false); $('.demo__link', badge).focus(); });

  /* ---------- Бегущая строка: скорость около 70 px в секунду ---------- */
  const set = $('.marquee__set');
  const tune = () => { if (set) document.documentElement.style.setProperty('--marq-t', `${Math.round(set.offsetWidth / 70)}s`); };
  addEventListener('load', tune); tune();
})();
