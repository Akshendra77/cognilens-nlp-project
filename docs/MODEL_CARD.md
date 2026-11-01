# Model card: CogniLens 1.0

**Task:** English sentence classification into ten cognitive-distortion categories plus a neutral class. The application may abstain. One label is assigned per sentence; paragraph labels are the union of accepted nonneutral sentence labels.

**Intended use:** undergraduate NLP teaching, reproducible ML demonstrations, interface exploration, and error analysis. Not intended for clinical decisions, screening, diagnosis, crisis response, or evaluating other people.

**Training data:** 704 assistant-authored synthetic teaching examples. No scraped diaries, patient data, or actual user reflections. The data generator explicitly records labels, family IDs, and fixed train/test splits. 528 examples in 132 training groups; 176 examples in 44 test groups. Four context variants per family. Training and test contexts differ. Examples are not independently or clinically annotated. Some labels are ambiguous or overlap by design of the underlying concepts.

**Architecture:** ASCII English word tokenization; lowercase; words of at least two letters; unigram/bigram TF-IDF; sublinear TF; smoothed IDF; L2 normalization; multinomial logistic regression, C=6.0, max_iter=2000, random seed 42. 1,528 features. Stopwords and negation are preserved. No stemming is used. scikit-learn 1.7.2 trains the model. Inference is exported to JSON and reproduced in JavaScript and Python.

**Evaluation:** forced-choice accuracy 0.7045; macro F1 0.6966; majority-class accuracy 0.0909. Full per-class metrics and confusion matrix are in `dist/metrics.json`. The test is separated by template family, not a random sentence split. Shared authorship and lexical patterns mean it is still not an independent real-world benchmark. All hyperparameters and acceptance thresholds are fixed teaching choices. No validation split, threshold optimization, probability calibration, external evaluation, or demographic subgroup evaluation has been performed.

**Abstention:** require score ≥ 0.34; margin over runner-up ≥ 0.08; at least 3 known word tokens; known-token fraction ≥ 0.40. Coverage is 0.6364 on the test set. The accepted-only accuracy is reported separately from all-example accuracy. Neutral results also must meet the threshold. An uncertain or neutral result does not demonstrate absence of a distortion.

**Explanation:** positive TF-IDF-weighted coefficient differences between the winning and runner-up classes. This explains the linear classifier's decision relative to its nearest competitor; it is not an explanation of a person's reasoning. Repeated features are represented by their first occurrence in highlights. Correlated words can be misleading. Static category-specific questions are not automatically generated reframes.

**Known failure modes:** short inputs, negated labels, quoted speech, figurative language, overlapping classes, segmentation around abbreviations, mixed clauses, context beyond a sentence, domain shift, and unsupported languages. The lexical model cannot establish whether a belief is factually justified. Unknown input may still receive a high score if it shares a few strong features.

**Data handling:** browser inference by default, no telemetry, opt-in localStorage saves, user-triggered downloads. The Flask API does not store request texts. Browser-local data is not encrypted by this application. No training occurs on user input.

**Next research steps:** obtain a suitable licensed and consented expert-labeled corpus; document annotation agreement and taxonomy mapping; partition by author or source; add a validation split; compare classical and transformer baselines; calibrate confidence; evaluate multilabel cases, negation, fairness, and out-of-domain performance. Retain an untouched external test set.
