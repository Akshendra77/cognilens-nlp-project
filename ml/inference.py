"""Dependency-free inference using the same JSON artifact as the browser."""
import json
import math
import re
from pathlib import Path
from collections import Counter
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
MODEL = json.loads((ROOT / 'dist/model.json').read_text(encoding='utf-8'))

def classify(text, model=MODEL):
    matches = list(re.finditer(r'\b[a-zA-Z][a-zA-Z]+\b', text.lower(), flags=re.ASCII))
    tokens = [m.group() for m in matches]
    terms = tokens + [a + ' ' + b for a, b in zip(tokens, tokens[1:])]
    vocab = model['vocabulary']
    values = {vocab[term]: (1 + math.log(count)) * model['idf'][vocab[term]] for term, count in Counter(terms).items() if term in vocab}
    norm = math.sqrt(sum(v*v for v in values.values())) or 1
    values = {i: v/norm for i, v in values.items()}
    logits = [bias + sum(weights[i]*v for i,v in values.items()) for bias, weights in zip(model['intercept'], model['weights'])]
    exps = [math.exp(logit - max(logits)) for logit in logits]
    total = sum(exps)
    scores = sorted([{'label': label, 'score': value/total} for label,value in zip(model['classes'], exps)], key=lambda x: -x['score'])
    known = sum(token in vocab for token in tokens)
    coverage = known / max(1, len(tokens))
    limits = model['thresholds']
    accepted = scores[0]['score'] >= limits['score'] and scores[0]['score']-scores[1]['score'] >= limits['margin'] and known >= limits['min_known_tokens'] and coverage >= limits['coverage']
    winner, runner = [model['classes'].index(s['label']) for s in scores[:2]]
    positions = {}
    for n, match in enumerate(matches):
        options = [(tokens[n], match.start(), match.end())]
        if n + 1 < len(tokens):
            options.append((tokens[n] + ' ' + tokens[n+1], match.start(), matches[n+1].end()))
        for term, start, end in options:
            if term in vocab and vocab[term] not in positions:
                positions[vocab[term]] = {'term': term, 'start': start, 'end': end}
    evidence = sorted([{**positions[i], 'contribution': v*(model['weights'][winner][i]-model['weights'][runner][i])} for i,v in values.items() if v*(model['weights'][winner][i]-model['weights'][runner][i]) > 0], key=lambda x: -x['contribution'])[:5]
    return {'text': text, 'label': scores[0]['label'] if accepted else 'uncertain', 'candidate': scores[0]['label'], 'score': scores[0]['score'], 'margin': scores[0]['score']-scores[1]['score'], 'coverage': coverage, 'scores': scores, 'evidence': evidence if accepted else [], 'tokenCount': len(tokens)}

def analyze(text):
    if not isinstance(text, str) or not text.strip():
        raise ValueError('Write a thought before running the analysis.')
    if len(text) > 5000:
        raise ValueError('Please keep each analysis under 5,000 characters.')
    chunks = re.findall(r'[^.!?\n]+(?:[.!?]+|(?=\n)|$)', text) or [text]
    sentences = [classify(chunk.strip()) for chunk in chunks if chunk.strip()]
    labels = list(dict.fromkeys(s['label'] for s in sentences if s['label'] not in ('uncertain', 'no_clear_pattern')))
    return {'text': text.strip(), 'sentences': sentences, 'labels': labels, 'words': len(text.split()), 'modelVersion': MODEL['version'], 'createdAt': datetime.now(timezone.utc).isoformat()}
