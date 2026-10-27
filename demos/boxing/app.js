/* Удар: живое расписание, запись, меню, движение. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const motionOK = matchMedia('(prefers-reduced-motion: no-preference)').matches;
  const root = document.documentElement;

  /* ---------- Первый экран: название по ширине ---------- */
  const hero = $('.hero');
  const line = $('.hero__line');
  const name = $('.hero__name');
  const film = $('.hero__film');
  const video = $('.hero__film video');
  function fit() {
    const cs = getComputedStyle(hero);
    const W = hero.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const wide = innerWidth > 900;
    const prev = name.style.fontSize;
    name.style.fontSize = '100px';
    const w100 = name.offsetWidth;
    name.style.fontSize = prev;
    if (!w100) return;
    const share = wide ? 0.6 : 0.995;
    line.style.setProperty('--hfs', (Math.floor((W * share * 100) / w100 * 10) / 10) + 'px');
  }
  fit();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  let rT; addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(fit, 80); });

  // Удар камеры: каждая буква бьёт по экрану, всё внутри кадра вздрагивает
  function shake(els, a) {
    if (!motionOK) return;
    els.forEach((el) => el && el.animate([
      { translate: '0 0' }, { translate: `${-a}px ${a * 0.6}px` }, { translate: `${a * 0.7}px ${-a * 0.45}px` },
      { translate: `${-a * 0.3}px ${a * 0.2}px` }, { translate: '0 0' }
    ], { duration: 190, easing: 'ease-out' }));
  }
  const heroParts = [film, $('.hero__top'), $('.hero__status'), $('.hero__foot')];
  $$('.hero__name span').forEach((s, i) => s.addEventListener('animationend', () => shake(heroParts, 4 + i * 1.5)));
  if (!motionOK && video) { video.removeAttribute('autoplay'); video.pause(); }

  /* ---------- Верхняя полоса, меню, плашка демо ---------- */
  const bar = $('#bar');
  const demo = $('#demo');
  const menu = $('#menu');
  const menuBtn = $('.bar__menu');
  function toggleMenu(open) {
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.textContent = open ? 'Закрыть' : 'Меню';
    bar.classList.toggle('is-menu', open);
    bar.classList.remove('is-hidden');
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) menu.querySelector('a').focus();
  }
  menuBtn.addEventListener('click', () => toggleMenu(menu.hidden));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) toggleMenu(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { toggleMenu(false); menuBtn.focus(); } });

  const demoX = $('.demo__x');
  demoX.addEventListener('click', () => {
    const min = demo.classList.toggle('is-min');
    demoX.setAttribute('aria-expanded', String(!min));
    demoX.setAttribute('aria-label', min ? 'Развернуть плашку демо' : 'Свернуть плашку');
    demoX.textContent = min ? 'Демо' : '×';
  });

  /* ---------- Движение по прокрутке ---------- */
  const hallPic = $('.hall__pic');
  const hallImg = $('.hall__pic img');
  const footName = $('.foot__name');
  let lastY = scrollY, ticking = false;
  function onScroll() {
    const y = scrollY, vh = innerHeight;
    bar.classList.toggle('is-dark', y > hero.offsetHeight - 64);
    if (menu.hidden) {
      if (y > lastY + 6 && y > 240) { bar.classList.add('is-hidden'); demo.classList.add('is-away'); }
      else if (y < lastY - 6 || y < 240) { bar.classList.remove('is-hidden'); demo.classList.remove('is-away'); }
    }
    lastY = y;
    if (!motionOK) return;
    // Название тяжелеет и чуть уменьшается, когда первый экран уходит
    const p = Math.min(1, Math.max(0, y / Math.max(1, hero.offsetHeight)));
    const target = innerWidth > 900 ? line : name;
    target.style.transform = `scale(${(1 - p * 0.08).toFixed(4)})`;
    if (video) video.style.transform = `scale(1.08) translateY(${(p * 5).toFixed(2)}%)`;
    // Медленный проезд по фото зала
    const r = hallPic.getBoundingClientRect();
    if (r.bottom > 0 && r.top < vh) {
      const q = (vh - r.top) / (vh + r.height);
      hallImg.style.transform = `translateY(${(-q * 15).toFixed(2)}%)`;
    }
    // Название в подвале вырастает навстречу
    const f = footName.getBoundingClientRect();
    if (f.top < vh) {
      const q = Math.min(1, (vh - f.top) / (f.height + vh * 0.25));
      footName.style.transform = `scale(${(0.94 + q * 0.06).toFixed(4)})`;
    }
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; onScroll(); }); } }, { passive: true });
  onScroll();

  /* ---------- Появление блоков ---------- */
  // Блок прячется только в момент входа в кадр и сразу проявляется: содержимое никогда не остаётся скрытым.
  const reveal = $$('[data-reveal], [data-shutter]');
  const groups = new Map();
  reveal.forEach((el) => {
    const g = el.parentElement; const n = groups.get(g) || 0; groups.set(g, n + 1);
    el.style.setProperty('--d', Math.min(n * 0.07, 0.35) + 's');
  });
  function play(el) {
    el.classList.add('is-pre');
    void el.offsetWidth;
    if (el.hasAttribute('data-shutter')) {
      requestAnimationFrame(() => requestAnimationFrame(() => { el.classList.add('is-in'); el.classList.remove('is-pre'); }));
    } else { el.classList.add('is-in'); el.classList.remove('is-pre'); }
  }
  if (motionOK && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((en) => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target); play(en.target);
    }), { rootMargin: '0px 0px -40px 0px' });
    reveal.forEach((el) => io.observe(el));
    // Название в подвале бьёт буквами, когда до него долистали
    footName.classList.add('is-wait');
    const fio = new IntersectionObserver((es) => es.forEach((en) => {
      if (!en.isIntersecting) return;
      fio.disconnect();
      footName.classList.remove('is-wait'); footName.classList.add('is-hit');
      $$('span', footName).forEach((s, i) => s.addEventListener('animationend', () => shake([footName], 3 + i)));
    }), { threshold: 0.3 });
    fio.observe(footName);
  } else {
    reveal.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Время в Москве ---------- */
  const KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const SHORT = { mon: 'Пн', tue: 'Вт', wed: 'Ср', thu: 'Чт', fri: 'Пт', sat: 'Сб', sun: 'Вс' };
  const toMin = (t) => { const [h, m] = t.split(':'); return +h * 60 + +m; };
  const now = new Date();
  const msk = new Date(now.getTime() + (now.getTimezoneOffset() + 180) * 60000);
  const todayIdx = (msk.getDay() + 6) % 7;
  const nowMin = msk.getHours() * 60 + msk.getMinutes();
  const hhmm = `${msk.getHours()}:${String(msk.getMinutes()).padStart(2, '0')}`;

  /* ---------- Расписание: фильтр и запись ---------- */
  const week = $('#week');
  const days = $$('.day', week);
  const items = $$('.slot-li', week);
  const info = (b) => {
    const sp = b.querySelectorAll(':scope > span');
    const dir = sp[0].firstChild.textContent.trim();
    return { id: b.dataset.id, day: b.closest('.day').dataset.day, dayName: $('.day__full', b.closest('.day')).textContent,
      start: b.dataset.start, end: b.dataset.end, dir, coach: sp[1].textContent, hall: sp[2].textContent };
  };

  // Сегодня и что идёт сейчас
  const today = days[todayIdx];
  today.classList.add('is-today');
  const todaySlots = $$('.slot', today).map((b) => ({ b, s: toMin(b.dataset.start), e: toMin(b.dataset.end) }));
  const cur = todaySlots.filter((x) => x.s <= nowMin && nowMin < x.e);
  const next = todaySlots.find((x) => x.s > nowMin);
  cur.forEach((x) => x.b.classList.add('is-now'));
  const open = nowMin >= 420 && nowMin < 1380;
  const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);
  let status;
  if (cur.length) { const i = info(cur[0].b); status = `Идёт: ${lower(i.dir)}, ${lower(i.hall)}, до ${i.end}`; }
  else if (next) { const i = info(next.b); status = `Следующее занятие в ${i.start}: ${lower(i.dir)}`; }
  else { const t = days[(todayIdx + 1) % 7].querySelector('.slot'); status = t ? `Завтра первое занятие в ${t.dataset.start}` : 'Пробная тренировка бесплатно'; }
  const hs = $('#hero-status');
  hs.innerHTML = '';
  const hb = document.createElement('b'); hb.textContent = open ? 'Открыто сейчас, до 23:00' : 'Сейчас закрыто, откроемся в 7:00';
  const hsp = document.createElement('span'); hsp.textContent = status;
  hs.append(hb, hsp);
  const sn = $('#sched-now');
  sn.textContent = '';
  const snb = document.createElement('b'); snb.textContent = `В Москве ${hhmm}. `;
  sn.append(snb, document.createTextNode(`${status}. Нажмите на занятие, чтобы записаться на пробную.`));

  // Фильтр
  const state = { dir: 'all', part: 'all' };
  const count = $('#sched-count');
  const plural = (n) => { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? 'занятие' : (a >= 2 && a <= 4 && (b < 12 || b > 14) ? 'занятия' : 'занятий'); };
  function apply(animate) {
    const first = new Map();
    if (animate && motionOK) items.forEach((li) => { if (!li.hidden) first.set(li, li.getBoundingClientRect()); });
    let n = 0;
    items.forEach((li) => {
      const ok = (state.dir === 'all' || li.dataset.dir === state.dir) && (state.part === 'all' || li.dataset.part === state.part);
      li.hidden = !ok; if (ok) n++;
    });
    days.forEach((d) => { $('.day__empty', d).hidden = $$('.slot-li', d).some((li) => !li.hidden); });
    count.textContent = n === items.length ? `Все ${n} занятий недели` : (n ? `Найдено ${n} ${plural(n)} в неделю` : 'По этому фильтру занятий нет');
    if (!(animate && motionOK)) return;
    items.forEach((li) => {
      if (li.hidden) return;
      const a = first.get(li), b = li.getBoundingClientRect();
      if (a) {
        const dx = a.left - b.left, dy = a.top - b.top;
        if (dx || dy) li.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' });
      } else {
        li.animate([{ opacity: 0, transform: 'scale(.8)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.3,1.5,.5,1)' });
      }
    });
  }
  function setFilter(f, v) {
    state[f] = v;
    $$(`.chip[data-f="${f}"]`).forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.v === v)));
  }
  $$('.chip').forEach((c) => c.addEventListener('click', () => { setFilter(c.dataset.f, c.dataset.v); apply(true); }));
  // Кнопки в карточках направлений открывают расписание своей группы
  $$('[data-go]').forEach((b) => b.addEventListener('click', () => {
    setFilter('dir', b.dataset.go); setFilter('part', 'all'); apply(false);
    $('#schedule').scrollIntoView({ behavior: motionOK ? 'smooth' : 'auto' });
  }));

  // Списки занятий в формах
  $$('select[name="slot"]').forEach((sel) => {
    days.forEach((d) => {
      const og = document.createElement('optgroup'); og.label = $('.day__full', d).textContent;
      $$('.slot', d).forEach((b) => { const i = info(b); og.append(new Option(`${SHORT[i.day]}, ${i.start}-${i.end}. ${i.dir}, ${i.coach}`, i.id)); });
      sel.append(og);
    });
  });

  // Клик по занятию: окно записи с уже выбранным занятием
  const book = $('#book');
  const bookSlot = $('#book-slot');
  function nextDate(dayKey, start) {
    const target = KEYS.indexOf(dayKey);
    let add = (target - todayIdx + 7) % 7;
    if (add === 0 && toMin(start) <= nowMin) add = 7;
    const d = new Date(msk.getFullYear(), msk.getMonth(), msk.getDate() + add);
    return add === 0 ? 'сегодня' : add === 1 ? 'завтра, ' + d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  }
  week.addEventListener('click', (e) => {
    const b = e.target.closest('.slot'); if (!b) return;
    const i = info(b);
    bookSlot.textContent = '';
    const t = document.createElement('b'); t.textContent = `${i.dayName}, ${i.start}-${i.end}`;
    const s1 = document.createElement('span'); s1.textContent = `${i.dir}. Тренер ${i.coach}, ${lower(i.hall)}.`;
    const s2 = document.createElement('span'); s2.textContent = `Ближайшее занятие ${nextDate(i.day, i.start)}.`;
    bookSlot.append(t, s1, s2);
    $('#b-slot').value = i.id;
    book.showModal();
    if (motionOK) shake([book], 3);
    setTimeout(() => $('#b-name').focus(), 30);
  });
  $('#b-slot').addEventListener('change', (e) => {
    const b = week.querySelector(`.slot[data-id="${e.target.value}"]`);
    if (!b) { bookSlot.textContent = ''; const t = document.createElement('b'); t.textContent = 'Подберём группу по звонку'; bookSlot.append(t); return; }
    const i = info(b); bookSlot.querySelector('b').textContent = `${i.dayName}, ${i.start}-${i.end}`;
    const sp = bookSlot.querySelectorAll('span');
    if (sp[0]) sp[0].textContent = `${i.dir}. Тренер ${i.coach}, ${lower(i.hall)}.`;
    if (sp[1]) sp[1].textContent = `Ближайшее занятие ${nextDate(i.day, i.start)}.`;
  });

  /* ---------- Окна ---------- */
  $$('dialog').forEach((d) => {
    d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
  });

  /* ---------- Формы ---------- */
  function fmtPhone(v) {
    let d = v.replace(/\D/g, '');
    if (!d) return '';
    if (d[0] === '8') d = '7' + d.slice(1);
    if (d[0] !== '7') d = '7' + d;
    d = d.slice(0, 11);
    let s = '+7';
    if (d.length > 1) s += ' ' + d.slice(1, 4);
    if (d.length > 4) s += ' ' + d.slice(4, 7);
    if (d.length > 7) s += '-' + d.slice(7, 9);
    if (d.length > 9) s += '-' + d.slice(9, 11);
    return s;
  }
  $$('input[type="tel"]').forEach((inp) => inp.addEventListener('input', () => { inp.value = fmtPhone(inp.value); }));
  function setErr(inp, msg) {
    const e = document.getElementById(inp.getAttribute('aria-describedby'));
    if (e) e.textContent = msg;
    inp.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  }
  const done = $('#done');
  $$('form[data-form]').forEach((f) => {
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const el = f.elements;
      const okName = setErr(el.name, el.name.value.trim().length < 2 ? 'Напишите, как к вам обращаться' : '');
      const okPhone = setErr(el.phone, el.phone.value.replace(/\D/g, '').length < 11 ? 'Нужен номер из 11 цифр, например +7 916 123-45-67' : '');
      const okAgree = setErr(el.agree, el.agree.checked ? '' : 'Отметьте согласие, иначе мы не сможем перезвонить');
      if (!(okName && okPhone && okAgree)) {
        const bad = [el.name, el.phone, el.agree].find((x) => x.getAttribute('aria-invalid') === 'true');
        if (bad) bad.focus();
        if (motionOK) shake([f], 5);
        return;
      }
      const box = f.closest('dialog'); if (box) box.close();
      f.reset();
      [el.name, el.phone, el.agree].forEach((x) => setErr(x, ''));
      done.showModal();
    });
  });

  /* ---------- Карточки «что взять»: открыта одна ---------- */
  const cards = $$('.card');
  cards.forEach((c) => c.addEventListener('toggle', () => { if (c.open) cards.forEach((o) => { if (o !== c) o.open = false; }); }));
})();
