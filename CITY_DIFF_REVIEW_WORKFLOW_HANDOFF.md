# City Diff coding handoff: candidate review workflow

## Task

Update the City Diff codebase at `/Users/michael_shen/Desktop/michael_project/city-diff`. Implement a small, usable workflow for reviewing the road-discontinuity candidates that the app already finds. Complete the code, documentation, and verification; do not stop at a design proposal.

The user-facing goal is simple: after City Diff flags a location, a person can inspect the existing maps, record what the evidence does and does not show, and export a case note another person can check. This is the next step between an algorithmic lead and a professional judgment. It is **not** a full urban-planning scenario editor.

## Read before editing

- `README.md` and `DATA_SOURCES.md` for existing features and truth boundaries.
- `research/REVIEW_PROTOCOL.md` for the review fields and status meanings. The protocol has **not yet been executed**; do not invent completed reviews.
- `research/RESEARCH_REPORT.md`, especially the evidence model, parameter-sensitivity result, and limitations.
- `src/App.tsx`, `src/components/RoadInspector.tsx`, `src/components/CompareMap.tsx`, `src/types/index.ts`, and `src/lib/i18n.tsx` for current selection, UI, and bilingual copy.

The app already shows historical raster maps, current OSM roads, alley-trace and stitch-point candidates, source dates, and warnings. It does not yet save a person's review of a candidate. Build on that existing flow instead of adding another detection algorithm or a new data source.

## Requested behavior

1. **Review a selected candidate.** Support both `lost-alleys` and `stitch-points`. From the selected candidate in the current inspector, open a review section that keeps the candidate, map, and historical comparison in context. Show the computed reason it was flagged, the relevant source/snapshot information, and the current evidence limits.
2. **Record a human assessment.** Use the status values from `research/REVIEW_PROTOCOL.md`: `unreviewed`, `supported`, `rejected`, and `unresolved`. Also capture `historical_evidence`, `present_condition`, a short observation, cited evidence (URL or identifiable source with date), and specific questions still needing confirmation. Make clear what exact candidate hypothesis the status refers to. A `supported` review must have a cited observation; it must never imply proven historical causation, public access, ownership, or construction feasibility.
3. **Keep records safely.** This is a static client-side app. Use a typed, versioned local record format. Persist reviews across refreshes and city/road changes without mixing candidates from different cities or candidate types. Include candidate identity and the source-data snapshot identifier or hash. If regenerated data makes a saved review potentially stale, warn the user instead of silently treating it as current. Provide JSON export and import so the work is portable; validate imports and handle malformed files without deleting existing reviews.
4. **Export one readable case note.** Provide a Markdown export for the selected candidate. Include location, candidate type, what the system calculated, what the reviewer observed, citations, status, unanswered questions, snapshot date/hash, and the limits of the conclusion. Keep observed source data, computed results, and human interpretation visibly separate. A map image is optional; do not block the export on map-tile capture or embed third-party raster imagery without checking its terms.
5. **Fit the current app.** Keep the existing map tools working. Provide natural Traditional Chinese and English UI text, keyboard-accessible controls, clear save/export feedback, and a layout that works on desktop and mobile. Do not add accounts, a server, or a database for this task.

## Evidence rules

- A geometry candidate remains a **lead to investigate**, even after a reviewer marks the narrow hypothesis `supported`.
- Historical raster lines are not legal parcel boundaries. OSM centrelines do not establish rights of way. Nearby monuments do not establish causation. The 2016 Tainan cadastral raster cannot be used as a legal odd-lot detector.
- Never fill review fields from the candidate score alone or seed plausible-looking review outcomes. Newly generated candidates start `unreviewed`.
- Do not claim model accuracy, professional-user validation, or improved planning decisions unless a separate real study supports those claims.

## Acceptance checks

- A user can review an alley-trace candidate and a stitch-point candidate, save both, refresh, change city/road/tool, and recover the correct records.
- JSON export/import preserves those records; a bad file produces a useful error and leaves saved records intact.
- Markdown export is readable without the app and distinguishes source observation, computation, human assessment, and unknowns.
- A changed data snapshot triggers a visible stale-review warning.
- Existing candidate selection, historical-map comparison, and source warnings still work.
- Add focused tests for record validation, identity/snapshot handling, import/export, and any nontrivial review logic. Run `npm test` and `npm run build`, then manually check the review flow in a browser at desktop and phone widths. Report the results and any remaining limits.

Update `README.md` with how review storage and export work. If implementation details require a modest change to the record fields, keep the meanings in `research/REVIEW_PROTOCOL.md` and explain the change in the final handoff.

## Why this matters for the application

City Diff is the applicant's first attempt to bring software skills back to an urban question. The portfolio should be able to show a complete path: the system flags a location, a person checks several sources, records a supported/rejected/unresolved finding, and identifies what remains unknown. After real reviews are performed, use a strong signal, a counterexample, and an unresolved case in the portfolio. Do not fabricate these examples as part of implementation.

The later SOP product goal is broader early-stage planning support. City Diff does not need to become that whole product. Its value here is showing how the applicant handles evidence, uncertainty, and the boundary between software output and professional judgment.
