const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const {outputText} = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019}
  });
  module._compile(outputText, filename);
};
const {MainStore} = require('../src/store/index.ts');

test('page editing preserves independent schemas and unique identities', () => {
  const store = MainStore.create({schema: {type: 'page', title: 'Edited'}});
  const original = store.pages[0].schema;
  store.addPage({label: '配置页', path: 'settings', schema: {type: 'page'}});
  assert.equal(store.pages.length, 2);
  assert.notEqual(store.pages[0].id, store.pages[1].id);
  store.updatePageSchemaAt(1);
  assert.deepEqual(store.pages[1].schema, {type: 'page', title: 'Edited'});
  assert.deepEqual(store.pages[0].schema, original);
  store.removePageAt(1);
  assert.equal(store.pages.length, 1);
});

test('preview, mobile and sidebar controls retain their state', () => {
  const store = MainStore.create({schema: {}});
  store.setPreview(true);
  store.setIsMobile(true);
  store.setAddPageIsOpen(true);
  store.toggleAsideFolded();
  store.toggleAsideFixed();
  store.toggleOffScreen();
  assert.deepEqual([store.preview, store.isMobile, store.addPageIsOpen, store.asideFolded, store.asideFixed, store.offScreen], [true, true, true, true, false, true]);
});

test('saved page configuration is restored and subsequent edits persist', () => {
  let saved = JSON.stringify({pages: [{id: 'saved', path: 'saved', label: '恢复页', schema: {type: 'page'}}], schema: {}});
  global.window = {localStorage: {getItem: key => key === 'store' ? saved : null, setItem: (key, value) => {assert.equal(key, 'store'); saved = value;}}};
  try {
    const store = MainStore.create({schema: {}});
    assert.equal(store.pages[0].label, '恢复页');
    store.updateSchema({type: 'page', title: '保存'});
    store.updatePageSchemaAt(0);
    assert.equal(JSON.parse(saved).pages[0].schema.title, '保存');
  } finally { delete global.window; }
});
