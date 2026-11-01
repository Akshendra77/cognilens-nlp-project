// Portable inference for the exported scikit-learn TF-IDF / linear model.
// Scores are uncalibrated softmax outputs, not probabilities of a diagnosis.
export function tokenize(text) {
  return Array.from(text.toLowerCase().matchAll(/\b[a-zA-Z][a-zA-Z]+\b/g), m => ({text: m[0], start: m.index, end: m.index + m[0].length}));
}

export function vectorize(text, model) {
  const tokens = tokenize(text);
  const counts = new Map();
  const positions = new Map();
  function add(term, start, end) {
    if (!Object.hasOwn(model.vocabulary, term)) return;
    const index = model.vocabulary[term];
    counts.set(index, (counts.get(index) || 0) + 1);
    if (!positions.has(index)) positions.set(index, {term, start, end});
  }
  tokens.forEach((token, i) => {
    add(token.text, token.start, token.end);
    if (i + 1 < tokens.length) add(token.text + ' ' + tokens[i+1].text, token.start, tokens[i+1].end);
  });
  const features = [...counts].map(([i, count]) => [i, (1 + Math.log(count)) * model.idf[i]]);
  const norm = Math.sqrt(features.reduce((sum, [, value]) => sum + value * value, 0)) || 1;
  const known = tokens.filter(t => Object.hasOwn(model.vocabulary, t.text)).length;
  return {features: features.map(([i, value]) => [i, value / norm]), positions, known, coverage: known / Math.max(1, tokens.length), tokenCount: tokens.length};
}

export function classify(text, model) {
  const vector = vectorize(text, model);
  const logits = model.weights.map((weights, c) => model.intercept[c] + vector.features.reduce((sum, [i, value]) => sum + weights[i] * value, 0));
  const max = Math.max(...logits);
  const exp = logits.map(value => Math.exp(value - max));
  const denominator = exp.reduce((sum, value) => sum + value, 0);
  const scores = exp.map((value, i) => ({label: model.classes[i], score: value / denominator})).sort((a,b) => b.score - a.score);
  const thresholds = model.thresholds;
  const accepted = scores[0].score >= thresholds.score && scores[0].score - scores[1].score >= thresholds.margin && vector.known >= thresholds.min_known_tokens && vector.coverage >= thresholds.coverage;
  const winner = model.classes.indexOf(scores[0].label);
  const runner = model.classes.indexOf(scores[1].label);
  const evidence = vector.features.map(([i, value]) => ({...vector.positions.get(i), contribution: value * (model.weights[winner][i] - model.weights[runner][i])})).filter(e => e.contribution > 0).sort((a,b) => b.contribution - a.contribution).slice(0, 5);
  return {text, label: accepted ? scores[0].label : 'uncertain', candidate: scores[0].label, score: scores[0].score, margin: scores[0].score - scores[1].score, coverage: vector.coverage, scores, evidence: accepted ? evidence : [], tokenCount: vector.tokenCount};
}

export function analyze(text, model) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('Write a thought before running the analysis.');
  if (text.length > 5000) throw new Error('Please keep each analysis under 5,000 characters.');
  // Simple punctuation segmentation; abbreviations and mixed clauses are limitations.
  const chunks = text.match(/[^.!?\n]+(?:[.!?]+|(?=\n)|$)/g) || [text];
  const sentences = chunks.map(s => s.trim()).filter(Boolean).map(sentence => classify(sentence, model));
  const labels = [...new Set(sentences.filter(s => !['uncertain', 'no_clear_pattern'].includes(s.label)).map(s => s.label))];
  return {text: text.trim(), sentences, labels, words: text.trim().split(/\s+/).length, modelVersion: model.version, createdAt: new Date().toISOString()};
}
