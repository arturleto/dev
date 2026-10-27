(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TZ = 'Europe/Moscow';
  const OPEN = 8, CLOSE = 22;

  // Время по Москве
  function mskNow() {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' })
      .formatToParts(new Date()).map((x) => [x.type, x.value]));
    return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday) };
  }
  const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const DAYS = ['воскресенье', 'понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу'];
  const ymd = (dt) => `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
  const human = (dt) => `${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]}`;
  const now = mskNow();
  const today = new Date(Date.UTC(now.y, now.mo - 1, now.d));

  // Открыто ли сейчас
  const isOpen = now.h >= OPEN && now.h < CLOSE;
  $$('[data-now]').forEach((el) => { el.textContent = isOpen ? `Сейчас открыто, до ${CLOSE}:00` : `Сейчас закрыто, откроемся в ${OPEN}:00`; });

  // Дата последней обжарки (понедельник)
  const rd = $('[data-roastdate]');
  if (rd) {
    const back = (now.wd + 6) % 7; // дней с понедельника
    const last = new Date(today); last.setUTCDate(last.getUTCDate() - back);
    const next = new Date(last); next.setUTCDate(next.getUTCDate() + 7);
    rd.textContent = back === 0
      ? `Сегодня понедельник, в зале жарим зерно. Следующая обжарка ${human(next)}.`
      : `Последняя обжарка была в понедельник, ${human(last)}. Следующая ${human(next)}.`;
  }

  // Появление блоков
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0 }) : null;
  $$('[data-reveal]').forEach((el) => (io ? io.observe(el) : el.classList.add('is-in')));
  $$('.curve__stages li').forEach((li, k) => li.style.setProperty('--k', k));
  $$('[data-reveal=""]').forEach((el) => [...el.children].forEach((c, n) => c.style.setProperty('--n', Math.min(n, 8))));
  $$('.drops > li').forEach((c, n) => c.style.setProperty('--n', 12 + n));

  // Меню: фото слева меняется под раздел
  const pics = $$('.menu__pics img'), caps = $$('.menu__cap span');
  const setPic = (id) => {
    pics.forEach((p) => p.classList.toggle('is-on', p.dataset.pic === id));
    caps.forEach((c) => c.classList.toggle('is-on', c.dataset.cap === id));
  };
  if ('IntersectionObserver' in window) {
    const gio = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setPic(e.target.dataset.group);
    }, { rootMargin: '-40% 0px -50% 0px', threshold: 0 });
    $$('.group').forEach((g) => gio.observe(g));
  }

  // Видео: не крутить, если просили меньше движения, и пауза за экраном
  const vid = $('.cell--film video');
  if (vid) {
    if (reduce) { vid.removeAttribute('autoplay'); vid.pause(); }
    else if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { if (e.isIntersecting) vid.play().catch(() => {}); else vid.pause(); }).observe(vid);
    }
  }

  // ===== График одной партии =====
  const chart = $('[data-curve]');
  const SVGNS = 'http://www.w3.org/2000/svg';
  const PTS = [[0, 200], [0.5, 152], [1, 110], [1.5, 95], [2, 98], [3, 117], [4.5, 150], [6, 169], [7, 181], [8.67, 196], [10, 204], [10.33, 205.4], [11, 209], [11.67, 213]];
  const STAGES = [[0, 4.5, '#b6b791'], [4.5, 7, '#d3bf82'], [7, 8.67, '#a77943'], [8.67, 10, '#7b5030'], [10, 11.67, '#5a3722']];
  function drawCurve() {
    if (!chart) return;
    const W = chart.clientWidth, H = chart.clientHeight;
    if (!W || !H) return;
    const narrow = W < 520;
    const L = narrow ? 38 : 50, R = narrow ? 8 : 20, T = 30, B = 60;
    const pw = W - L - R, ph = H - T - B;
    const X = (t) => L + (t / 12) * pw;
    const Y = (v) => T + (1 - (v - 60) / 160) * ph;
    const el = (tag, at, txt) => { const n = document.createElementNS(SVGNS, tag); for (const k in at) n.setAttribute(k, at[k]); if (txt != null) n.textContent = txt; return n; };
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, 'aria-hidden': 'true' });
    // кривая Катмулла-Рома
    const P = PTS.map(([t, v]) => [X(t), Y(v)]);
    let d = `M${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}`;
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    // цвет зерна по минутам
    const by = T + ph + 12;
    STAGES.forEach(([a, b, c], k) => svg.append(el('rect', { class: 'c-band', x: X(a), y: by, width: X(b) - X(a) + 0.5, height: 16, fill: c, style: `--dl:${300 + k * 90}ms` })));
    // оси: только подписи
    for (let t = 0; t <= 12; t += 2) svg.append(el('text', { class: 'c-ax', x: X(t), y: by + 38, 'text-anchor': t === 0 ? 'start' : t === 12 ? 'end' : 'middle' }, t === 12 ? '12 мин' : String(t)));
    for (const v of [100, 150, 200]) svg.append(el('text', { class: 'c-ax', x: L - 10, y: Y(v) + 4, 'text-anchor': 'end' }, `${v}°`));
    const line = el('path', { class: 'c-line', d });
    svg.append(line);
    // точки и подписи
    const note = (t, v, a, b, dx, dy, anchor, dl) => {
      svg.append(el('circle', { class: 'c-dot', cx: X(t), cy: Y(v), r: 6, style: `--dl:${dl}ms` }));
      svg.append(el('text', { class: 'c-lbl', x: X(t) + dx, y: Y(v) + dy, 'text-anchor': anchor, style: `--dl:${dl + 80}ms` }, a));
      svg.append(el('text', { class: 'c-sub', x: X(t) + dx, y: Y(v) + dy + 18, 'text-anchor': anchor, style: `--dl:${dl + 140}ms` }, b));
    };
    note(0, 200, '0:00, 200°', 'загружаем зелёное зерно', 14, -24, 'start', 150);
    note(1.5, 95, '1:30, 95°', 'поворотная точка', narrow ? 10 : 12, 30, 'start', 400);
    note(4.5, 150, '4:30, 150°', 'зерно желтеет', -14, -34, 'end', 650);
    note(8.67, 196, '8:40, 196°', 'первый крэк', -14, -34, 'end', 900);
    [10, 10.33, 11, 11.67].forEach((t, k) => {
      const v = PTS.find((p) => Math.abs(p[0] - t) < 0.01)[1];
      svg.append(el('circle', { class: 'c-drop', cx: X(t), cy: Y(v), r: 5, style: `--dl:${1100 + k * 90}ms` }));
    });
    const ex = narrow ? W - R : X(10.84), ea = narrow ? 'end' : 'middle';
    svg.append(el('text', { class: 'c-lbl', x: ex, y: Y(204) + 38, 'text-anchor': ea, style: '--dl:1300ms' }, 'выгрузка 4 сортов'));
    svg.append(el('text', { class: 'c-sub', x: ex, y: Y(204) + 56, 'text-anchor': ea, style: '--dl:1360ms' }, 'с 10:00 до 11:40'));
    chart.replaceChildren(svg);
    const len = Math.ceil(line.getTotalLength());
    line.style.setProperty('--len', len);
    line.setAttribute('stroke-dasharray', `${len} ${len}`);
  }
  drawCurve();
  if (chart && 'ResizeObserver' in window) { let w0 = chart.clientWidth; new ResizeObserver(() => { if (Math.abs(chart.clientWidth - w0) > 2) { w0 = chart.clientWidth; drawCurve(); } }).observe(chart); }

  // ===== Подбор зерна =====
  const SORTS = {
    eth: { name: 'Эфиопия Иргачефф', acid: 3, body: 1, t: 94, methods: ['v60', 'aero', 'french'], notes: 'Жасмин, бергамот, лимонная цедра. Светлая обжарка.', p250: '1 250 ₽', p1000: '4 400 ₽' },
    ken: { name: 'Кения Ньери', acid: 3, body: 2, t: 94, methods: ['v60', 'aero', 'french'], notes: 'Чёрная смородина, грейпфрут, тростниковый сахар. Светлая обжарка.', p250: '1 390 ₽', p1000: '4 900 ₽' },
    col: { name: 'Колумбия Уила', acid: 2, body: 2, t: 91, methods: ['espresso', 'moka', 'turka', 'v60', 'aero', 'french'], notes: 'Красное яблоко, карамель, молочный шоколад. Средняя обжарка.', p250: '990 ₽', p1000: '3 500 ₽' },
    bra: { name: 'Бразилия Серрадо', acid: 1, body: 3, t: 91, methods: ['espresso', 'moka', 'turka', 'french'], notes: 'Тёмный шоколад, фундук, какао. Средняя обжарка.', p250: '890 ₽', p1000: '3 100 ₽' },
  };
  const RECIPE = {
    espresso: (t) => `Для эспрессо возьмите 18 г кофе и пролейте 36 г в чашку за 27-30 секунд, вода ${t}°.`,
    moka: () => 'Для гейзера налейте горячую воду до клапана, кофе насыпьте без утрамбовки, помол чуть крупнее, чем для эспрессо. Снимите с огня, как только зашипит.',
    turka: () => 'Для турки возьмите 8 г кофе на 100 мл холодной воды, помол в пыль. Грейте на слабом огне до пенки и не кипятите.',
    v60: (t) => `Для воронки возьмите 15 г кофе на 250 мл воды ${t}°. Помол как морская соль, время 3 минуты.`,
    aero: (t) => `Для аэропресса возьмите 15 г кофе на 220 мл воды ${t}°. Помол средний, 1 минута настоя и 30 секунд нажима.`,
    french: (t) => `Для френч-пресса возьмите 30 г кофе на 500 мл воды ${t}°. Помол крупный, 4 минуты, потом снимите корочку и нажмите.`,
  };
  const ORDER = ['col', 'bra', 'eth', 'ken'];
  const pick = $('#pick');
  let picked = 'col';
  function choose(first) {
    if (!pick) return;
    const f = new FormData(pick);
    const acid = +f.get('acid'), body = +f.get('body'), brew = f.get('brew');
    let best = null, bestS = Infinity;
    for (const id of ORDER) {
      const s = SORTS[id];
      const sc = 1.2 * Math.abs(acid - s.acid) + Math.abs(body - s.body) + (s.methods.includes(brew) ? 0 : 1.5);
      if (sc < bestS - 1e-9) { bestS = sc; best = id; }
    }
    const s = SORTS[best];
    const res = $('[data-res]');
    $('[data-r="name"]').textContent = s.name;
    $('[data-r="notes"]').textContent = s.notes;
    $('[data-r="p250"]').textContent = s.p250;
    $('[data-r="p1000"]').textContent = s.p1000;
    $('[data-r="recipe"]').textContent = RECIPE[brew](s.t);
    if (!first && !reduce) { res.classList.remove('is-swap'); void res.offsetWidth; res.classList.add('is-swap'); }
    picked = best;
    $$('[data-sort]').forEach((n) => n.classList.toggle('is-pick', n.dataset.sort === best));
  }
  if (pick) {
    pick.addEventListener('change', () => choose(false));
    pick.addEventListener('submit', (e) => e.preventDefault());
    choose(true);
  }

  // ===== Окно демо =====
  const modal = $('#demo-modal');
  let lastFocus = null;
  function demo(what) {
    $('[data-modal-what]').textContent = what;
    lastFocus = document.activeElement;
    if (modal && typeof modal.showModal === 'function') modal.showModal();
    else alert(`${what}\n\nЭто демо-сайт. На настоящем сайте заявка сразу пришла бы владельцу в Telegram.`);
  }
  if (modal) {
    modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('[data-close]')) modal.close(); });
    modal.addEventListener('close', () => { if (lastFocus) lastFocus.focus(); });
  }
  $$('[data-hold]').forEach((b) => b.addEventListener('click', () => {
    const s = SORTS[b.dataset.hold || picked];
    demo(`Отложим пачку «${s.name}» 250 г за ${s.p250}. Заберите её в кофейне до ${CLOSE}:00.`);
  }));

  // ===== Бронь стола =====
  const form = $('#book-form');
  if (form) {
    const dEl = $('#b-date'), tEl = $('#b-time');
    const minutesNow = now.h * 60 + now.mi;
    const fmt = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
    let start = new Date(today);
    if (minutesNow > (CLOSE - 1) * 60 - 30) start.setUTCDate(start.getUTCDate() + 1);
    const max = new Date(today); max.setUTCDate(max.getUTCDate() + 30);
    dEl.min = ymd(start); dEl.max = ymd(max); dEl.value = ymd(start);
    function fillTimes() {
      const keep = tEl.value;
      const isToday = dEl.value === ymd(today);
      const from = isToday ? Math.max(OPEN * 60, Math.ceil((minutesNow + 30) / 30) * 30) : OPEN * 60;
      tEl.replaceChildren();
      for (let m = from; m <= (CLOSE - 1) * 60 + 30; m += 30) tEl.append(new Option(fmt(m), fmt(m)));
      if (!tEl.options.length) tEl.append(new Option('нет свободного времени', ''));
      const want = keep && [...tEl.options].some((o) => o.value === keep) ? keep : ([...tEl.options].find((o) => o.value === '19:00') || tEl.options[0]).value;
      tEl.value = want;
    }
    fillTimes();
    dEl.addEventListener('change', fillTimes);

    const setErr = (input, msg) => {
      const box = input.closest('.f'); const err = $('#' + input.id + '-e');
      box.classList.toggle('is-bad', !!msg);
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (err) err.textContent = msg || '';
    };
    form.addEventListener('input', (e) => { if (e.target.closest('.f.is-bad')) setErr(e.target, ''); });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#b-name'), phone = $('#b-phone');
      let bad = null;
      if (!dEl.value || dEl.value < dEl.min || dEl.value > dEl.max) { setErr(dEl, 'Выберите дату в ближайшие 30 дней.'); bad = bad || dEl; } else setErr(dEl, '');
      if (!tEl.value) { setErr(tEl, 'На эту дату мест уже нет, выберите другой день.'); bad = bad || tEl; } else setErr(tEl, '');
      if (name.value.trim().length < 2) { setErr(name, 'Напишите имя, чтобы мы знали, кого ждать.'); bad = bad || name; } else setErr(name, '');
      if (phone.value.replace(/\D/g, '').length < 10) { setErr(phone, 'Нужен телефон, чтобы подтвердить бронь. Например, +7 900 123-45-67.'); bad = bad || phone; } else setErr(phone, '');
      if (bad) { bad.focus(); return; }
      const [y, mo, d] = dEl.value.split('-').map(Number);
      const dt = new Date(Date.UTC(y, mo - 1, d));
      const g = $('#b-guests').value;
      demo(`Стол на ${DAYS[dt.getUTCDay()]}, ${human(dt)} в ${tEl.value}, гостей ${g}.`);
    });
  }

  // ===== Меню на телефоне =====
  const more = $('.bar__more'), sheet = $('#sheet-nav');
  if (more && sheet) {
    const close = () => { sheet.hidden = true; more.setAttribute('aria-expanded', 'false'); document.documentElement.style.overflow = ''; more.focus(); };
    more.addEventListener('click', () => {
      sheet.hidden = false; more.setAttribute('aria-expanded', 'true'); document.documentElement.style.overflow = 'hidden';
      const a = $('a', sheet); if (a) a.focus();
    });
    $('.sheetnav__close', sheet).addEventListener('click', close);
    $$('a', sheet).forEach((a) => a.addEventListener('click', () => { sheet.hidden = true; more.setAttribute('aria-expanded', 'false'); document.documentElement.style.overflow = ''; }));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) close(); });
  }

  // ===== Плашка демо =====
  const badge = $('#demo');
  if (badge) {
    const KEY = 'kofe-demo-min';
    const set = (min) => { badge.classList.toggle('is-min', min); try { sessionStorage.setItem(KEY, min ? '1' : ''); } catch (_) {} };
    try { if (sessionStorage.getItem(KEY)) badge.classList.add('is-min'); } catch (_) {}
    $('.demo__x', badge).addEventListener('click', () => { set(true); $('.demo__open', badge).focus(); });
    $('.demo__open', badge).addEventListener('click', () => { set(false); $('.demo__a', badge).focus(); });
  }

  // ===== Подвал под страницей =====
  const foot = $('#foot');
  if (foot) {
    const fit = () => {
      const h = foot.offsetHeight;
      const tooTall = h > innerHeight - 8;
      foot.style.position = tooTall ? 'static' : '';
      document.documentElement.style.setProperty('--foot-h', tooTall ? '0px' : h + 'px');
    };
    fit();
    addEventListener('resize', fit);
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(foot);
  }
})();
