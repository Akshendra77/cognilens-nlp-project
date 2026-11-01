# CogniLens — Cognitive Distortion Detection using NLP

A complete BTech-level project: a responsive frontend, trained text classifier, Python Flask API, reproducible dataset and evaluation, batch exploration, local saved history, and a separate IEEE-style PDF report.

## Run the project

Requires Python 3.11 or later. No API key or paid service is required. The trained model is included.

From this project folder:

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python app.py
```

Open **http://127.0.0.1:5000**. Stop with Ctrl+C. If that port is busy, run `python app.py --port 5055` using your virtual environment's Python.

On macOS/Linux, replace `.venv\Scripts\python` with `.venv/bin/python`.

For just the frontend, with no dependency installation:

```powershell
python -m http.server 5000 --bind 127.0.0.1 --directory dist
```

The browser runs the included model locally. The static mode has no Flask API. Opening `index.html` directly as a file will not work because model loading requires HTTP.

## Features

- Ten cognitive distortion categories and a neutral class.
- Sentence segmentation, trained TF-IDF features, and multinomial logistic regression.
- Model scores, highlighted influential words, and per-pattern reflection questions.
- An explicit uncertain result for weak, ambiguous, or unfamiliar input.
- Searchable pattern library with examples.
- Save, reopen, delete, and clear local reflections; export analysis JSON.
- Batch analysis for up to 50 texts, plain-text import, and CSV export.
- Model dashboard with measured metrics, baseline comparison, per-class results, and confusion matrix.
- Responsive layout, keyboard access, reduced-motion support, and accessible form labels.
- A local Flask API for integration or university demonstration.

## Architecture

```text
data/corpus.csv ──> ml/train.py (scikit-learn)
                       │
                       ├──> dist/model.json ──> dist/nlp.js ──> browser UI
                       │                  └──> ml/inference.py ──> Flask API
                       ├──> dist/metrics.json ──> model dashboard
                       └──> tests/sklearn_fixtures.json ──> parity tests

Browser Save button ──> localStorage (explicitly saved text only)
```

The frontend uses browser inference, even when served by Flask. The Flask endpoints are an additional integration interface. Both implementations use the same model artifact and are tested against scikit-learn outputs. No account, database, or external prediction service is needed.

## Reproduce the model

```powershell
.venv\Scripts\python ml/build_dataset.py
.venv\Scripts\python ml/train.py
.venv\Scripts\python -m unittest discover -s tests -v
node tests/inference.test.mjs
```

Node.js 20+ is needed only for the JavaScript tests; it is not needed to run the app. Training copies the CSV into `dist/` and refreshes all model metrics and score fixtures. Restart Flask after retraining and reload the browser.

The dataset has **704 synthetic examples** across 11 balanced classes: **528 training / 176 test**. It uses 176 authored template families with four context variants per family. Entire families and contexts are held out; the vectorizer sees training data only. Test labels are used only for evaluation. Shared authorship, vocabulary, and template style still make this a narrow teaching evaluation.

| Metric | Measured result |
|---|---:|
| Forced-choice test accuracy | 70.45% |
| Macro F1 | 0.6966 |
| Majority-class baseline accuracy | 9.09% |
| Coverage after abstention | 63.64% |

For the full results, see `dist/metrics.json` and `data/test_predictions.csv`. The main evaluation scores every test example before abstention. Accepted-only accuracy excludes abstentions and must be interpreted together with coverage. Thresholds are fixed heuristics, not calibrated probabilities.

## API

### `GET /api/health`

Returns status, model version, and class count.

### `POST /api/analyze`

```json
{"text": "I should never make any mistakes."}
```

Returns the input, sentence-level labels, scores for all classes, influential features, detected pattern list, and model version. A text must be nonempty and at most 5,000 characters. Invalid input returns HTTP 400.

### `POST /api/batch`

```json
{"texts": ["I am a loser.", "I made a mistake, and I can learn from it."]}
```

Accepts 1–50 strings, each up to 5,000 characters. Returns `{"results": [...]}`. The request body limit is 300 KB.

PowerShell example:

```powershell
$body = @{ text = 'I should never make any mistakes.' } | ConvertTo-Json
Invoke-RestMethod -Uri http://127.0.0.1:5000/api/analyze -Method Post -ContentType 'application/json' -Body $body
```

## Project structure

```text
app.py                        Local server and API validation
requirements.txt              Python dependencies
start.bat / start.sh           Start an already installed project
dist/index.html               App shell and page structure
dist/styles.css               Responsive design system
dist/app.js                   Routing, forms, history, library, batch, metrics
dist/nlp.js                   Browser model inference
dist/catalog.js               Category definitions and examples
dist/model.json               Learned model and vocabulary
dist/metrics.json             Reproducible evaluation results
data/corpus.csv               Complete labeled synthetic corpus
data/test_predictions.csv     Held-out predictions for error analysis
ml/build_dataset.py           Corpus construction and split provenance
ml/train.py                   Training, evaluation, and portable export
ml/inference.py               Python implementation of exported model
tests/                        API, model, split, and parity tests
docs/VIVA.md                  Viva questions and demo walkthrough
docs/MODEL_CARD.md            Intended use, dataset, and limitations
```

## Submission and demo

The academic report is provided separately as `CogniLens-IEEE-Report.pdf`, alongside the project ZIP. It uses a two-column IEEE-style layout with numbered references, methodology, measured results, tables, and diagrams. The report is not hosted on the website. The completed PDF includes both students' names and registration numbers and is delivered separately.

Suggested demo: analyze an academic-pressure example; compare a balanced thought; open the model-score tab; save and reopen a reflection; search the library; run a batch; explain the confusion matrix and limitations. Read `docs/VIVA.md` before presenting.

## Limitations and privacy

This is an educational NLP prototype, **not a clinically validated screening or diagnosis system**. Its small synthetic corpus is not expert annotated and does not establish real-world performance. It can misread negation, sarcasm, ordinary instructions, quotations, and contextual or multilingual language. It predicts one class per sentence, although actual language can contain overlapping patterns. It provides static reflection questions, not generated counseling or personalized treatment.

Text entered in the frontend stays in browser memory unless explicitly saved or downloaded. Saved text is readable by anyone with access to that browser profile and is limited to 100 entries. No analytics or tracking code is included. Google Fonts is optional; system-font fallbacks work without internet. If you call the API directly, the local Flask process receives your text but does not persist it. Flask is bound to loopback with debug disabled and is intended for a local demonstration; production hosting of the Python API requires a proper WSGI server and appropriate operational controls.

## References

- Sage, Keppens, and Yannakoudakis (2025). [A Survey of Cognitive Distortion Detection and Classification in NLP](https://aclanthology.org/2025.findings-emnlp.804/).
- Lin et al. (2024). [Detection and Positive Reconstruction of Cognitive Distortion Sentences](https://aclanthology.org/2024.findings-acl.399/). Background reading; this project does not use its Mandarin dataset or claim its results.
- scikit-learn. [Text feature extraction](https://scikit-learn.org/stable/modules/feature_extraction.html).

## License

Code and the synthetic instructional corpus in this project are provided under the included MIT license. Referenced publications retain their own licenses. External fonts retain their respective licenses.
