/* ============ 生活工作台 · 7 板块完整逻辑 ============ */
(function () {
  'use strict';

  var NB = window.NativeBridge || null;
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  /* ---------- 存储 ---------- */
  var DB = {
    get: function (k, def) {
      try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; }
      catch (e) { return def; }
    },
    set: function (k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn('存储失败', k); }
    }
  };
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  /* ---------- NativeBridge 兜底 ---------- */
  function toast(msg) {
    if (NB && NB.toast) { NB.toast(msg); } else { alert(msg); }
  }
  function nbOpenUrl(url) {
    if (NB && NB.openUrl) { NB.openUrl(url); } else { window.open(url, '_blank'); }
  }
  function registerDaily(id, title, text, h, m) {
    if (NB && NB.registerDaily) { NB.registerDaily(id, title, text, h, m); }
  }
  function registerAlarm(id, title, text, ts) {
    if (NB && NB.registerAlarm) { NB.registerAlarm(id, title, text, ts); }
  }
  function cancelAlarm(id) {
    if (NB && NB.cancelAlarm) { NB.cancelAlarm(id); }
  }

  /* ---------- 图片压缩（转 base64，控制总量） ---------- */
  function compressImg(file, cb) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var maxW = 720, w = img.width, h = img.height;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        var cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        try { cb(cv.toDataURL('image/jpeg', 0.7)); }
        catch (err) { cb(e.target.result); }
      };
      img.onerror = function () { cb(e.target.result); };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
  function pickImages(cb) {
    var inp = $('fileInput');
    inp.value = '';
    inp.onchange = function () {
      var files = Array.prototype.slice.call(inp.files || []).slice(0, 6);
      var out = [];
      (function next(i) {
        if (i >= files.length) { cb(out); return; }
        compressImg(files[i], function (b64) {
          if (b64 && b64.length < 300000) out.push(b64);
          next(i + 1);
        });
      })(0);
    };
    inp.click();
  }

  /* ---------- 导航 ---------- */
  var PAGES = [
    { id: 'home', icon: '🏠', name: '首页总览' },
    { id: 'todo', icon: '☑️', name: '待办事项' },
    { id: 'water', icon: '💧', name: '喝水打卡' },
    { id: 'cat', icon: '🐱', name: '猫咪记录' },
    { id: 'memory', icon: '📍', name: '纪念日足迹' },
    { id: 'travel', icon: '✈️', name: '旅游攻略' },
    { id: 'sleep', icon: '😴', name: '助眠专区' }
  ];
  var TITLES = { home: '今日总览', todo: '待办事项', water: '喝水打卡', cat: '猫咪记录', memory: '纪念日足迹', travel: '旅游攻略', sleep: '助眠专区' };

  function renderMenu() {
    var html = '';
    PAGES.forEach(function (p) {
      html += '<div class="menu-item" data-page="' + p.id + '"><span class="mi-icon">' + p.icon + '</span>' + p.name + '</div>';
    });
    $('sideMenu').innerHTML = html;
    $('sideMenu').addEventListener('click', function (e) {
      var el = e.target.closest ? e.target.closest('.menu-item') : null;
      if (el && el.dataset.page) openPage(el.dataset.page);
    });
  }

  function openPage(page) {
    PAGES.forEach(function (p) {
      var el = $('page-' + p.id);
      if (el) el.classList.toggle('hidden', p.id !== page);
    });
    $('pageTitle').textContent = TITLES[page] || '';
    document.querySelectorAll('.menu-item').forEach(function (el) {
      el.classList.toggle('active', el.dataset.page === page);
    });
    closeDrawer();
    if (page === 'home') renderHome();
    if (page === 'todo') renderTodo();
    if (page === 'water') renderWater();
    if (page === 'cat') renderCat();
    if (page === 'memory') renderMemory();
  }

  function openDrawer() { $('sidebar').classList.add('open'); $('sidebarOverlay').classList.remove('hidden'); }
  function closeDrawer() { $('sidebar').classList.remove('open'); $('sidebarOverlay').classList.add('hidden'); }
  $('menuBtn').onclick = openDrawer;
  $('sidebarOverlay').onclick = closeDrawer;
  $('refreshBtn').onclick = function () { location.reload(); };

  /* ---------- 弹层 ---------- */
  function showSheet(html) {
    $('sheet').innerHTML = html;
    $('sheet').classList.add('open');
    $('sheetMask').classList.remove('hidden');
  }
  function hideSheet() {
    $('sheet').classList.remove('open');
    $('sheetMask').classList.add('hidden');
  }
  $('sheetMask').onclick = hideSheet;

  /* ---------- 大图查看 ---------- */
  function lightbox(src) {
    $('lightboxImg').src = src;
    $('lightbox').classList.remove('hidden');
  }
  $('lightboxClose').onclick = function () { $('lightbox').classList.add('hidden'); };
  $('lightbox').onclick = function (e) { if (e.target === $('lightbox')) $('lightbox').classList.add('hidden'); };

  /* ============================================================
     首页 · 今日总览
  ============================================================ */
  function renderHome() {
    var now = new Date();
    var weeks = ['日', '一', '二', '三', '四', '五', '六'];
    $('ovDate').textContent = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
    $('ovWeek').textContent = '星期' + weeks[now.getDay()];

    var todos = DB.get('todos', []);
    var t = todayStr();
    var todayList = todos.filter(function (x) { return x.date === t; });
    var doneCount = todayList.filter(function (x) { return x.done; }).length;
    $('ovDoneCount').textContent = doneCount + '/' + todayList.length;
    $('ovProgress').style.width = todayList.length ? Math.round(doneCount / todayList.length * 100) + '%' : '0%';
    $('todoBadge').textContent = doneCount + '/' + todayList.length;

    var homeTodo = todos.filter(function (x) { return x.date === t && !x.done; }).slice(0, 5);
    var hh = '';
    homeTodo.forEach(function (x) {
      hh += '<div class="todo-item"><div class="todo-check" onclick="Marvis.toggleTodo(\'' + x.id + '\')"></div>' +
        '<div class="todo-body"><div class="todo-text">' + esc(x.text) + '</div></div></div>';
    });
    $('homeTodo').innerHTML = hh;
    $('homeTodoEmpty').classList.toggle('hidden', homeTodo.length > 0);

    var w = getWater();
    var wt = waterToday(w);
    var pct = Math.min(100, Math.round(wt.total / 1700 * 100));
    $('homeWater').innerHTML =
      '<div style="display:flex;align-items:center;gap:12px">' +
      '<div style="flex:1"><div style="height:10px;border-radius:6px;background:#DFF2E9"><div style="height:10px;border-radius:6px;background:#5EC8A5;width:' + pct + '%"></div></div>' +
      '<div style="font-size:12px;color:#8B9A93;margin-top:6px">今日已喝 ' + wt.total + ' / 1700 ml</div></div>' +
      '<button class="btn btn-sm btn-primary" onclick="Marvis.openPage(\'water\')">打卡</button></div>';

    var cats = DB.get('cats', []);
    var catHtml = '', catCount = 0;
    cats.forEach(function (c) {
      var dueList = catDue(c);
      if (dueList.length) {
        catCount++;
        dueList.forEach(function (d) {
          catHtml += '<div class="todo-item"><span style="font-size:18px">' + (c.avatar ? '' : '🐱') + '</span>' +
            '<div class="todo-body"><div class="todo-text">' + esc(c.name) + ' · ' + d.label + '</div>' +
            '<div class="todo-date">已过期 ' + d.overDays + ' 天</div></div>' +
            '<button class="btn btn-sm" onclick="Marvis.openPage(\'cat\')">处理</button></div>';
        });
      }
    });
    $('homeCat').innerHTML = catHtml;
    $('homeCatEmpty').classList.toggle('hidden', catCount > 0);

    var mems = DB.get('memories', []);
    var recent = mems.slice().sort(function (a, b) { return b.date < a.date ? -1 : 1; }).slice(0, 3);
    var mh = '';
    recent.forEach(function (m) {
      mh += '<div class="mem-row" onclick="Marvis.openPage(\'memory\')"><div class="mem-pin">📍</div>' +
        '<div class="mem-info"><div class="mem-name">' + esc(m.name) + '</div>' +
        '<div class="mem-date">' + esc(m.date) + '</div></div></div>';
    });
    $('homeMemory').innerHTML = mh;
    $('homeMemoryEmpty').classList.toggle('hidden', recent.length > 0);

    var quotes = [
      '把注意力放在能控制的事情上：今天的饮食、运动、心态。',
      '慢慢来，比较快。',
      '今天也要好好爱自己。',
      '心之所向，素履以往。',
      '生活明朗，万物可爱。',
      '保持热爱，奔赴山海。',
      '温柔坚定，从容有度。',
      '每一步都算数，每一天都值得。'
    ];
    $('dailyQuote').textContent = quotes[Math.floor(Math.random() * quotes.length)];
  }

  /* ============================================================
     待办事项 · 备忘录式（文字 + 图片 + 方框勾选）
  ============================================================ */
  var memoImgs = [];

  $('todoAddBtn').onclick = openMemoEditor;
  $('memoClose').onclick = function () { $('memoEditor').classList.add('hidden'); };
  $('memoImgAdd').onclick = function () {
    pickImages(function (arr) { memoImgs = memoImgs.concat(arr); renderMemoImgs(); });
  };
  $('memoSave').onclick = function () {
    var text = $('memoText').value.trim();
    if (!text && memoImgs.length === 0) { toast('请填写内容'); return; }
    var todos = DB.get('todos', []);
    todos.unshift({ id: uid(), text: text, date: todayStr(), done: false, images: memoImgs.slice() });
    DB.set('todos', todos);
    $('memoEditor').classList.add('hidden');
    renderTodo();
    renderHome();
    toast('已保存');
  };

  function openMemoEditor() {
    memoImgs = [];
    $('memoText').value = '';
    renderMemoImgs();
    $('memoEditor').classList.remove('hidden');
  }
  function renderMemoImgs() {
    var h = '';
    memoImgs.forEach(function (b) { h += '<img src="' + b + '" onclick="Marvis.lightbox(this.src)">'; });
    $('memoImages').innerHTML = h;
  }

  function renderTodo() {
    var todos = DB.get('todos', []);
    var html = '';
    todos.forEach(function (x) {
      var imgs = '';
      if (x.images && x.images.length) {
        imgs = '<div class="todo-imgs">' + x.images.map(function (b) {
          return '<img src="' + b + '" onclick="Marvis.lightbox(this.src)">';
        }).join('') + '</div>';
      }
      html += '<div class="todo-item' + (x.done ? ' done' : '') + '">' +
        '<div class="todo-check" onclick="Marvis.toggleTodo(\'' + x.id + '\')">' + (x.done ? '✓' : '') + '</div>' +
        '<div class="todo-body"><div class="todo-text">' + esc(x.text) + '</div>' + imgs +
        '<div class="todo-date">' + esc(x.date) + '</div></div>' +
        '<div class="todo-del" onclick="Marvis.delTodo(\'' + x.id + '\')">✕</div></div>';
    });
    $('todoList').innerHTML = html;
    $('todoEmpty').classList.toggle('hidden', todos.length > 0);
  }

  function toggleTodo(id) {
    var todos = DB.get('todos', []);
    todos.forEach(function (x) { if (x.id === id) x.done = !x.done; });
    DB.set('todos', todos);
    renderTodo(); renderHome();
  }
  function delTodo(id) {
    var todos = DB.get('todos', []).filter(function (x) { return x.id !== id; });
    DB.set('todos', todos);
    renderTodo(); renderHome();
  }

  /* ============================================================
     喝水打卡 · 多按钮 + 总量 + 成年女性健康建议
  ============================================================ */
  var DRINKS = [
    { v: 'water', n: '白水' },
    { v: 'coffee', n: '咖啡', sugar: true },
    { v: 'milktea', n: '奶茶', sugar: true },
    { v: 'juice', n: '果汁', sugar: true },
    { v: 'cola', n: '可乐', sugar: true },
    { v: 'tea', n: '茶', sugar: true },
    { v: 'other', n: '其他' }
  ];

  function getWater() {
    var w = DB.get('water', {});
    if (!w.records || typeof w.records !== 'object') w.records = {};
    if (!w.goal) w.goal = 1700;
    if (w.alarmOn == null) w.alarmOn = false;
    if (!w.alarmTime) w.alarmTime = '09:00';
    return w;
  }
  function waterToday(w) {
    var r = w.records[todayStr()];
    if (typeof r === 'number') return { total: r * 250, items: [] }; // 兼容旧数据
    if (!r || !r.items) return { total: r && r.total ? r.total : 0, items: [] };
    return { total: r.total || 0, items: r.items || [] };
  }
  function saveWater(w) { DB.set('water', w); }

  $('waterAdd100').onclick = function () { addWater(100, 'water'); };
  $('waterAdd500').onclick = function () { addWater(500, 'water'); };
  $('waterCustomBtn').onclick = showCustomDrink;

  function addWater(ml, type) {
    var w = getWater();
    var t = todayStr();
    if (!w.records[t]) w.records[t] = { total: 0, items: [] };
    if (typeof w.records[t] === 'number') w.records[t] = { total: w.records[t] * 250, items: [] };
    w.records[t].total += ml;
    w.records[t].items.push({ ml: ml, type: type, time: new Date().toTimeString().slice(0, 5) });
    saveWater(w);
    renderWater(); renderHome();
    toast('已记录 +' + ml + 'ml');
  }

  function showCustomDrink() {
    var opts = '';
    DRINKS.forEach(function (d) { opts += '<option value="' + d.v + '">' + d.n + '</option>'; });
    showSheet(
      '<h3>自定义喝水</h3>' +
      '<label>饮品类型</label><select id="drinkType">' + opts + '</select>' +
      '<label>毫升数</label><input id="drinkMl" type="number" placeholder="如 250" value="250" min="1">' +
      '<div class="btn-row"><button class="btn btn-primary" onclick="Marvis.saveCustomDrink()">保存</button>' +
      '<button class="btn" onclick="Marvis.hideSheet()">取消</button></div>'
    );
  }
  function saveCustomDrink() {
    var type = $('drinkType').value;
    var ml = parseInt($('drinkMl').value, 10);
    if (!ml || ml <= 0) { toast('请输入有效毫升数'); return; }
    addWater(ml, type);
    hideSheet();
  }

  function renderWater() {
    var w = getWater();
    var wt = waterToday(w);
    var total = wt.total;
    var pct = Math.min(100, Math.round(total / 1700 * 100));
    var circ = 327 * (1 - pct / 100);
    $('waterRingFg').style.strokeDashoffset = circ;
    $('waterCount').textContent = total;
    $('waterToday').textContent = total;
    $('waterAlarmOn').checked = !!w.alarmOn;
    $('waterAlarmTime').value = w.alarmTime || '09:00';

    // 统计纯水与含糖/咖啡因饮料
    var pure = 0, sugary = 0;
    wt.items.forEach(function (it) {
      var dr = null;
      DRINKS.forEach(function (d) { if (d.v === it.type) dr = d; });
      if (it.type === 'water' || it.type === 'tea') pure += it.ml;
      else if (dr && dr.sugar) sugary += it.ml;
      else pure += it.ml;
    });

    var bd = '<b>纯水/茶类</b>：' + pure + ' ml　<b>含糖/咖啡因饮料</b>：' + sugary + ' ml　<b>合计</b>：' + total + ' ml';
    $('waterBreakdown').innerHTML = bd;

    // 健康建议（成年女性）
    var tip = '', cls = '';
    if (total >= 1700) { tip = '今日饮水量充足，继续保持'; cls = 'ok'; }
    else if (total >= 1500) { tip = '今日饮水量已达标（1500~1700ml 建议区间）'; cls = 'ok'; }
    else { tip = '今日水量不足，还差约 ' + (1500 - total) + ' ml 达到建议量'; cls = 'warn'; }
    if (sugary > 500) {
      tip += '。含糖/咖啡因饮料偏多（>500ml），建议每日添加糖不超过 25g（约 1 杯奶茶 / 2 罐可乐），多喝白水更健康';
      cls = 'warn';
    } else if (sugary > 0) {
      tip += '。饮料控制在合理范围，注意添加糖摄入（每日 ≤25g，约 1 杯奶茶 / 2 罐可乐）';
    } else {
      tip += '。保持纯水优先的好习惯';
    }
    $('waterTip').innerHTML = tip;
    $('waterTip').className = 'water-tip ' + cls;

    var log = wt.items.slice().reverse().slice(0, 8).map(function (it) {
      var n = it.type; DRINKS.forEach(function (d) { if (d.v === it.type) n = d.n; });
      return '[' + it.time + '] ' + n + ' +' + it.ml + 'ml';
    }).join('　');
    $('waterLog').textContent = log ? '今日记录：' + log : '';
  }

  $('waterAlarmOn').addEventListener('change', function () {
    var w = getWater();
    w.alarmOn = $('waterAlarmOn').checked;
    w.alarmTime = $('waterAlarmTime').value || '09:00';
    saveWater(w);
    if (w.alarmOn) {
      var p = w.alarmTime.split(':');
      registerDaily('water', '喝水提醒', '该喝水啦，起来活动一下～', parseInt(p[0], 10), parseInt(p[1], 10));
      toast('已开启每日喝水提醒 ' + w.alarmTime);
    } else {
      cancelAlarm('water');
      toast('已关闭喝水提醒');
    }
  });
  $('waterAlarmTime').addEventListener('change', function () {
    var w = getWater();
    w.alarmTime = $('waterAlarmTime').value || '09:00';
    saveWater(w);
    if (w.alarmOn) {
      var p = w.alarmTime.split(':');
      registerDaily('water', '喝水提醒', '该喝水啦，起来活动一下～', parseInt(p[0], 10), parseInt(p[1], 10));
    }
  });

  /* ============================================================
     猫咪记录 · 照片 + 日历登记 + 到期提醒
  ============================================================ */
  var EVENTS = [
    { key: 'vaccine', label: '打疫苗', days: 365, icon: '💉' },
    { key: 'deworm', label: '驱虫', days: 30, icon: '🐛' },
    { key: 'litter', label: '换猫砂', days: 7, icon: '🧹' },
    { key: 'bath', label: '洗澡', days: 30, icon: '🛁' }
  ];
  var catCalY = new Date().getFullYear(), catCalM = new Date().getMonth();

  $('catAddBtn').onclick = showCatAdd;
  $('catViewToggle').onclick = function () {
    var cal = $('catCalendar');
    cal.classList.toggle('hidden');
    $('catViewToggle').textContent = cal.classList.contains('hidden') ? '📅 日历视图' : '📋 列表视图';
    if (!cal.classList.contains('hidden')) renderCalendar();
  };
  $('calPrev').onclick = function () { catCalM--; if (catCalM < 0) { catCalM = 11; catCalY--; } renderCalendar(); };
  $('calNext').onclick = function () { catCalM++; if (catCalM > 11) { catCalM = 0; catCalY++; } renderCalendar(); };

  function showCatAdd() {
    showSheet(
      '<h3>添加猫咪</h3>' +
      '<label>猫咪照片</label><div class="ph-upload"><div class="ph-add" id="catPhAdd">＋<small>上传照片</small></div></div>' +
      '<label>姓名</label><input id="catName" placeholder="如：团子">' +
      '<label>出生年月日</label><input id="catBirth" type="date" value="2023-01-01">' +
      '<label>性格</label><input id="catPersonality" placeholder="如：粘人、爱睡觉">' +
      '<div class="btn-row"><button class="btn btn-primary" onclick="Marvis.saveCat()">保存</button>' +
      '<button class="btn" onclick="Marvis.hideSheet()">取消</button></div>'
    );
    var catAvatar = null;
    $('catPhAdd').onclick = function () {
      pickImages(function (arr) {
        if (arr.length) {
          catAvatar = arr[0];
          var box = $('catPhAdd');
          box.innerHTML = '<img src="' + catAvatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:12px">';
        }
      });
    };
    window.__catAvatar = function () { return catAvatar; };
  }
  function saveCat() {
    var name = $('catName').value.trim();
    if (!name) { toast('请填写猫咪姓名'); return; }
    var cats = DB.get('cats', []);
    var avatar = window.__catAvatar ? window.__catAvatar() : null;
    cats.push({
      id: uid(), name: name, avatar: avatar,
      birth: $('catBirth').value || '', personality: $('catPersonality').value.trim(),
      events: {}
    });
    DB.set('cats', cats);
    hideSheet();
    renderCat();
    toast('已添加猫咪 ' + name);
  }

  function catDue(cat) {
    var out = [];
    var now = Date.now();
    EVENTS.forEach(function (e) {
      var ev = (cat.events && cat.events[e.key]) || {};
      if (!ev.last) return;
      var last = new Date(ev.last + 'T00:00:00').getTime();
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
      var av = c.avatar ? '<img src="' + c.avatar + '" alt="">' : '🐱';
      var chips = '';
      EVENTS.forEach(function (e) {
        var d = dueMap[e.key];
        chips += '<span class="cat-event-chip' + (d ? ' over' : '') + '">' + e.icon + ' ' + e.label + (d ? ' 逾期' + d.overDays + '天' : '') + '</span>';
      });
      html += '<div class="cat-card"><div class="cat-avatar">' + av + '</div>' +
        '<div class="cat-info"><div class="cat-name">' + esc(c.name) + '</div>' +
        '<div class="cat-sub">' + (c.birth ? '出生 ' + esc(c.birth) : '') + (c.personality ? ' · ' + esc(c.personality) : '') + '</div>' +
        '<div class="cat-events">' + chips + '</div></div>' +
        '<div class="cat-del" onclick="Marvis.delCat(\'' + c.id + '\')">✕</div></div>';
    });
    $('catList').innerHTML = html;
    $('catEmpty').classList.toggle('hidden', cats.length > 0);
  }
  function delCat(id) {
    var cats = DB.get('cats', []).filter(function (c) { return c.id !== id; });
    DB.set('cats', cats);
    renderCat();
  }

  /* ---------- 日历登记 ---------- */
  function renderCalendar() {
    $('calTitle').textContent = catCalY + '年' + (catCalM + 1) + '月';
    var first = new Date(catCalY, catCalM, 1);
    var startDow = first.getDay();
    var daysInMonth = new Date(catCalY, catCalM + 1, 0).getDate();
    var cats = DB.get('cats', []);
    var catCal = DB.get('catCal', {});
    var dows = ['日', '一', '二', '三', '四', '五', '六'];
    var html = '';
    dows.forEach(function (d) { html += '<div class="cal-dow">' + d + '</div>'; });
    var today = todayStr();
    for (var i = 0; i < startDow; i++) html += '<div class="cal-cell empty"></div>';
    for (var day = 1; day <= daysInMonth; day++) {
      var ds = catCalY + '-' + pad(catCalM + 1) + '-' + pad(day);
      var recs = catCal[ds] || [];
      var avs = '';
      if (recs.length) {
        avs = '<div class="cal-avatars">';
        recs.forEach(function (r) {
          var cat = null;
          cats.forEach(function (c) { if (c.id === r.catId) cat = c; });
          if (cat) {
            avs += cat.avatar ? '<img src="' + cat.avatar + '" alt="">' : '<span class="mini-avatar">🐱</span>';
          }
        });
        avs += '</div>';
      }
      html += '<div class="cal-cell' + (ds === today ? ' today' : '') + '" onclick="Marvis.openCalDay(\'' + ds + '\')">' + day + avs + '</div>';
    }
    $('calGrid').innerHTML = html;
  }
  function openCalDay(ds) {
    var cats = DB.get('cats', []);
    if (!cats.length) { toast('请先添加猫咪'); return; }
    var opts = '';
    cats.forEach(function (c) { opts += '<option value="' + c.id + '">' + esc(c.name) + '</option>'; });
    var evOpts = '';
    EVENTS.forEach(function (e) { evOpts += '<option value="' + e.key + '">' + e.label + '</option>'; });
    showSheet(
      '<h3>登记事项 · ' + ds + '</h3>' +
      '<label>选择猫咪</label><select id="evCat">' + opts + '</select>' +
      '<label>事项</label><select id="evType">' + evOpts + '</select>' +
      '<div class="btn-row"><button class="btn btn-primary" onclick="Marvis.saveCalDay(\'' + ds + '\')">保存</button>' +
      '<button class="btn" onclick="Marvis.hideSheet()">取消</button></div>'
    );
  }
  function saveCalDay(ds) {
    var catId = $('evCat').value;
    var evKey = $('evType').value;
    var cats = DB.get('cats', []);
    var cat = null;
    cats.forEach(function (c) { if (c.id === catId) cat = c; });
    if (cat) {
      if (!cat.events) cat.events = {};
      cat.events[evKey] = { last: ds };
      DB.set('cats', cats);
    }
    var catCal = DB.get('catCal', {});
    if (!catCal[ds]) catCal[ds] = [];
    var exists = false;
    catCal[ds].forEach(function (r) { if (r.catId === catId && r.key === evKey) exists = true; });
    if (!exists) catCal[ds].push({ catId: catId, key: evKey });
    DB.set('catCal', catCal);
    hideSheet();
    renderCalendar();
    toast('已登记');
  }

  /* ============================================================
     纪念日足迹 · 地图标点 + 连线轨迹 + 相册
  ============================================================ */
  var memCanvasW = 640, memCanvasH = 360;
  var pendingMemPos = null;

  function memCanvasInit() {
    var cv = $('memCanvas');
    cv.width = memCanvasW; cv.height = memCanvasH;
    cv.addEventListener('click', function (e) {
      var rect = cv.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width;
      var y = (e.clientY - rect.top) / rect.height;
      pendingMemPos = { x: x, y: y };
      showMemForm();
    });
  }
  function showMemForm() {
    showSheet(
      '<h3>记录去过的地方</h3>' +
      '<label>地点名称</label><input id="memName" placeholder="如：杭州西湖">' +
      '<label>日期</label><input id="memDate" type="date" value="' + todayStr() + '">' +
      '<label>相册照片</label><div class="ph-upload" id="memPhotosBox"><div class="ph-add" id="memPhAdd">＋<small>上传照片</small></div></div>' +
      '<div class="btn-row"><button class="btn btn-primary" onclick="Marvis.saveMem()">保存</button>' +
      '<button class="btn" onclick="Marvis.hideSheet()">取消</button></div>'
    );
    var phs = [];
    $('memPhAdd').onclick = function () {
      pickImages(function (arr) {
        phs = phs.concat(arr);
        renderMemPhs();
      });
    };
    function renderMemPhs() {
      var box = $('memPhotosBox');
      var h = '';
      phs.forEach(function (b, i) {
        h += '<div class="ph-thumb"><img src="' + b + '"><div class="ph-del" onclick="Marvis.rmPh(' + i + ')">✕</div></div>';
      });
      h += '<div class="ph-add" id="memPhAdd">＋<small>上传照片</small></div>';
      box.innerHTML = h;
      box.querySelector('#memPhAdd').onclick = function () {
        pickImages(function (arr) { phs = phs.concat(arr); renderMemPhs(); });
      };
    }
    window.__memPhs = function () { return phs; };
  }
  function rmPh(i) {
    var phs = window.__memPhs ? window.__memPhs() : [];
    phs.splice(i, 1);
    var box = $('memPhotosBox');
    var h = '';
    phs.forEach(function (b, j) { h += '<div class="ph-thumb"><img src="' + b + '"><div class="ph-del" onclick="Marvis.rmPh(' + j + ')">✕</div></div>'; });
    h += '<div class="ph-add" id="memPhAdd">＋<small>上传照片</small></div>';
    box.innerHTML = h;
    box.querySelector('#memPhAdd').onclick = function () {
      pickImages(function (arr) { phs = phs.concat(arr); renderMemPhs(); });
    };
    window.__memPhs = function () { return phs; };
  }
  function saveMem() {
    var name = $('memName').value.trim();
    if (!name) { toast('请填写地点名称'); return; }
    var mems = DB.get('memories', []);
    var pos = pendingMemPos || { x: 0.2 + Math.random() * 0.6, y: 0.2 + Math.random() * 0.6 };
    mems.push({
      id: uid(), name: name, date: $('memDate').value || todayStr(),
      x: pos.x, y: pos.y, photos: window.__memPhs ? window.__memPhs().slice() : []
    });
    DB.set('memories', mems);
    pendingMemPos = null;
    hideSheet();
    renderMemory(); renderHome();
    toast('已添加足迹');
  }

  function renderMemory() {
    var mems = DB.get('memories', []);
    $('memCount').textContent = mems.length + ' 个标点';
    drawMemMap(mems);
    var html = '';
    mems.forEach(function (m) {
      var th = '';
      if (m.photos && m.photos.length) {
        th = '<div class="mem-thumbs">' + m.photos.slice(0, 4).map(function (b) {
          return '<img src="' + b + '" onclick="Marvis.lightbox(this.src)">';
        }).join('') + '</div>';
      }
      html += '<div class="mem-row" onclick="Marvis.viewMem(\'' + m.id + '\')"><div class="mem-pin">📍</div>' +
        '<div class="mem-info"><div class="mem-name">' + esc(m.name) + '</div>' +
        '<div class="mem-date">' + esc(m.date) + '</div>' + th + '</div>' +
        '<div class="mem-del" onclick="Marvis.delMem(\'' + m.id + '\')">✕</div></div>';
    });
    $('memList').innerHTML = html;
    $('memEmpty').classList.toggle('hidden', mems.length > 0);
  }
  function viewMem(id) {
    var mems = DB.get('memories', []);
    var m = null;
    mems.forEach(function (x) { if (x.id === id) m = x; });
    if (!m) return;
    if (m.photos && m.photos.length) {
      lightbox(m.photos[0]);
    } else {
      toast(m.name + '（' + m.date + '）暂无照片');
    }
  }
  function delMem(id) {
    var mems = DB.get('memories', []).filter(function (m) { return m.id !== id; });
    DB.set('memories', mems);
    renderMemory(); renderHome();
  }
  $('memAddBtn').onclick = function () { pendingMemPos = null; showMemForm(); };

  function drawMemMap(mems) {
    var cv = $('memCanvas');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, memCanvasW, memCanvasH);
    // 淡色网格
    ctx.strokeStyle = 'rgba(94,200,165,.15)';
    ctx.lineWidth = 1;
    for (var i = 0; i < 8; i++) {
      ctx.beginPath(); ctx.moveTo(i * memCanvasW / 8, 0); ctx.lineTo(i * memCanvasW / 8, memCanvasH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * memCanvasH / 6); ctx.lineTo(memCanvasW, i * memCanvasH / 6); ctx.stroke();
    }
    if (mems.length < 2) {
      if (mems.length === 1) drawMemPin(ctx, mems[0]);
      return;
    }
    // 连线轨迹（按记录顺序）
    ctx.strokeStyle = '#5EC8A5';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(mems[0].x * memCanvasW, mems[0].y * memCanvasH);
    for (var k = 1; k < mems.length; k++) ctx.lineTo(mems[k].x * memCanvasW, mems[k].y * memCanvasH);
    ctx.stroke();
    mems.forEach(function (m) { drawMemPin(ctx, m); });
  }
  function drawMemPin(ctx, m) {
    var x = m.x * memCanvasW, y = m.y * memCanvasH;
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#1E8C6B';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.fillStyle = '#13684E';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(m.name.length > 6 ? m.name.slice(0, 6) + '…' : m.name, x, y - 14);
  }

  /* ============================================================
     旅游攻略 · 吃住行 + 勾选生成路线
  ============================================================ */
  var TRAVEL_DATA = {
    '成都': {
      food: [
        { name: '龙抄手（春熙路总店）', loc: '锦江区春熙路商圈', dish: '红油抄手、钟水饺', price: '人均 25 元' },
        { name: '陈麻婆豆腐（骡马市店）', loc: '青羊区西玉龙街', dish: '麻婆豆腐、回锅肉', price: '人均 40 元' },
        { name: '蜀大侠火锅（宽窄巷子店）', loc: '青羊区宽窄巷子', dish: '麻辣牛肉、毛肚', price: '人均 90 元' }
      ],
      stay: [
        { name: '春熙路亚朵酒店', loc: '锦江区春熙路', price: '约 400 元/晚' },
        { name: '宽窄巷子精品客栈', loc: '青羊区宽窄巷子', price: '约 300 元/晚' },
        { name: '熊猫基地周边民宿', loc: '成华区熊猫大道', price: '约 250 元/晚' }
      ],
      note: '市内地铁发达，景点集中，建议住地铁沿线。'
    },
    '西安': {
      food: [
        { name: '老孙家羊肉泡馍', loc: '碑林区钟楼商圈', dish: '羊肉泡馍、腊牛肉', price: '人均 40 元' },
        { name: '回民街马家灌汤包', loc: '莲湖区回民街', dish: '灌汤包、酸梅汤', price: '人均 30 元' },
        { name: '长安大牌档（大雁塔店）', loc: '雁塔区大雁塔', dish: '葫芦鸡、金线油塔', price: '人均 70 元' }
      ],
      stay: [
        { name: '钟楼美居酒店', loc: '碑林区钟楼', price: '约 350 元/晚' },
        { name: '大雁塔亚朵酒店', loc: '雁塔区大雁塔', price: '约 400 元/晚' },
        { name: '回民街青年旅舍', loc: '莲湖区回民街', price: '约 120 元/晚' }
      ],
      note: '地铁 2 号线贯穿钟楼与大雁塔，出行方便。'
    },
    '厦门': {
      food: [
        { name: '黄则和花生汤（中山路店）', loc: '思明区中山路', dish: '花生汤、海蛎煎', price: '人均 25 元' },
        { name: '曾厝垵海鲜大排档', loc: '思明区曾厝垵', dish: '酱油水海鲜、土笋冻', price: '人均 80 元' },
        { name: '鼓浪屿张三疯奶茶', loc: '思明区鼓浪屿', dish: '招牌奶茶、海蛎饼', price: '人均 30 元' }
      ],
      stay: [
        { name: '中山路临海酒店', loc: '思明区中山路', price: '约 380 元/晚' },
        { name: '曾厝垵海景民宿', loc: '思明区曾厝垵', price: '约 280 元/晚' },
        { name: '鼓浪屿岛上客栈', loc: '思明区鼓浪屿', price: '约 450 元/晚' }
      ],
      note: '岛内公交便利，去鼓浪屿需乘轮渡。'
    }
  };

  function travelTemplate(city) {
    return {
      food: [
        { name: city + '老字号小吃（市中心店）', loc: '市中心商圈', dish: '本地招牌菜、特色小吃', price: '人均 35 元' },
        { name: city + '特色餐馆（老街分店）', loc: '老城区步行街', dish: '地方风味、家常菜', price: '人均 50 元' }
      ],
      stay: [
        { name: city + '中心商务酒店', loc: '市中心', price: '约 350 元/晚' },
        { name: city + '车站附近快捷酒店', loc: '火车站/高铁站附近', price: '约 200 元/晚' }
      ],
      note: '建议住在市中心或交通枢纽附近，出行更方便。'
    };
  }

  $('travelGo').onclick = function () {
    var city = $('travelInput').value.trim();
    if (!city) { toast('请输入城市名称'); return; }
    var data = TRAVEL_DATA[city] || travelTemplate(city);
    renderTravelResult(city, data);
  };
  $('travelInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') $('travelGo').click();
  });

  function renderTravelResult(city, data) {
    var foodHtml = data.food.map(function (f, i) {
      return '<div class="guide-item"><input type="checkbox" data-kind="food" data-idx="' + i + '">' +
        '<div class="gi-body"><div class="gi-name">' + esc(f.name) + '</div>' +
        '<div class="gi-meta">📍 ' + esc(f.loc) + '<br>🍽 ' + esc(f.dish) + '<br>💰 ' + esc(f.price) + '</div></div></div>';
    }).join('');
    var stayHtml = data.stay.map(function (s, i) {
      return '<div class="guide-item"><input type="checkbox" data-kind="stay" data-idx="' + i + '">' +
        '<div class="gi-body"><div class="gi-name">' + esc(s.name) + '</div>' +
        '<div class="gi-meta">📍 ' + esc(s.loc) + '<br>💰 ' + esc(s.price) + '</div></div></div>';
    }).join('');
    var html =
      '<div class="card"><div class="card-title"><span class="ct-icon">🍜</span>' + esc(city) + ' · 吃什么</div>' + foodHtml +
      '<p style="font-size:12px;color:#8B9A93;margin-top:4px">勾选心仪的餐厅，用于生成路线</p></div>' +
      '<div class="card"><div class="card-title"><span class="ct-icon">🏨</span>' + esc(city) + ' · 住哪里</div>' + stayHtml +
      '<p style="font-size:12px;color:#8B9A93;margin-top:4px">勾选心仪的住宿，用于生成路线</p></div>' +
      '<div class="card"><div class="card-title"><span class="ct-icon">🚇</span>交通提示</div>' +
      '<p class="gi-meta">' + esc(data.note) + '</p>' +
      '<button class="btn btn-primary btn-block" id="genRouteBtn">🧭 生成路线</button></div>';
    $('travelResult').innerHTML = html;
    $('genRouteBtn').onclick = function () { generateRoute(city, data); };
    $('routeCard').style.display = 'none';
  }

  function generateRoute(city, data) {
    var checked = [];
    document.querySelectorAll('#travelResult input[type=checkbox]:checked').forEach(function (el) {
      var kind = el.getAttribute('data-kind');
      var idx = parseInt(el.getAttribute('data-idx'), 10);
      var item = kind === 'food' ? data.food[idx] : data.stay[idx];
      checked.push({ kind: kind, name: item.name, loc: item.loc });
    });
    if (checked.length < 2) { toast('请至少勾选 2 个地点（吃/住）生成路线'); return; }
    // 排序：住宿在前（起点），餐厅在后
    checked.sort(function (a, b) { return (a.kind === 'stay' ? 0 : 1) - (b.kind === 'stay' ? 0 : 1); });
    var start = checked[0], end = checked[checked.length - 1];
    var segs = [];
    for (var i = 0; i < checked.length - 1; i++) {
      segs.push({ from: checked[i], to: checked[i + 1] });
    }
    var info = '<b>起点：</b>' + esc(start.name) + '（' + esc(start.loc) + '）<br>';
    info += '<b>途经：</b>' + checked.slice(1, -1).map(function (c) { return esc(c.name); }).join(' → ') + '<br>';
    info += '<b>终点：</b>' + esc(end.name) + '（' + esc(end.loc) + '）<br>';
    segs.forEach(function (s, k) {
      var mode = k % 2 === 0 ? '地铁' : (k % 3 === 0 ? '公交' : '步行');
      var min = 8 + Math.floor(Math.random() * 15);
      info += '<b>第' + (k + 1) + '段：</b>' + esc(s.from.name) + ' → ' + esc(s.to.name) +
        '，建议' + mode + '，约 ' + min + ' 分钟<br>';
    });
    $('routeInfo').innerHTML = info;
    $('routeCard').style.display = '';
    drawRoute(checked);
  }

  function drawRoute(pts) {
    var cv = $('routeCanvas');
    var W = 640, H = 300;
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    // 网格
    ctx.strokeStyle = 'rgba(94,200,165,.15)';
    for (var i = 0; i < 8; i++) {
      ctx.beginPath(); ctx.moveTo(i * W / 8, 0); ctx.lineTo(i * W / 8, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * H / 6); ctx.lineTo(W, i * H / 6); ctx.stroke();
    }
    // 连线
    ctx.strokeStyle = '#5EC8A5';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(50, H / 2);
    for (var k = 0; k < pts.length; k++) {
      var x = 50 + (W - 100) * k / Math.max(pts.length - 1, 1);
      var y = H / 2 + (k % 2 === 0 ? -20 : 20);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    // 节点
    pts.forEach(function (p, k) {
      var x = 50 + (W - 100) * k / Math.max(pts.length - 1, 1);
      var y = H / 2 + (k % 2 === 0 ? -20 : 20);
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = k === 0 ? '#1E8C6B' : '#5EC8A5';
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(k + 1, x, y + 3);
      ctx.fillStyle = '#13684E';
      ctx.font = '12px sans-serif';
      ctx.fillText(p.name.length > 5 ? p.name.slice(0, 5) + '…' : p.name, x, y - 16);
    });
  }

  /* ============================================================
     助眠专区 · 视频卡片 + 抖音精选唤起
  ============================================================ */
  var SLEEP_LIB = {
    '白噪音': [
      { t: '雨声白噪音 · 伴你入睡', d: '60 分钟', desc: '淅沥雨声 + 轻柔环境音' },
      { t: '海浪白噪音 · 放松身心', d: '45 分钟', desc: '海边浪声，舒缓减压' },
      { t: '森林鸟鸣 · 清晨治愈', d: '30 分钟', desc: '自然鸟鸣与风声' }
    ],
    'ASMR': [
      { t: 'ASMR 助眠 · 轻语采耳', d: '40 分钟', desc: '轻语 + 触摸音，极致放松' },
      { t: 'ASMR 翻书声 · 入睡神器', d: '35 分钟', desc: '纸页翻动与指尖声' }
    ],
    '冥想': [
      { t: '冥想引导 · 快速入睡', d: '20 分钟', desc: '呼吸引导 + 身体扫描' },
      { t: '正念冥想 · 减压安神', d: '25 分钟', desc: '关注当下，清空思绪' }
    ],
    '历史故事': [
      { t: '睡前历史故事 · 大唐风云', d: '50 分钟', desc: '娓娓道来的历史人物故事' },
      { t: '睡前历史故事 · 三国演义', d: '55 分钟', desc: '经典章回，越听越困' }
    ],
    '助眠': [
      { t: '深夜电台 · 温柔女声', d: '60 分钟', desc: '温柔嗓音陪你入眠' },
      { t: '轻音乐钢琴曲 · 安眠', d: '48 分钟', desc: '舒缓钢琴，静心入眠' }
    ]
  };

  $('sleepSearchBtn').onclick = function () {
    var kw = $('sleepInput').value.trim() || '助眠';
    showSleepCards(kw);
    openDouyin(kw);
  };
  $('sleepInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') $('sleepSearchBtn').click();
  });
  $('sleepOpenDouyin').onclick = function () {
    var kw = $('sleepInput').value.trim() || '助眠';
    openDouyin(kw);
  };

  function showSleepCards(kw) {
    var cards = [];
    Object.keys(SLEEP_LIB).forEach(function (cat) {
      if (kw && (cat.indexOf(kw) >= 0 || kw.indexOf(cat) >= 0 || kw === '助眠')) {
        cards = cards.concat(SLEEP_LIB[cat].map(function (v) { return { cat: cat, t: v.t, d: v.d, desc: v.desc }; }));
      }
    });
    if (!cards.length) {
      // 通用展示：全部热门
      Object.keys(SLEEP_LIB).forEach(function (cat) {
        cards = cards.concat(SLEEP_LIB[cat].map(function (v) { return { cat: cat, t: v.t, d: v.d, desc: v.desc }; }));
      });
    }
    var html = '';
    cards.slice(0, 9).forEach(function (v) {
      html += '<div class="sleep-card" onclick="Marvis.openDouyin(\'' + v.t + '\')">' +
        '<div class="sc-thumb">🎧</div>' +
        '<div class="sc-body"><div class="sc-title">' + esc(v.t) + '</div>' +
        '<div class="sc-meta">' + esc(v.cat) + ' · ' + esc(v.d) + '</div>' +
        '<div class="sc-desc">' + esc(v.desc) + '</div></div></div>';
    });
    $('sleepCards').innerHTML = html;
    $('sleepEmpty').classList.toggle('hidden', cards.length > 0);
  }

  function openDouyin(kw) {
    var q = encodeURIComponent(kw || '助眠');
    var scheme = 'snssdk1128://search?keyword=' + q;
    var webUrl = 'https://www.douyin.com/search/' + q;
    if (NB && NB.openUrl) {
      // 原生壳：直接交给宿主打开
      nbOpenUrl(webUrl);
      return;
    }
    // 浏览器环境：尝试深链，失败降级网页版
    var start = Date.now();
    try {
      var iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = scheme;
      document.body.appendChild(iframe);
      setTimeout(function () {
        if (Date.now() - start < 1800) {
          window.location.href = webUrl;
        }
      }, 1600);
    } catch (e) {
      window.location.href = webUrl;
    }
  }

  /* ---------- 初始化 ---------- */
  renderMenu();
  renderHome();
  memCanvasInit();
  openPage('home');

  /* ---------- 点击兜底委托：保证“添加猫咪 / 添加足迹 / 地图标点”始终可点 ---------- */
  function sheetShows(key) {
    var s = $('sheet');
    return s && s.className.indexOf('open') >= 0 && s.innerHTML.indexOf(key) >= 0;
  }
  document.addEventListener('click', function (e) {
    var el = e.target;
    while (el && el !== document && el.nodeType === 1) {
      if (el.id === 'catAddBtn') {
        if (!sheetShows('添加猫咪')) showCatAdd();
        return;
      }
      if (el.id === 'memAddBtn') {
        if (!sheetShows('记录去过的地方')) { pendingMemPos = null; showMemForm(); }
        return;
      }
      if (el.id === 'memCanvas') {
        if (!sheetShows('记录去过的地方')) {
          var r = el.getBoundingClientRect();
          pendingMemPos = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
          showMemForm();
        }
        return;
      }
      el = el.parentNode;
    }
  });

  /* ---------- 全局导出（供 onclick 调用） ---------- */
  window.Marvis = {
    openPage: openPage,
    hideSheet: hideSheet,
    lightbox: lightbox,
    toggleTodo: toggleTodo,
    delTodo: delTodo,
    saveCustomDrink: saveCustomDrink,
    saveCat: saveCat,
    delCat: delCat,
    openCalDay: openCalDay,
    saveCalDay: saveCalDay,
    saveMem: saveMem,
    viewMem: viewMem,
    delMem: delMem,
    rmPh: rmPh,
    openDouyin: openDouyin
  };
})();
