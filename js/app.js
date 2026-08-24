/* ============ 生活工作台 核心逻辑 ============ */
(function () {
  'use strict';

  var NB = window.NativeBridge || null;
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- 存储 ---------- */
  var DB = {
    get: function (k, def) {
      try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; }
      catch (e) { return def; }
    },
    set: function (k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
    }
  };
  var uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };

  var today = function () {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  var nowTs = function () { return Date.now(); };

  /* ---------- 导航 ---------- */
  var PAGES = ['home', 'todo', 'water', 'cat', 'memory', 'travel', 'sleep'];
  var TITLES = { home: '今日总览', todo: '待办事项', water: '喝水打卡', cat: '猫咪记录', memory: '纪念日足迹', travel: '旅游攻略', sleep: '助眠专区' };

  function openPage(page) {
    PAGES.forEach(function (p) {
      $('page-' + p).classList.toggle('hidden', p !== page);
    });
    $('pageTitle').textContent = TITLES[page];
    document.querySelectorAll('.menu-item').forEach(function (el) {
      el.classList.toggle('active', el.dataset.page === page);
    });
    closeDrawer();
    if (page === 'home') renderHome();
    if (page === 'todo') renderTodo();
    if (page === 'water') renderWater();
    if (page === 'cat') renderCat();
    if (page === 'memory') renderMem();
    if (page === 'sleep') renderSleep();
  }

  function openDrawer() {
    $('drawer').classList.add('open');
    $('drawerOverlay').classList.remove('hidden');
  }
  function closeDrawer() {
    $('drawer').classList.remove('open');
    $('drawerOverlay').classList.add('hidden');
  }
  $('menuBtn').onclick = openDrawer;
  $('drawerOverlay').onclick = closeDrawer;
  document.querySelectorAll('.menu-item').forEach(function (el) {
    el.onclick = function () { openPage(el.dataset.page); };
  });

  /* ---------- 弹层 ---------- */
  function showSheet(html) {
    $('sheet').innerHTML = html;
    $('sheet').classList.add('open');
    $('bottomSheetMask').classList.remove('hidden');
  }
  function hideSheet() {
    $('sheet').classList.remove('open');
    $('bottomSheetMask').classList.add('hidden');
  }
  $('bottomSheetMask').onclick = hideSheet;

  /* ---------- 轻提示 ---------- */
  function toast(msg) {
    if (NB) { NB.toast(msg); return; }
    alert(msg);
  }

  /* ============================================================
     首页
  ============================================================ */
  function renderHome() {
    // 今日待办
    var todos = DB.get('todos', []);
    var t = today();
    var list = todos.filter(function (x) { return !x.done && x.date <= t; });
    list.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    list = list.slice(0, 5);
    var html = '';
    list.forEach(function (x) {
      html += '<div class="todo-item"><div class="todo-check" onclick="Marvis.doneTodo(\'' + x.id + '\')"></div>' +
        '<div class="todo-body"><div class="todo-text">' + esc(x.text) + '</div></div></div>';
    });
    $('homeTodo').innerHTML = html;
    $('homeTodoEmpty').classList.toggle('hidden', list.length > 0);

    // 今日完成度
    var tAll = todos.length;
    var tDone = todos.filter(function (y) { return y.done; }).length;
    var pct = tAll ? Math.round(tDone / tAll * 100) : 0;
    var fillEl = $('ovBarFill');
    var pctEl = $('ovPct');
    if (fillEl) fillEl.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';

    // 喝水
    var w = DB.get('water', { goal: 8, records: {}, alarmOn: false, alarmTime: '09:00' });
    var wc = w.records[today()] || 0;
    var wPct = Math.min(100, Math.round(wc / w.goal * 100));
    $('homeWater').innerHTML = '<div style="display:flex;align-items:center;gap:12px">' +
      '<div style="flex:1"><div style="height:10px;border-radius:6px;background:#E8ECF6"><div style="height:10px;border-radius:6px;background:#4F6EF7;width:' + wPct + '%"></div></div>' +
      '<div style="font-size:12px;color:#9AA0AC;margin-top:6px">今日已喝 ' + wc + ' / ' + w.goal + ' 杯</div></div>' +
      '<button class="btn btn-sm btn-primary" onclick="Marvis.openPage(\'water\')">打卡</button></div>';

    // 猫咪提醒
    var cats = DB.get('cats', []);
    var catHtml = '';
    var catCount = 0;
    cats.forEach(function (c) {
      var dueList = catDue(c);
      if (dueList.length) {
        catCount++;
        dueList.forEach(function (d) {
          catHtml += '<div class="event-row"><div class="event-name" style="width:auto">' + c.name + '</div>' +
            '<div class="event-info"><b>' + d.label + '</b> 已过期 ' + d.overDays + ' 天</div>' +
            '<span class="event-due due-over">待处理</span></div>';
        });
      }
    });
    $('homeCat').innerHTML = catHtml;
    $('homeCatEmpty').classList.toggle('hidden', catCount > 0 || !cats.length);

    // 足迹
    var mems = DB.get('memories', []);
    var memHtml = '';
    var recent = mems.slice().sort(function (a, b) { return b.date < a.date ? -1 : 1; }).slice(0, 3);
    recent.forEach(function (m) {
      memHtml += '<div class="event-row"><div class="mem-pin" style="width:30px;height:30px;font-size:14px">&#128205;</div>' +
        '<div class="event-info"><b>' + esc(m.name) + '</b> <span style="color:#9AA0AC">' + m.date + '</span></div></div>';
    });
    $('homeMemory').innerHTML = memHtml;
    $('homeMemoryEmpty').classList.toggle('hidden', recent.length > 0);
  }

  /* ============================================================
     待办事项
  ============================================================ */
  function renderTodo() {
    var todos = DB.get('todos', []);
    todos.sort(function (a, b) { return (a.done - b.done) || (a.date < b.date ? -1 : 1); });
    var html = '';
    todos.forEach(function (x) {
      var priName = ['普通', '重要', '紧急'][x.pri || 0];
      html += '<div class="todo-item' + (x.done ? ' done' : '') + '">' +
        '<div class="todo-check" onclick="Marvis.doneTodo(\'' + x.id + '\')">' + (x.done ? '&#10003;' : '') + '</div>' +
        '<div class="todo-body"><div class="todo-text">' + esc(x.text) + '</div>' +
        '<div class="todo-date">' + x.date + '<span class="todo-pri pri-' + (x.pri || 0) + '">' + priName + '</span></div></div>' +
        '<div class="todo-del" onclick="Marvis.delTodo(\'' + x.id + '\')">&#10005;</div></div>';
    });
    $('todoList').innerHTML = html;
    $('todoEmpty').classList.toggle('hidden', todos.length > 0);
  }

  function addTodoSheet() {
    var d = today();
    showSheet(
      '<h3>新增待办</h3>' +
      '<label>内容</label><input id="tText" placeholder="要做什么">' +
      '<label>日期</label><input id="tDate" type="date" value="' + d + '">' +
      '<label>优先级</label><select id="tPri"><option value="0">普通</option><option value="1">重要</option><option value="2">紧急</option></select>' +
      '<div class="btn-row"><button class="btn btn-primary" onclick="Marvis.saveTodo()">保存</button>' +
      '<button class="btn" onclick="Marvis.hideSheet()">取消</button></div>'
    );
  }

  function saveTodo() {
    var text = $('tText').value.trim();
    if (!text) { toast('请输入内容'); return; }
    var todos = DB.get('todos', []);
    todos.push({ id: uid(), text: text, date: $('tDate').value || today(), done: false, pri: parseInt($('tPri').value, 10) || 0 });
    DB.set('todos', todos);
    hideSheet();
    renderTodo();
    toast('已添加');
  }

  function doneTodo(id) {
    var todos = DB.get('todos', []);
    todos.forEach(function (x) { if (x.id === id) x.done = !x.done; });
    DB.set('todos', todos);
    renderTodo();
  }

  function delTodo(id) {
    var todos = DB.get('todos', []).filter(function (x) { return x.id !== id; });
    DB.set('todos', todos);
    renderTodo();
  }

  /* ============================================================
     喝水
  ============================================================ */
  function renderWater() {
    var w = DB.get('water', { goal: 8, records: {}, alarmOn: false, alarmTime: '09:00' });
    var t = today();
    var wc = w.records[t] || 0;
    var pct = Math.min(100, Math.round(wc / w.goal * 100));
    var circ = 327 * (1 - pct / 100);
    $('waterRingFg').style.strokeDashoffset = circ;
    $('waterCount').textContent = wc;
    $('waterToday').textContent = wc;
    $('waterGoal').textContent = w.goal;
    $('waterAlarmOn').checked = !!w.alarmOn;
    $('waterAlarmTime').value = w.alarmTime || '09:00';
  }

  function waterAdd() {
    var w = DB.get('water', { goal: 8, records: {}, alarmOn: false, alarmTime: '09:00' });
    var t = today();
    if (!w.records) w.records = {};
    w.records[t] = (w.records[t] || 0) + 1;
    DB.set('water', w);
    renderWater();
  }
  function waterMinus() {
    var w = DB.get('water', { goal: 8, records: {}, alarmOn: false, alarmTime: '09:00' });
    var t = today();
    if (!w.records) w.records = {};
    if ((w.records[t] || 0) > 0) w.records[t]--;
    DB.set('water', w);
    renderWater();
  }
  function waterReset() {
    var w = DB.get('water', { goal: 8, records: {}, alarmOn: false, alarmTime: '09:00' });
    w.records[today()] = 0;
    DB.set('water', w);
    renderWater();
  }

  function waterAlarmChanged() {
    var w = DB.get('water', { goal: 8, records: {}, alarmOn: false, alarmTime: '09:00' });
    w.alarmOn = $('waterAlarmOn').checked;
    w.alarmTime = $('waterAlarmTime').value || '09:00';
    DB.set('water', w);
    if (w.alarmOn && NB) {
      var parts = w.alarmTime.split(':');
      NB.registerDaily('water', '喝水提醒', '该喝水啦，起来活动一下～', parseInt(parts[0], 10), parseInt(parts[1], 10));
      toast('已开启每日喝水提醒 ' + w.alarmTime);
    } else if (!w.alarmOn && NB) {
      NB.cancelAlarm('water');
      toast('已关闭喝水提醒');
    }
  }

  /* ============================================================
     猫咪
  ============================================================ */
  var EVENTS = [
    { key: 'vaccine', label: '打疫苗', days: 365, icon: '&#127807;' },
    { key: 'deworm', label: '驱虫', days: 30, icon: '&#128026;' },
    { key: 'litter', label: '换猫砂', days: 7, icon: '&#128169;' },
    { key: 'bath', label: '洗澡', days: 30, icon: '&#128167;' }
  ];

  function catDue(cat) {
    var out = [];
    var now = nowTs();
    EVENTS.forEach(function (e) {
      var ev = (cat.events && cat.events[e.key]) || {};
      if (!ev.last) return;
      var last = new Date(ev.last).getTime();
      var dueAt = last + e.days * 86400000;
      if (now > dueAt) {
        out.push({ key: e.key, label: e.label, days: e.days, overDays: Math.floor((now - dueAt) / 86400000) });
      }
    });
    return out;
  }

  function renderCat() {
    var cats = DB.get('cats', []);
    var html = '';
    cats.forEach(function (c) {
      var due = catDue(c);
      var dueMap = {};
      due.forEach(function (d) { dueMap[d.key] = d; });
      html += '<div class="cat-card"><div class="cat-head">' +
        '<div class="cat-avatar">' + (c.emoji || '&#128008;') + '</div>' +
        '<div><div class="cat-name">' + esc(c.name) + '</div><div class="cat-sub">' +
        (c.birth ? '出生 ' + c.birth : '') + '</div></div>' +
        '<div class="cat-del" onclick="Marvis.delCat(\'' + c.id + '\')">&#10005;</div></div>';
      EVENTS.forEach(function (e) {
        var ev = (c.events && c.events[e.key]) || {};
        var info, badge, cls;
        if (ev.last) {
          var last = new Date(ev.last);
          var dueAt = last.getTime() + e.days * 86400000;
          var now = nowTs();
          var diff = dueAt - now;
          var dstr = last.getFullYear() + '-' + String(last.getMonth() + 1).padStart(2, '0') + '-' + String(last.getDate()).padStart(2, '0');
          if (diff < 0) {
            info = '上次 ' + dstr + ' · 已超期 ' + Math.floor(-diff / 86400000) + ' 天';
            badge = '已过期'; cls = 'due-over';
          } else if (diff < 3 * 86400000) {
            info = '上次 ' + dstr + ' · ' + Math.ceil(diff / 86400000) + ' 天后到期';
            badge = '即将'; cls = 'due-warn';
          } else {
            info = '上次 ' + dstr + ' · 剩余 ' + Math.ceil(diff / 86400000) + ' 天';
            badge = '正常'; cls = 'due-ok';
          }
        } else {
          info = '尚未记录'; badge = '未记录'; cls = 'due-warn';
        }
        html += '<div class="event-row"><div class="event-name">' + e.icon + ' ' + e.label + '</div>' +
          '<div class="event-info">' + info + '</div>' +
          '<span class="event-due ' + cls + '">' + badge + '</span>' +
          '<button class="event-do" onclick="Marvis.doEvent(\'' + c.id + '\',\'' + e.key + '\')">记录</button></div>';
      });
      html += '</div>';
    });
    $('catList').innerHTML = html;
    $('catEmpty').classList.toggle('hidden', cats.length > 0);
  }

  function addCatSheet() {
    showSheet(
      '<h3>添加猫咪</h3>' +
      '<label>名字</label><input id="cName" placeholder="猫咪的名字">' +
      '<label>生日（可选）</label><input id="cBirth" type="date">' +
      '<label>头像表情</label><select id="cEmoji"><option value="&#128008;">&#128008; 猫咪</option><option value="&#128049;">&#128049; 老虎</option><option value="&#128576;">&#128576; 喵</option></select>' +
      '<div class="btn-row"><button class="btn btn-primary" onclick="Marvis.saveCat()">保存</button>' +
      '<button class="btn" onclick="Marvis.hideSheet()">取消</button></div>'
    );
  }

  function saveCat() {
    var name = $('cName').value.trim();
    if (!name) { toast('请输入名字'); return; }
    var cats = DB.get('cats', []);
    cats.push({ id: uid(), name: name, birth: $('cBirth').value || '', emoji: $('cEmoji').value, events: {} });
    DB.set('cats', cats);
    hideSheet();
    renderCat();
    toast('已添加');
  }

  function delCat(id) {
    var cats = DB.get('cats', []).filter(function (c) { return c.id !== id; });
    DB.set('cats', cats);
    if (NB) { NB.cancelAlarm('cat_' + id); }
    renderCat();
  }

  function doEvent(catId, key) {
    var cats = DB.get('cats', []);
    var cat = cats.filter(function (c) { return c.id === catId; })[0];
    if (!cat) return;
    var e = EVENTS.filter(function (x) { return x.key === key; })[0];
    if (!e) return;
    var last = (cat.events && cat.events[key] && cat.events[key].last) ? cat.events[key].last : today();
    showSheet(
      '<h3>' + cat.name + ' · ' + e.label + '</h3>' +
      '<label>完成日期</label><input id="eDate" type="date" value="' + last + '">' +
      '<label>备注（可选）</label><input id="eNote" placeholder="如疫苗批号/驱虫药名">' +
      '<div class="btn-row"><button class="btn btn-primary" onclick="Marvis.saveEvent(\'' + catId + '\',\'' + key + '\')">保存</button>' +
      '<button class="btn" onclick="Marvis.hideSheet()">取消</button></div>'
    );
  }

  function saveEvent(catId, key) {
    var cats = DB.get('cats', []);
    var cat = cats.filter(function (c) { return c.id === catId; })[0];
    if (!cat) { return; }
    var date = $('eDate').value || today();
    if (!cat.events) cat.events = {};
    if (!cat.events[key]) cat.events[key] = {};
    cat.events[key].last = date;
    cat.events[key].note = $('eNote').value.trim() || '';
    DB.set('cats', cats);

    // 注册下次到期提醒
    if (NB) {
      var e = EVENTS.filter(function (x) { return x.key === key; })[0];
      var dueTs = new Date(date + 'T20:00:00').getTime() + e.days * 86400000;
      NB.registerAlarm('cat_' + catId + '_' + key, cat.name + ' · ' + e.label, '该给 ' + cat.name + ' ' + e.label + ' 啦', dueTs);
    }
    hideSheet();
    renderCat();
    toast('已记录，下次到期会提醒你');
  }

  /* ============================================================
     纪念日 / 足迹
  ============================================================ */
  function renderMem() {
    var mems = DB.get('memories', []);
    mems.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var html = '';
    mems.forEach(function (m) {
      var ph = (m.photos || []);
      var phHtml = '';
      ph.forEach(function (p, i) {
        phHtml += '<div class="mem-photo"><img src="file://' + p + '" onclick="Marvis.viewPhoto(\'' + p.replace(/'/g, "\\'") + '\')"></div>';
      });
      if (ph.length < 9) {
        phHtml += '<div class="add-tile" onclick="Marvis.pickPhotos(\'' + m.id + '\')">+</div>';
      }
      html += '<div class="mem-card"><div class="mem-head">' +
        '<div class="mem-pin">&#128205;</div>' +
        '<div><div class="mem-title">' + esc(m.name) + '</div>' +
        '<div class="mem-meta">' + m.date + (m.lat ? ' · ' + m.lat.toFixed(2) + ', ' + m.lng.toFixed(2) : '') + '</div></div>' +
        '<div class="mem-del" onclick="Marvis.delMem(\'' + m.id + '\')">&#10005;</div></div>' +
        (m.note ? '<div class="mem-note">' + esc(m.note) + '</div>' : '') +
        (phHtml ? '<div class="mem-photos">' + phHtml + '</div>' : '<div class="mem-photos"><div class="add-tile" onclick="Marvis.pickPhotos(\'' + m.id + '\')">+ 添加照片</div></div>') +
        '</div>';
    });
    $('memList').innerHTML = html;
    $('memEmpty').classList.toggle('hidden', mems.length > 0);
  }

  function addMemSheet() {
    showSheet(
      '<h3>记录新地点</h3>' +
      '<label>地点名称</label><input id="mName" placeholder="如：大理古城">' +
      '<label>日期</label><input id="mDate" type="date" value="' + today() + '">' +
      '<label>备注（可选）</label><textarea id="mNote" placeholder="那天的故事…"></textarea>' +
      '<div class="btn-row"><button class="btn btn-primary" onclick="Marvis.saveMem()">保存</button>' +
      '<button class="btn" onclick="Marvis.hideSheet()">取消</button></div>'
    );
  }

  function saveMem() {
    var name = $('mName').value.trim();
    if (!name) { toast('请输入地点名称'); return; }
    var mems = DB.get('memories', []);
    var geo = guessGeo(name);
    mems.push({
      id: uid(), name: name, date: $('mDate').value || today(),
      note: $('mNote').value.trim() || '', lat: geo.lat, lng: geo.lng, photos: []
    });
    DB.set('memories', mems);
    hideSheet();
    renderMem();
    toast('已记录');
  }

  function delMem(id) {
    var mems = DB.get('memories', []).filter(function (m) { return m.id !== id; });
    DB.set('memories', mems);
    renderMem();
  }

  function pickPhotos(id) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = function () {
      var files = Array.prototype.slice.call(input.files || []);
      if (!files.length) return;
      var mems = DB.get('memories', []);
      var mem = mems.filter(function (m) { return m.id === id; })[0];
      if (!mem) return;
      if (!mem.photos) mem.photos = [];
      var left = 9 - mem.photos.length;
      files.slice(0, left).forEach(function (f) {
        var reader = new FileReader();
        reader.onload = function () {
          if (NB) {
            var path = NB.saveImage(reader.result, f.name);
            if (path && path.indexOf('ERR') !== 0) mem.photos.push(path);
            else if (path) toast(path);
          } else {
            mem.photos.push(reader.result);
          }
          DB.set('memories', mems);
          renderMem();
        };
        reader.readAsDataURL(f);
      });
    };
    input.click();
  }

  function viewPhoto(src) {
    $('lightboxImg').src = src;
    $('lightbox').classList.remove('hidden');
  }
  $('lightboxClose').onclick = function () { $('lightbox').classList.add('hidden'); };
  $('lightbox').onclick = function (e) { if (e.target === $('lightbox')) $('lightbox').classList.add('hidden'); };

  function showMap() {
    var mems = DB.get('memories', []);
    if (!mems.length) { toast('还没有足迹可展示'); return; }
    showSheet('<h3>我的足迹地图</h3><div class="map-wrap"><canvas id="footMap" width="560" height="300"></canvas>' +
      '<div class="map-legend">按时间顺序连线 · 圆点越大时间越近</div></div>' +
      '<div class="btn-row"><button class="btn" onclick="Marvis.hideSheet()">关闭</button></div>');
    drawMap(mems);
  }

  /* 简单经纬度数据库（画地图用） */
  var GEO = {
    '北京': [39.9, 116.4], '上海': [31.2, 121.5], '广州': [23.1, 113.3], '深圳': [22.5, 114.1],
    '成都': [30.6, 104.1], '重庆': [29.6, 106.5], '西安': [34.3, 108.9], '杭州': [30.3, 120.2],
    '南京': [32.1, 118.8], '武汉': [30.6, 114.3], '长沙': [28.2, 113.0], '厦门': [24.5, 118.1],
    '青岛': [36.1, 120.4], '天津': [39.1, 117.2], '昆明': [25.0, 102.7], '大理': [25.6, 100.3],
    '丽江': [26.9, 100.2], '三亚': [18.3, 109.5], '哈尔滨': [45.8, 126.5], '拉萨': [29.7, 91.1],
    '乌鲁木齐': [43.8, 87.6], '桂林': [25.3, 110.3], '苏州': [31.3, 120.6], '敦煌': [40.1, 94.7],
    '郑州': [34.7, 113.6], '济南': [36.7, 117.0], '沈阳': [41.8, 123.4], '兰州': [36.1, 103.8],
    '贵阳': [26.6, 106.7], '南宁': [22.8, 108.3], '海口': [20.0, 110.3], '呼和浩特': [40.8, 111.7]
  };
  function guessGeo(name) {
    for (var k in GEO) {
      if (name.indexOf(k) >= 0) return { lat: GEO[k][0], lng: GEO[k][1] };
    }
    // 随机给一个国内大致位置
    return { lat: 20 + Math.random() * 20, lng: 95 + Math.random() * 35 };
  }

  function drawMap(mems) {
    var canvas = $('footMap');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    // 经纬网格背景
    ctx.strokeStyle = 'rgba(79,110,247,0.12)';
    ctx.lineWidth = 1;
    for (var lon = 70; lon <= 140; lon += 10) {
      var x = (lon - 70) / 70 * W;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (var lat = 15; lat <= 55; lat += 5) {
      var y = (55 - lat) / 40 * H;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    // 中国大致轮廓（简化多边形）
    ctx.beginPath();
    var border = [[73,40],[80,42],[87,49],[97,53],[108,53],[117,52],[123,48],[127,45],[131,43],[134,48],[130,52],[126,48],[121,42],[122,38],[119,32],[123,30],[121,27],[118,24],[111,21],[109,18],[107,21],[103,18],[99,21],[98,26],[93,24],[91,22],[88,22],[85,25],[79,24],[76,28],[73,32],[73,40]];
    ctx.moveTo(border[0][0], border[0][1]);
    for (var i = 1; i < border.length; i++) {
      var px = (border[i][0] - 70) / 70 * W;
      var py = (55 - border[i][1]) / 40 * H;
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(79,110,247,0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(79,110,247,0.4)';
    ctx.stroke();

    // 标点 + 连线（按时间顺序）
    var pts = mems.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FF8A5C';
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    var first = true;
    pts.forEach(function (m) {
      if (m.lat == null) return;
      var x = (m.lng - 70) / 70 * W;
      var y = (55 - m.lat) / 40 * H;
      if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    pts.forEach(function (m, idx) {
      if (m.lat == null) return;
      var x = (m.lng - 70) / 70 * W;
      var y = (55 - m.lat) / 40 * H;
      var r = 5 + idx * 0.6;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#4F6EF7';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
      ctx.fillStyle = '#3A3F4B';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      var label = m.name.length > 6 ? m.name.slice(0, 6) : m.name;
      ctx.fillText(label, x + 6, y - 6);
    });
  }

  /* ============================================================
     旅游攻略
  ============================================================ */
  var TRAVEL = {
    '北京': {
      desc: '六朝古都，历史与现代交融，故宫、长城、胡同，处处是风景。',
      food: ['北京烤鸭（全聚德/四季民福）', '炸酱面', '铜锅涮肉', '豆汁儿焦圈', '驴打滚、豌豆黄'],
      hotel: ['前门/王府井一带：逛景点方便', '后海/南锣鼓巷：胡同风情民宿', '经济型：如家/汉庭，地铁沿线'],
      sight: ['故宫博物院（需提前预约）', '八达岭长城', '天安门广场', '颐和园', '天坛公园', '什刹海+南锣鼓巷'],
      traffic: ['地铁最方便，可办一卡通或刷手机NFC', '长城建议坐高铁到八达岭或旅游专线', '市内景点密集，适合步行+骑行']
    },
    '上海': {
      desc: '魔都风情，外滩夜景、老洋房、迪士尼，现代与复古并存。',
      food: ['生煎包', '小笼包（南翔）', '葱油拌面', '本帮红烧肉', '蟹壳黄'],
      hotel: ['南京东路/人民广场：交通枢纽', '陆家嘴：看江景', '武康路/安福路：文艺民宿'],
      sight: ['外滩+陆家嘴夜景', '迪士尼乐园', '豫园城隍庙', '武康路老洋房', '田子坊', '上海博物馆'],
      traffic: ['地铁网络发达，基本全覆盖', '往返浦东机场可坐磁悬浮', '迪士尼地铁11号线直达']
    },
    '广州': {
      desc: '食在广州，早茶文化浓厚，老城烟火气与珠江新城现代感交织。',
      food: ['早茶虾饺/凤爪/肠粉', '烧腊（叉烧、烧鹅）', '云吞面', '艇仔粥', '双皮奶'],
      hotel: ['天河CBD：购物方便', '越秀/荔湾：老广州风情', '珠江新城：夜景好'],
      sight: ['广州塔', '沙面岛欧陆建筑', '陈家祠', '白云山', '北京路步行街', '长隆野生动物世界'],
      traffic: ['地铁+BRT全覆盖', '广州塔建议傍晚去，夜景更美']
    },
    '深圳': {
      desc: '年轻创新之城，山海相间，主题公园和海边栈道都很棒。',
      food: ['海鲜大排档', '椰子鸡', '潮汕牛肉火锅', '早茶点心'],
      hotel: ['福田CBD：商务便利', '南山科技园：近景区', '大梅沙/较场尾：海边民宿'],
      sight: ['世界之窗', '深圳湾公园', '东部华侨城', '大梅沙海滨', '海上世界'],
      traffic: ['地铁发达', '去海边可坐地铁转公交或打车']
    },
    '成都': {
      desc: '天府之国，火锅串串、大熊猫、慢生活，来了就不想走。',
      food: ['火锅（蜀大侠/大龙燚）', '串串香', '担担面', '兔头', '钵钵鸡', '甜水面'],
      hotel: ['春熙路/太古里：市中心', '宽窄巷子附近：有成都味', '文殊院片区：性价比高'],
      sight: ['大熊猫繁育基地（早去）', '宽窄巷子', '锦里武侯祠', '都江堰+青城山', '人民公园喝茶掏耳朵'],
      traffic: ['地铁+共享单车很方便', '熊猫基地地铁3号线+接驳', '都江堰可坐城际列车']
    },
    '重庆': {
      desc: '8D魔幻山城，洪崖洞夜景、轻轨穿楼、麻辣火锅，视觉冲击力满分。',
      food: ['重庆火锅', '小面', '酸辣粉', '毛血旺', '烤脑花'],
      hotel: ['解放碑/洪崖洞：核心景区', '观音桥：商业区', '南滨路：江景'],
      sight: ['洪崖洞夜景', '李子坝轻轨穿楼', '解放碑步行街', '磁器口古镇', '长江索道', '南山一棵树观景台'],
      traffic: ['轻轨是主角，导航留意爬坡', '长江索道建议傍晚坐', '穿平底鞋！']
    },
    '西安': {
      desc: '十三朝古都，兵马俑、城墙、回民街，历史厚度无可替代。',
      food: ['肉夹馍', '凉皮', '羊肉泡馍', 'biangbiang面', '甑糕'],
      hotel: ['钟楼/鼓楼：市中心', '大雁塔附近：近不夜城', '城墙内民宿'],
      sight: ['兵马俑', '西安城墙（可骑行）', '大雁塔+大唐不夜城', '回民街', '陕西历史博物馆（预约）'],
      traffic: ['地铁直达各景点', '兵马俑坐游5/地铁9号线+接驳']
    },
    '杭州': {
      desc: '人间天堂，西湖烟雨、茶园飘香，江南美学的天花板。',
      food: ['西湖醋鱼', '东坡肉', '龙井虾仁', '片儿川', '定胜糕'],
      hotel: ['西湖边：推窗见景', '武林商圈：购物方便', '灵隐寺旁：清幽'],
      sight: ['西湖（苏堤/断桥/雷峰塔）', '灵隐寺', '龙井村茶园', '西溪湿地', '河坊街'],
      traffic: ['地铁+共享单车', '西湖环湖可坐观光车/游船']
    },
    '南京': {
      desc: '六朝古都，梧桐大道、夫子庙秦淮河，历史与文艺并存。',
      food: ['盐水鸭', '鸭血粉丝汤', '牛肉锅贴', '赤豆元宵'],
      hotel: ['新街口：市中心', '夫子庙：夜游秦淮', '中山陵附近：清幽'],
      sight: ['中山陵+明孝陵', '夫子庙秦淮河夜景', '南京博物院', '总统府', '玄武湖', '颐和路民国街'],
      traffic: ['地铁全覆盖', '中山陵景区内可坐观光车']
    },
    '武汉': {
      desc: '江城武汉，樱花烂漫、过早文化、长江大桥，烟火气十足。',
      food: ['热干面', '豆皮', '武昌鱼', '面窝', '周黑鸭'],
      hotel: ['江汉路步行街：热闹', '楚河汉街：购物', '户部巷附近：过早方便'],
      sight: ['黄鹤楼', '武汉大学（樱花季）', '东湖绿道', '长江大桥', '户部巷', '湖北省博物馆'],
      traffic: ['地铁发达', '东湖可骑行或坐观光车']
    },
    '长沙': {
      desc: '不夜城长沙，茶颜悦色、臭豆腐、橘子洲烟花，年轻活力之城。',
      food: ['臭豆腐', '糖油粑粑', '茶颜悦色', '口味虾', '辣椒炒肉'],
      hotel: ['五一广场/IFS：市中心', '坡子街附近：吃货天堂'],
      sight: ['橘子洲', '岳麓山+岳麓书院', '太平老街', '湖南省博物馆', 'IFS国金中心'],
      traffic: ['地铁2号线串起主要景点']
    },
    '厦门': {
      desc: '文艺海岛城市，鼓浪屿、环岛路、沙茶面，适合慢慢逛。',
      food: ['沙茶面', '海蛎煎', '土笋冻', '花生汤', '姜母鸭'],
      hotel: ['中山路：老城区', '曾厝垵：文艺民宿', '环岛路：海景'],
      sight: ['鼓浪屿（提前订船票）', '环岛路骑行', '曾厝垵', '南普陀寺', '厦门大学（预约）'],
      traffic: ['公交+打车', '去鼓浪屿需码头坐船']
    },
    '青岛': {
      desc: '红瓦绿树、碧海蓝天，德式建筑与啤酒文化碰撞的滨海之城。',
      food: ['海鲜大餐', '青岛啤酒', '鲅鱼饺子', '辣炒蛤蜊'],
      hotel: ['栈桥/中山路：老城海景', '五四广场：现代海景', '八大关：别墅区'],
      sight: ['八大关', '栈桥', '崂山', '信号山公园', '青岛啤酒博物馆', '石老人海水浴场'],
      traffic: ['公交+地铁', '沿海岸线步行或骑行很舒服']
    },
    '大理': {
      desc: '风花雪月，苍山洱海、白族风情，躺平发呆的理想地。',
      food: ['砂锅鱼', '乳扇', '喜洲粑粑', '鲜花饼'],
      hotel: ['洱海海景客栈：推窗见海', '古城内：热闹', '喜洲：田园风光'],
      sight: ['洱海环湖骑行', '大理古城', '苍山', '喜洲古镇', '双廊古镇'],
      traffic: ['租电动车/自行车环洱海', '古城到双廊有旅游巴士']
    },
    '丽江': {
      desc: '古城慢时光，雪山、纳西文化，艳遇之都的慵懒日常。',
      food: ['腊排骨火锅', '鸡豆凉粉', '丽江粑粑', '酥油茶'],
      hotel: ['古城客栈：体验纳西院落', '束河古镇：安静', '玉龙雪山脚下：看雪山'],
      sight: ['玉龙雪山（大索道）', '丽江古城', '束河古镇', '蓝月谷', '拉市海'],
      traffic: ['古城内步行', '雪山需包车或跟团']
    },
    '三亚': {
      desc: '热带海滨天堂，碧海银沙、椰林海鲜，度假首选。',
      food: ['海鲜自助', '文昌鸡', '椰子鸡', '清补凉'],
      hotel: ['亚龙湾：顶级度假', '海棠湾：近免税店', '三亚湾：看日落'],
      sight: ['亚龙湾', '天涯海角', '南山文化旅游区', '蜈支洲岛', '三亚国际免税城'],
      traffic: ['打车为主，各湾区距市中心远', '免税店建议预留半天']
    },
    '哈尔滨': {
      desc: '冰城夏都，中央大街欧式风情、冰雪大世界，冬天的人间仙境。',
      food: ['锅包肉', '铁锅炖', '红肠', '马迭尔冰棍'],
      hotel: ['中央大街附近：逛街方便', '太阳岛：度假'],
      sight: ['中央大街', '圣索菲亚教堂', '冰雪大世界（冬季）', '松花江', '太阳岛'],
      traffic: ['地铁+公交', '冬季注意保暖']
    },
    '拉萨': {
      desc: '日光之城，布达拉宫、八廓街转经，最接近天堂的地方。',
      food: ['藏面', '甜茶', '酥油茶', '牦牛肉'],
      hotel: ['八廓街附近：感受藏式生活', '布达拉宫附近：看全景'],
      sight: ['布达拉宫（预约）', '大昭寺', '八廓街', '纳木错', '羊卓雍措'],
      traffic: ['市内打车/公交', '高原反应注意慢慢走，多喝水']
    },
    '桂林': {
      desc: '桂林山水甲天下，漓江竹筏、阳朔田园，诗画里的中国。',
      food: ['桂林米粉', '啤酒鱼', '田螺酿', '油茶'],
      hotel: ['桂林市区：交通便利', '阳朔西街：热闹', '遇龙河畔：田园'],
      sight: ['漓江（游船/竹筏）', '阳朔西街', '遇龙河漂流', '象鼻山', '龙脊梯田'],
      traffic: ['桂林-阳朔可坐游船或大巴', '遇龙河漂流分段乘坐']
    },
    '敦煌': {
      desc: '大漠明珠，莫高窟壁画、鸣沙山月牙泉，丝绸之路的瑰宝。',
      food: ['驴肉黄面', '杏皮水', '手抓羊肉'],
      hotel: ['市区：离莫高窟和鸣沙山都近'],
      sight: ['莫高窟（提前预约）', '鸣沙山月牙泉', '玉门关', '雅丹魔鬼城'],
      traffic: ['包车或跟团最方便', '沙漠游玩注意防晒补水']
    },
    '苏州': {
      desc: '园林之城，小桥流水、评弹昆曲，古典江南的极致。',
      food: ['松鼠桂鱼', '苏式面（枫镇大肉面）', '糖粥', '生煎'],
      hotel: ['平江路：古城水乡', '观前街：市中心', '金鸡湖：现代'],
      sight: ['拙政园', '留园', '平江路', '山塘街', '虎丘', '金鸡湖'],
      traffic: ['地铁+步行', '园林多需提前预约']
    },
    '昆明': {
      desc: '春城昆明，四季如春，滇池海鸥、石林奇观。',
      food: ['过桥米线', '汽锅鸡', '菌子火锅', '烧饵块'],
      hotel: ['翠湖公园附近：市中心', '滇池边：看海鸥'],
      sight: ['滇池+海埂公园', '石林', '翠湖公园', '云南民族村', '斗南花市'],
      traffic: ['地铁+公交', '石林可坐旅游专线']
    }
  };
  var HOT_CITIES = ['成都', '北京', '西安', '重庆', '杭州', '三亚', '大理', '丽江', '长沙', '厦门', '青岛', '桂林'];

  function renderTravel() {
    var html = '';
    HOT_CITIES.forEach(function (c) {
      html += '<span class="hot-tag" onclick="Marvis.genGuide(\'' + c + '\')">' + c + '</span>';
    });
    $('travelHot').innerHTML = html;
  }

  function genGuide(name) {
    var city = name.trim();
    if (!city) { toast('请输入城市名'); return; }
    var g = null;
    for (var k in TRAVEL) {
      if (city.indexOf(k) >= 0) { g = TRAVEL[k]; city = k; break; }
    }
    if (!g) {
      // 兜底模板
      g = {
        desc: '「' + city + '」是一座值得探索的城市。以下为通用出行建议，出发前可再结合当地最新资讯完善。',
        food: ['当地特色小吃街走一圈，错开饭点排队', '大众点评/小红书搜「' + city + '必吃」', '点菜先问分量，避免浪费'],
        hotel: ['建议住市中心或地铁站旁，出行省时', '旺季提前1-2周预订', '民宿与连锁酒店比价后选择'],
        sight: ['市博物馆/历史街区了解城市脉络', '标志性景点提前查开放时间与预约', '备选1-2个冷门打卡点'],
        traffic: ['地铁/公交是性价比首选', '打车避开早晚高峰', '下载当地公交APP或使用地图导航']
      };
    }
    var sec = function (icon, bg, title, items) {
      var lis = '';
      items.forEach(function (it) { lis += '<li>' + esc(it) + '</li>'; });
      return '<div class="guide-section"><h3><span class="gs-icon" style="background:' + bg + '">' + icon + '</span>' + title + '</h3><ul>' + lis + '</ul></div>';
    };
    var html = '<div class="guide-head"><h2>' + esc(city) + '</h2><p>' + esc(g.desc) + '</p></div>' +
      sec('&#127858;', '#FFF4E5', '吃什么', g.food) +
      sec('&#127968;', '#E8F0FE', '住哪里', g.hotel) +
      sec('&#127748;', '#E9F9F1', '玩什么', g.sight) +
      sec('&#128652;', '#F3EBFF', '怎么去', g.traffic);
    $('travelResult').innerHTML = html;
  }

  $('travelGo').onclick = function () { genGuide($('travelInput').value); };
  $('travelInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') genGuide($('travelInput').value); });

  /* ============================================================
     助眠专区
  ============================================================ */
  var SLEEP_TAGS = ['助眠历史故事', '睡前听历史', '历史小故事', '百家讲坛', '安徒生童话', '白噪音助眠', '深夜电台', 'asmr助眠'];

  // 抖音深链 scheme
  var DOUYIN = {
    search: function (kw) { return 'snssdk1128://search?keyword=' + encodeURIComponent(kw); },
    hot: 'snssdk1128://feed?from=tab'      // 抖音精选/推荐流
  };

  function sleepSearch(kw) {
    kw = (kw || '').trim() || '助眠历史故事';
    if (NB) { NB.openUrl(DOUYIN.search(kw)); }
    else {
      // 无原生桥接时降级打开网页版搜索
      window.open('https://www.douyin.com/search/' + encodeURIComponent(kw), '_blank');
    }
  }

  function sleepOpenDouyin() {
    if (NB) { NB.openUrl(DOUYIN.hot); }
    else { window.open('https://www.douyin.com/', '_blank'); }
  }

  function renderSleep() {
    var html = '';
    SLEEP_TAGS.forEach(function (t) {
      html += '<span class="sleep-tag" data-kw="' + esc(t) + '">' + esc(t) + '</span>';
    });
    $('sleepTags').innerHTML = html;
  }

  $('sleepSearchBtn').onclick = function () { sleepSearch($('sleepInput').value); };
  $('sleepInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') sleepSearch($('sleepInput').value); });
  $('sleepOpenDouyin').onclick = sleepOpenDouyin;
  $('sleepTags').addEventListener('click', function (e) {
    var el = e.target;
    if (el && el.classList && el.classList.contains('sleep-tag')) {
      $('sleepInput').value = el.dataset.kw;
      sleepSearch(el.dataset.kw);
    }
  });

  /* ---------- 绑定事件 ---------- */
  $('todoAddBtn').onclick = addTodoSheet;
  $('catAddBtn').onclick = addCatSheet;
  $('memAddBtn').onclick = addMemSheet;
  $('memMapBtn').onclick = showMap;
  $('waterAdd').onclick = waterAdd;
  $('waterMinus').onclick = waterMinus;
  $('waterReset').onclick = waterReset;
  $('waterAlarmOn').onchange = waterAlarmChanged;
  $('waterAlarmTime').onchange = waterAlarmChanged;

  /* ---------- 工具 ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---------- 暴露给全局（内联onclick用） ---------- */
  window.Marvis = {
    openPage: openPage,
    hideSheet: hideSheet,
    saveTodo: saveTodo,
    doneTodo: doneTodo,
    delTodo: delTodo,
    saveCat: saveCat,
    delCat: delCat,
    doEvent: doEvent,
    saveEvent: saveEvent,
    saveMem: saveMem,
    delMem: delMem,
    pickPhotos: pickPhotos,
    viewPhoto: viewPhoto,
    genGuide: genGuide
  };

  /* ---------- 初始化 ---------- */
  renderTravel();
  renderSleep();
  openPage('home');
})();
