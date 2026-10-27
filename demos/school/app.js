/* Говорим: демо-сайт. Живая вещь: тест уровня из 6 вопросов с переворотом карточки. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const later = (fn, ms) => setTimeout(fn, reduce ? 0 : ms);
  const smooth = reduce ? 'auto' : 'smooth';

  /* ---------- появление блоков ---------- */
  const revealEls = $$('[data-reveal], .words');
  if (reduce || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-in'));
  } else {
    const vh = innerHeight;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    }, { rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach((el) => {
      const top = el.getBoundingClientRect().top + scrollY;
      if (top < vh * 0.92) { el.classList.add('is-in'); return; }
      // далеко внизу ничего не прячем: только мягкий сдвиг при появлении
      el.classList.add(top < vh * 8 ? 'armed' : 'soft');
      io.observe(el);
    });
  }

  /* ---------- буквы-резинки в заголовке ---------- */
  const letters = $$('.hero__title .ch');
  if (!reduce && letters.length) {
    const rub = (c) => { c.classList.remove('rub'); void c.offsetWidth; c.classList.add('rub'); };
    letters.forEach((c) => {
      c.addEventListener('animationend', (e) => {
        if (e.animationName === 'drop') c.classList.add('landed');
        if (e.animationName === 'rubber') c.classList.remove('rub');
      });
      c.addEventListener('pointerenter', () => { if (c.classList.contains('landed')) rub(c); });
    });
    const wave = () => {
      if (document.hidden || scrollY > innerHeight) return;
      letters.forEach((c, i) => setTimeout(() => { if (c.classList.contains('landed')) rub(c); }, i * 70));
    };
    setTimeout(() => { wave(); setInterval(wave, 7000); }, 2400);
  }

  /* ---------- меню на телефоне ---------- */
  const menuBtn = $('.top__menu');
  const menu = $('#menu');
  if (menuBtn && menu) {
    const open = () => {
      menu.hidden = false;
      menuBtn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      $('nav a', menu).focus();
    };
    const close = (focusBack = true) => {
      menu.hidden = true;
      menuBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      if (focusBack) menuBtn.focus();
    };
    menuBtn.addEventListener('click', open);
    $('.menu__close', menu).addEventListener('click', () => close());
    $$('nav a', menu).forEach((a) => a.addEventListener('click', () => close(false)));
    menu.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      const f = $$('button, a', menu);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ---------- тест уровня ---------- */
  const Q = [
    { kind: 'Выберите слово', prompt: 'Hi! I ___ Anna. Nice to meet you.', lang: 'en', optLang: 'en',
      opts: ['is', 'am', 'are', 'be'], ok: 1, why: 'После I всегда am: I am, you are, she is.' },
    { kind: 'Переведите фразу', prompt: '«Можно счёт, пожалуйста?»', lang: 'ru', optLang: 'en',
      opts: ['Can I have the account, please?', 'Can I get the bill, please?', 'Give me the score, please.', 'Can I pay the check-in?'], ok: 1,
      why: 'Счёт в кафе это bill. В Америке ещё говорят check.' },
    { kind: 'Поймите реплику', prompt: 'At check-in: “Window or aisle?”', lang: 'en', optLang: 'ru',
      opts: ['Вам открыть окно?', 'Сколько у вас сумок?', 'Место у окна или у прохода?', 'Вы летите туда и обратно?'], ok: 2,
      why: 'Aisle это проход между рядами. Так спрашивают на регистрации.' },
    { kind: 'Выберите слово', prompt: 'I’ve been living in Lisbon ___ March.', lang: 'en', optLang: 'en',
      opts: ['for', 'during', 'from', 'since'], ok: 3,
      why: 'Since ставим перед моментом: since March. For ставим перед сроком: for 3 months.' },
    { kind: 'Поймите реплику', prompt: 'A colleague: “Could you loop me in on this?”', lang: 'en', optLang: 'ru',
      opts: ['Держите меня в курсе', 'Перезвоните мне позже', 'Повторите, пожалуйста', 'Не трогайте эту задачу'], ok: 0,
      why: 'Loop someone in значит добавить в переписку и держать в курсе.' },
    { kind: 'Переведите фразу', prompt: '«Если бы я знал раньше, я бы согласился.»', lang: 'ru', optLang: 'en',
      opts: ['If I knew earlier, I will agree.', 'If I would know earlier, I agreed.', 'If I had known earlier, I would have agreed.', 'When I knew earlier, I would agree.'], ok: 2,
      why: 'Это условие про прошлое: if I had known, I would have agreed.' },
  ];
  const LEVELS = {
    A1: { c: 'var(--mint)', name: 'Начальный уровень', text: 'Вы на старте, и это удобно: ничего не нужно переучивать. За 3 месяца научитесь знакомиться, заказывать и спрашивать дорогу.', fit: 'Подойдёт группа A1. Если хочется быстрее, 8 занятий один на один.' },
    A2: { c: 'var(--lemon)', name: 'Элементарный уровень', text: 'Простые разговоры уже ваши: кафе, магазин, такси. Дальше учимся объясняться, когда что-то пошло не по плану.', fit: 'Подойдёт группа A2, 2 раза в неделю. С A2 можно ходить в разговорный клуб.' },
    B1: { c: 'var(--orange)', name: 'Средний уровень', text: 'Вы объясняетесь в поездке и на работе, но ищете слова и говорите проще, чем думаете. Это быстро уходит с практикой.', fit: 'Подойдёт группа B1 и разговорный клуб по четвергам.' },
    B2: { c: 'var(--blue)', name: 'Выше среднего', text: 'Вы спорите, шутите и проходите собеседования. Осталось убрать кальку с русского и звучать естественно.', fit: 'Подойдут занятия один на один под вашу цель и клуб с носителем.' },
  };
  const card = $('#quiz-card');
  if (card) {
    const front = $('#face-front');
    const back = $('#face-back');
    const verdict = $('#a-verdict');
    const right = $('#a-right');
    const why = $('#a-why');
    const next = $('#a-next');
    const now = $('#q-now');
    const bars = $$('.progress__bar li');
    let i = 0, score = 0, turn = 0;

    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const progress = (done) => {
      bars.forEach((b, k) => { b.classList.toggle('is-done', k < done); b.classList.toggle('is-now', k === done && done < Q.length); });
    };
    const show = (side) => {
      turn += 180;
      card.style.setProperty('--turn', turn + 'deg');
      card.dataset.side = side;
      front.inert = side !== 'front';
      back.inert = side !== 'back';
    };
    const render = (k) => {
      const q = Q[k];
      front.innerHTML = `<p class="q-kind">${q.kind}</p>
        <p class="q-prompt" id="q-prompt" lang="${q.lang}">${esc(q.prompt)}</p>
        <div class="q-opts" role="group" aria-labelledby="q-prompt">${q.opts.map((o, n) => `<button class="opt" type="button" data-n="${n}" lang="${q.optLang}">${esc(o)}</button>`).join('')}</div>`;
      now.textContent = `Вопрос ${k + 1} из ${Q.length}`;
      progress(k);
    };
    const levelOf = (s) => (s <= 1 ? 'A1' : s <= 3 ? 'A2' : s <= 5 ? 'B1' : 'B2');
    const result = () => {
      const code = levelOf(score);
      const L = LEVELS[code];
      front.innerHTML = `<div class="result">
        <p class="r-top"><span class="r-lvl" style="--c:${L.c}">${code}</span><span class="r-name" id="r-name" tabindex="-1">${L.name}<span>${score} из ${Q.length} ответов верно</span></span></p>
        <p class="r-text">${L.text}</p>
        <p class="r-fit">${L.fit}</p>
        <div class="r-acts"><a class="btn btn--ink" href="#trial" data-trial>Записаться на пробный урок</a><button class="btn btn--line" type="button" data-again>Пройти ещё раз</button></div>
      </div>`;
      now.textContent = `Готово: уровень ${code}`;
      progress(Q.length);
      const sel = $('#f-level');
      if (sel) sel.value = code;
    };

    front.addEventListener('click', (e) => {
      const opt = e.target.closest('.opt');
      if (opt && !opt.disabled) {
        const q = Q[i];
        const n = +opt.dataset.n;
        const ok = n === q.ok;
        if (ok) score++;
        $$('.opt', front).forEach((b) => { b.disabled = true; });
        opt.classList.add('is-picked');
        verdict.textContent = ok ? 'Верно!' : 'Почти';
        right.innerHTML = `${ok ? 'Ответ' : 'Правильно'}: <span lang="${q.optLang}">${esc(q.opts[q.ok])}</span>`;
        why.textContent = q.why;
        back.classList.toggle('is-miss', !ok);
        next.textContent = i < Q.length - 1 ? 'Следующий вопрос' : 'Узнать уровень';
        later(() => { show('back'); later(() => next.focus({ preventScroll: true }), 460); }, 240);
        return;
      }
      if (e.target.closest('[data-again]')) {
        i = 0; score = 0;
        render(0);
        if (!reduce) { card.classList.remove('is-shuffle'); void card.offsetWidth; card.classList.add('is-shuffle'); }
        const first = $('.opt', front);
        if (first) first.focus({ preventScroll: true });
      }
    });
    card.addEventListener('animationend', () => card.classList.remove('is-shuffle'));
    next.addEventListener('click', () => {
      if (i < Q.length - 1) {
        i++;
        render(i);
        show('front');
        later(() => { const f = $('.opt', front); if (f) f.focus({ preventScroll: true }); }, 460);
      } else {
        result();
        show('front');
        later(() => { const r = $('#r-name'); if (r) r.focus({ preventScroll: true }); }, 460);
      }
    });
    render(0);
  }

  /* ---------- карточки слов ---------- */
  $$('.word-card').forEach((b) => {
    b.addEventListener('click', () => b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')));
  });

  /* ---------- вкладки форматов ---------- */
  const tabs = $$('.tab');
  const tag = $('.plate__tag');
  const clock = $('.plate__time');
  const TAGS = { 'tab-group': ['Мадина, группа A2', '12:40'], 'tab-solo': ['Мадина, один на один', '31:05'], 'tab-club': ['Мадина, клуб в четверг', '47:20'] };
  const pick = (tab, focus) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const p = document.getElementById(t.getAttribute('aria-controls'));
      p.hidden = !on;
      if (on && !reduce) { p.classList.remove('is-enter'); void p.offsetWidth; p.classList.add('is-enter'); }
    });
    if (tag && TAGS[tab.id]) { tag.textContent = TAGS[tab.id][0]; clock.textContent = TAGS[tab.id][1]; }
    if (focus) tab.focus();
  };
  tabs.forEach((t, k) => {
    t.addEventListener('click', () => pick(t));
    t.addEventListener('keydown', (e) => {
      const map = { ArrowRight: k + 1, ArrowLeft: k - 1, Home: 0, End: tabs.length - 1 };
      if (!(e.key in map)) return;
      e.preventDefault();
      pick(tabs[(map[e.key] + tabs.length) % tabs.length], true);
    });
  });

  /* ---------- программа: фото рядом со строкой ---------- */
  const index = $('.index');
  if (index) {
    const frame = $('.index__frame', index);
    const imgs = $$('.index__img', frame);
    const cap = $('figcaption', frame);
    let current = $('.index__row', index);
    let front = 0;
    const place = (row) => {
      const max = Math.max(0, index.clientHeight - frame.offsetHeight);
      const y = Math.min(max, Math.max(0, row.offsetTop - 18));
      frame.style.setProperty('--y', y + 'px');
    };
    const preview = (row) => {
      if (!finePointer.matches || innerWidth <= 760) return;
      place(row);
      if (row === current) return;
      current = row;
      const incoming = imgs[1 - front];
      const swap = () => {
        incoming.classList.remove('is-out');
        imgs[front].classList.add('is-out');
        front = 1 - front;
      };
      if (incoming.getAttribute('src') === row.dataset.preview && incoming.complete) swap();
      else { incoming.onload = swap; incoming.src = row.dataset.preview; }
      cap.textContent = row.dataset.cap;
    };
    $$('.index__row', index).forEach((row) => {
      row.addEventListener('pointerenter', () => preview(row));
      row.addEventListener('focus', () => preview(row));
    });
    // заранее подгружаем остальные фото, чтобы смена была мгновенной
    if ('requestIdleCallback' in window) requestIdleCallback(() => $$('.index__row', index).forEach((r) => { const im = new Image(); im.src = r.dataset.preview; }));
  }

  /* ---------- тарифы ведут в форму ---------- */
  const planSel = $('#f-plan');
  const nameInput = $('#f-name');
  const goTrial = () => {
    $('#trial').scrollIntoView({ behavior: smooth, block: 'start' });
    later(() => nameInput && nameInput.focus({ preventScroll: true }), 700);
  };
  $$('.plan__btn').forEach((b) => b.addEventListener('click', () => {
    if (planSel) planSel.value = b.dataset.plan;
    goTrial();
  }));

  /* ---------- окно «это демо» ---------- */
  const modal = $('#modal');
  const modalText = $('#modal-text');
  const TEXT_FORM = 'На настоящем сайте заявка сразу пришла бы владельцу в Telegram.';
  const TEXT_CHAT = 'На настоящем сайте здесь открылся бы Telegram школы, и сообщение сразу увидел бы администратор.';
  let lastFocus = null;
  const openModal = (text) => {
    lastFocus = document.activeElement;
    modalText.textContent = text;
    if (typeof modal.showModal === 'function') modal.showModal();
    else alert('Это демо-сайт. ' + text);
  };
  if (modal) {
    $('[data-close]', modal).addEventListener('click', () => modal.close());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });
    modal.addEventListener('close', () => { if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); });
  }
  $$('[data-demo]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); openModal(TEXT_CHAT); }));

  /* ---------- форма пробного урока ---------- */
  const form = $('#trial-form');
  if (form) {
    const contact = $('#f-contact');
    const fields = [
      { input: nameInput, err: $('#f-name-err'), ok: (v) => v.trim().length >= 2 },
      { input: contact, err: $('#f-contact-err'), ok: (v) => { const t = v.trim(); return t.replace(/\D/g, '').length >= 10 || /^@?[A-Za-z][A-Za-z0-9_]{3,}$/.test(t); } },
    ];
    fields.forEach((f) => f.input.addEventListener('input', () => {
      if (f.err.hidden) return;
      if (f.ok(f.input.value)) { f.err.hidden = true; f.input.removeAttribute('aria-invalid'); }
    }));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let firstBad = null;
      fields.forEach((f) => {
        const good = f.ok(f.input.value);
        f.err.hidden = good;
        if (good) f.input.removeAttribute('aria-invalid');
        else { f.input.setAttribute('aria-invalid', 'true'); firstBad = firstBad || f.input; }
      });
      if (firstBad) { firstBad.focus(); return; }
      openModal(TEXT_FORM);
      nameInput.value = '';
      contact.value = '';
    });
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-trial]')) later(() => nameInput && nameInput.focus({ preventScroll: true }), 700);
  });

  /* ---------- плашка демо ---------- */
  const demo = $('#demo');
  if (demo) {
    const closeBtn = $('.demo__close', demo);
    const openBtn = $('.demo__open', demo);
    let touched = false;
    const setMin = (min, focus) => {
      demo.classList.toggle('is-min', min);
      closeBtn.setAttribute('aria-expanded', String(!min));
      if (focus) (min ? openBtn : $('.demo__link', demo)).focus();
    };
    closeBtn.addEventListener('click', () => { touched = true; setMin(true, true); });
    openBtn.addEventListener('click', () => { touched = true; setMin(false, true); });
    // на телефоне плашка сама сворачивается, когда начинают листать
    if (matchMedia('(max-width: 600px)').matches) {
      const onScroll = () => {
        if (touched) { removeEventListener('scroll', onScroll); return; }
        if (scrollY > innerHeight * 0.9) { setMin(true, false); removeEventListener('scroll', onScroll); }
      };
      addEventListener('scroll', onScroll, { passive: true });
    }
  }

  /* ---------- строка контакта в подвале во всю ширину ---------- */
  const contactLine = $('.foot__contact');
  if (contactLine) {
    const fit = () => {
      contactLine.style.fontSize = '';
      const fs = parseFloat(getComputedStyle(contactLine).fontSize);
      const avail = contactLine.clientWidth;
      const need = contactLine.scrollWidth;
      if (avail && need) contactLine.style.fontSize = Math.min(200, Math.floor(fs * (avail / need) * 0.98)) + 'px';
    };
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(fit);
    let t = 0;
    addEventListener('resize', () => { clearTimeout(t); t = setTimeout(fit, 120); });
  }

  /* ---------- видео урока: играет только на экране ---------- */
  const video = $('.plate__video');
  if (video) {
    if (reduce) { video.removeAttribute('autoplay'); video.pause(); }
    else if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { const p = video.play(); if (p && p.catch) p.catch(() => {}); }
        else video.pause();
      }, { threshold: 0.15 }).observe(video);
    }
  }
})();
