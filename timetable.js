/* ==========================================================================
   宇宙课表 · Cosmic Timetable
   1) 星流粒子背景：canvas + 流场（flow field）
   2) 周课表：数据 → 渲染 → 左右翻页（按钮 / 键盘 / 拖拽）
   ========================================================================== */
(function () {
  'use strict';

  /* ==================================================================
     0. 通用工具
     ================================================================== */

  const $ = (selector, root) => (root || document).querySelector(selector);
  const DAY_MS = 86400000;
  const pad2 = (n) => String(n).padStart(2, '0');

  const prefersReducedMotion =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const isSameDay = (a, b) => a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
  const fmtShort = (d) => `${d.getMonth() + 1}/${pad2(d.getDate())}`;
  const fmtISO = (d) => `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`;

  /* ==================================================================
     1. 宇宙粒子背景
     ================================================================== */

  function initStarfield() {
    const canvas = $('#starfield');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    /* 纸色底：粒子要「看不见」才对 */
    const BG = '245, 245, 240';
    const sprite = createGlowSprite();

    let width = 0;
    let height = 0;
    let particles = [];
    let rafId = 0;
    let lastTs = 0;
    let running = false;

    /* 预先绘制一颗极淡的灰尘贴图 */
    function createGlowSprite() {
      const size = 64;
      const off = document.createElement('canvas');
      off.width = off.height = size;
      const g = off.getContext('2d');
      const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grd.addColorStop(0, 'rgba(10, 10, 10, 1)');
      grd.addColorStop(0.35, 'rgba(10, 10, 10, 0.5)');
      grd.addColorStop(0.7, 'rgba(10, 10, 10, 0.12)');
      grd.addColorStop(1, 'rgba(10, 10, 10, 0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, size, size);
      return off;
    }

    /* 粒子数量极其稀疏：1440 × 1000 大约只有 28 颗 */
    function particleCount() {
      return Math.max(16, Math.min(46, Math.round((width * height) / 52000)));
    }

    /* depth: 0 = 远景（更小更淡更慢） 1 = 近景；透明度上限 0.05 */
    function seed() {
      const total = particleCount();
      particles = new Array(total);
      for (let i = 0; i < total; i += 1) {
        const depth = Math.random();
        particles[i] = {
          x: Math.random() * width,
          y: Math.random() * height,
          depth,
          size: 0.35 + depth * 1.5,
          alpha: 0.014 + depth * 0.036,
          speed: 0.045 + depth * 0.13
        };
      }
    }

    /* 流场：三组正弦叠加，形成极缓慢的空气流动 */
    function angleAt(x, y, t) {
      return (
        Math.sin(x * 0.0015 + t * 0.00005) * 1.5 +
        Math.cos(y * 0.0021 - t * 0.00004) * 1.5 +
        Math.sin((x + y) * 0.0008 + t * 0.00003) * 0.9
      );
    }

    function drawParticle(p, alphaScale) {
      const r = p.size * 5;
      ctx.globalAlpha = p.alpha * (alphaScale || 1);
      ctx.drawImage(sprite, p.x - r, p.y - r, r * 2, r * 2);
    }

    function clearOpaque() {
      ctx.globalAlpha = 1;
      ctx.fillStyle = `rgb(${BG})`;
      ctx.fillRect(0, 0, width, height);
    }

    function drawStaticFrame() {
      clearOpaque();
      for (let i = 0; i < particles.length; i += 1) drawParticle(particles[i], 0.9);
      ctx.globalAlpha = 1;
    }

    function step(ts) {
      if (!lastTs) lastTs = ts;
      const dt = Math.min(34, ts - lastTs) / 16.67;
      lastTs = ts;

      /* 每帧完全重绘：灰尘不留拖尾，画面保持干净 */
      clearOpaque();

      const margin = 48;
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        const angle = angleAt(p.x, p.y, ts);
        p.x += Math.cos(angle) * p.speed * dt;
        p.y += Math.sin(angle) * p.speed * dt;

        if (p.x < -margin) p.x = width + margin;
        else if (p.x > width + margin) p.x = -margin;
        if (p.y < -margin) p.y = height + margin;
        else if (p.y > height + margin) p.y = -margin;

        drawParticle(p, 1);
      }

      ctx.globalAlpha = 1;
      rafId = window.requestAnimationFrame(step);
    }

    function start() {
      if (running || prefersReducedMotion) return;
      running = true;
      lastTs = 0;
      rafId = window.requestAnimationFrame(step);
    }

    function stop() {
      running = false;
      window.cancelAnimationFrame(rafId);
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth || window.innerWidth;
      height = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();

      if (prefersReducedMotion) drawStaticFrame();
      else clearOpaque();
    }

    resize();
    start();

    let resizeTimer = 0;
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 160);
    });

    /* 页面不可见时停掉动画，省电省 CPU */
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else start();
    });
  }

  /* ==================================================================
     2. 课表数据
     ================================================================== */

  const TOTAL_WEEKS = 18;
  const TERM_START = new Date(2026, 7, 30); /* 2026-08-30，第 1 周周日 */
  const LAST_THEORY_WEEK = 14; /* 理论课固定周次：第 1—14 周 */
  const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  /* 第 3-4 节常规 10:15 开始；教室在昭明楼的提前到 10:05 开始 */
  const P34 = { normal: '10:15–11:55', early: '10:05–11:55' };
  const EARLY_ROOM = '昭明楼';

  /* 每天 8 小节 → 4 大节：上午 12 / 34，下午 56 / 78 */
  const PERIODS = [
    {
      id: 'p12',
      label: '上午 路 第1-2节',
      time: '08:20—09:55',
      subs: ['08:20—09:05', '09:10—09:55'],
      first: 1
    },
    {
      id: 'p34',
      label: '上午 路 第3-4节',
      time: P34.normal,
      subs: ['10:15—11:10', '11:10—11:55'],
      note: '昭明楼 10:05',
      first: 3
    },
    {
      id: 'p56',
      label: '下午 路 第5-6节',
      time: '13:40—15:15',
      subs: ['13:40—14:25', '14:30—15:15'],
      first: 5
    },
    {
      id: 'p78',
      label: '下午 路 第7-8节',
      time: '15:25—17:00',
      subs: ['15:25—16:10', '16:15—17:00'],
      first: 7
    },
    {
      id: 'p9',
      label: '晚间 路 第9节',
      time: '18:30—19:15',
      subs: ['18:30—19:15'],
      first: 9
    },
    {
      id: 'p10',
      label: '晚间 路 第10节',
      time: '19:20—20:05',
      subs: ['19:20—20:05'],
      first: 10
    },
    {
      id: 'p11',
      label: '晚间 路 第11节',
      time: '20:10—20:55',
      subs: ['20:10—20:55'],
      first: 11
    }
  ];

  /* 课程工厂：kind 只用「理论」「上机」两种 */
  const theory = (title, room) => ({ title, room, kind: '理论' });
  const lab = (title, room) => ({ title, room, kind: '上机' });

  /* 单门课的实际时间：第 3-4 节遇昭明楼教室时提前到 10:05 开始 */
  function courseTime(period, course) {
    if (period.id === 'p34' && course.room && course.room.indexOf(EARLY_ROOM) === 0) {
      return P34.early;
    }
    return period.time;
  }

  /* 理论课固定课表（第 1—14 周）：day 索引 0 = 周日，1 = 周一 …… 6 = 周六；键为大节 id */
  const PLAN_BASE = {
    1: { /* 周一 */
      p56: theory('操作系统', '京江楼B105')
    },
    2: { /* 周二 */
      p12: theory('计算机网络', '文心楼A402'),
      p34: theory('汇编语言', '昭明楼316'),
      p56: theory('软件工程', '京江楼B205')
    },
    3: { /* 周三 */
      p34: theory('操作系统', '昭明楼214')
    },
    4: { /* 周四 */
      p12: theory('汇编语言', '昭明楼214'),
      p34: theory('计算机网络', '文心楼B205')
    }
    /* 0 = 周日、5 = 周五、6 = 周六：无课 */
  };

  /* 各周增补 / 覆盖：周次 → 星期 → 大节 → 课程 */
  const WEEK_EXTRA = {};

  function addSlot(week, day, period, course) {
    const weekPlan = WEEK_EXTRA[week] || (WEEK_EXTRA[week] = {});
    const dayPlan = weekPlan[day] || (weekPlan[day] = {});
    dayPlan[period] = course;
  }

  /* 计算机网络上机实验：第 7—14 周，周一第 3-4 节，B403 机房 */
  for (let week = 7; week <= 14; week += 1) {
    addSlot(week, 1, 'p34', lab('计算机网络', 'B403机房'));
  }

  /* 软件工程A 上机（计算机2404/2405/2406）：
     第 6—9 周 周四 5-6 节 A407 机房；第 10 / 12 / 14 / 15 周 周三 5-6 节 A406 机房 */
  [6, 7, 8, 9].forEach((week) => addSlot(week, 4, 'p56', lab('软件工程', 'A407机房')));
  [10, 12, 14, 15].forEach((week) => addSlot(week, 3, 'p56', lab('软件工程', 'A406机房')));

  /* 第 15 周 周二 5-6 节补一节软件工程理论课（教室与之前周二相同） */
  addSlot(15, 2, 'p56', theory('软件工程', '京江楼B205'));

  /* 汇编语言与接口技术课程设计 上机（计算机2401/2402/2403）：
     第 17 周 周一至周五、第 18 周 周一至周二，5-6 节与 7-8 节，A411 / A412 机房 */
  [17, 18].forEach((week) => {
    const days = week === 17 ? [1, 2, 3, 4, 5] : [1, 2];
    days.forEach((day) => {
      addSlot(week, day, 'p56', lab('汇编语言课程设计', 'A411/A412机房'));
      addSlot(week, day, 'p78', lab('汇编语言课程设计', 'A411/A412机房'));
    });
  });

  /* 数据库：第 10—14 周，周一 7-9 节，昭明楼 301 */
  for (let week = 10; week <= 14; week += 1) {
    addSlot(week, 1, 'p78', theory('数据库', '昭明楼301'));
    addSlot(week, 1, 'p9', theory('数据库', '昭明楼301'));
  }

  /* 电工电子：第 14 周 周一 第 9 节；第 8—13 周 周一 9-11 节，文心楼 A208 */
  addSlot(14, 1, 'p9', theory('电工电子', '文心楼A208'));
  for (let week = 8; week <= 13; week += 1) {
    addSlot(week, 1, 'p9', theory('电工电子', '文心楼A208'));
    addSlot(week, 1, 'p10', theory('电工电子', '文心楼A208'));
    addSlot(week, 1, 'p11', theory('电工电子', '文心楼A208'));
  }

  /* 计算机组成原理：第 14 周 周二 第 9 节；第 8—13 周 周二 9-11 节，京江楼 B103 */
  addSlot(14, 2, 'p9', theory('计算机组成原理', '京江楼B103'));
  for (let week = 8; week <= 13; week += 1) {
    addSlot(week, 2, 'p9', theory('计算机组成原理', '京江楼B103'));
    addSlot(week, 2, 'p10', theory('计算机组成原理', '京江楼B103'));
    addSlot(week, 2, 'p11', theory('计算机组成原理', '京江楼B103'));
  }


  /* 组装某一周的课表：第 1—14 周先铺理论课，再叠加该周的增补 */
  function planFor(week) {
    const plan = {};
    if (week <= LAST_THEORY_WEEK) {
      Object.keys(PLAN_BASE).forEach((day) => {
        plan[day] = Object.assign({}, PLAN_BASE[day]);
      });
    }
    const extra = WEEK_EXTRA[week];
    if (extra) {
      Object.keys(extra).forEach((day) => {
        plan[day] = Object.assign({}, plan[day], extra[day]);
      });
    }
    return plan;
  }

  /* 一周从周日开始：第 1 周 = 2026/08/30（周日）— 09/05（周六） */
  const sundayOfWeek = (week) => addDays(TERM_START, (week - 1) * 7);
  const sundayOf = (date) => addDays(startOfDay(date), -date.getDay());

  /* ==================================================================
     3. 渲染课表
     ================================================================== */

  const dom = {
    track: $('#track'),
    viewport: $('#viewport'),
    weekLabel: $('#weekLabel'),
    weekRange: $('#weekRange'),
    counter: $('#counter'),
    progressBar: $('#progressBar'),
    prevBtn: $('#prevWeek'),
    nextBtn: $('#nextWeek'),
    todayBtn: $('#todayBtn'),
    semesterMeta: $('#semesterMeta')
  };

  const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);

  /* 卡片：课程名 / 具体时间 / 教室 + 理论·上机标签 */
  function courseHTML(course, period) {
    const type = course.kind === '上机' ? 'is-lab' : 'is-theory';
    return (
      `<article class="course ${type}">` +
        `<p class="c-title">${escapeHTML(course.title)}</p>` +
        `<p class="c-time">${escapeHTML(courseTime(period, course))}</p>` +
        '<p class="c-meta">' +
          `<span class="c-room">${escapeHTML(course.room)}</span>` +
          `<span class="c-kind">${escapeHTML(course.kind)}</span>` +
        '</p>' +
      '</article>'
    );
  }

  /* 一周 = 表头一行 + 每个大节一行；行用 display:contents 保持 grid 布局语义 */
  function panelHTML(week) {
    const sunday = sundayOfWeek(week);
    const plan = planFor(week);
    const today = startOfDay(new Date());
    const parts = [];

    parts.push(
      '<div class="g-row g-head" role="row">' +
        '<div class="corner" role="columnheader"><span>节次</span></div>'
    );
    for (let day = 0; day < 7; day += 1) {
      const date = addDays(sunday, day);
      const isToday = isSameDay(date, today);
      parts.push(
        `<div class="day-head${isToday ? ' is-today' : ''}" role="columnheader">` +
          `<span class="day-name">${WEEKDAYS[day]}</span>` +
          `<span class="day-date">${fmtShort(date)}</span>` +
        '</div>'
      );
    }
    parts.push('</div>');

    PERIODS.forEach((period) => {
      const first = period.first || 1;
      let tip;
      if (period.subs.length === 1) {
        tip = `第 ${first} 节 ${period.time}`;
      } else {
        tip = `大节 ${period.time} · 第 ${first} 小节 ${period.subs[0]} · 第 ${first + 1} 小节 ${period.subs[1]}`;
      }
      const subSpans = period.subs.map((s) => `<span class="p-time">${s}</span>`).join('');
      parts.push(
        '<div class="g-row" role="row">' +
          `<div class="period" role="rowheader" title="${tip}">` +
            `<span class="p-label">${period.label}</span>` +
            subSpans +
            (period.note ? `<span class="p-note">${period.note}</span>` : '') +
          '</div>'
      );

      for (let day = 0; day < 7; day += 1) {
        const course = (plan[day] || {})[period.id];
        const isToday = isSameDay(addDays(sunday, day), today);
        let cls = 'cell';
        if (isToday) cls += ' is-today';
        if (!course) cls += ' is-empty';
        parts.push(`<div class="${cls}" role="cell">${course ? courseHTML(course, period) : ''}</div>`);
      }

      parts.push('</div>');
    });

    return `<div class="grid" role="table" aria-label="第 ${week} 周课程表">${parts.join('')}</div>`;
  }

  function buildPanels() {
    const fragment = document.createDocumentFragment();
    for (let week = 1; week <= TOTAL_WEEKS; week += 1) {
      const panel = document.createElement('div');
      panel.className = 'week-panel';
      panel.dataset.week = String(week);
      panel.innerHTML = panelHTML(week);
      fragment.appendChild(panel);
    }
    dom.track.replaceChildren(fragment);
    return Array.from(dom.track.children);
  }

  /* ==================================================================
     4. 翻页
     ================================================================== */

  const TODAY = startOfDay(new Date());

  function homeWeek() {
    const diff = Math.round((sundayOf(TODAY) - sundayOf(TERM_START)) / DAY_MS / 7);
    return Math.min(TOTAL_WEEKS, Math.max(1, diff + 1));
  }

  /* 当前教学周：本地时间在学期区间内时，第 1 页就是本周 */
  const HOME_WEEK = homeWeek();

  let panels = [];
  let current = HOME_WEEK;

  const clampWeek = (week) => Math.min(TOTAL_WEEKS, Math.max(1, week));

  function setTransform(px) {
    dom.track.style.transform = `translate3d(${px}px, 0, 0)`;
  }

  const offsetFor = (week) => -(week - 1) * (dom.viewport.clientWidth || 1);
  const activePanel = () => panels[current - 1] || null;

  function syncPanels() {
    panels.forEach((panel, index) => {
      panel.classList.toggle('is-active', index === current - 1);
    });
  }

  function syncUI() {
    const sunday = sundayOfWeek(current);
    dom.weekLabel.innerHTML = `第 <span class="num">${current}</span> 周`;
    dom.weekRange.textContent = `${fmtISO(sunday)} — ${fmtShort(addDays(sunday, 6))}`;
    dom.counter.textContent = `WEEK ${pad2(current)} / ${TOTAL_WEEKS}`;
    dom.progressBar.style.width = `${(current / TOTAL_WEEKS) * 100}%`;
    dom.prevBtn.disabled = current <= 1;
    dom.nextBtn.disabled = current >= TOTAL_WEEKS;
    dom.todayBtn.disabled = current === HOME_WEEK;
  }

  function goTo(week, animate) {
    const target = clampWeek(week);
    const changed = target !== current;
    current = target;

    if (animate === false) {
      dom.track.style.transition = 'none';
      setTransform(offsetFor(current));
      void dom.track.offsetWidth;
      dom.track.style.transition = '';
    } else {
      setTransform(offsetFor(current));
    }

    syncPanels();
    syncUI();
    return changed;
  }

  /* ==================================================================
     5. 拖拽切换（鼠标 / 触摸 / 触控笔）
     ================================================================== */

  function initSwipe() {
    const surface = dom.viewport;
    if (!surface) return;

    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastTs = 0;
    let velocity = 0;
    let axis = null;

    /* 窄屏时单周内部可横向滚动：先滚到边缘，再翻页 */
    function panelCanScroll(panel, dx) {
      if (!panel || panel.scrollWidth <= panel.clientWidth + 2) return false;
      return dx < 0
        ? panel.scrollLeft + panel.clientWidth < panel.scrollWidth - 2
        : panel.scrollLeft > 2;
    }

    function dragTransform(dx) {
      const atEdge = (current <= 1 && dx > 0) || (current >= TOTAL_WEEKS && dx < 0);
      setTransform(offsetFor(current) + dx * (atEdge ? 0.2 : 0.6));
    }

    surface.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      pointerId = event.pointerId;
      startX = lastX = event.clientX;
      startY = event.clientY;
      lastTs = event.timeStamp;
      velocity = 0;
      axis = null;
      if (surface.setPointerCapture) surface.setPointerCapture(pointerId);
    });

    surface.addEventListener('pointermove', (event) => {
      if (pointerId === null || event.pointerId !== pointerId) return;

      const dx = event.clientX - startX;
      const dy = event.clientY - startY;

      if (!axis) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        if (Math.abs(dy) > Math.abs(dx)) {
          axis = 'y'; /* 纵向手势交还页面滚动 */
          return;
        }
        if (panelCanScroll(activePanel(), dx)) {
          axis = 'scroll'; /* 先让课表自身横向滚动 */
          return;
        }
        axis = 'x';
        dom.track.style.transition = 'none';
      }

      if (axis !== 'x') return;

      event.preventDefault();
      dragTransform(dx);

      const elapsed = event.timeStamp - lastTs;
      if (elapsed > 0) velocity = (event.clientX - lastX) / elapsed;
      lastX = event.clientX;
      lastTs = event.timeStamp;
    });

    function endDrag(event) {
      if (pointerId === null) return;
      if (event && event.pointerId !== pointerId) return;

      const dx = (event ? event.clientX : lastX) - startX;
      const wasDragging = axis === 'x';

      pointerId = null;
      axis = null;

      if (!wasDragging) return;

      dom.track.style.transition = '';
      void dom.track.offsetWidth;

      const width = dom.viewport.clientWidth || 1;
      const far = Math.abs(dx) > width * 0.16;
      const fast = Math.abs(velocity) > 0.45;

      let target = current;
      if (dx < 0 && (far || (fast && velocity < 0))) target = current + 1;
      else if (dx > 0 && (far || (fast && velocity > 0))) target = current - 1;

      goTo(target);
    }

    surface.addEventListener('pointerup', endDrag);
    surface.addEventListener('pointercancel', endDrag);
  }

  /* ==================================================================
     6. 启动
     ================================================================== */

  function init() {
    panels = buildPanels();
    current = HOME_WEEK;
    goTo(HOME_WEEK, false);
    initSwipe();

    const lastSunday = sundayOfWeek(TOTAL_WEEKS);
    dom.semesterMeta.textContent =
      `${fmtISO(TERM_START)} — ${fmtISO(addDays(lastSunday, 6))} · 共 ${TOTAL_WEEKS} 教学周`;

    dom.prevBtn.addEventListener('click', () => goTo(current - 1));
    dom.nextBtn.addEventListener('click', () => goTo(current + 1));
    dom.todayBtn.addEventListener('click', () => goTo(HOME_WEEK));

    document.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goTo(current - 1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goTo(current + 1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        goTo(HOME_WEEK);
      }
    });

    let resizeTimer = 0;
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => goTo(current, false), 120);
    });
  }

  function boot() {
    initStarfield();
    init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

