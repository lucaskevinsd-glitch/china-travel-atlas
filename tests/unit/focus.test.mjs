import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
global.CTA = {};
global.window = { CTA: global.CTA };
global.document = { addEventListener() {} };
require('../../assets/js/ui.js');

test('focusPos：top 取上部裁切带，bottom 取下部，缺省与非法值回落居中', () => {
  assert.equal(global.CTA.ui.focusPos('top'), 'center 10%');
  assert.equal(global.CTA.ui.focusPos('bottom'), 'center 90%');
  assert.equal(global.CTA.ui.focusPos('center'), 'center 50%');
  assert.equal(global.CTA.ui.focusPos(undefined), 'center 50%');
  assert.equal(global.CTA.ui.focusPos('left'), 'center 50%');
});
