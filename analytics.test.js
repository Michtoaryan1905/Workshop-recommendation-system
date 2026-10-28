const test = require('node:test'); const assert = require('node:assert');
const { zTest } = require('../utils/stats');
test('zTest: identical rates -> p ~ 1', () => assert.ok(zTest(10, 100, 10, 100) > 0.99));
test('zTest: very different rates -> p < 0.05', () => assert.ok(zTest(5, 200, 40, 200) < 0.05));
test('zTest: empty group -> null', () => assert.strictEqual(zTest(0, 0, 1, 10), null));
