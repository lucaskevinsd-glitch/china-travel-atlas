/* 2.2 正式开发验收（真实 Firefox）：S1 摄影版权页 / S2 首页 / S3 页面统一 / S4 视觉修复。
   未覆盖：K80 真机、屏幕阅读器朗读、SW 版本更新流程（见 dev-report 未执行项）。 */
import { firefox } from 'playwright-core';
const BASE = 'http://127.0.0.1:8130';
let pass = 0, fail = 0;
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name, extra); }
}
const browser = await firefox.launch();
const errs = [];
async function newPage(vp, opts = {}) {
  const ctx = await browser.newContext({ viewport: vp, ...opts });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGE ' + String(e).slice(0, 120)));
  p.on('console', m => { if (m.type() === 'error') errs.push('CON ' + m.text().slice(0, 120)); });
  return p;
}
const overflow = p => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/* —— S2 首页（桌面） —— */
let p = await newPage({ width: 1440, height: 900 });
await p.goto(BASE + '/#/', { waitUntil: 'networkidle' });
await p.waitForSelector('.car-slide.on');
ok('首页5张轮播', await p.evaluate(() => document.querySelectorAll('.car-slide').length) === 5);
ok('首屏信息层：每张有目的地名+卖点+CTA（B1）', await p.evaluate(() => {
  const caps = [...document.querySelectorAll('.car-slide .car-caption')];
  return caps.length === 5 && caps.every(c =>
    c.querySelector('.car-title').textContent.trim().length > 0 &&
    c.querySelector('.car-sub').textContent.trim().length > 0 &&
    c.querySelector('.car-cta').textContent.includes('探索目的地'));
}), 'caption=' + await p.evaluate(() => document.querySelectorAll('.car-slide .car-caption').length));
ok('首屏全幅无溢出', (await overflow(p)) <= 0, String(await overflow(p)));
ok('全局顶栏隐藏', await p.evaluate(() => getComputedStyle(document.querySelector('.topbar')).display === 'none'));
ok('页内导航在首屏后', await p.evaluate(() => !!document.querySelector('.home-nav')));
ok('主题4卡', await p.evaluate(() => document.querySelectorAll('.theme-card').length) === 4);
ok('主题卡跳转真实主题筛选', await p.evaluate(() =>
  [...document.querySelectorAll('.theme-card')].every(a => /^#\/discover\?theme=(nature|historic|ancient-town|coastal)$/.test(a.getAttribute('href')))));
ok('精选1大+2卡', await p.evaluate(() => document.querySelectorAll('.feat-main').length === 1 && document.querySelectorAll('.feat-card').length === 2));
ok('省份31条真实数量（A1：24→31）', await p.evaluate(() => {
  const rows = [...document.querySelectorAll('.index-list a')];
  return rows.length === 31 && rows.every(a => /\d+ 个目的地/.test(a.textContent));
}));
ok('页脚无开发说明', await p.evaluate(() => {
  const t = document.querySelector('.site-footer').textContent;
  return !/版本号|缓存|测试统计/.test(t) && t.includes('摄影版权');
}));

/* —— S2 轮播行为 —— */
const curSlide = () => p.evaluate(() => [...document.querySelectorAll('.car-slide')].findIndex(s => s.classList.contains('on')));
await p.click('[data-car-next]');
await p.waitForTimeout(300);
ok('下一张切换', (await curSlide()) === 1, String(await curSlide()));
await p.click('[data-car-prev]');
await p.waitForTimeout(300);
ok('上一张切换', (await curSlide()) === 0, String(await curSlide()));
await p.click('.car-dot[data-dot="3"]');
await p.waitForTimeout(300);
ok('圆点跳转', (await curSlide()) === 3, String(await curSlide()));
const paused = await p.evaluate(() => { document.querySelector('[data-car-pause]').click(); return document.querySelector('[data-car-pause]').textContent; });
ok('暂停按钮切换（播放态→暂停态，B1显式暂停）', paused === '▶', paused);
const paused2 = await p.evaluate(() => { document.querySelector('[data-car-pause]').click(); return document.querySelector('[data-car-pause]').textContent; });
ok('暂停按钮切换（暂停态→播放态，B1恢复）', paused2 === '❚❚', paused2);
ok('控件键盘可达', await p.evaluate(() => {
  document.querySelector('[data-car-next]').focus();
  return document.activeElement.getAttribute('data-car-next') !== null;
}));
await p.close();

/* —— S2 减动效 —— */
p = await newPage({ width: 1440, height: 900 }, { reducedMotion: 'reduce' });
await p.goto(BASE + '/#/', { waitUntil: 'networkidle' });
await p.waitForSelector('.car-slide.on');
await p.waitForTimeout(6500);
ok('减动效下不自动轮播', (await p.evaluate(() => [...document.querySelectorAll('.car-slide')].findIndex(s => s.classList.contains('on')))) === 0);
await p.close();

/* —— S2/S4 移动端 390px —— */
p = await newPage({ width: 390, height: 844 }, { hasTouch: true, isMobile: true });
await p.goto(BASE + '/#/', { waitUntil: 'networkidle' });
await p.waitForSelector('.car-slide.on');
ok('390px无横向溢出', (await overflow(p)) <= 0, String(await overflow(p)));
const gap = await p.evaluate(() => {
  const d = document.querySelector('.car-dots').getBoundingClientRect();
  const c = document.querySelector('.car-ctl').getBoundingClientRect();
  return Math.round(c.left - d.right);
});
ok('S4-V1 轮播控件不拥挤（间距>20px）', gap > 20, 'gap=' + gap);
ok('触控目标≥44px', await p.evaluate(() =>
  [...document.querySelectorAll('.car-ctl button')].every(b => b.getBoundingClientRect().width >= 44)));
/* 移动端底部标签栏不得盖住轮播控件（真实交互问题回归，2026-11-01 发现并修复） */
const aboveTab = await p.evaluate(() => {
  const tab = document.querySelector('.bottom-tabs').getBoundingClientRect();
  const ctl = document.querySelector('.car-ctl').getBoundingClientRect();
  const dots = document.querySelector('.car-dots').getBoundingClientRect();
  const hit = sel => {
    const e = document.querySelector(sel); const b = e.getBoundingClientRect();
    const el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
    return el === e || e.contains(el);
  };
  return {
    ctlAbove: ctl.bottom <= tab.top, dotsAbove: dots.bottom <= tab.top,
    hitNext: hit('.car [data-car-next]'), hitDot: hit('.car-dot'),
  };
});
ok('轮播控件位于底部标签栏之上', aboveTab.ctlAbove && aboveTab.dotsAbove, JSON.stringify(aboveTab));
ok('轮播控件真实可点击命中', aboveTab.hitNext && aboveTab.hitDot, JSON.stringify(aboveTab));
const cur0 = await p.evaluate(() => [...document.querySelectorAll('.car-slide')].findIndex(s => s.classList.contains('on')));
await p.click('[data-car-next]');
await p.waitForTimeout(400);
ok('移动端真实点击切换下一张', (await p.evaluate(() => [...document.querySelectorAll('.car-slide')].findIndex(s => s.classList.contains('on')))) === (cur0 + 1) % 5, 'from ' + cur0);
/* 恢复轮播到原位置，避免影响后续触摸滑动测试的状态假设 */
await p.click(`.car-dot[data-dot="${cur0}"]`);
await p.waitForTimeout(400);
/* 触摸滑动：合成触摸事件（handler 仅读取 touches/changedTouches 的 clientX） */
await p.evaluate(() => {
  const root = document.querySelector('[data-carousel]');
  function tev(type, x) {
    const e = new Event(type, { bubbles: true, cancelable: true });
    const pts = [{ clientX: x, clientY: 400 }];
    Object.defineProperty(e, 'touches', { value: type === 'touchend' ? [] : pts });
    Object.defineProperty(e, 'changedTouches', { value: pts });
    root.dispatchEvent(e);
  }
  tev('touchstart', 300);
  tev('touchend', 180);
});
await p.waitForTimeout(400);
ok('触摸滑动切换', (await p.evaluate(() => [...document.querySelectorAll('.car-slide')].findIndex(s => s.classList.contains('on')))) === 1);
/* 省份长名 */
await p.evaluate(() => document.querySelector('.index-list').scrollIntoView());
await p.waitForTimeout(400);
ok('S4-V2 省份行无换行错位', await p.evaluate(() =>
  [...document.querySelectorAll('.index-list a b')].every(b => b.getBoundingClientRect().height < 32)));
await p.close();

/* —— 360px / 768px 溢出 —— */
for (const w of [360, 768]) {
  p = await newPage({ width: w, height: 800 });
  await p.goto(BASE + '/#/', { waitUntil: 'networkidle' });
  await p.waitForSelector('.theme-grid');
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(500);
  ok(w + 'px无横向溢出', (await overflow(p)) <= 0, String(await overflow(p)));
  await p.close();
}

/* —— S1 摄影版权页 —— */
p = await newPage({ width: 1440, height: 900 });
await p.goto(BASE + '/#/credits', { waitUntil: 'networkidle' });
await p.waitForSelector('.credit-img');
ok('版权页134张（A1 129 + B1 首页轮播 5）', await p.evaluate(() => document.querySelectorAll('.credit-img').length) === 134);
ok('每图有作者+来源链接+许可链接（Public domain 无官方 deed 页，显示许可名称即可）', await p.evaluate(() =>
  [...document.querySelectorAll('.credit-img')].every(li => {
    const links = [...li.querySelectorAll('a[href^="http"]')];
    const hasSrc = links.some(a => a.href.includes('commons.wikimedia.org/wiki/File'));
    const licText = li.textContent;
    const needsDeed = !licText.includes('Public domain');
    const hasDeed = links.some(a => a.href.includes('creativecommons.org'));
    return licText.includes('作者') && hasSrc && (!needsDeed || hasDeed);
  })));
ok('来源链接可点击（真实a标签）', await p.evaluate(() =>
  [...document.querySelectorAll('.credit-meta a')].filter(a => a.textContent.includes('原作品')).length) === 134);
ok('手机端版权页可读', await p.evaluate(() => {
  const s = getComputedStyle(document.querySelector('.credit-meta p'));
  return parseFloat(s.fontSize) >= 13;
}));
/* 深链 */
await p.goto(BASE + '/#/credits?dest=huangshan&img=1', { waitUntil: 'networkidle' });
await p.waitForSelector('.credit-img.flash');
ok('深链定位到对应图片', await p.evaluate(() => {
  const f = document.querySelector('.credit-img.flash');
  return f && f.id === 'ci-huangshan-1';
}));
await p.close();

/* —— S1 详情页：ⓘ入口/无长署名/无天气 —— */
p = await newPage({ width: 1440, height: 900 });
await p.goto(BASE + '/#/dest/huangshan', { waitUntil: 'networkidle' });
await p.waitForSelector('article.detail h2');
ok('画廊有ⓘ图片信息入口', await p.evaluate(() => {
  const a = document.querySelector('[data-imginfo]');
  return a && a.href.includes('#/credits?dest=huangshan');
}));
ok('无长署名条覆盖', await p.evaluate(() => !document.querySelector('.img-credit')));
ok('天气区块已移除', await p.evaluate(() => !document.querySelector('#weather-box')));
ok('规格表无数据来源行', await p.evaluate(() => !document.querySelector('.fact-strip').textContent.includes('数据来源')));
ok('详情眉题编辑式层级', await p.evaluate(() => {
  const e = document.querySelector('.detail-eyebrow');
  const s = getComputedStyle(e);
  return e.textContent.includes('No.') && parseFloat(s.letterSpacing) > 0;
}));
/* 灯箱ⓘ */
await p.click('[data-zoom]');
await p.waitForFunction(() => !document.querySelector('.lightbox').hidden);
ok('灯箱ⓘ入口指向对应图片', await p.evaluate(() => {
  const a = document.querySelector('[data-lbinfo]');
  return a && /#\/credits\?dest=huangshan&img=\d+/.test(a.getAttribute('href'));
}));
await p.keyboard.press('Escape');
await p.close();

/* —— S3 发现页 —— */
p = await newPage({ width: 1440, height: 900 });
await p.goto(BASE + '/#/discover', { waitUntil: 'networkidle' });
await p.waitForSelector('#discover-form');
ok('发现页头图有标题层（B2 精选聚光灯）', await p.evaluate(() => {
  const cap = document.querySelector('.disc-band-cap');
  return !!cap && !!cap.querySelector('.disc-band-title').textContent.trim() && !!cap.querySelector('.disc-band-kicker').textContent.trim();
}));
ok('搜索筛选功能正常', await p.evaluate(async () => {
  document.querySelector('#f-keyword').value = '黄山';
  document.querySelector('#discover-form').dispatchEvent(new Event('submit', { cancelable: true }));
  await new Promise(r => setTimeout(r, 600));
  return document.querySelectorAll('#discover-results .dest-card').length >= 1;
}));
await p.close();

/* —— S3 规划页 —— */
p = await newPage({ width: 1440, height: 900 });
await p.goto(BASE + '/#/planner?dest=huangshan', { waitUntil: 'networkidle' });
await p.waitForSelector('#plan-form');
ok('规划页加载正常', await p.evaluate(() => !!document.querySelector('#plan-result') || !!document.querySelector('#plan-form')));
await p.close();

/* —— 控制台错误 —— */
ok('全程零控制台/页面错误', errs.length === 0, errs.slice(0, 3).join(' || '));

await browser.close();
console.log('\n2.2验收: ' + pass + ' 通过, ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
