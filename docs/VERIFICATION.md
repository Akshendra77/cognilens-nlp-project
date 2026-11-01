# Verification record

- Python suite: 12 tests passed, including API routes, input limits, source-file isolation, dataset split checks, segmentation, canonical examples, and exported-model parity.
- JavaScript: 561 probability comparisons (51 inputs × 11 classes) matched scikit-learn within 1e-12, plus validation, segmentation, abstention, and representative prediction checks.
- Browser: verified academic-pressure analysis yields two sentence-level patterns; verified model scores, explicit saving, history navigation, reopening, library search and detail modal, analyzing a library example, batch analysis with six rows, neutral and uncertain outcomes, and the evaluation dashboard.
- Responsive DOM layout: checked 390 px mobile and 1440 px desktop viewports. Analyzer changes from one column to two; document width stays within the viewport.
- No browser console warnings or errors were observed during the checked interactions.

Screenshot capture was unavailable in the browser automation environment, so website visual pixel inspection was not verified. The CSV download was checked in the browser and its file contents inspected. Import behavior is not covered by the automated suite. The separate IEEE-style PDF report was rendered and visually checked; it is not a website asset.

Model metrics describe the supplied held-out synthetic dataset only. See MODEL_CARD.md for the evaluation's limitations.
