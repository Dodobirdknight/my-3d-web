/* ==========================================================================
   HERE IS TIMETABLE — 首页脚本
   1) 卡阵数据：一轮 37 张专辑 —— 4 门课 + 3 门上机 + 30 个章节
      （课名、教室、周次取自课表，章节名取自教学大纲）
   2) 卡阵：一律正着摆（不转向）—— 沿一条「左高右低」的倒 C（∩）上下起伏、逐张叠压；
      一圈 37 张首尾相扣，于是卡带可以一直从左往右流
   3) 交互：鼠标左右移动 / 拖拽 / 滚轮 / 方向键 → 卡阵转动；
      鼠标靠近哪张，哪张原地放大成一张正方的卡；点一下直接进第二页（课程页）；
      鼠标静止 2.8 秒后，卡阵自己从左往右慢慢走，一圈接一圈
   ========================================================================== */
(function () {
  'use strict';

  const $ = (selector, root) => (root || document).querySelector(selector);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (value) => String(value).replace(/[&<>\"']/g, (ch) => ESCAPE_MAP[ch]);

  /* ==================================================================
     一、四门课：课名 / 教室 / 周次 / 章节目录
     ================================================================== */

  const COURSES = [
    {
      key: 'os', no: '01', cn: '操作系统', en: 'Operating Systems',
      rooms: '京江楼 B105 · 昭明楼 214', weeks: 'W01—W14',
      chapters: ['操作系统引论', '进程与线程', '处理机调度与死锁', '进程同步与互斥',
        '存储器管理', '文件管理', '设备管理']
    },
    {
      key: 'net', no: '02', cn: '计算机网络', en: 'Computer Networks',
      rooms: '文心楼 A402 · B205', weeks: 'W01—W14',
      chapters: ['概述', '物理层', '数据链路层', '网络层', '传输层', '应用层', '网络安全（选讲）']
    },
    {
      key: 'asm', no: '03', cn: '汇编语言', en: 'Assembly Language',
      rooms: '昭明楼 316 · 214', weeks: 'W01—W14',
      chapters: ['基础知识', '寄存器与寻址方式', '指令系统', '源程序格式与调试', '子程序与结构化设计',
        '存储器与 I/O 接口', '中断系统与系统调用', '综合应用与课程设计']
    },
    {
      key: 'se', no: '04', cn: '软件工程', en: 'Software Engineering',
      rooms: '京江楼 B205', weeks: 'W01—W14',
      chapters: ['软件工程概述', '可行性研究与需求分析', '软件设计', '软件实现与编码', '软件测试',
        '软件维护', '软件项目管理', '面向对象方法与统一过程']
    }
  ];

  /* 上机 / 课程设计：单独成张专辑 */
  const LABS = [
    { key: 'net', cat: 'CT-02L', cn: '计算机网络上机', en: 'Network Lab', rooms: 'B403 机房', weeks: 'W07—W14' },
    { key: 'asm', cat: 'CT-03L', cn: '汇编语言课程设计', en: 'Assembly Project', rooms: 'A411 / A412 机房', weeks: 'W15—W18' },
    { key: 'se', cat: 'CT-04L', cn: '软件工程上机', en: 'Software Lab', rooms: 'A407 / A406 机房', weeks: 'W06—W15' }
  ];

  /* ==================================================================
     二、铺成一轮卡带：每门课 = 一张课程专辑 +（上机专辑）+ 各章节专辑
     ================================================================== */

  const pad = (n) => (n < 10 ? '0' + n : String(n));
  const ROUND = [];

  COURSES.forEach((course) => {
    ROUND.push({
      key: course.key, cat: 'CT-' + course.no, course: course.cn,
      cn: course.cn, en: course.en, note: course.rooms, tag: course.weeks
    });

    LABS.filter((lab) => lab.key === course.key).forEach((lab) => {
      ROUND.push({
        key: lab.key, cat: lab.cat, course: course.cn,
        cn: lab.cn, en: lab.en, note: lab.rooms, tag: lab.weeks
      });
    });

    course.chapters.forEach((chapter, index) => {
      ROUND.push({
        key: course.key, cat: 'CT-' + course.no + '·' + pad(index + 1), course: course.cn,
        cn: chapter, en: course.en, note: course.cn, tag: course.weeks
      });
    });
  });

  /* ==================================================================
     三、卡阵的参数（屏幕空间：k = |x| / xmax，0 = 正中，1 = 页面两边）
     ================================================================== */

  const TURN = 0;          // 左右转向（rotateY，度）—— 0 = 一律正着摆
  const ROLL = 0;          // 左右歪斜（rotateZ，度）—— 0 = 一律正着摆
  const SHRINK = 0.12;     // 边缘一张缩到 1 - SHRINK（越靠边稍微沉一点）
  const ARCH = 1.15;       // 边缘一张沿倒 C 下沉的距离 = 卡宽 × ARCH
  const TILT = 0.14;       // 左高右低：左端抬、右端沉 各 卡宽 × TILT（整条卡带是斜的）
  const POWER = 2;         // 起伏指数：越大中间越平、两端越沉
  const GAP = -0.4;        // 相邻两张的间距 = 卡宽 × GAP（负＝叠压，全屏按比例一样）
  const RANGE = 12;        // 左右各可翻 12 张（正好铺满整幅宽）
  const SWEEP = 12;        // 鼠标从左扫到右，正好走过 RANGE 张
  const IDLE = 2800;       // 静止多久后开始自流（毫秒）
  const DRIFT = 0.32;      // 自流速度（张 / 秒）—— 只朝右，一圈接一圈
  const NEAR = 1.05;       // 「鼠标靠近」的判定半径 = 卡宽 × NEAR
  const NEAR_Y = 1.55;     // 竖直方向再收一点：指针在页面上下角时不会误吸卡片
  const GROW = 0.34;       // 靠近的那张放大到 1 + GROW（等比放大，仍是正方形）

  const SKINS = ['cream', 'ink', 'cobalt', 'acid', 'white', 'blush', 'tang'];
  const VARIANTS = ['a', 'b', 'c'];

  /* 只铺一轮就够：一轮 37 张，视野里二十多张，永远不会自己撞脸 */
  const DECK = ROUND.slice();

  const ring = $('#ring');

  let cards = [];
  let metrics = null;
  let spin = 0;          // 卡阵当前落点 = sweep + phase（以「第几张卡」计量）
  let sweep = 0;         // 鼠标 / 滚轮 / 方向键拨出来的位置（限在 min..max 之间）
  let phase = 0;         // 自流累积的位置（一路朝右，不设上限，靠 relOffset 折成一圈）
  let target = 0;        // 目标落点
  let base = 0;          // 初始居中位置
  let dragging = false;
  let dragX = 0;
  let dragFrom = 0;
  let lift = [];         // 每一张的放大进度：0 = 在原位，1 = 放大成一张方卡
  let hoverIndex = -1;   // 鼠标最近的那一张
  let pointerX = -1e9;   // 指针位置（不指在页面上时是个极小的数）
  let pointerY = -1e9;
  let lastPointer = -1e9;
  let lastFrame = 0;

  /* 中文标题按字数定字号（去掉空格再数），长标题换到第二行 */
  function cnScale(text) {
    const n = Math.max(1, Array.from(String(text).replace(/\s+/g, '')).length);
    return clamp(0.84 / n, 0.11, 0.21);
  }

  function template(album) {
    return '<span class="sv-head"><span>' + esc(album.cat) + '</span>' +
        '<span>' + esc(album.tag) + '</span></span>' +
      '<span class="sv-name">' +
        '<span class="sv-cn">' + esc(album.cn) + '</span>' +
        '<span class="sv-en">' + esc(album.en) + '</span>' +
      '</span>' +
      '<span class="sv-foot"><span>' + esc(album.note) + '</span></span>';
  }

  function build() {
    const fragment = document.createDocumentFragment();
    cards = [];
    lift = [];

    DECK.forEach((album, index) => {
      const el = document.createElement('a');
      el.className = 'sleeve skin-' + SKINS[index % SKINS.length] +
        ' sv-' + VARIANTS[index % VARIANTS.length];
      el.href = 'courses.html?course=' + album.key;
      el.setAttribute('aria-label', album.cn + ' · ' + album.course + ' · ' + album.tag);
      el.style.setProperty('--cn', cnScale(album.cn).toFixed(4));
      el.dataset.hidden = '0';
      el.innerHTML = template(album);
      fragment.appendChild(el);
      cards.push(el);
      lift.push(0);
    });

    ring.appendChild(fragment);
  }

  /* ==================================================================
     四、尺度：卡宽定「一张卡多小」，xmax 定「最左最右正好到页面两边」
     ================================================================== */

  function measure() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    /* 卡宽 = 视口宽 / ratio：窄屏卡更大、宽屏卡更小（比参考图再放大一档） */
    const size = vw < 560 ? { ratio: 5.8 }
      : vw < 900 ? { ratio: 7.4 }
        : { ratio: 10.7 };

    const cw = Math.round(vw / size.ratio);
    const xmax = vw / 2 - cw / 2;                 // 边缘那张的中心位置：正好贴住页面两边
    const gap = cw * GAP;                         // 全屏统一的间距（GAP 为负＝相邻两张叠压）

    /* 一张卡在屏幕上真正占的宽度：越靠边缩一点（一律正着摆，所以没有转向带来的宽度损失） */
    const widthAt = (x) => {
      const k = clamp(Math.abs(x) / xmax, 0, 1);
      return cw * (1 - SHRINK * k) * Math.cos((k * TURN * Math.PI) / 180);
    };

    /* 从正中往外一张张摆：每一步按「卡宽 × GAP」留同样的间距 —— 于是全屏疏密一致 */
    const spacing = [0];
    const cap = vw / 2 + cw;                      // 越过这里就整张出画
    let x = 0;
    while (x < cap && spacing.length <= DECK.length) {
      const here = widthAt(x);
      let next = x + here + gap;
      /* 间距要按「下一张自己的宽度」来留，迭代三次就收敛 */
      for (let n = 0; n < 3; n += 1) next = x + (here + widthAt(next)) / 2 + gap;
      x = next;
      spacing.push(x);
    }

    /* 左高右低的斜度：左端抬 tilt、右端沉 tilt；整条卡带同时抬 rise，
       于是沉下去的右端仍然停在底部小字之上（一抬一沉，构图重心不动） */
    const tilt = cw * TILT;
    const rise = tilt / 2;

    /* 下沉量：中间抬得高、两端沉得深，弧度按卡宽定；矮屏时收一点，别压到左下角那行小字上 */
    const origin = ring.getBoundingClientRect();
    const room = vh - 62 - cw * (1 - SHRINK) / 2 - origin.top;
    const arch = Math.min(cw * ARCH, Math.max(cw * 0.2, room - tilt * 1.5));

    metrics = {
      cw: cw,
      xmax: xmax,
      spacing: spacing,
      arch: arch,
      tilt: tilt,                                 // 左高右低的一斜（px）：左端 -tilt、右端 +tilt
      rise: rise,                                 // 整条卡带统一抬起的量（px）
      turn: TURN,
      roll: ROLL,
      shrink: SHRINK,
      power: POWER,
      originX: origin.left,                       // 卡阵原点在视口里的位置（判「鼠标靠近」用）
      originY: origin.top,
      cut: (vw / 2 + cw) / xmax,                  // k 超过它就整张出画
      min: Math.max(0, base - RANGE),
      max: Math.min(DECK.length - 1, base + RANGE)
    };

    ring.style.setProperty('--cw', cw + 'px');
  }

  /* ==================================================================
     五、逐张摆位：左高右低那条倒 C 上的一点 —— x 均匀铺满，一律正着摆，越靠边稍微缩一点、沉一点
     ================================================================== */

  /* 把「相对正中第几张」折进一轮之内：卡带一直朝右流，出画的卡从另一头无缝接上 */
  function relOffset(d) {
    const n = DECK.length;
    const half = n / 2;
    let v = (d + half) % n;
    if (v < 0) v += n;
    return v - half;
  }

  /* 由「离正中几张」反查屏幕横坐标：表内插值，表外顺着最后一步外推 */
  function slotX(at) {
    const table = metrics.spacing;
    const last = table.length - 1;
    if (at <= last) {
      const lo = Math.floor(at);
      const f = at - lo;
      return f === 0 ? table[lo] : table[lo] + (table[lo + 1] - table[lo]) * f;
    }
    return table[last] + (at - last) * (table[last] - table[last - 1]);
  }

  function paint() {
    let hover = -1;
    let hoverD = metrics.cw * NEAR;                // 「靠近」的判定半径

    for (let i = 0; i < cards.length; i += 1) {
      const el = cards[i];
      const t = relOffset(i - spin);               // 相对正中第几张（折进一轮之内）
      const side = t < 0 ? -1 : 1;
      const x = slotX(Math.abs(t)) * side;         // 屏幕上的横坐标
      const raw = Math.abs(x) / metrics.xmax;      // 未截断：判断出画用
      const k = Math.min(1, raw);                  // 截断到 0..1：所有视觉参数只看它

      if (raw > metrics.cut) {
        if (el.dataset.hidden !== '1') {
          el.dataset.hidden = '1';
          el.style.visibility = 'hidden';
          el.style.pointerEvents = 'none';
          el.tabIndex = -1;
        }
        lift[i] = 0;
        continue;
      }

      if (el.dataset.hidden === '1') {
        el.dataset.hidden = '0';
        el.style.visibility = 'visible';
        el.style.pointerEvents = '';
      }
      el.tabIndex = raw <= 1 ? 0 : -1;

      /* 屏幕空间里的倒 C：x 均分、y 按 k 的幂下沉，再叠一道左高右低的斜；一律正着摆 */
      const lx = x;
      const ly = metrics.arch * Math.pow(k, metrics.power) + metrics.tilt * k * side - metrics.rise;
      const ry = side * k * metrics.turn;
      const rz = -side * k * metrics.roll;
      /* 鼠标靠近的那张：原地等比放大成一张正方卡，并压到卡阵最上面 */
      const shrink = (1 - metrics.shrink * k) * (1 + GROW * lift[i]);
      const layer = 2000 - Math.round(k * 1000) + Math.round(lift[i] * 3000);

      /* 指针离哪张���近，哪张就是「靠近」的那张（竖直方向收一点，免得吸到页面上下角） */
      if (pointerY > -1e8) {
        const dx = metrics.originX + lx - pointerX;
        const dy = (metrics.originY + ly - pointerY) * NEAR_Y;
        const d = Math.hypot(dx, dy);
        if (d < hoverD) {
          hoverD = d;
          hover = i;
        }
      }

      // Use GSAP to set 3D transforms so we can leverage GPU and smooth interpolation.
      if (window.gsap && typeof window.gsap.set === 'function') {
        // translateZ is used to give subtle depth; larger k (towards edge) moves slightly backwards
        const depth = -Math.round(k * 180);
        gsap.set(el, {
          x: lx,
          y: ly,
          z: depth,
          rotationY: ry,
          rotationZ: rz,
          scale: shrink,
          transformPerspective: 1200,
          transformOrigin: '50% 50%'
        });
      } else {
        el.style.transform =
          'translate3d(' + lx.toFixed(2) + 'px, ' + ly.toFixed(2) + 'px, 0) ' +
          'rotateY(' + ry.toFixed(2) + 'deg) ' +
          'rotateZ(' + rz.toFixed(2) + 'deg) ' +
          'scale(' + shrink.toFixed(4) + ')';
      }

      el.style.zIndex = String(layer);
    }

    /* 换一张卡被靠近：只负责摘 / 挂那点更重的投影，大小由 lift 逐帧缓动 */
    if (hover !== hoverIndex) {
      if (hoverIndex >= 0) cards[hoverIndex].classList.remove('is-lift');
      hoverIndex = hover;
      if (hoverIndex >= 0) cards[hoverIndex].classList.add('is-lift');
    }
  }

  /* ==================================================================
     六、每一帧：自流 + 缓动 + 靠近放大
     ================================================================== */

  function loop(now) {
    if (!lastFrame) lastFrame = now;
    /* 夹住 dt：一来慢帧不至于跳一大步，二来时间戳万一倒了也不会把卡阵倒着推 */
    const dt = clamp((now - lastFrame) / 1000, 0, 0.05);
    lastFrame = now;

    /* 放大进度：被靠近的那张涨到 1，其余的落回 0 */
    const rate = reduced ? 1 : Math.min(1, dt * 9);
    for (let i = 0; i < lift.length; i += 1) {
      const goal = i === hoverIndex ? 1 : 0;
      lift[i] += (goal - lift[i]) * rate;
      if (Math.abs(goal - lift[i]) < 0.002) lift[i] = goal;
    }

    if (reduced) {
      target = sweep + phase;
      spin = target;
    } else {
      /* 鼠标没动：卡阵自己从左往右流 —— 位置一直减，靠 relOffset 折进一轮，永不到头 */
      if (!dragging && now - lastPointer > IDLE) phase -= DRIFT * dt;
      target = sweep + phase;
      spin += (target - spin) * Math.min(1, dt * 5.5);
      if (Math.abs(target - spin) < 0.0005) spin = target;
    }

    paint();
    requestAnimationFrame(loop);
  }

  /* ==================================================================
     七、交互：鼠标横移 / 拖拽 / 滚轮 / 方向键
     ================================================================== */

  function sweepTo(clientX) {
    const ratio = clamp(clientX / window.innerWidth, 0, 1);
    return clamp(base + (ratio - 0.5) * SWEEP, metrics.min, metrics.max);
  }

  /* 鼠标一动就记一笔：不动手了就让它继续从左往右流（方向恒定，不用记方向） */
  function wake() {
    lastPointer = performance.now();
  }

  window.addEventListener('pointermove', (event) => {
    lastPointer = performance.now();
    pointerX = event.clientX;                     // 「鼠标靠近哪张」认的就是这里
    pointerY = event.clientY;

    if (event.pointerType === 'mouse') {
      dragging = false;
      sweep = sweepTo(event.clientX);
      return;
    }

    if (dragging) {
      const perCard = metrics.spacing[1] || 1;      // 屏幕上一张卡差不多占多少像素
      sweep = clamp(dragFrom - (event.clientX - dragX) / perCard, metrics.min, metrics.max);
    }
  }, { passive: true });

  /* 指针划出窗口：把「靠近」清掉，别让某一张一直张着 */
  document.addEventListener('pointerleave', () => {
    pointerX = -1e9;
    pointerY = -1e9;
  }, { passive: true });

  window.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse') return;
    dragging = true;
    dragX = event.clientX;
    dragFrom = sweep;
    wake();
  }, { passive: true });

  window.addEventListener('pointerup', () => { dragging = false; }, { passive: true });
  window.addEventListener('pointercancel', () => { dragging = false; }, { passive: true });

  window.addEventListener('wheel', (event) => {
    wake();
    const delta = (event.deltaY || 0) + (event.deltaX || 0);
    sweep = clamp(sweep + delta / 320, metrics.min, metrics.max);
  }, { passive: true });

  window.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    wake();
    const step = event.key === 'ArrowRight' ? 1 : -1;
    sweep = clamp(Math.round(sweep) + step, metrics.min, metrics.max);
    event.preventDefault();
  });

  window.addEventListener('resize', () => {
    measure();
    sweep = clamp(sweep, metrics.min, metrics.max);
    paint();
  });

  /* ==================================================================
     八、点一下：不拦任何事件 —— <a href> 自己带走，直接进第二页（课程页）
         放大只跟「鼠标靠近」有关，与点击无关
     ================================================================== */

  /* ==================================================================
     九、启动
     ================================================================== */

  base = Math.floor(DECK.length / 2);
  measure();
  build();
  sweep = clamp(base, metrics.min, metrics.max);
  target = spin = sweep + phase;
  paint();
  requestAnimationFrame(loop);
})();
