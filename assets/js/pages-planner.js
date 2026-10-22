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

    const draft = CTA.store.getPlanDraft();
    if (draft && draft.plan && draft.plan.ok) renderPlan(draft.plan);

    function renderPlan(plan) {
      result.innerHTML = '<h3>行程草案（' + plan.days + ' 天，自 ' + esc(plan.startDate) + '）</h3>' +
        '<ol>' + plan.itinerary.map(day =>
          '<li>' + esc(day.date) + '：<a href="#/dest/' + encodeURIComponent(day.destinationId) + '">' + esc(day.destinationName) + '</a>' +
          (day.activities && day.activities.length ? ' — ' + day.activities.map(esc).join('、') : '') + '</li>').join('') + '</ol>' +
        '<p class="muted">草案已保存在本机，可在收藏页外随时回此页查看。出发地、人数与预算仅作记录与排序权重，不生成交通票价信息。</p>';
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
      CTA.store.setPlanDraft({ savedAt: new Date().toISOString(), from: el.querySelector('#p-from').value, plan });
      renderPlan(plan);
    });
  };
})();
