const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeContractStyle, contractBlocks } = require('./contract-formatting');
const style = { fontFamily: 'Arial', blocks: [{ index: 0, text: 'PAYMENT TERMS', bold: true, color: '#514568', fontSize: 16 }] };
test('contract formatting keeps supported styles and rejects arbitrary CSS and unbounded data', () => {
  assert.deepEqual(normalizeContractStyle(style), style);
  for (const bad of [{ ...style, fontFamily: 'url(https://example.com)' }, { ...style, blocks: [{ ...style.blocks[0], color: 'red;display:none' }] }, { ...style, blocks: [{ ...style.blocks[0], fontSize: 999 }] }, { ...style, blocks: [style.blocks[0], style.blocks[0]] }]) assert.throws(() => normalizeContractStyle(bad), /Invalid contract formatting/);
  assert.deepEqual(contractBlocks('PAYMENT TERMS\nPay on time.\n\nNext paragraph.').map(({text, heading}) => ({text, heading})), [{text:'PAYMENT TERMS',heading:true},{text:'Pay on time.',heading:false},{text:'Next paragraph.',heading:false}]);
});
