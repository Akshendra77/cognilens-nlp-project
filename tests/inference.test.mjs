import assert from 'node:assert/strict';
import fs from 'node:fs';
import {analyze, classify} from '../dist/nlp.js';
const model = JSON.parse(fs.readFileSync(new URL('../dist/model.json', import.meta.url)));
const fixtures = JSON.parse(fs.readFileSync(new URL('./sklearn_fixtures.json', import.meta.url)));
let comparisons = 0;
for (const fixture of fixtures) {
  const result = classify(fixture.text, model);
  for (const {label, score} of result.scores) {
    assert.ok(Math.abs(score - fixture.scores[label]) < 1e-12, `scikit-learn parity: ${fixture.text}: ${label}`);
    comparisons++;
  }
}
assert.throws(()=>analyze('',model));
assert.throws(()=>analyze('x'.repeat(5001),model));
assert.equal(classify('constructor prototype',model).label,'uncertain');
assert.equal(classify('zqxv',model).label,'uncertain');
assert.equal(classify('你好世界',model).label,'uncertain');
assert.equal(analyze('First line\nSecond line. Third sentence!',model).sentences.length,3);
assert.equal(classify('I should never make any mistakes.',model).label,'should_statements');
assert.equal(classify('I made a mistake, and I can learn from it.',model).label,'no_clear_pattern');
console.log(`Passed: ${comparisons} score comparisons with scikit-learn; validation, segmentation, canonical predictions, and abstention checks.`);
