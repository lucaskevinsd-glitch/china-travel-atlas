/* 灯箱键盘交互测试（真实 Firefox）：焦点陷阱、焦点返回、Escape、连续开关、浏览器返回。
   明确声明：键盘/焦点为自动化验证；屏幕阅读器朗读不在此覆盖。 */
import { firefox } from 'playwright-core';
const BASE = 'http://127.0.0.1:8130';
let pass = 0, fail = 0;
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name, extra); }
}
const browser = await firefox.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push(String(e)));
const activeCls = () => p.evaluate(() => document.activeElement.className);
const lbOpen = () => p.evaluate(() => !document.querySelector('.lightbox').hidden);

await p.goto(BASE + '/#/dest/huangshan', { waitUntil: 'networkidle' });
await p.waitForSelector('article.detail h2');

// 1. 放大按钮打开 → 焦点进入灯箱关闭按钮
await p.click('[data-zoom]');
await p.waitForFunction(() => !document.querySelector('.lightbox').hidden);
ok('打开灯箱', await lbOpen());
ok('焦点进入灯箱关闭按钮', (await activeCls()).includes('lb-close'), await activeCls());
ok('灯箱为模态语义', await p.evaluate(() => {
  const lb = document.querySelector('.lightbox');
  return lb.getAttribute('role') === 'dialog' && lb.getAttribute('aria-modal') === 'true';
}));

// 2. 正向 Tab 陷阱：close → prev → next → 回绕 close
await p.keyboard.press('Tab');
ok('Tab 到上一张', (await activeCls()).includes('lb-prev'), await activeCls());
await p.keyboard.press('Tab');
ok('Tab 到下一张', (await activeCls()).includes('lb-next'), await activeCls());
await p.keyboard.press('Tab');
ok('Tab 回绕到关闭', (await activeCls()).includes('lb-close'), await activeCls());

// 3. 反向 Shift+Tab：close → next
await p.keyboard.down('Shift');
await p.keyboard.press('Tab');
await p.keyboard.up('Shift');
ok('Shift+Tab 回绕到下一张', (await activeCls()).includes('lb-next'), await activeCls());

// 4. 方向键仍可切换（无回归）
const before = await p.evaluate(() => document.querySelector('.lb-count').textContent);
await p.keyboard.press('ArrowRight');
const after = await p.evaluate(() => document.querySelector('.lb-count').textContent);
ok('方向键切换图片', before !== after, before + ' -> ' + after);

// 5. Escape 关闭 → 焦点返回放大按钮
await p.keyboard.press('Escape');
await p.waitForFunction(() => document.querySelector('.lightbox').hidden);
ok('Escape 关闭灯箱', !(await lbOpen()));
ok('焦点返回放大按钮', await p.evaluate(() => document.activeElement.hasAttribute('data-zoom')));

// 6. 点击主图打开 → 关闭后焦点回到放大按钮（图片本身不可聚焦）
await p.click('.gallery-stage img');
await p.waitForFunction(() => !document.querySelector('.lightbox').hidden);
await p.keyboard.press('Escape');
await p.waitForFunction(() => document.querySelector('.lightbox').hidden);
ok('图片点击打开后焦点返回放大按钮', await p.evaluate(() => document.activeElement.hasAttribute('data-zoom')));

// 7. 连续打开关闭
for (let i = 0; i < 3; i++) {
  await p.click('[data-zoom]');
  await p.waitForFunction(() => !document.querySelector('.lightbox').hidden);
  await p.keyboard.press('Escape');
  await p.waitForFunction(() => document.querySelector('.lightbox').hidden);
}
ok('连续开关3次后焦点仍返回', await p.evaluate(() => document.activeElement.hasAttribute('data-zoom')));
ok('无重复 keydown 监听导致异常', errs.length === 0, errs.join(';'));

// 8. 触发控件被移除时关闭不抛错
await p.click('[data-zoom]');
await p.waitForFunction(() => !document.querySelector('.lightbox').hidden);
await p.evaluate(() => document.querySelector('[data-zoom]').remove());
await p.keyboard.press('Escape');
await p.waitForFunction(() => document.querySelector('.lightbox').hidden);
ok('触发控件已移除时关闭不抛错', errs.length === 0, errs.join(';'));

// 9. 灯箱打开时浏览器返回 → 无错误、灯箱被清理
await p.reload({ waitUntil: 'networkidle' });
await p.waitForSelector('article.detail h2');
await p.waitForSelector('[data-zoom]');
await p.click('[data-zoom]');
await p.waitForFunction(() => !document.querySelector('.lightbox').hidden);
await p.goto(BASE + '/#/', { waitUntil: 'networkidle' });
ok('路由切换后灯箱被清理', await p.evaluate(() => !document.querySelector('.lightbox')));
ok('浏览器返回场景无脚本错误', errs.length === 0, errs.join(';'));

await browser.close();
console.log(`\nLIGHTBOX-FOCUS SUMMARY: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
