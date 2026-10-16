/* ==========================================================================
   课程资料 · 黑场纸页扇（3D Paper Fan）
   Three.js + CanvasTexture：八张有厚度的纸围绕画面中央的书脊点
   向左右两侧呈放射状摊开，横拖即开合，点一张把它翻过来。
   ========================================================================== */
(function () {
  'use strict';

  const $ = (selector, root) => (root || document).querySelector(selector);
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  /* ==================================================================
     0. 八张纸的数据（4 左 + 4 右）
     ================================================================== */

  const PLATES = [
    // 左侧 4 张（逆时针展开）
    {
      id: 'os', side: 'left', no: '01',
      cn: '操作系统', en: 'Operating Systems',
      rooms: '京江楼 B105 · 昭明楼 214', weeks: 'W01—W14',
      chapters: ['操作系统引论', '进程与线程', '处理机调度与死锁', '进程同步与互斥',
        '存储器管理', '文件管理', '设备管理'],
      backColor: 'yellow', flipped: false
    },
    {
      id: 'net', side: 'left', no: '02',
      cn: '计算机网络', en: 'Computer Networks',
      rooms: '文心楼 A402 · B205', weeks: 'W01—W14',
      chapters: ['概述', '物理层', '数据链路层', '网络层', '传输层', '应用层', '网络安全（选讲）'],
      backColor: 'blue', flipped: true
    },
    {
      id: 'asm', side: 'left', no: '03',
      cn: '汇编语言', en: 'Assembly Language',
      rooms: '昭明楼 316 · 214', weeks: 'W01—W14',
      chapters: ['基础知识', '寄存器与寻址方式', '指令系统', '源程序格式与调试', '子程序与结构化设计',
        '存储器与 I/O 接口', '中断系统与系统调用', '综合应用与课程设计'],
      backColor: 'yellow', flipped: false
    },
    {
      id: 'se', side: 'left', no: '04',
      cn: '软件工程', en: 'Software Engineering',
      rooms: '京江楼 B205', weeks: 'W01—W14',
      chapters: ['软件工程概述', '可行性研究与需求分析', '软件设计', '软件实现与编码', '软件测试',
        '软件维护', '软件项目管理', '面向对象方法与统一过程'],
      backColor: 'blue', flipped: true
    },
    // 右侧 4 张（顺时针展开）
    {
      id: 'net-lab', side: 'right', no: 'L2',
      cn: '计算机网络上机', en: 'Network Lab',
      rooms: 'B403 机房', weeks: 'W07—W14',
      chapters: ['Wireshark 抓包', 'Socket 编程', '路由配置模拟', '网络安全实验'],
      backColor: 'yellow', flipped: false
    },
    {
      id: 'asm-proj', side: 'right', no: 'L3',
      cn: '汇编课程设计', en: 'Assembly Project',
      rooms: 'A411 / A412 机房', weeks: 'W15—W18',
      chapters: ['汇编程序设计', '接口技术实验', '综合项目开发', '答辩与报告'],
      backColor: 'blue', flipped: true
    },
    {
      id: 'se-lab', side: 'right', no: 'L4',
      cn: '软件工程上机', en: 'Software Lab',
      rooms: 'A407 / A406 机房', weeks: 'W06—W15',
      chapters: ['UML 建模工具', '版本控制实践', '单元测试与持续集成', '小型项目迭代'],
      backColor: 'yellow', flipped: false
    },
    {
      id: 'overview', side: 'right', no: '00',
      cn: '周课表总览', en: 'Timetable Overview',
      rooms: '全学期', weeks: 'W01—W18',
      chapters: ['周一', '周二', '周三', '周四', '周五'],
      backColor: 'blue', flipped: true
    }
  ];

  const BACK_COLORS = {
    yellow: '#d8ff3a',
    blue: '#1f2ef0'
  };

  const style = getComputedStyle(document.body);
  const SHEET = (style.getPropertyValue('--sheet') || '#f4f3ee').trim();
  const SHEET_INK = (style.getPropertyValue('--sheet-ink') || '#0a0a0a').trim();
  const SHEET_MUTE = (style.getPropertyValue('--sheet-mute') || 'rgba(10,10,10,0.52)').trim();
  const SHEET_HAIR = (style.getPropertyValue('--sheet-hair') || 'rgba(10,10,10,0.15)').trim();
  const SHEET_EDGE = (style.getPropertyValue('--sheet-edge') || '#cfcec7').trim();
  const SHEET_EDGE2 = (style.getPropertyValue('--sheet-edge-2') || '#a8a7a0').trim();
  const ACCENT = (style.getPropertyValue('--accent') || '#d8ff3a').trim();


  /* ==================================================================
     1. Canvas 纹理绘制：正面（白纸） / 背面（色块）
     ================================================================== */

  const TEX_W = 1024;
  const TEX_H = 1440;

  function createCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function drawRecto(plate) {
    const c = createCanvas(TEX_W, TEX_H);
    const g = c.getContext('2d');
    const w = TEX_W, h = TEX_H;

    g.fillStyle = SHEET;
    g.fillRect(0, 0, w, h);

    g.save();
    g.globalAlpha = 0.04;
    for (let i = 0; i < 4000; i++) {
      g.fillStyle = Math.random() > 0.5 ? '#000' : '#444';
      g.fillRect(Math.random() * w, Math.random() * h, 1.2, 1.2);
    }
    g.restore();

    g.fillStyle = SHEET_INK;
    g.font = 'bold 28px "SFMono-Regular", "JetBrains Mono", Consolas, monospace';
    g.fillText('HO NGAI', 72, 90);

    g.fillStyle = SHEET_MUTE;
    g.font = '200 18px Inter, "PingFang SC", "Microsoft YaHei", sans-serif';
    g.fillText('课程资料  ·  ' + plate.weeks, 72, 128);

    g.strokeStyle = SHEET_HAIR;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(72, 158);
    g.lineTo(w - 72, 158);
    g.stroke();

    g.fillStyle = SHEET_INK;
    g.font = '900 210px Inter, "Helvetica Neue", Arial, sans-serif';
    g.fillText(plate.no, 72, 380);

    g.fillStyle = SHEET_INK;
    g.font = '600 54px Inter, "PingFang SC", "Microsoft YaHei", sans-serif';
    g.fillText(plate.cn, 72, 510);

    g.fillStyle = SHEET_MUTE;
    g.font = 'italic 300 32px "Times New Roman", Times, serif';
    g.fillText(plate.en, 72, 570);

    g.fillStyle = SHEET_MUTE;
    g.font = '300 24px Inter, sans-serif';
    g.fillText(plate.rooms, 72, 640);
    g.fillText(plate.weeks, 72, 678);

    const listY = 820;
    g.fillStyle = SHEET_INK;
    g.font = '400 20px "SFMono-Regular", monospace';
    g.fillText('CONTENTS', 72, listY - 30);

    g.strokeStyle = SHEET_HAIR;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(72, listY - 10);
    g.lineTo(280, listY - 10);
    g.stroke();

    plate.chapters.forEach((ch, i) => {
      const y = listY + 44 + i * 56;
      g.fillStyle = ACCENT;
      g.font = '500 18px "SFMono-Regular", monospace';
      g.fillText(String(i + 1).padStart(2, '0'), 72, y);
      g.fillStyle = SHEET_INK;
      g.font = '300 26px Inter, "PingFang SC", sans-serif';
      g.fillText(ch, 130, y);
      g.strokeStyle = SHEET_HAIR;
      g.setLineDash([4, 8]);
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(130, y + 14);
      g.lineTo(w - 72, y + 14);
      g.stroke();
      g.setLineDash([]);
    });

    g.fillStyle = SHEET_MUTE;
    g.font = '200 18px Inter, sans-serif';
    g.fillText('COSMIC TIMETABLE  ·  2026 AUTUMN', 72, h - 72);

    return c;
  }

  function drawVerso(plate) {
    const c = createCanvas(TEX_W, TEX_H);
    const g = c.getContext('2d');
    const w = TEX_W, h = TEX_H;
    const color = BACK_COLORS[plate.backColor] || BACK_COLORS.yellow;

    g.fillStyle = color;
    g.fillRect(0, 0, w, h);

    g.fillStyle = 'rgba(0,0,0,0.06)';
    g.fillRect(0, 0, 60, h);

    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.font = '900 320px Inter, Arial, sans-serif';
    g.textAlign = 'right';
    g.fillText(plate.no, w - 72, h - 80);
    g.textAlign = 'left';

    g.fillStyle = 'rgba(0,0,0,0.75)';
    g.font = '600 48px Inter, "PingFang SC", sans-serif';
    g.fillText(plate.cn, 120, h / 2 - 30);

    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.font = 'italic 300 28px "Times New Roman", serif';
    g.fillText(plate.en, 120, h / 2 + 30);

    g.fillStyle = 'rgba(0,0,0,0.1)';
    g.fillRect(120, h / 2 + 70, 180, 4);

    return c;
  }



  /* ==================================================================
     2. Three.js 场景初始化
     ================================================================== */

  const canvas = $('#view');
  const stage = $('#stage');
  if (!canvas || !window.THREE) {
    const note = $('#stageNote');
    if (note) note.hidden = false;
    return;
  }

  const THREE = window.THREE;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight);
  renderer.setClearColor(0x000000, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.035);

  const camera = new THREE.PerspectiveCamera(
    42,
    (canvas.clientWidth || window.innerWidth) / (canvas.clientHeight || window.innerHeight),
    0.1, 100
  );
  camera.position.set(0, 5, 14);
  camera.lookAt(0, 0, 0);

  const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
  mainLight.position.set(6, 10, 8);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.set(1024, 1024);
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.35);
  fillLight.position.set(-6, 4, 4);
  scene.add(fillLight);

  const rimLight = new THREE.SpotLight(ACCENT, 0.8);
  rimLight.position.set(0, 8, -6);
  rimLight.lookAt(0, 0, 0);
  scene.add(rimLight);

  const ambient = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(ambient);

  /* 书根组：所有卡片放里面，整体可转 */
  const bookGroup = new THREE.Group();
  scene.add(bookGroup);

  /* ==================================================================
     3. 造纸：BoxGeometry + CanvasTexture
     ================================================================== */

  const CARD_W = 3.2;
  const CARD_H = 4.5;
  const CARD_T = 0.09;

  const cards = [];

  const edgeMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(SHEET_EDGE), roughness: 0.9, metalness: 0.0 });
  const edgeMat2 = new THREE.MeshStandardMaterial({ color: new THREE.Color(SHEET_EDGE2), roughness: 0.9, metalness: 0.0 });

  PLATES.forEach((plate, index) => {
    const rectoCanvas = drawRecto(plate);
    const versoCanvas = drawVerso(plate);

    const rectoTex = new THREE.CanvasTexture(rectoCanvas);
    const versoTex = new THREE.CanvasTexture(versoCanvas);

    const frontMat = new THREE.MeshStandardMaterial({ map: rectoTex, roughness: 0.65, metalness: 0.0 });
    const backMat = new THREE.MeshStandardMaterial({ map: versoTex, roughness: 0.65, metalness: 0.0 });

    const geo = new THREE.BoxGeometry(CARD_W, CARD_H, CARD_T);
    const isLeft = plate.side === 'left';
    const offsetX = isLeft ? -CARD_W / 2 : CARD_W / 2;
    geo.translate(offsetX, 0, 0);

    const materials = [edgeMat, edgeMat2, edgeMat, edgeMat2, frontMat, backMat];

    const mesh = new THREE.Mesh(geo, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const group = new THREE.Group();
    group.add(mesh);
    bookGroup.add(group);

    const flipAngle = plate.flipped ? Math.PI : 0;
    mesh.rotation.x = flipAngle;

    cards.push({
      group, mesh, data: plate, index, isLeft,
      targetAngle: 0, targetDepth: 0, targetX: 0, targetY: 0, targetTiltX: 0,
      flipAngle, hover: 0, targetHover: 0
    });
  });

  /* ==================================================================
     4. 布局：书脊点在 (0,0,0)，呈圆锥形向深处展开
     ================================================================== */

  const CONE = {
    maxAngle: Math.PI / 2.2,   // ~82° 更大展开
    maxDepth: 2.0,             // 更大纵深
    maxHeight: 1.0,            // 垂直偏移，形成倒锥
    maxTilt: 0.25,             // 绕X轴倾斜，顶部向后倒
    spineGap: 0.08,            // 书脊处厚度间距
    coverOffset: 0.22          // 封面根偏移
  };

  function layoutCards(openness01) {
    let leftIdx = 0;
    let rightIdx = 0;
    cards.forEach((card) => {
      const t = openness01;
      if (card.isLeft) {
        const ratio = (leftIdx + 1) / 4;          // 0.25, 0.5, 0.75, 1.0
        const outward = ratio * t;
        card.targetAngle = -CONE.maxAngle * outward;
        card.targetDepth = -CONE.maxDepth * outward;
        card.targetY = -CONE.maxHeight * outward * outward; // 外侧更低，二次曲线更自然
        card.targetTiltX = CONE.maxTilt * outward;          // 顶部向后倒
        const innerness = 3 - leftIdx;            // 3(内) → 0(外)
        card.targetX = -(innerness * CONE.spineGap + CONE.coverOffset) * t;
        leftIdx++;
      } else {
        const ratio = (rightIdx + 1) / 4;
        const outward = ratio * t;
        card.targetAngle = CONE.maxAngle * outward;
        card.targetDepth = -CONE.maxDepth * outward;
        card.targetY = -CONE.maxHeight * outward * outward;
        card.targetTiltX = CONE.maxTilt * outward;
        const innerness = rightIdx;               // 0(内) → 3(外)
        card.targetX = (innerness * CONE.spineGap + CONE.coverOffset) * t;
        rightIdx++;
      }
    });
  }



  /* ==================================================================
     5. 交互状态机
     ================================================================== */

  let openness = 0.45;
  let targetOpenness = 0.45;
  let opennessVelocity = 0.0;
  const SPRING = 0.08;
  const DAMPING = 0.82;
  const DRAG_FACTOR = 0.004;

  let cameraLean = 0.0;
  let targetLean = 0.0;
  let cameraZoom = 12.0;
  let targetZoom = 12.0;

  let hoveredCard = null;
  let activeCard = null;
  let isAutoBreathe = true;
  let breatheTime = 0;

  let targetBookRotation = 0.35;

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  let isPointerDown = false;
  let pointerDownX = 0;
  let pointerDownY = 0;
  let dragStartOpenness = 0;
  let dragStartLean = 0;
  let dragStartBookRotation = 0;
  let hasDragged = false;

  /* ==================================================================
     6. DOM 控件联动
     ================================================================== */

  const opennessSlider = $('#openness');
  const leanSlider = $('#lean');
  const openVal = $('#openVal');
  const leanVal = $('#leanVal');
  const autoBtn = $('#autoBtn');
  const resetBtn = $('#resetBtn');
  const detailBtn = $('#detailBtn');

  if (opennessSlider) {
    opennessSlider.value = 35;
    opennessSlider.addEventListener('input', (e) => {
      targetOpenness = parseFloat(e.target.value) / 100;
      isAutoBreathe = false;
      if (autoBtn) autoBtn.textContent = '自动呼吸：关';
    });
  }

  if (leanSlider) {
    leanSlider.value = 0;
    leanSlider.addEventListener('input', (e) => {
      targetLean = parseFloat(e.target.value);
    });
  }

  if (autoBtn) {
    autoBtn.addEventListener('click', () => {
      isAutoBreathe = !isAutoBreathe;
      autoBtn.textContent = isAutoBreathe ? '自动呼吸：开' : '自动呼吸：关';
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      targetOpenness = 0.35;
      targetLean = 0;
      targetZoom = 14;
      targetBookRotation = 0.25;
      isAutoBreathe = true;
      if (opennessSlider) opennessSlider.value = 35;
      if (leanSlider) leanSlider.value = 0;
      if (openVal) openVal.textContent = '0%';
      if (leanVal) leanVal.textContent = '0°';
      if (autoBtn) autoBtn.textContent = '自动呼吸：开';
      cards.forEach((c) => {
        c.data.flipped = false;
        c.flipAngle = 0;
      });
      hideDetail();
    });
  }

  if (detailBtn) {
    detailBtn.addEventListener('click', () => {
      if (activeCard) showDetail(activeCard.data);
      else if (hoveredCard) showDetail(hoveredCard.data);
    });
  }

  /* ==================================================================
     7. 详情抽屉
     ================================================================== */

  const scrim = $('#scrim');
  const detailPanel = $('#detail');
  const detailClose = $('#detailClose');
  const detailSheet = $('#detailSheet');

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



  /* ==================================================================
     8. 鼠标 / 触摸交互
     ================================================================== */

  function getPointerNorm(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 2 - 1,
      y: -((clientY - rect.top) / rect.height) * 2 + 1
    };
  }

  function updateHover(clientX, clientY) {
    const p = getPointerNorm(clientX, clientY);
    mouse.set(p.x, p.y);
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    const hit = hits.find((h) => h.object && h.object.geometry);
    if (hit) {
      const card = cards.find((c) => c.mesh === hit.object || c.group === hit.object.parent);
      if (card) {
        hoveredCard = card;
        canvas.style.cursor = 'pointer';
        return;
      }
    }
    hoveredCard = null;
    canvas.style.cursor = 'grab';
  }

  canvas.addEventListener('pointermove', (e) => {
    if (!isPointerDown) {
      updateHover(e.clientX, e.clientY);
      return;
    }
    const dx = e.clientX - pointerDownX;
    const dy = e.clientY - pointerDownY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasDragged = true;

    if (Math.abs(dx) > Math.abs(dy)) {
      targetBookRotation = dragStartBookRotation + dx * 0.008;
    } else {
      targetLean = clamp(dragStartLean + dy * 0.06, -25, 25);
      if (leanSlider) leanSlider.value = Math.round(targetLean);
    }
  });

  canvas.addEventListener('pointerdown', (e) => {
    isPointerDown = true;
    hasDragged = false;
    pointerDownX = e.clientX;
    pointerDownY = e.clientY;
    dragStartOpenness = targetOpenness;
    dragStartLean = targetLean;
    dragStartBookRotation = targetBookRotation;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
  });

  canvas.addEventListener('pointerup', (e) => {
    isPointerDown = false;
    canvas.style.cursor = hoveredCard ? 'pointer' : 'grab';
    canvas.releasePointerCapture(e.pointerId);

    if (!hasDragged) {
      if (hoveredCard) {
        activeCard = hoveredCard;
        hoveredCard.data.flipped = !hoveredCard.data.flipped;
        hoveredCard.flipAngle = hoveredCard.data.flipped ? Math.PI : 0;
        showDetail(hoveredCard.data);
      } else {
        targetOpenness = targetOpenness > 0.5 ? 0 : 1;
        if (opennessSlider) opennessSlider.value = Math.round(targetOpenness * 100);
        isAutoBreathe = false;
        if (autoBtn) autoBtn.textContent = '自动呼吸：关';
      }
    }
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    targetZoom = clamp(targetZoom + e.deltaY * 0.008, 6, 22);
  }, { passive: false });

  /* 键盘可及性：为八张纸生成 sr-only 按钮 */
  const platesUl = $('#plates');
  if (platesUl) {
    platesUl.innerHTML = '';
    PLATES.forEach((p, i) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.className = 'plates-btn';
      btn.textContent = `${p.cn}（${p.side === 'left' ? '左' : '右'}第 ${i + 1} 张）`;
      btn.addEventListener('click', () => {
        const card = cards[i];
        if (!card) return;
        card.data.flipped = !card.data.flipped;
        card.flipAngle = card.data.flipped ? Math.PI : 0;
        showDetail(card.data);
      });
      li.appendChild(btn);
      platesUl.appendChild(li);
    });
  }



  /* ==================================================================
     9. 动画循环
     ================================================================== */

  function animate() {
    const t = performance.now() * 0.001;

    if (isAutoBreathe) {
      breatheTime += 0.008;
      targetOpenness = 0.45 + Math.sin(breatheTime) * 0.25;
      if (opennessSlider) opennessSlider.value = Math.round(targetOpenness * 100);
    }

    opennessVelocity += (targetOpenness - openness) * SPRING;
    opennessVelocity *= DAMPING;
    openness += opennessVelocity;

    layoutCards(openness);

    bookGroup.rotation.y += (targetBookRotation - bookGroup.rotation.y) * 0.08;

    cameraLean += (targetLean - cameraLean) * 0.06;
    cameraZoom += (targetZoom - cameraZoom) * 0.06;

    const rad = cameraLean * Math.PI / 180;
    camera.position.set(
      Math.sin(rad) * 6,
      3.5 + Math.sin(t * 0.3) * 0.3,
      cameraZoom + Math.cos(rad) * 2
    );
    camera.lookAt(0, 0, 0);

    if (openVal) openVal.textContent = Math.round(openness * 100) + '%';
    if (leanVal) leanVal.textContent = Math.round(cameraLean) + '°';

    cards.forEach((card) => {
      card.targetHover = (hoveredCard === card || activeCard === card) ? 1 : 0;
      card.hover += (card.targetHover - card.hover) * 0.1;

      card.group.rotation.y += (card.targetAngle - card.group.rotation.y) * 0.08;
      card.group.position.z += (card.targetDepth - card.group.position.z) * 0.08;
      card.group.position.x += (card.targetX - card.group.position.x) * 0.08;
      card.group.position.y += (card.targetY - card.group.position.y) * 0.08;

      const targetFlipX = card.flipAngle + card.targetTiltX;
      card.mesh.rotation.x += (targetFlipX - card.mesh.rotation.x) * 0.1;

      const s = 1 + card.hover * 0.03;
      card.mesh.scale.setScalar(s);
      card.group.rotation.x = card.hover * 0.04;
    });

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  /* ==================================================================
     10. 窗口尺寸适配
     ================================================================== */

  function onResize() {
    const w = stage.clientWidth || window.innerWidth;
    const h = stage.clientHeight || window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  window.addEventListener('resize', onResize);
  onResize();

  requestAnimationFrame(animate);
})();

