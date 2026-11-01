# Viva preparation and demo script

## A five-minute demonstration

1. Open Thought analyzer. Explain that this is an educational English text classifier.
2. Choose Academic pressure and analyze. Explain sentence labels, feature highlights, and model scores.
3. Compare A balanced thought. Type unfamiliar text to demonstrate abstention. Explain that the model is not always correct.
4. Save a reflection; open Saved reflections; reopen it. Explain localStorage and privacy.
5. Search the Pattern library for mind reading and open its example.
6. Open Batch explorer, load examples, analyze, and export CSV.
7. Open Model & methodology. Explain the 528/176 split, 70.45% accuracy, 0.697 macro F1, and 9.09% baseline.
8. Show the Python training script and Flask API. Point out that no secret key or paid prediction API is involved.

## Questions and answers

**What is the problem statement?** Build a reproducible NLP application that identifies possible cognitive-distortion language in English sentences, explains the classifier's decision, and presents results through an accessible interface.

**Why is this NLP rather than a keyword search?** A supervised classifier learns coefficients from labeled examples. TF-IDF represents both individual words and adjacent word pairs; all learned feature weights contribute to a score. Explanations show the weighted contribution of observed features. It is still a shallow lexical model, so it cannot understand context as a person would.

**What is TF-IDF?** A feature value combines how often a term appears in the input with how rare it is across training documents. Here, TF is 1 + log(count), IDF is log((1 + N)/(1 + document frequency)) + 1, followed by L2 normalization.

**Why use bigrams?** Word pairs preserve some local context, such as “must always” or “just luck.” They do not solve long-range negation or reasoning.

**Why logistic regression?** It is inexpensive, understandable, reproducible, and easy to export to the browser. Its coefficients support direct feature-contribution explanations. It is an appropriate baseline for a small dataset.

**What are the model classes?** All-or-nothing thinking, overgeneralization, mental filtering, discounting positives, mind reading, catastrophizing, emotional reasoning, should statements, labeling, personalization, and no clear pattern.

**Is this a multilabel model?** No. It predicts one class per sentence. The UI aggregates accepted labels across sentences, so a paragraph may display several patterns. Full multilabel prediction within one sentence is future work.

**What data is used?** A transparent, assistant-authored synthetic corpus with 704 examples from 176 template families. It is a teaching dataset, not clinical data or independent expert annotation. This limits all performance claims.

**How do you avoid leakage?** All variants of one template belong to one split; test contexts also differ. Text and group disjointness are checked automatically. The vectorizer is fitted only on training text. Shared style and vocabulary can still inflate performance; external evaluation is needed.

**Why report macro F1?** Accuracy measures overall correctness. Macro F1 averages the harmonic mean of precision and recall equally across classes, exposing weak performance on individual categories. The corpus is balanced, but macro F1 is still informative.

**What is the baseline?** A classifier that always predicts the most frequent training class. Since classes are balanced, it gets 1/11, or 9.09%, accuracy on the test set.

**Is model score the chance that a person has a distortion?** No. It is an uncalibrated softmax preference among model labels, based on the training corpus. It is not a clinical probability or a measurement of a person.

**Why abstain?** Weak or unfamiliar input should not always be assigned a confident-sounding label. Fixed thresholds check top score, margin, known words, and vocabulary coverage. Coverage and accepted-only accuracy must both be reported.

**How do the explanations work?** For each observed feature, multiply its TF-IDF value by the difference between the winning class coefficient and runner-up coefficient. Rank positive contributions and show the highest contributing spans.

**How is privacy handled?** The default UI computes in the browser. Text is saved only when the user selects Save reflection, in that browser's localStorage. The local API receives text only when called directly and does not persist it. Saved data can be deleted or exported.

**Why no database or login?** They are unnecessary for this local, single-user student demonstration. LocalStorage covers saved reflections. Adding a server database would require deliberate identity, access, retention, and security design.

**What tests are included?** Python API validation and route tests; train/test group checks; representative classifications; unknown-text and length checks; newline segmentation; and JavaScript/Python probability comparisons to scikit-learn reference outputs.

**What is the biggest limitation?** The model is trained and evaluated on a small synthetic corpus. It cannot establish the truth of a statement or understand the full circumstances of a person's experience. Real-world reliability is unmeasured.

**What would you improve?** Use an appropriately licensed, expert-annotated dataset; add author-separated splits and a validation set; compare transformers with classical baselines; support multilabel sentences; calibrate uncertainty; and run external error and subgroup analyses.

## Useful failure examples to discuss

- “I am not a failure.” Negation can be overwhelmed by the word “failure.”
- “The character in the book says everyone hates him.” Quotation and perspective are difficult.
- “You should turn left at the next street.” An ordinary instruction is not necessarily a rigid expectation.
- “Everyone in the room signed the form.” Universal words can be factually justified.

Do not hide incorrect predictions during the viva. Explain why they occur and how you would evaluate improvements on new held-out data.
