import csv
import json
import unittest
from pathlib import Path
from app import app
from ml.inference import classify, analyze, MODEL

ROOT = Path(__file__).resolve().parents[1]

class InferenceTests(unittest.TestCase):
    def test_export_matches_sklearn_reference(self):
        fixtures = json.loads((ROOT / 'tests/sklearn_fixtures.json').read_text(encoding='utf-8'))
        for fixture in fixtures:
            with self.subTest(text=fixture['text']):
                scores = {item['label']: item['score'] for item in classify(fixture['text'])['scores']}
                for label, expected in fixture['scores'].items():
                    self.assertAlmostEqual(expected, scores[label], places=12)

    def test_empty_and_long_input(self):
        for text in ['', '  ', None, 42, 'a'*5001]:
            with self.assertRaises(ValueError):
                analyze(text)

    def test_unknown_and_short_input_abstains(self):
        for text in ['zqxv plmokn', 'constructor prototype', '你好世界', '...', 'failure']:
            self.assertEqual(classify(text)['label'], 'uncertain')

    def test_expected_canonical_patterns(self):
        cases = {
            'I made a mistake in my presentation; I am a loser.': 'labeling',
            'I should never make any mistakes.': 'should_statements',
            'I did well, but it does not count because it was just luck.': 'discounting_positive',
            'If the interview goes wrong, my entire future will be ruined.': 'catastrophizing',
            'I made a mistake, and I can learn from it.': 'no_clear_pattern'
        }
        for text, label in cases.items():
            self.assertEqual(classify(text)['label'], label, text)

    def test_segmentation_preserves_lines_and_punctuation(self):
        result = analyze('I made a mistake\nI can learn from it. Is that true? Yes!')
        self.assertEqual(len(result['sentences']), 4)
        self.assertEqual(result['sentences'][0]['text'], 'I made a mistake')

    def test_evidence_and_probabilities(self):
        text = 'If the interview goes wrong, my entire future will be ruined.'
        result = classify(text)
        self.assertAlmostEqual(sum(s['score'] for s in result['scores']), 1)
        self.assertGreater(len(result['evidence']), 0)
        for evidence in result['evidence']:
            self.assertGreater(evidence['contribution'], 0)
            self.assertTrue(text[evidence['start']:evidence['end']])

    def test_dataset_has_no_group_or_text_leakage(self):
        with (ROOT / 'data/corpus.csv').open(encoding='utf-8') as stream:
            rows = list(csv.DictReader(stream))
        train = [r for r in rows if r['split'] == 'train']
        test = [r for r in rows if r['split'] == 'test']
        self.assertFalse(set(r['group'] for r in train) & set(r['group'] for r in test))
        self.assertFalse(set(r['text'] for r in train) & set(r['text'] for r in test))
        self.assertEqual(set(r['label'] for r in train), set(MODEL['classes']))

class APITests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_health_and_static_app(self):
        self.assertEqual(self.client.get('/api/health').json['classes'], 11)
        for path in ['/', '/model.json', '/metrics.json', '/corpus.csv', '/styles.css', '/app.js']:
            response = self.client.get(path)
            self.assertEqual(response.status_code, 200, path)
            response.close()

    def test_analysis_response(self):
        response = self.client.post('/api/analyze', json={'text': 'I should never make any mistakes.'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['sentences'][0]['label'], 'should_statements')
        self.assertEqual(response.headers['Cache-Control'], 'no-store')

    def test_bad_input_returns_400(self):
        for body in [None, [], {}, {'text': 5}, {'text': ''}, {'text': 'a'*5001}]:
            response = self.client.post('/api/analyze', json=body)
            self.assertEqual(response.status_code, 400)

    def test_batch_and_limits(self):
        valid = self.client.post('/api/batch', json={'texts': ['I made a mistake and can learn.', 'I am a loser.']})
        self.assertEqual(valid.status_code, 200)
        self.assertEqual(len(valid.json['results']), 2)
        for texts in [[], ['text']*51, 'not an array', [42]]:
            self.assertEqual(self.client.post('/api/batch', json={'texts':texts}).status_code, 400)

    def test_source_and_directory_traversal_are_not_served(self):
        for path in ['/app.py', '/ml/train.py', '/../app.py', '/.openai/hosting.json', '/project-report.html']:
            self.assertEqual(self.client.get(path).status_code, 404)

if __name__ == '__main__':
    unittest.main()
