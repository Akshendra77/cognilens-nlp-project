"""Train and export TF-IDF + logistic regression; test is never used for fitting."""
import csv
import hashlib
import json
from pathlib import Path
import numpy as np
import sklearn
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.dummy import DummyClassifier
from sklearn.metrics import accuracy_score, f1_score, classification_report, confusion_matrix

ROOT = Path(__file__).resolve().parents[1]

def main():
    path = ROOT / 'data/corpus.csv'
    rows = list(csv.DictReader(path.open(encoding='utf-8')))
    train = [r for r in rows if r['split'] == 'train']
    test = [r for r in rows if r['split'] == 'test']
    assert set(r['group'] for r in train).isdisjoint(r['group'] for r in test)
    assert set(r['text'].lower() for r in train).isdisjoint(r['text'].lower() for r in test)
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), token_pattern=r'(?a)\b[a-zA-Z][a-zA-Z]+\b', sublinear_tf=True, lowercase=True)
    x_train = vectorizer.fit_transform([r['text'] for r in train])
    x_test = vectorizer.transform([r['text'] for r in test])
    y_train, y_test = [r['label'] for r in train], [r['label'] for r in test]
    clf = LogisticRegression(C=6.0, max_iter=2000, random_state=42)
    clf.fit(x_train, y_train)
    predictions = clf.predict(x_test)
    dummy = DummyClassifier(strategy='most_frequent').fit(x_train, y_train)
    thresholds = {'score': 0.34, 'margin': 0.08, 'coverage': 0.40, 'min_known_tokens': 3}
    model = {
        'version': '1.0.0', 'algorithm': 'TF-IDF + multinomial logistic regression',
        'classes': clf.classes_.tolist(),
        'vocabulary': {k: int(v) for k, v in vectorizer.vocabulary_.items()},
        'idf': vectorizer.idf_.tolist(), 'weights': clf.coef_.tolist(),
        'intercept': clf.intercept_.tolist(), 'thresholds': thresholds,
        'sublinear_tf': True, 'ngram_range': [1, 2],
        'corpus_sha256': hashlib.sha256(path.read_bytes()).hexdigest()
    }
    probabilities = clf.predict_proba(x_test)
    sorted_scores = np.sort(probabilities, axis=1)
    # Application acceptance also uses token coverage. Compute it identically.
    import re
    coverage = []
    for row in test:
        tokens = vectorizer.build_tokenizer()(row['text'].lower())
        known = sum(t in model['vocabulary'] for t in tokens)
        coverage.append(known >= thresholds['min_known_tokens'] and known / max(1, len(tokens)) >= thresholds['coverage'])
    accepted = (sorted_scores[:, -1] >= thresholds['score']) & (sorted_scores[:, -1] - sorted_scores[:, -2] >= thresholds['margin']) & np.array(coverage)
    report = {
        'dataset': 'Synthetic instructional corpus (not clinical data)',
        'train_examples': len(train), 'test_examples': len(test),
        'train_template_groups': len(set(r['group'] for r in train)),
        'test_template_groups': len(set(r['group'] for r in test)),
        'vocabulary_size': len(model['vocabulary']), 'seed': 42,
        'accuracy': accuracy_score(y_test, predictions),
        'macro_f1': f1_score(y_test, predictions, average='macro'),
        'baseline_accuracy': accuracy_score(y_test, dummy.predict(x_test)),
        'baseline_macro_f1': f1_score(y_test, dummy.predict(x_test), average='macro'),
        'selective_coverage': float(accepted.mean()),
        'selective_accuracy': float(accuracy_score(np.array(y_test)[accepted], predictions[accepted])) if accepted.any() else None,
        'per_class': classification_report(y_test, predictions, output_dict=True, zero_division=0),
        'confusion_matrix': confusion_matrix(y_test, predictions, labels=clf.classes_).tolist(),
        'classes': clf.classes_.tolist(), 'sklearn_version': sklearn.__version__,
        'corpus_sha256': model['corpus_sha256'],
        'limitations': 'Same-author synthetic template families; related vocabulary remains across splits. Scores do not estimate real-world or clinical performance. Thresholds are fixed heuristics, not calibrated on a validation set.'
    }
    (ROOT / 'dist/model.json').write_text(json.dumps(model, separators=(',', ':')), encoding='utf-8')
    (ROOT / 'dist/metrics.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    (ROOT / 'dist/corpus.csv').write_bytes(path.read_bytes())
    fixture_texts = [r['text'] for r in test[::4]] + ['constructor prototype', 'hello hello hello', 'I am NOT a failure.', 'I feel anxious but feelings are not facts.', 'café déjà vu', '😊 I made a mistake and I can learn from it.', '']
    fixture_probs = clf.predict_proba(vectorizer.transform(fixture_texts))
    fixtures = [{'text': text, 'scores': dict(zip(clf.classes_, probabilities.tolist()))} for text, probabilities in zip(fixture_texts, fixture_probs)]
    (ROOT / 'tests/sklearn_fixtures.json').write_text(json.dumps(fixtures, indent=2), encoding='utf-8')
    with (ROOT / 'data/test_predictions.csv').open('w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['text', 'expected', 'predicted', 'score', 'accepted'])
        for row, predicted, probability, ok in zip(test, predictions, probabilities, accepted):
            writer.writerow([row['text'], row['label'], predicted, float(max(probability)), bool(ok)])
    print(json.dumps({k: report[k] for k in ['train_examples', 'test_examples', 'vocabulary_size', 'accuracy', 'macro_f1', 'baseline_accuracy', 'selective_coverage']}, indent=2))

if __name__ == '__main__':
    main()
