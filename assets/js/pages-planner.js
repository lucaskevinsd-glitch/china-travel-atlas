(function () {
  window.CTA = window.CTA || {};
  CTA.pages = CTA.pages || {};
  CTA.pages.planner = async function (el, params) {
    const esc = CTA.ui.esc;
    const today = new Date().toISOString().slice(0, 10);
    el.innerHTML =
      '<h2>旅行规划（规则版）</h2><p class="muted">按主题、季节与建议天数从已发布目的地中生成逐日草案；AI 规划为二期功能，当前未启用。</p>' +
      '<form id="plan-form" class="filter-form">' +
      '<label>出发地<input type="text" id="p-from" placeholder="如：上海"></label>' +
      '<label>出发日期<input type="date" id="p-date" value="' + today + '" required></label>' +
      '<label>天数<input type="number" id="p-days" min="1" max="30" value="3" required></label>' +
      '<label>人数<input type="number" id="p-people" min="1" max="50" value="2"></label>' +
      '<label>预算档位<select id="p-budget"><option value="economy">经济</option><option value="standard" selected>标准</option><option value="comfort">舒适</option></select></label>' +
      '<label>主题偏好<select id="p-theme"><option value="">不限</option></select></label>' +
      '<label>季节<select id="p-season"><option value="">不限</option><option value="spring">春季</option><option value="summer">夏季</option><option value="autumn">秋季</option><option value="winter">冬季</option></select></label>' +
      '<button type="submit">生成行程草案</button></form>' +
      '<div id="plan-result"></div>';
    const result = el.querySelector('#plan-result');
    let index = [];
    try {
      const [idx, themesDoc] = await Promise.all([CTA.dataService.loadIndex(), CTA.dataService.loadThemes()]);
      index = idx;
      const sel = el.querySelector('#p-theme');
      themesDoc.themes.forEach(t => {
        const o = document.createElement('option'); o.value = t.id; o.textContent = t.label; sel.appendChild(o);
      });
    } catch (e) { result.innerHTML = CTA.ui.errorBox('DATA_LOAD_FAILED'); return; }

    let currentPlan = null;
    let currentFrom = '';

    function timeLabel(iso) {
      try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; }
    }
    function destOptions(selected) {
      return '<option value="">请选择目的地</option>' + index.map(d =>
        '<option value="' + esc(d.id) + '"' + (d.id === selected ? ' selected' : '') + '>' + esc(d.name) + '</option>').join('');
    }
    function saveEdited(plan) {
      const now = new Date().toISOString();
      const ok = CTA.store.setPlanDraft({ savedAt: now, from: currentFrom, plan: plan, edited: true, editedAt: now });
      currentPlan = plan;
      renderPlan(plan, ok ? '已保存 ' + timeLabel(now) : null, ok ? null : 'PLAN_SAVE_FAILED');
    }
    function renderPlan(plan, savedText, errorCode) {
      const days = plan.itinerary || [];
      let html = '<h3>行程草案（' + days.length + ' 天，自 ' + esc(plan.startDate) + '）</h3>';
      if (errorCode) html += CTA.ui.errorBox(errorCode);
      else if (savedText) html += '<p class="muted" id="plan-status">' + esc(savedText) + '</p>';
      if (!days.length) {
        html += '<p class="muted">还没有行程安排：可以从下方新增一天，或填写上方表单重新生成。</p>' +
          '<div class="plan-insert"><label>新增一天<select id="add-end-select" aria-label="新增一天的目的地">' + destOptions('') + '</select></label>' +
          '<button type="button" data-act="add-end">新增一天</button></div>';
      } else {
        html += '<ol id="plan-list">' + days.map((day, i) =>
          '<li data-day="' + i + '">' + esc(day.date) + '：<a href="#/dest/' + encodeURIComponent(day.destinationId) + '">' + esc(day.destinationName) + '</a>' +
          (day.activities && day.activities.length ? ' — ' + day.activities.map(esc).join('、') : '') +
          '<div class="plan-actions">' +
          '<button type="button" data-act="up" data-i="' + i + '"' + (i === 0 ? ' disabled' : '') + ' aria-label="第' + (i + 1) + '天上移">↑上移</button>' +
          '<button type="button" data-act="down" data-i="' + i + '"' + (i === days.length - 1 ? ' disabled' : '') + ' aria-label="第' + (i + 1) + '天下移">↓下移</button>' +
          '<button type="button" data-act="insert" data-i="' + i + '" aria-label="在第' + (i + 1) + '天后插入一天">＋后插一天</button>' +
          '<button type="button" data-act="remove" data-i="' + i + '" aria-label="删除第' + (i + 1) + '天">✕删除</button>' +
          '</div>' +
          '<div class="plan-insert" data-insert-form="' + i + '" hidden><label>插入目的地<select data-insert-select="' + i + '" aria-label="在第' + (i + 1) + '天后插入的目的地">' + destOptions('') + '</select></label>' +
          '<button type="button" data-act="confirm-insert" data-i="' + i + '">确认插入</button></div>' +
          '</li>').join('') + '</ol>' +
          '<div class="plan-insert"><label>末尾新增一天<select id="add-end-select" aria-label="末尾新增一天的目的地">' + destOptions('') + '</select></label>' +
          '<button type="button" data-act="add-end">新增一天</button></div>';
      }
      html += '<p class="muted">草案已保存在本机，可在收藏页外随时回此页查看。出发地、人数与预算仅作记录与排序权重，不生成交通票价信息。</p>';
      result.innerHTML = html;
    }

    result.addEventListener('click', function (e) {
      const btn = e.target.closest('button[data-act]');
      if (!btn || !currentPlan) return;
      const act = btn.getAttribute('data-act');
      const i = parseInt(btn.getAttribute('data-i'), 10);
      const edit = CTA.plannerEdit;
      if (!edit) return;
      if (act === 'insert') {
        const form = result.querySelector('[data-insert-form="' + i + '"]');
        if (form) form.hidden = !form.hidden;
        return;
      }
      let res = null;
      if (act === 'up') res = edit.moveDay(currentPlan.itinerary, i, -1);
      else if (act === 'down') res = edit.moveDay(currentPlan.itinerary, i, 1);
      else if (act === 'remove') res = edit.removeDay(currentPlan.itinerary, i);
      else if (act === 'confirm-insert') {
        const sel = result.querySelector('[data-insert-select="' + i + '"]');
        const dest = sel ? index.filter(d => d.id === sel.value)[0] : null;
        if (!dest) return;
        res = edit.insertDay(currentPlan.itinerary, i, dest);
      } else if (act === 'add-end') {
        const sel = result.querySelector('#add-end-select');
        const dest = sel ? index.filter(d => d.id === sel.value)[0] : null;
        if (!dest) return;
        res = edit.insertDay(currentPlan.itinerary, currentPlan.itinerary.length - 1, dest, currentPlan.startDate);
      }
      if (!res || !res.ok) return;
      const plan = Object.assign({}, currentPlan, { itinerary: res.itinerary, days: res.itinerary.length, totalDays: res.itinerary.length });
      saveEdited(plan);
    });

    const draft = CTA.store.getPlanDraft();
    if (draft && draft.plan && draft.plan.ok && Array.isArray(draft.plan.itinerary)) {
      currentPlan = draft.plan;
      currentFrom = draft.from || '';
      renderPlan(draft.plan, draft.savedAt ? '草案已保存（' + timeLabel(draft.savedAt) + '）' : null, null);
    } else {
      result.innerHTML = '<p class="muted">还没有行程草案，填写上方表单生成。</p>';
    }

    el.querySelector('#plan-form').addEventListener('submit', function (e) {
      e.preventDefault();
      const input = {
        startDate: el.querySelector('#p-date').value,
        days: parseInt(el.querySelector('#p-days').value, 10),
        people: parseInt(el.querySelector('#p-people').value, 10) || null,
        budgetTier: el.querySelector('#p-budget').value,
        theme: el.querySelector('#p-theme').value,
        season: el.querySelector('#p-season').value,
      };
      const plan = CTA.plannerService.planTrip(index, input);
      if (!plan.ok) {
        result.innerHTML = CTA.ui.errorBox(plan.error === 'EMPTY_RESULT' ? 'EMPTY_RESULT' : 'INVALID_INPUT');
        return;
      }
      currentFrom = el.querySelector('#p-from').value;
      const ok = CTA.store.setPlanDraft({ savedAt: new Date().toISOString(), from: currentFrom, plan: plan });
      currentPlan = plan;
      renderPlan(plan, ok ? '已保存 ' + timeLabel(new Date().toISOString()) : null, ok ? null : 'PLAN_SAVE_FAILED');
    });
  };
})();
