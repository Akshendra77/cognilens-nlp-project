import {catalog, samples} from './catalog.js';
import {analyze} from './nlp.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const percent = value => (value * 100).toFixed(1) + '%';
const iconPaths = {
  spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/><path d="M20 2v4m-2-2h4"/>',
  library:'<path d="M4 4h5v16H4zM11 4h4v16h-4zM17 5l3-1 4 15-3 1z"/>',
  history:'<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6M12 7v5l3 2"/>',
  layers:'<path d="m12 3 10 5-10 5L2 8l10-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
  chart:'<path d="M4 3v17h17M8 16v-4m5 4V7m5 9V4"/>',
  document:'<path d="M6 3h9l4 4v14H6V3Zm9 0v5h4M9 12h7m-7 4h7"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
  scan:'<path d="M3 8V3h5m8 0h5v5M3 16v5h5m8 0h5v-5M7 9h10M7 13h7M7 17h4"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-11v1"/>',
  search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  upload:'<path d="M12 16V3m-5 5 5-5 5 5M3 15v6h18v-6"/>',
  download:'<path d="M12 3v13m-5-5 5 5 5-5M3 16v5h18v-5"/>',
  save:'<path d="M5 3h14v18l-7-5-7 5V3Z"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.spark}</svg>`;
$$('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));
let model = null, currentResult = null, resultTab = 'sentences', batchResults = [], toastTimer;
const STORAGE_KEY = 'cognilens.saved.v1';
let history = [];
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  if (Array.isArray(saved)) history = saved.filter(item => item && typeof item.id === 'string' && typeof item.text === 'string' && item.text.length <= 5000 && typeof item.createdAt === 'string').slice(0, 100).map(item => ({id: item.id, text: item.text, createdAt: item.createdAt}));
} catch { /* Storage is optional: the analyzer still works. */ }

function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3500);
}
function download(content, filename, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], {type}));
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const titles = {analyzer: 'Thought analyzer', library: 'Pattern library', history: 'Saved reflections', batch: 'Batch explorer', model: 'Model & methodology'};
function route() {
  const page = location.hash.slice(1) in titles ? location.hash.slice(1) : 'analyzer';
  $$('.page').forEach(el => el.classList.toggle('active', el.id === 'page-' + page));
  $$('[data-page]').forEach(el => {el.classList.toggle('active', el.dataset.page === page); if (el.dataset.page === page) el.setAttribute('aria-current','page'); else el.removeAttribute('aria-current');});
  $('#breadcrumb-title').textContent = titles[page];
  document.title = `${titles[page]} · CogniLens`;
  if (page === 'history') renderHistory();
  window.scrollTo({top:0, behavior:'instant'});
}
window.addEventListener('hashchange', route);

$('#sample-chips').innerHTML = samples.map((sample, i) => `<button class="chip" data-sample="${i}">${escape(sample.name)}</button>`).join('');
$('#sample-chips').addEventListener('click', e => {
  const button = e.target.closest('[data-sample]');
  if (!button) return;
  $('#thought-input').value = samples[Number(button.dataset.sample)].text;
  onInput(); $('#thought-input').focus();
});
const initialResultHTML = $('#result-content').innerHTML;
function onInput() {
  const text = $('#thought-input').value;
  $('#word-count').innerHTML = `${text.trim() ? text.trim().split(/\s+/).length : 0} words <span>·</span> ${text.length.toLocaleString()} / 5,000`;
  $('#input-error').textContent = '';
  // An edited input invalidates the old analysis rather than leaving stale results visible.
  if (currentResult && text.trim() !== currentResult.text) {
    currentResult = null;
    $('#result-content').innerHTML = initialResultHTML;
  }
}
$('#thought-input').addEventListener('input', onInput);
$('#clear-btn').addEventListener('click', () => {$('#thought-input').value = ''; currentResult = null; $('#result-content').innerHTML = initialResultHTML; onInput(); $('#thought-input').focus();});
$('#thought-input').addEventListener('keydown', e => {if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {e.preventDefault(); runAnalysis();}});
$('#analyze-btn').addEventListener('click', runAnalysis);
function runAnalysis() {
  if (!model) {$('#input-error').textContent = 'The model is not ready. Reload the page to retry.';return;}
  try {
    const start = performance.now();
    currentResult = analyze($('#thought-input').value, model);
    currentResult.processingMs = Math.round((performance.now() - start) * 10) / 10;
    resultTab = 'sentences';
    renderResult();
    $('#input-error').textContent = '';
    if (window.innerWidth < 901) $('#result-panel').scrollIntoView({behavior: 'smooth', block:'start'});
  } catch (error) {$('#input-error').textContent = error.message;}
}

function highlighted(sentence) {
  const selected = [];
  sentence.evidence.forEach(item => {
    if (!selected.some(other => item.start < other.end && item.end > other.start)) selected.push(item);
  });
  selected.sort((a,b) => a.start - b.start);
  let position = 0, output = '';
  selected.forEach(item => {output += escape(sentence.text.slice(position, item.start)) + '<mark>' + escape(sentence.text.slice(item.start, item.end)) + '</mark>'; position = item.end;});
  return output + escape(sentence.text.slice(position));
}
function renderResult() {
  if (!currentResult) return;
  const result = currentResult;
  const count = result.labels.length;
  const uncertainCount = result.sentences.filter(s => s.label === 'uncertain').length;
  const summary = count ? `${count} possible ${count === 1 ? 'pattern' : 'patterns'}` : uncertainCount ? 'More context would help.' : 'No clear pattern found.';
  const sentenceView = result.sentences.map((sentence,i) => `<div class="sentence-result"><blockquote>${highlighted(sentence)}</blockquote><div class="sentence-badges"><span class="badge">${escape(catalog[sentence.label].name)}</span><span class="sentence-score">${sentence.label === 'uncertain' ? 'Model abstained' : percent(sentence.score)+' model score'}</span></div>${sentence.evidence.length ? `<p class="evidence-note">Influential features: ${sentence.evidence.slice(0,3).map(e=>escape(e.term)).join(' · ')}</p>` : `<p class="evidence-note">${escape(catalog.uncertain.description)}</p>`}</div>`).join('');
  const scoresView = result.sentences.map((sentence,i) => `<div><h3 class="scores-heading">Sentence ${i+1}${sentence.label === 'uncertain' ? ' · uncertain' : ''}</h3>${sentence.scores.slice(0,4).map(score => `<div class="score-row"><div class="score-label"><span>${escape(catalog[score.label].short)}</span><span>${percent(score.score)}</span></div><div class="score-track"><div class="score-fill" style="width:${score.score*100}%"></div></div></div>`).join('')}</div>`).join('');
  const promptLabels = count ? result.labels : [uncertainCount ? 'uncertain' : 'no_clear_pattern'];
  $('#result-content').innerHTML = `<div class="result-summary ${count ? '' : 'green'}"><div class="summary-top"><span>YOUR ANALYSIS</span>${icon('spark')}</div><h3>${summary}</h3><p>${result.sentences.length} ${result.sentences.length === 1 ? 'sentence' : 'sentences'} explored${uncertainCount ? ` · ${uncertainCount} uncertain` : ''} · ${result.words} words</p></div><div class="tabs" role="tablist" aria-label="Analysis views"><button class="tab ${resultTab === 'sentences' ? 'active' : ''}" role="tab" aria-selected="${resultTab === 'sentences'}" id="sentences-tab" aria-controls="analysis-view" data-result-tab="sentences">Sentence insights</button><button class="tab ${resultTab === 'scores' ? 'active' : ''}" role="tab" aria-selected="${resultTab === 'scores'}" id="scores-tab" aria-controls="analysis-view" data-result-tab="scores">Model scores</button></div><div id="analysis-view" role="tabpanel" aria-labelledby="${resultTab}-tab">${resultTab === 'sentences' ? sentenceView : scoresView}</div>${promptLabels.map(label=>`<div class="reflection-prompt"><strong>A QUESTION TO EXPLORE${promptLabels.length > 1 ? ' · '+escape(catalog[label].short).toUpperCase() : ''}</strong>${escape(catalog[label].question)}</div>`).join('')}<p class="score-footnote">Scores reflect this model’s preference among labels, not clinical certainty. Highlights show feature contributions, not proof of a distortion.</p><div class="result-actions"><button class="button secondary small" id="save-result">${icon('save')} Save reflection</button><button class="button secondary small" id="export-result">${icon('download')} Export JSON</button></div>`;
  $$('[data-result-tab]').forEach(button => button.addEventListener('click', () => {resultTab = button.dataset.resultTab;renderResult();$(`#${resultTab}-tab`).focus();}));
  $('#save-result').addEventListener('click', saveCurrent);
  $('#export-result').addEventListener('click', () => download(JSON.stringify({...currentResult, note:'Educational prototype. Synthetic training corpus. Scores are uncalibrated; this is not a diagnosis.'}, null, 2), 'cognilens-analysis.json'));
}

function persistHistory(next) {
  try {localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); history = next; updateHistoryCount();return true;}
  catch {toast('Browser storage is unavailable or full. You can still export your analysis.');return false;}
}
function updateHistoryCount() {$('#history-count').textContent = history.length;}
function saveCurrent() {
  if (!currentResult) return;
  if (history.some(item => item.text === currentResult.text)) {toast('This reflection is already saved.');return;}
  if (history.length >= 100) {toast('Your history is full. Delete an older reflection before saving.');return;}
  const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  if (persistHistory([{id, text: currentResult.text, createdAt: currentResult.createdAt}, ...history])) toast('Reflection saved on this device.');
}
function renderHistory() {
  $('#saved-count').textContent = `${history.length} saved ${history.length === 1 ? 'reflection' : 'reflections'}`;
  $('#delete-all').disabled = history.length === 0;
  if (!history.length) {$('#history-list').innerHTML = `<div class="empty-state">${icon('save')}<h2>A place for your reflections.</h2><p>Run an analysis and choose “Save reflection” to keep it here.</p><a class="button secondary" href="#analyzer">Explore a thought ↗</a></div>`;return;}
  $('#history-list').innerHTML = history.map(item => `<article class="history-card"><header><span>${escape(new Date(item.createdAt).toLocaleString(undefined, {dateStyle:'medium',timeStyle:'short'}))}</span><span>Saved on this device</span></header><p>${escape(item.text)}</p><div class="input-actions"><button class="button secondary small" data-reopen="${escape(item.id)}">Open analysis ↗</button><button class="text-button" data-remove="${escape(item.id)}">Delete</button></div></article>`).join('');
}
$('#history-list').addEventListener('click', e => {
  const reopen = e.target.closest('[data-reopen]'), remove = e.target.closest('[data-remove]');
  if (reopen) {const item = history.find(item => item.id === reopen.dataset.reopen); if (!item) return;$('#thought-input').value = item.text;onInput();location.hash='analyzer';runAnalysis();}
  if (remove && persistHistory(history.filter(item => item.id !== remove.dataset.remove))) {renderHistory();toast('Saved reflection deleted.');}
});
$('#delete-all').addEventListener('click', () => $('#confirm-dialog').showModal());
$('#cancel-delete').addEventListener('click', () => $('#confirm-dialog').close());
$('#confirm-delete').addEventListener('click', () => {if(persistHistory([])){renderHistory();toast('All saved reflections deleted.');}$('#confirm-dialog').close();});

const patternEntries = Object.entries(catalog).filter(([key]) => !['uncertain','no_clear_pattern'].includes(key));
$('#preview-cards').innerHTML = ['all_or_nothing','mind_reading','catastrophizing'].map(key => {const c=catalog[key];return `<button class="pattern-preview" data-pattern="${key}"><div class="pattern-top"><span class="pattern-symbol" style="--pattern-color:${c.color}">${c.symbol}</span><span>↗</span></div><h3>${c.name}</h3><p>${{all_or_nothing:'When everything becomes a success or a failure.',mind_reading:'When assumptions stand in for what others think.',catastrophizing:'When the worst case feels like the only outcome.'}[key]}</p></button>`;}).join('');
function renderLibrary() {
  const query = $('#library-search').value.toLowerCase().trim();
  const entries = patternEntries.filter(([key, value]) => `${value.name} ${value.description} ${value.example}`.toLowerCase().includes(query));
  $('#library-count').textContent = `${entries.length} ${entries.length === 1 ? 'pattern' : 'patterns'}`;
  $('#library-grid').innerHTML = entries.length ? entries.map(([key,c]) => `<button class="library-card" data-pattern="${key}"><span class="pattern-symbol" style="--pattern-color:${c.color}">${c.symbol}</span><h2>${c.name}</h2><p>${c.description}</p><blockquote>“${c.example}”</blockquote><span class="text-link">Look a little closer ↗</span></button>`).join('') : '<p class="no-results">No patterns match that search. Try a different word.</p>';
}
$('#library-search').addEventListener('input', renderLibrary);
document.addEventListener('click', e => {
  const button = e.target.closest('[data-pattern]');
  if (!button) return;
  const key = button.dataset.pattern, c = catalog[key];
  $('#dialog-content').innerHTML = `<div class="dialog-body"><div class="dialog-symbol" style="color:${c.color}">${c.symbol}</div><div class="eyebrow">A THINKING PATTERN</div><h2>${c.name}</h2><p>${c.description}</p><blockquote>“${c.example}”</blockquote><div class="reflection-prompt"><strong>A QUESTION TO EXPLORE</strong>${c.question}</div><div class="input-actions"><button class="button primary" id="try-pattern">Try this example ↗</button></div><p class="score-footnote">An example can fit more than one pattern. A label alone cannot capture the context of a real experience.</p></div>`;
  $('#pattern-dialog').showModal();
  $('#try-pattern').addEventListener('click', () => {$('#pattern-dialog').close();$('#thought-input').value = c.example;onInput();location.hash = 'analyzer';runAnalysis();});
});
$('.dialog-close').addEventListener('click', () => $('#pattern-dialog').close());
$$('dialog').forEach(dialog=>dialog.addEventListener('click', e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}}));

function batchLines() {return $('#batch-input').value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);}
function updateBatchCount() {$('#batch-count').textContent = `${batchLines().length} texts`;$('#batch-results').innerHTML = '';batchResults=[];$('#batch-error').textContent='';}
$('#batch-input').addEventListener('input', updateBatchCount);
$('#batch-demo').addEventListener('click', () => {$('#batch-input').value = [...samples.map(s=>s.text),'The parcel arrived at noon.','Blue quantum marmalade zqxv.'].join('\n');updateBatchCount();});
$('.file-label').setAttribute('tabindex', '0');
$('.file-label').setAttribute('role', 'button');
$('.file-label').addEventListener('keydown', event => {if (event.key === 'Enter' || event.key === ' ') {event.preventDefault();$('#batch-file').click();}});
$('#batch-file').addEventListener('change', async event => {
  const file = event.target.files[0];if (!file) return;
  if (file.size > 250000) {$('#batch-error').textContent='Choose a text file smaller than 250 KB.';event.target.value='';return;}
  try {$('#batch-input').value = await file.text();updateBatchCount();}catch {$('#batch-error').textContent = 'The file could not be read. Try a UTF-8 plain text file.';}event.target.value='';
});
$('#batch-analyze').addEventListener('click', () => {
  const lines = batchLines();
  if (!model) {$('#batch-error').textContent='The model is not ready. Reload the page to retry.';return;}
  if (!lines.length || lines.length > 50) {$('#batch-error').textContent = 'Enter between 1 and 50 texts, with one per line.';return;}
  if (lines.some(line => line.length > 5000)) {$('#batch-error').textContent = 'Each line must contain no more than 5,000 characters.';return;}
  batchResults = lines.map(line=>analyze(line,model));$('#batch-error').textContent='';
  $('#batch-results').innerHTML = `<div class="section-title" style="margin-top:28px"><h2>${batchResults.length} texts explored</h2><button class="button secondary" id="batch-export">${icon('download')} Export CSV</button></div><div class="table-container"><table><thead><tr><th>#</th><th>Text</th><th>Possible patterns</th><th>Sentences</th></tr></thead><tbody>${batchResults.map((r,i)=>`<tr><td>${i+1}</td><td class="batch-text">${escape(r.text)}</td><td>${r.labels.length ? r.labels.map(label=>`<span class="badge">${catalog[label].short}</span>`).join(' ') : r.sentences.some(s=>s.label==='uncertain') ? 'Uncertain' : 'No clear pattern'}${r.labels.length && r.sentences.some(s=>s.label==='uncertain') ? '<br><small>Includes uncertain sentences</small>' : ''}</td><td>${r.sentences.length}</td></tr>`).join('')}</tbody></table></div><p class="score-footnote">One label is predicted per sentence; multiple sentences can produce multiple patterns. The collection is not saved automatically.</p>`;
  $('#batch-export').addEventListener('click', () => {
    const csvCell = value => {let s=String(value);if(/^[=+@\-\t\r]/.test(s)) s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
    const rows = [['text','sentence','label','model_score','candidate','coverage'],...batchResults.flatMap(r=>r.sentences.map(s=>[r.text,s.text,catalog[s.label].name,s.score.toFixed(6),catalog[s.candidate].name,s.coverage.toFixed(6)]))];
    download('\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n'), 'cognilens-batch.csv','text/csv;charset=utf-8');
  });
});

function renderModel(metrics) {
  const stats=[['Held-out accuracy',percent(metrics.accuracy),'Forced-choice predictions'],['Macro F1',metrics.macro_f1.toFixed(3),'Equal weight per class'],['Training examples',metrics.train_examples,'Synthetic teaching data'],['Held-out examples',metrics.test_examples,'Disjoint template families']];
  $('#model-content').innerHTML = `<div class="model-stats">${stats.map(([label,value,note])=>`<div class="stat-card"><span>${label}</span><strong>${value}</strong><p>${note}</p></div>`).join('')}</div><div class="model-notice"><strong>A teaching baseline, with honest limits.</strong><br>${escape(metrics.limitations)} No personal data was used to construct this dataset. It is authored for this project and has not been annotated by clinicians.</div><div class="model-grid"><section class="panel model-block"><h2>From words to a possible pattern</h2>${[['Read & segment','Split English text into sentences using punctuation and line breaks. Each sentence is classified independently.'],['Represent the language','Lowercase words; keep unigrams and bigrams. Apply sublinear term frequency, inverse document frequency, and L2 normalization.'],['Score the patterns','A multinomial logistic regression model scores ten patterns plus a neutral class. Its weights were learned from the training split.'],['Explain & abstain','Show positive feature contributions relative to the runner-up. Abstain below score, margin, or vocabulary-coverage thresholds.']].map(([title,body],i)=>`<div class="pipeline-step"><span class="section-number">0${i+1}</span><div><strong>${title}</strong><p>${body}</p></div></div>`).join('')}<p>Paragraphs may receive multiple labels because their sentences differ. The model is single-label per sentence; it does not solve full multilabel classification.</p></section><section class="panel model-block"><h2>What the evaluation shows</h2><div class="metric-row"><span>Logistic regression accuracy</span><strong>${percent(metrics.accuracy)}</strong></div><div class="metric-row"><span>Majority-class baseline accuracy</span><strong>${percent(metrics.baseline_accuracy)}</strong></div><div class="metric-row"><span>Accepted predictions / all test inputs</span><strong>${percent(metrics.selective_coverage)}</strong></div><div class="metric-row"><span>Accuracy on accepted predictions only</span><strong>${percent(metrics.selective_accuracy)}</strong></div><div class="metric-row"><span>Vocabulary size (words + word pairs)</span><strong>${metrics.vocabulary_size.toLocaleString()}</strong></div><div class="metric-row"><span>Template families · train / test</span><strong>${metrics.train_template_groups} / ${metrics.test_template_groups}</strong></div><h3>How to interpret the numbers</h3><p>The headline score includes every held-out example before abstention. Accepted-only accuracy excludes uncertain predictions and must be read alongside coverage. Neither is a clinical reliability estimate.</p><h3>Fixed acceptance thresholds</h3><p>Top score ≥ 0.34; top-two score margin ≥ 0.08; known-token coverage ≥ 40%; at least 3 known tokens. These heuristics are not calibrated probabilities.</p></section></div><section class="panel model-block" style="margin-top:20px"><h2>Performance by class</h2><p class="metrics-caption">Precision, recall, and F1 on the held-out synthetic split. F1 balances precision and recall.</p><div class="table-container"><table class="evaluation-table"><thead><tr><th>Pattern</th><th>Precision</th><th>Recall</th><th>F1</th><th>Examples</th></tr></thead><tbody>${metrics.classes.map(label=>{const c=metrics.per_class[label];return `<tr><td>${catalog[label].name}</td><td>${c.precision.toFixed(3)}</td><td>${c.recall.toFixed(3)}</td><td>${c['f1-score'].toFixed(3)}</td><td>${c.support}</td></tr>`;}).join('')}</tbody></table></div><p class="confusion-caption">Confusion matrix · rows = actual labels; columns = predicted labels. Class numbers follow the table above.</p><div class="table-container"><table class="confusion-table"><thead><tr><th>Actual ↓ / Predicted →</th>${metrics.classes.map((label,i)=>`<th title="${catalog[label].name}">${i+1}</th>`).join('')}</tr></thead><tbody>${metrics.confusion_matrix.map((row,i)=>`<tr><th>${i+1}. ${catalog[metrics.classes[i]].short}</th>${row.map((value,j)=>`<td style="background:rgba(124,149,94,${Math.min(.75,value/20)})" title="Actual ${catalog[metrics.classes[i]].name}; predicted ${catalog[metrics.classes[j]].name}: ${value}">${value}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section><div class="model-grid" style="margin-top:20px"><section class="panel model-block"><h2>Where it can go wrong</h2><p>Negation, sarcasm, quotations, slang, mixed languages, unfamiliar vocabulary, multiple patterns in one sentence, and missing context can confuse this model. A low score does not prove that a thought is balanced, and a high score does not prove a distortion.</p><h3>Data and privacy</h3><p>The demo performs inference in your browser. Your text is not sent to a prediction service. Saved reflections use this browser’s local storage only after you click Save. Anyone with access to this browser profile may read them. External font requests do not contain your text.</p></section><section class="panel model-block"><h2>Reproduce and explore</h2><p>The project includes the full synthetic corpus, training script, Flask API, portable model, and tests. The vectorizer is fit on training data only; template groups and example text are disjoint across splits.</p><div class="model-links"><a class="button secondary small" href="metrics.json" download>Evaluation JSON ↗</a><a class="button secondary small" href="corpus.csv" download>Dataset CSV ↗</a></div><h3>Further reading</h3><p><a class="source-link" href="https://aclanthology.org/2025.findings-emnlp.804/" target="_blank" rel="noopener">Sage et al. (2025): cognitive distortion detection survey</a><br><a class="source-link" href="https://scikit-learn.org/stable/modules/feature_extraction.html" target="_blank" rel="noopener">scikit-learn: text feature extraction</a></p></section></div>`;
}

async function initialize() {
  updateHistoryCount();renderLibrary();route();
  const results = await Promise.allSettled([fetch('model.json').then(r=>{if(!r.ok)throw new Error('Model download failed');return r.json();}),fetch('metrics.json').then(r=>{if(!r.ok)throw new Error('Metrics download failed');return r.json();})]);
  if (results[0].status === 'fulfilled') {model=results[0].value;$('#analyze-btn').disabled=false;$('#analyze-label').textContent='Analyze thought';}
  else {$('#analyze-label').textContent='Model unavailable';$('#input-error').textContent='Could not load the model. Start the local server or reload this page to retry.';}
  if(results[1].status === 'fulfilled') renderModel(results[1].value);
  else $('#model-content').innerHTML='<p class="error">Evaluation could not be loaded. Reload the page to retry.</p>';
}
initialize();
