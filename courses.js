/* courses.js — Pure CSS3D + DOM paper fan (replaces three.js implementation) */
(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ==================================================================
     0. 八张纸的数据（与原实现内容一致）
     ================================================================== */
  const PLATES = [
    { id: 'os', side: 'left', no: '01', cn: '操作系统', en: 'Operating Systems',
      rooms: '京江楼 B105 · 昭明楼 214', weeks: 'W01—W14',
      chapters: ['操作系统引论','进程与线程','处理机调度与死锁','进程同步与互斥','存储器管理','文件管理','设备管理'],
      backColor: 'yellow', flipped: false
    },
    { id: 'net', side: 'left', no: '02', cn: '计算机网络', en: 'Computer Networks',
      rooms: '文心楼 A402 · B205', weeks: 'W01—W14',
      chapters: ['概述','物理层','数据链路层','网络层','传输层','应用层','网络安全（选讲）'],
      backColor: 'blue', flipped: true
    },
    { id: 'asm', side: 'left', no: '03', cn: '汇编语言', en: 'Assembly Language',
      rooms: '昭明楼 316 · 214', weeks: 'W01—W14',
      chapters: ['基础知识','寄存器与寻址方式','指令系统','源程序格式与调试','子程序与结构化设计','存储器与 I/O 接口','中断系统与系统调用','综合应用与课程设计'],
      backColor: 'yellow', flipped: false
    },
    { id: 'se', side: 'left', no: '04', cn: '软件工程', en: 'Software Engineering',
      rooms: '京江楼 B205', weeks: 'W01—W14',
      chapters: ['软件工程概述','可行性研究与需求分析','软件设计','软件实现与编码','软件测试','软件维护','软件项目管理','面向对象方法与统一过程'],
      backColor: 'blue', flipped: true
    },
    { id: 'net-lab', side: 'right', no: 'L2', cn: '计算机网络上机', en: 'Network Lab',
      rooms: 'B403 机房', weeks: 'W07—W14',
      chapters: ['Wireshark 抓包','Socket 编程','路由配置模拟','网络安全实验'],
      backColor: 'yellow', flipped: false
    },
    { id: 'asm-proj', side: 'right', no: 'L3', cn: '汇编课程设计', en: 'Assembly Project',
      rooms: 'A411 / A412 机房', weeks: 'W15—W18',
      chapters: ['汇编程序设计','接口技术实验','综合项目开发','答辩与报告'],
      backColor: 'blue', flipped: true
    },
    { id: 'se-lab', side: 'right', no: 'L4', cn: '软件工程上机', en: 'Software Lab',
      rooms: 'A407 / A406 机房', weeks: 'W06—W15',
      chapters: ['UML 建模工具','版本控制实践','单元测试与持续集成','小型项目迭代'],
      backColor: 'yellow', flipped: false
    },
    { id: 'overview', side: 'right', no: '00', cn: '周课表总览', en: 'Timetable Overview',
      rooms: '全学期', weeks: 'W01—W18',
      chapters: ['周一','周二','周三','周四','周五'],
      backColor: 'blue', flipped: true
    }
  ];

  const BACK_COLORS = { yellow: '#d8ff3a', blue: '#1f2ef0' };

  const style = getComputedStyle(document.body);
  const SHEET = (style.getPropertyValue('--sheet') || '#f4f3ee').trim();
  const SHEET_INK = (style.getPropertyValue('--sheet-ink') || '#0a0a0a').trim();
  const SHEET_MUTE = (style.getPropertyValue('--sheet-mute') || 'rgba(10,10,10,0.52)').trim();
  const SHEET_HAIR = (style.getPropertyValue('--sheet-hair') || 'rgba(10,10,10,0.15)').trim();
  const ACCENT = (style.getPropertyValue('--accent') || '#d8ff3a').trim();

  /* ==================================================================
     1. Canvas 绘制（与原先逻辑相近），返回 canvas
     ================================================================== */
  const TEX_W = 1024, TEX_H = 1440;
  function createCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function drawRecto(plate) {
    const c = createCanvas(TEX_W, TEX_H);
    const g = c.getContext('2d');
    const w = TEX_W, h = TEX_H;
    g.fillStyle = SHEET; g.fillRect(0,0,w,h);

    g.save();
    g.globalAlpha = 0.04;
    for (let i=0;i<2000;i++) {
      g.fillStyle = Math.random() > 0.5 ? '#000' : '#444';
      g.fillRect(Math.random()*w, Math.random()*h, 1.2, 1.2);
    }
    g.restore();

    g.fillStyle = SHEET_INK;
    g.font = '900 210px Inter, "Helvetica Neue", Arial, sans-serif';
    g.fillText(plate.no || '', 72, 380);

    g.fillStyle = SHEET_INK;
    g.font = '600 54px Inter, "PingFang SC", sans-serif';
    g.fillText(plate.cn || '', 72, 510);

    g.fillStyle = SHEET_MUTE;
    g.font = '300 24px Inter, sans-serif';
    g.fillText(plate.rooms || '', 72, 640);
    g.fillText(plate.weeks || '', 72, 678);

    const listY = 820;
    g.fillStyle = SHEET_INK;
    g.font = '400 20px "SFMono-Regular", monospace';
    g.fillText('CONTENTS', 72, listY - 30);
    plate.chapters.forEach((ch, i) => {
      const y = listY + 44 + i * 56;
      g.fillStyle = ACCENT;
      g.font = '500 18px "SFMono-Regular", monospace';
      g.fillText(String(i+1).padStart(2,'0'), 72, y);
      g.fillStyle = SHEET_INK;
      g.font = '300 26px Inter, "PingFang SC", sans-serif';
      g.fillText(ch, 130, y);
    });

    return c;
  }

  function drawVerso(plate) {
    const c = createCanvas(TEX_W, TEX_H);
    const g = c.getContext('2d');
    const w = TEX_W, h = TEX_H;
    const color = BACK_COLORS[plate.backColor] || BACK_COLORS.yellow;
    g.fillStyle = color; g.fillRect(0,0,w,h);

    g.fillStyle = 'rgba(0,0,0,0.75)';
    g.font = '600 48px Inter, "PingFang SC", sans-serif';
    g.fillText(plate.cn || '', 120, h/2 - 30);

    return c;
  }

  /* ==================================================================
     2. 创建 DOM plates（把 canvas 转 dataURL 用作背景）
     ================================================================== */
  const fan = $('#fan');
  const platesContainer = $('#plates');
  if (!fan || !platesContainer) return;

  function computePlateSize() {
    const vw = Math.max(360, window.innerWidth);
    const ratio = vw < 560 ? 3.8 : vw < 900 ? 4.8 : 5.8;
    const pw = Math.round(vw / ratio);
    const ph = Math.round(pw * 1.4);
    return { pw, ph };
  }

  const sizes = computePlateSize();
  fan.style.setProperty('--pw', sizes.pw + 'px');
  fan.style.setProperty('--ph', sizes.ph + 'px');
  fan.innerHTML = '';

  const plateEls = [];
  PLATES.forEach((plate, idx) => {
    const rectoC = drawRecto(plate);
    const versoC = drawVerso(plate);
    const rectoURL = rectoC.toDataURL();
    const versoURL = versoC.toDataURL();

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'plate';
    btn.dataset.index = String(idx);
    btn.setAttribute('aria-label', (plate.cn || plate.id) + ' · ' + (plate.weeks || ''));
    btn.style.width = sizes.pw + 'px';
    btn.style.height = sizes.ph + 'px';

    const paper = document.createElement('div');
    paper.className = 'paper';

    const front = document.createElement('div');
    front.className = 'face front';
    front.style.backgroundImage = `url(${rectoURL})`;

    const back = document.createElement('div');
    back.className = 'face back';
    back.style.backgroundImage = `url(${versoURL})`;

    paper.appendChild(front);
    paper.appendChild(back);
    btn.appendChild(paper);
    fan.appendChild(btn);

    plateEls.push({ btn, paper, front, back, data: plate, idx });
  });

  plateEls.forEach((p) => {
    p.btn.addEventListener('click', () => {
      p.btn.classList.toggle('is-flipped');
    });
    p.btn.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        p.btn.classList.toggle('is-flipped');
      }
    });
  });

  /* ==================================================================
     3. Layout & interaction (fold openness & lean slider bind)
     ================================================================== */
  let MAX_ANGLE_DEG = 78;
  let MAX_DEPTH_PX = 160;
  let MAX_Y_PX = 80;
  let SPINE_GAP_PX = 10;

  let targetOpenness = parseFloat($('#openness')?.value || 60) / 100;
  let currentOpenness = targetOpenness;
  let targetLeanDeg = parseFloat($('#lean')?.value || 9);
  let currentLeanDeg = targetLeanDeg;

  function layoutOnce() {
    const rect = fan.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    const left = plateEls.filter(p => p.data.side === 'left' || plateEls.indexOf(p) < Math.ceil(plateEls.length/2));
    const right = plateEls.filter(p => p.data.side === 'right' || plateEls.indexOf(p) >= Math.ceil(plateEls.length/2));

    left.forEach((p, i) => {
      const ratio = (i+1)/Math.max(1,left.length);
      const out = ratio * currentOpenness;
      const angle = -MAX_ANGLE_DEG * out;
      const depth = -MAX_DEPTH_PX * out;
      const y = MAX_Y_PX * out * out;
      const spineOffset = -((left.length -1 - i) * SPINE_GAP_PX) * currentOpenness;

      p.btn.style.transformOrigin = '100% 50%';
      p.btn.style.transform = `translate3d(${cx}px, ${cy + y}px, 0px) translateX(${spineOffset}px) translateZ(${depth}px) rotateY(${angle}deg)`;
    });

    right.forEach((p, i) => {
      const ratio = (i+1)/Math.max(1,right.length);
      const out = ratio * currentOpenness;
      const angle = MAX_ANGLE_DEG * out;
      const depth = -MAX_DEPTH_PX * out;
      const y = MAX_Y_PX * out * out;
      const spineOffset = (i * SPINE_GAP_PX) * currentOpenness;

      p.btn.style.transformOrigin = '0% 50%';
      p.btn.style.transform = `translate3d(${cx}px, ${cy + y}px, 0px) translateX(${spineOffset}px) translateZ(${depth}px) rotateY(${angle}deg)`;
    });

    fan.style.transform = `translate(-50%, -50%) rotateX(${currentLeanDeg}deg)`;
    const ov = $('#openVal'); if (ov) ov.textContent = Math.round(currentOpenness*100) + '%';
    const lv = $('#leanVal'); if (lv) lv.textContent = Math.round(currentLeanDeg) + '°';
  }

  function tick() {
    currentOpenness += (targetOpenness - currentOpenness) * 0.12;
    currentLeanDeg += (targetLeanDeg - currentLeanDeg) * 0.08;
    layoutOnce();
    requestAnimationFrame(tick);
  }

  const openSlider = $('#openness');
  const leanSlider = $('#lean');
  if (openSlider) {
    openSlider.addEventListener('input', (e) => { targetOpenness = clamp(parseFloat(e.target.value)/100, 0, 1); });
  }
  if (leanSlider) {
    leanSlider.addEventListener('input', (e) => { targetLeanDeg = clamp(parseFloat(e.target.value), -25, 45); });
  }

  window.addEventListener('resize', () => {
    const s = computePlateSize();
    fan.style.setProperty('--pw', s.pw + 'px');
    fan.style.setProperty('--ph', s.ph + 'px');
    plateEls.forEach(p => { p.btn.style.width = s.pw + 'px'; p.btn.style.height = s.ph + 'px'; });
    layoutOnce();
  });

  layoutOnce();
  requestAnimationFrame(tick);

  /* ==================================================================
     4. Accessibility: create sr-only list of buttons (replicates original plates <ul>)
     ================================================================== */
  if (platesContainer) {
    platesContainer.innerHTML = '';
    PLATES.forEach((p, i) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.className = 'plates-btn';
      btn.textContent = `${p.cn}（${p.side === 'left' ? '左' : '右'}第 ${i + 1} 张）`;
      btn.addEventListener('click', () => {
        const plate = plateEls[i];
        if (!plate) return;
        plate.btn.classList.toggle('is-flipped');
      });
      li.appendChild(btn);
      platesContainer.appendChild(li);
    });
  }

  /* ==================================================================
     5. Detail drawer (reuse original showDetail/hideDetail behavior)
     ================================================================== */
  const scrim = $('#scrim'), detailPanel = $('#detail'), detailSheet = $('#detailSheet'), detailClose = $('#detailClose');
  function showDetail(plate) {
    if (!detailPanel || !detailSheet) return;
    detailSheet.innerHTML = `
      <div style="font:900 64px Inter,sans-serif;margin-bottom:8px;color:${ACCENT};">${plate.no}</div>
      <div style="font:600 28px Inter,'PingFang SC',sans-serif;margin-bottom:6px;">${plate.cn}</div>
      <div style="font:italic 300 18px 'Times New Roman',serif;margin-bottom:24px;opacity:.7;">${plate.en}</div>
      <div style="font:300 16px Inter,sans-serif;line-height:1.7;opacity:.85;">
        <p><strong style="font-weight:500;">教室：</strong>${plate.rooms}</p>
        <p><strong style="font-weight:500;">周次：</strong>${plate.weeks}</p>
      </div>
      <h4 style="font:500 14px 'SFMono-Regular',monospace;margin:28px 0 10px;letter-spacing:.18em;">CONTENTS</h4>
      <ul style="list-style:none;padding:0;font:300 16px Inter,sans-serif;line-height:2.2;opacity:.9;">
        ${plate.chapters.map((ch, i) => `<li><span style="color:${ACCENT};font-weight:500;margin-right:12px;">${String(i + 1).padStart(2, '0')}</span>${ch}</li>`).join('')}
      </ul>
    `;
    detailPanel.classList.add('is-open');
    if (scrim) scrim.classList.add('is-open');
  }

  function hideDetail() {
    if (detailPanel) detailPanel.classList.remove('is-open');
    if (scrim) scrim.classList.remove('is-open');
  }

  if (scrim) scrim.addEventListener('click', hideDetail);
  if (detailClose) detailClose.addEventListener('click', hideDetail);

  $('#detailBtn')?.addEventListener('click', () => {
    const flipped = plateEls.find(p => p.btn.classList.contains('is-flipped'));
    if (flipped) showDetail(flipped.data);
    else if (plateEls[0]) showDetail(plateEls[0].data);
  });

})();
