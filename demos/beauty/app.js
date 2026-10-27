/* Пион, студия красоты. Демо-сайт. Запись, сцена, движение, плашка демо. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desk = matchMedia('(min-width: 1000px)');
  document.documentElement.classList.add('js');

  const money = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽';
  const plural = (n, a, b, c) => { const m10 = n % 10, m100 = n % 100; if (m10 === 1 && m100 !== 11) return a; if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return b; return c; };
  const dur = (m) => { const h = Math.floor(m / 60), r = m % 60; return (h ? h + ' ч' : '') + (h && r ? ' ' : '') + (r ? r + ' мин' : ''); };
  const hm = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- Появление блоков ---------- */
  const reveal = $$('[data-reveal]');
  for (const el of reveal) {
    const box = (el.parentElement && el.parentElement.closest('.group, section, footer, .slip-wrap')) || document.body;
    const sibs = $$('[data-reveal]', box);
    el.style.setProperty('--d', Math.min(Math.max(sibs.indexOf(el), 0), 5) * 80 + 'ms');
  }
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -4% 0px', threshold: 0 });
    reveal.forEach((el) => io.observe(el));
  } else reveal.forEach((el) => el.classList.add('is-in'));

  /* ---------- Демо-окно ---------- */
  const dlg = $('#dlg');
  const dlgSum = $('#dlgSum');
  function openDemo(summary) {
    dlgSum.textContent = summary || '';
    if (typeof dlg.showModal === 'function') { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', '');
  }
  $('#dlgClose').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  for (const a of $$('[data-demo]')) a.addEventListener('click', (e) => {
    e.preventDefault();
    openDemo(a.dataset.demo === 'call' ? 'Здесь была бы ссылка на настоящий телефон студии: на телефоне номер набрался бы сам.' : 'Здесь открылся бы чат студии в Telegram.');
  });

  /* ---------- Плашка демо ---------- */
  const demo = $('#demo');
  const setMin = (on) => { demo.classList.toggle('min', on); try { sessionStorage.setItem('pion-demo-min', on ? '1' : ''); } catch (_) {} };
  try { if (sessionStorage.getItem('pion-demo-min')) demo.classList.add('min'); } catch (_) {}
  $('#demoMin').addEventListener('click', () => { setMin(true); $('#demoOpen').focus(); });
  $('#demoOpen').addEventListener('click', () => { setMin(false); $('#demoMin').focus(); });

  /* ---------- Меню на телефоне ---------- */
  const menu = $('#menu'), menuOpen = $('#menuOpen');
  function closeMenu() { menu.hidden = true; menuOpen.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; }
  menuOpen.addEventListener('click', () => {
    menu.hidden = false; menuOpen.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden';
    $('nav a', menu).focus();
  });
  $('#menuClose').addEventListener('click', () => { closeMenu(); menuOpen.focus(); });
  $$('a', menu).forEach((a) => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { closeMenu(); menuOpen.focus(); } });

  /* ---------- Сцена: фото меняется вместе с разделом ---------- */
  const stage = $('.stage');
  const layers = Object.fromEntries($$('.stage__layer').map((l) => [l.dataset.layer, l]));
  const cap = $('#stageCap');
  const video = $('.stage video');
  const caps = { hero: 'Тверская, 18, второй этаж', nails: 'Маникюр, мастер Мария', pedicure: 'Педикюр, мастер Анна', brows: 'Брови, мастер Ольга', hair: 'Стрижка, мастер Виктория', room: 'Зал на втором этаже' };
  const marks = $$('[data-stage]');
  let cur = 'hero';

  if (reduce && video) { video.removeAttribute('autoplay'); video.pause(); }
  const playVideo = (on) => { if (!video || reduce) return; if (on) { const p = video.play(); if (p && p.catch) p.catch(() => {}); } else video.pause(); };

  /* Работы: одна рамка, содержимое меняется */
  const workBtns = $$('.work');
  const works = workBtns.map((b) => ({ cap: $('.work__name', b).textContent + ', ' + $('.work__who', b).textContent.split(',')[0] }));
  const stageWorks = $$('.works-set > img');
  const phoneWorks = $$('#worksBox > img');
  const worksCap = $('#worksCap');
  let wi = 0, wTimer = null, wHold = 0;
  function setWork(i) {
    wi = (i + works.length) % works.length;
    stageWorks.forEach((im, k) => im.classList.toggle('on', k === wi));
    phoneWorks.forEach((im, k) => im.classList.toggle('on', k === wi));
    workBtns.forEach((b, k) => b.setAttribute('aria-pressed', String(k === wi)));
    worksCap.textContent = works[wi].cap;
    if (cur === 'works') cap.textContent = works[wi].cap;
  }
  function startWorks() { if (reduce || wTimer) return; wTimer = setInterval(() => { if (Date.now() > wHold) setWork(wi + 1); }, 3000); }
  function stopWorks() { clearInterval(wTimer); wTimer = null; }
  workBtns.forEach((b, k) => b.addEventListener('click', () => { setWork(k); wHold = Date.now() + 8000; }));
  const box = $('#worksBox');
  const nextWork = () => { setWork(wi + 1); wHold = Date.now() + 8000; };
  box.addEventListener('click', nextWork);
  box.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nextWork(); } });

  function setStage(key) {
    if (key === cur) return;
    if (layers[cur]) layers[cur].classList.remove('on');
    cur = key;
    if (layers[key]) layers[key].classList.add('on');
    stage.dataset.on = key;
    cap.textContent = key === 'works' ? works[wi].cap : caps[key];
    playVideo(key === 'hero');
    if (key === 'works') startWorks(); else stopWorks();
  }
  function pickStage() {
    if (!desk.matches) return;
    const line = innerHeight * 0.55;
    let key = 'hero';
    for (const m of marks) if (m.getBoundingClientRect().top < line) key = m.dataset.stage;
    setStage(key);
  }

  /* На телефоне: видео играет, пока видно; работы листаются, пока рамка на экране */
  if ('IntersectionObserver' in window) {
    const vio = new IntersectionObserver((es) => { for (const e of es) if (!desk.matches) playVideo(e.isIntersecting); });
    if (video) vio.observe(video);
    const wio = new IntersectionObserver((es) => { for (const e of es) if (!desk.matches) { if (e.isIntersecting) startWorks(); else stopWorks(); } }, { threshold: 0.4 });
    wio.observe(box);
  }

  /* ---------- Онлайн-запись ---------- */
  const SERVICES = [
    { id: 'mani', g: 'Маникюр', name: 'Маникюр без покрытия', price: 2200, dur: 60, m: ['anna', 'maria'] },
    { id: 'mani-gel', g: 'Маникюр', name: 'Маникюр с покрытием', price: 3600, dur: 105, m: ['anna', 'maria'] },
    { id: 'mani-design', g: 'Маникюр', name: 'Маникюр с покрытием и дизайном', price: 4800, dur: 135, m: ['maria'] },
    { id: 'remove', g: 'Маникюр', name: 'Снятие покрытия', price: 500, dur: 15, m: ['anna', 'maria'] },
    { id: 'pedi', g: 'Педикюр', name: 'Педикюр без покрытия', price: 3400, dur: 75, m: ['anna'] },
    { id: 'pedi-gel', g: 'Педикюр', name: 'Педикюр с покрытием', price: 4400, dur: 105, m: ['anna'] },
    { id: 'brow', g: 'Брови и ресницы', name: 'Коррекция бровей', price: 1400, dur: 30, m: ['olga'] },
    { id: 'brow-tint', g: 'Брови и ресницы', name: 'Коррекция и окрашивание бровей', price: 2300, dur: 45, m: ['olga'] },
    { id: 'brow-lami', g: 'Брови и ресницы', name: 'Ламинирование бровей', price: 3400, dur: 75, m: ['olga'] },
    { id: 'lash-lami', g: 'Брови и ресницы', name: 'Ламинирование ресниц', price: 3200, dur: 75, m: ['olga'] },
    { id: 'lash-tint', g: 'Брови и ресницы', name: 'Окрашивание ресниц', price: 900, dur: 20, m: ['olga'] },
    { id: 'cut', g: 'Волосы', name: 'Женская стрижка', price: 3800, dur: 60, m: ['vika'] },
    { id: 'style', g: 'Волосы', name: 'Укладка', price: 2600, dur: 45, m: ['vika'] },
    { id: 'color', g: 'Волосы', name: 'Окрашивание в один тон', price: 6500, from: true, dur: 120, m: ['vika'] },
    { id: 'complex', g: 'Волосы', name: 'Сложное окрашивание', price: 14000, from: true, dur: 270, m: ['vika'] },
  ];
  const MASTERS = {
    anna: { name: 'Анна', what: 'маникюр и педикюр, с 2014 года', days: [1, 2, 3, 4, 5], sched: 'пн-пт' },
    maria: { name: 'Мария', what: 'маникюр и дизайн ногтей, с 2017 года', days: [0, 3, 4, 5, 6], sched: 'ср-вс' },
    olga: { name: 'Ольга', what: 'брови и ресницы, с 2012 года', days: [2, 3, 4, 5, 6], sched: 'вт-сб' },
    vika: { name: 'Виктория', what: 'стрижки и окрашивание, с 2010 года', days: [0, 1, 3, 5, 6], sched: 'пн, ср, пт-вс' },
  };
  const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const WDF = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  const MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const OPEN = 600, CLOSE = 1260; // 10:00-21:00

  // Время в Москве, где бы ни был посетитель
  const msk = (() => { const d = new Date(); return new Date(d.getTime() + (d.getTimezoneOffset() + 180) * 60000); })();
  const nowMin = msk.getHours() * 60 + msk.getMinutes();
  const DAYS = Array.from({ length: 7 }, (_, i) => new Date(msk.getFullYear(), msk.getMonth(), msk.getDate() + i));
  const dayKey = (d) => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();

  function rng(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  }
  // Занятость мастера на день: при каждом заходе в этот день одна и та же
  const busyCache = {};
  function busy(mid, d) {
    const k = mid + dayKey(d);
    if (busyCache[k]) return busyCache[k];
    const r = rng(k), out = [];
    // у мастера по волосам записи реже, но длиннее, поэтому день у неё свободнее
    const want = (mid === 'vika' ? 1 : 2) + Math.floor(r() * 3);
    for (let a = 0; a < 30 && out.length < want; a++) {
      const len = [60, 90, 90, 120, 150][Math.floor(r() * 5)];
      const s = OPEN + 30 * Math.floor(r() * ((CLOSE - OPEN - len) / 30 + 1));
      if (out.some(([x, y]) => s < y && s + len > x)) continue;
      out.push([s, s + len]);
    }
    return (busyCache[k] = out);
  }
  function slots(mid, di, minutes) {
    const d = DAYS[di];
    if (!MASTERS[mid].days.includes(d.getDay())) return null;
    const b = busy(mid, d), res = [];
    for (let s = OPEN; s + minutes <= CLOSE; s += 30) {
      if (di === 0 && s < nowMin + 30) continue;
      if (b.some(([a, e]) => s < e && s + minutes > a)) continue;
      res.push(s);
    }
    return res;
  }
  const svcById = (id) => SERVICES.find((s) => s.id === id);
  // Свободные окна с учётом выбора «любой мастер»: время -> мастер
  function freeMap(di) {
    const svc = svcById(st.service);
    const list = st.master === 'any' ? svc.m : [st.master];
    const map = new Map(); let works = false;
    for (const mid of list) {
      const s = slots(mid, di, svc.dur);
      if (s === null) continue;
      works = true;
      for (const t of s) if (!map.has(t)) map.set(t, mid);
    }
    return { works, map: new Map([...map.entries()].sort((a, b) => a[0] - b[0])) };
  }

  const st = { step: 0, service: null, master: null, day: null, time: null, who: null, lock: null, form: null };
  const panel = $('#panel');
  const stepBtns = $$('#steps button');
  const stepsEl = $('#steps');

  // Подсветка шага переезжает с пружиной (рисуется псевдоэлементом списка шагов)
  function placeHl() {
    const b = stepBtns[st.step]; if (!b) return;
    const li = b.parentElement;
    stepsEl.style.setProperty('--hl-w', li.offsetWidth + 'px');
    stepsEl.style.setProperty('--hl-x', li.offsetLeft + 'px');
    stepsEl.style.setProperty('--hl-y', (li.offsetTop - 4) + 'px');
  }
  function reachable(n) {
    if (n === 0) return true;
    if (n === 1) return !!st.service;
    if (n === 2) return !!(st.service && st.master);
    if (n === 3) return st.day !== null;
    if (n === 4) return st.time !== null;
    return false;
  }
  function syncTabs() {
    stepBtns.forEach((b, n) => {
      b.disabled = !reachable(n);
      if (n === st.step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    placeHl();
  }
  stepBtns.forEach((b, n) => b.addEventListener('click', () => { if (reachable(n)) go(n); }));

  const opt = (attrs, inner, pressed, i) => `<button type="button" class="opt rise" style="--i:${i}" ${attrs} aria-pressed="${pressed}">${inner}</button>`;

  function render() {
    let h = '', i = 0;
    if (st.step === 0) {
      h += `<h3 class="rise" tabindex="-1">Что делаем?</h3>`;
      if (st.lock) h += `<p class="empty rise" style="--i:1;margin-bottom:18px">Услуги, которые делает ${MASTERS[st.lock].name}. <button type="button" class="dlg__close" data-unlock>Показать все услуги</button></p>`;
      const groups = [...new Set(SERVICES.map((s) => s.g))];
      for (const g of groups) {
        const list = SERVICES.filter((s) => s.g === g && (!st.lock || s.m.includes(st.lock)));
        if (!list.length) continue;
        h += `<div class="p-group"><p class="p-group__name rise" style="--i:${i++}">${g}</p><div class="opts">`;
        for (const s of list) h += opt(`data-svc="${s.id}"`, `<span>${s.name}</span><span class="opt__dur">${dur(s.dur)}</span><span class="opt__price">${s.from ? 'от ' : ''}${money(s.price)}</span>`, st.service === s.id, i++);
        h += `</div></div>`;
      }
    } else if (st.step === 1) {
      const svc = svcById(st.service);
      h += `<h3 class="rise" tabindex="-1">К кому записаться?</h3><div class="opts">`;
      if (svc.m.length > 1) h += opt('data-mst="any"', `<span>Любой свободный мастер<small>Покажем все окна: ${svc.m.map((m) => MASTERS[m].name).join(' и ')}</small></span><span class="opt__dur"></span><span></span>`, st.master === 'any', i++);
      for (const mid of svc.m) { const m = MASTERS[mid]; h += opt(`data-mst="${mid}"`, `<span>${m.name}<small>${m.what}</small></span><span class="opt__dur">${m.sched}</span><span></span>`, st.master === mid, i++); }
      h += `</div>`;
    } else if (st.step === 2) {
      const a = DAYS[0], z = DAYS[6];
      h += `<h3 class="rise" tabindex="-1">Какой день?</h3><p class="p-group__name rise" style="--i:1">${a.getDate()} ${MON[a.getMonth()]} - ${z.getDate()} ${MON[z.getMonth()]}</p><div class="days">`;
      DAYS.forEach((d, di) => {
        const f = freeMap(di), n = f.map.size;
        const status = !f.works ? 'выходной' : n ? `${n} ${plural(n, 'окно', 'окна', 'окон')}` : 'занято';
        const top = di === 0 ? 'сегодня' : di === 1 ? 'завтра' : WD[d.getDay()];
        h += `<button type="button" class="day rise" style="--i:${di + 2}" data-day="${di}" aria-pressed="${st.day === di}" ${n ? '' : 'disabled'} aria-label="${WDF[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}: ${status}"><span>${top}</span><b>${d.getDate()}</b><span>${status}</span></button>`;
      });
      h += `</div>`;
    } else if (st.step === 3) {
      const f = freeMap(st.day), d = DAYS[st.day];
      h += `<h3 class="rise" tabindex="-1">Во сколько?</h3><p class="p-group__name rise" style="--i:1">${WDF[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}</p>`;
      if (!f.map.size) {
        h += `<div class="empty rise"><p>В этот день свободных окон нет.</p><button type="button" class="btn btn--light btn--sm" data-go="2">Выбрать другой день</button></div>`;
      } else {
        i = 2;
        for (const [name, a2, b2] of [['Утро', 0, 720], ['День', 720, 1020], ['Вечер', 1020, 2000]]) {
          const ts = [...f.map.keys()].filter((t) => t >= a2 && t < b2);
          if (!ts.length) continue;
          h += `<div class="p-group"><p class="p-group__name rise" style="--i:${i++}">${name}</p><div class="times">`;
          for (const t of ts) h += `<button type="button" class="time rise" style="--i:${Math.min(i++, 14)}" data-time="${t}" aria-pressed="${st.time === t}">${hm(t)}</button>`;
          h += `</div></div>`;
        }
      }
    } else if (st.step === 4) {
      const d = DAYS[st.day], fm = st.form || {};
      h += `<h3 class="rise" tabindex="-1">Куда прислать подтверждение?</h3>
        <form class="form" id="bookForm" novalidate>
          <div class="field rise" style="--i:1"><label for="bName">Имя</label><input id="bName" name="name" type="text" autocomplete="given-name" aria-describedby="bNameErr" value="${esc(fm.name || '')}"><span class="err" id="bNameErr"></span></div>
          <div class="field rise" style="--i:2"><label for="bPhone">Телефон</label><input id="bPhone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 900 000-00-00" aria-describedby="bPhoneErr" value="${esc(fm.phone || '')}"><span class="err" id="bPhoneErr"></span></div>
          <div class="field rise" style="--i:3"><label for="bNote">Комментарий, если нужен</label><textarea id="bNote" name="note" rows="2"></textarea></div>
          <div class="rise" style="--i:4"><button class="btn btn--light" type="submit">Записаться на ${WD[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}, ${hm(st.time)}</button></div>
          <p class="form__note rise" style="--i:5">Перенести или отменить запись можно бесплатно за 12 часов.</p>
        </form>`;
    }
    panel.innerHTML = h;
    syncTabs();
  }

  function go(n, focus = true) {
    st.step = n; render(); slip();
    if (!focus) return;
    const top = panel.getBoundingClientRect().top;
    if (top < 70 || top > innerHeight * 0.8) {
      const y = scrollY + $('#steps').getBoundingClientRect().top - (desk.matches ? 24 : 80);
      scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    }
    const h3 = $('h3', panel); if (h3) h3.focus({ preventScroll: true });
  }

  panel.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t || t.type === 'submit') return;
    if (t.hasAttribute('data-unlock')) { st.lock = null; render(); return; }
    if (t.dataset.go) { go(+t.dataset.go); return; }
    if (t.dataset.svc) {
      st.service = t.dataset.svc; st.day = null; st.time = null; st.who = null;
      const svc = svcById(st.service);
      if (st.lock && svc.m.includes(st.lock)) { st.master = st.lock; go(2); return; }
      if (st.master && st.master !== 'any' && !svc.m.includes(st.master)) st.master = null;
      if (st.master === 'any' && svc.m.length < 2) st.master = null;
      if (!st.master && svc.m.length === 1) st.master = svc.m[0];
      go(1); return;
    }
    if (t.dataset.mst) { st.master = t.dataset.mst; st.day = null; st.time = null; st.who = null; go(2); return; }
    if (t.dataset.day !== undefined) { st.day = +t.dataset.day; st.time = null; st.who = null; go(3); return; }
    if (t.dataset.time !== undefined) { st.time = +t.dataset.time; st.who = freeMap(st.day).map.get(st.time); go(4); }
  });

  panel.addEventListener('submit', (e) => {
    if (e.target.id !== 'bookForm') return;
    e.preventDefault();
    const f = e.target, name = f.elements.name.value.trim(), phone = f.elements.phone.value.trim();
    st.form = { name, phone };
    const digits = phone.replace(/\D/g, '');
    let bad = null;
    const setErr = (inp, msg) => { inp.setAttribute('aria-invalid', msg ? 'true' : 'false'); $('#' + inp.id + 'Err').textContent = msg; if (msg && !bad) bad = inp; };
    setErr(f.elements.name, name.length < 2 ? 'Напишите имя, чтобы мастер знал, как к вам обращаться.' : '');
    setErr(f.elements.phone, digits.length < 10 || digits.length > 12 ? 'Нужен номер из 10-11 цифр, например +7 900 123-45-67.' : '');
    if (bad) { bad.focus(); return; }
    const svc = svcById(st.service), d = DAYS[st.day];
    openDemo(`Ваша запись: ${svc.name}, мастер ${MASTERS[st.who].name}, ${WDF[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}, ${hm(st.time)}-${hm(st.time + svc.dur)}. ${svc.from ? 'От ' : ''}${money(svc.price)}.`);
  });
  panel.addEventListener('input', (e) => {
    if (e.target.getAttribute('aria-invalid') !== 'true') return;
    e.target.setAttribute('aria-invalid', 'false');
    const er = $('#' + e.target.id + 'Err'); if (er) er.textContent = '';
  });

  // Листок записи
  const S = { service: $('#sService'), dur: $('#sDur'), master: $('#sMaster'), day: $('#sDay'), time: $('#sTime'), total: $('#sTotal'), note: $('#sNote') };
  function put(el, text, none) {
    el.classList.toggle('none', !!none);
    if (el.textContent === text) return;
    el.textContent = text;
    if (!reduce) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
  }
  function slip() {
    const svc = st.service ? svcById(st.service) : null;
    put(S.service, svc ? svc.name : 'не выбрана', !svc);
    put(S.dur, svc ? dur(svc.dur) : 'не выбрана', !svc);
    const who = st.who || (st.master && st.master !== 'any' ? st.master : null);
    put(S.master, who ? MASTERS[who].name : st.master === 'any' ? 'любой свободный' : 'не выбран', !who && st.master !== 'any');
    const d = st.day !== null ? DAYS[st.day] : null;
    put(S.day, d ? `${WDF[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}` : 'не выбран', !d);
    put(S.time, st.time !== null && svc ? `${hm(st.time)}-${hm(st.time + svc.dur)}` : 'не выбрано', st.time === null);
    put(S.total, svc ? `${svc.from ? 'от ' : ''}${money(svc.price)}, ${dur(svc.dur)}` : '0 ₽');
    S.note.textContent = svc && svc.from ? 'Точную цену мастер назовёт на консультации: она зависит от длины и густоты волос.' : 'Оплата в студии после процедуры, картой или наличными.';
  }

  // Запись из прайса и от мастера
  for (const b of $$('.item[data-book]')) b.addEventListener('click', () => {
    const svc = svcById(b.dataset.book);
    st.lock = null; st.service = svc.id; st.day = null; st.time = null; st.who = null;
    st.master = svc.m.length === 1 ? svc.m[0] : null;
    st.step = 1; render(); slip();
    $('#zapis').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    setTimeout(() => { const h3 = $('h3', panel); if (h3) h3.focus({ preventScroll: true }); }, reduce ? 0 : 700);
  });
  for (const a of $$('[data-master]')) a.addEventListener('click', () => {
    const mid = a.dataset.master;
    st.lock = mid; st.master = mid; st.service = null; st.day = null; st.time = null; st.who = null;
    st.step = 0; render(); slip();
  });

  render(); slip();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeHl);

  /* ---------- Название тяжелеет при уходе первого экрана ---------- */
  const wm = $('.wm');
  let ticking = false;
  function onScroll() {
    ticking = false;
    if (!reduce) {
      const p = Math.min(1, Math.max(0, scrollY / (innerHeight * 0.9)));
      wm.style.transform = `scale(${(1 - 0.07 * p).toFixed(4)})`;
    }
    pickStage();
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', () => { onScroll(); placeHl(); });
  onScroll();

  /* ---------- Сертификаты: веер и номинал ---------- */
  const fan = $('#fan');
  if ('IntersectionObserver' in window && !reduce) {
    const fio = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) { fan.classList.add('open'); fio.disconnect(); } }, { threshold: 0.35 });
    fio.observe(fan);
  } else fan.classList.add('open');
  const cardSum = $('#cardSum'), cardTo = $('#cardTo'), certForm = $('#certForm');
  certForm.addEventListener('change', (e) => {
    if (e.target.name !== 'nom') return;
    cardSum.textContent = money(+e.target.value);
    if (!reduce) { cardSum.classList.remove('pop'); void cardSum.offsetWidth; cardSum.classList.add('pop'); }
  });
  $('#certTo').addEventListener('input', (e) => { cardTo.textContent = e.target.value.trim(); });
  certForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = +certForm.elements.nom.value, to = $('#certTo').value.trim();
    openDemo(`Сертификат на ${money(v)}${to ? ', кому: ' + to : ''}.`);
  });
})();
