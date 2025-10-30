# Devlog — Modular Playlist Track Removal

## Context
The feature plan in @docs/feature/2025-10-20-remove-track-plan.md establishes a modular approach for removing individual tracks while keeping playback state, shuffle order, and memory management coherent across the app. This devlog converts that plan into actionable engineering work.

## Milestones
1. **M1 · Playlist Domain Helpers (Target: Week 1)**
   - Responsible: Playback/State engineer (TBD)
   - Deliverables: `playlistActions.js` with pure helpers for remove/sanitize/shuffle reconciliation and dedicated unit tests.
   - **Testing Suite:**
     - *Automated:* Jest unit suite validating helper outputs for first/middle/last removals, shuffle reconciliation, repeat-one edge cases, and empty queues.
     - *Behavioral:* Local node REPL or Storybook sandbox exercising helpers with sample playlists; confirm outputs align with expectations documented in the feature plan.
     - *Lint/Test Additions:* Add `playlistActions.test.js`; ensure CI runs `npm run test -- playlistActions` and include new file in lint/coverage thresholds.
2. **M2 · Playback Context Integration (Target: Week 2)**
   - Responsible: Playback/State engineer (TBD)
   - Deliverables: `removeTrackAt`, `removeTracks`, and `removeCurrentTrack` surfaced via context; shuffle/repeat parity maintained; URL cleanup handled on single path.
   - **Testing Suite:**
     - *Automated:* React Testing Library specs covering context consumers, URL revocation mocks, playback state transitions, and shuffle mode recalculation.
     - *Behavioral:* In-app manual walkthrough removing active/inactive tracks, verifying playback continuity, repeat-one halt, and active source labeling.
     - *Lint/Test Additions:* Extend `PlaybackContext.test.jsx`; update ESLint import order rules for new helper module; ensure TypeScript/PropTypes constraints updated if used.
3. **M3 · UI & Controls (Target: Week 3)**
   - Responsible: Frontend engineer (TBD)
   - Deliverables: Playlist item remove control with keyboard support, optional player overflow action, styling polish, and regression tests.
   - **Testing Suite:**
     - *Automated:* RTL or Cypress tests for button click, keyboard Delete/Backspace, focus handling, and optional overflow action invoking `removeCurrentTrack`.
     - *Behavioral:* Manual QA covering hover/focus styling, assistive tech review (screen reader output for remove buttons), and ensuring removal does not break drag/drop.
     - *Lint/Test Additions:* Update Storybook/visual regression stories if available; add CSS lint checks for new styles; include interaction test script in CI matrix.
4. **M4 · QA & Polishing (Target: Week 4)**
   - Responsible: QA + engineering pairing (TBD)
   - Deliverables: Manual checklist run, automated tests stable in CI, release notes drafted.
   - **Testing Suite:**
     - *Automated:* Full CI pipeline (lint, unit, integration, e2e) with new suites enabled; monitor coverage deltas.
     - *Behavioral:* Execute full manual checklist, cross-browser verification (Chrome/Safari/Firefox), memory profiling for object URL leaks.
     - *Lint/Test Additions:* Confirm lint rules pass on new files, regenerate any snapshots, and document commands in release checklist.

## Task Board

### Phase 1 — Domain Helper Module (M1)
- [x] Scaffold `src/context/playlistActions.js` exporting pure helpers for:
  - [x] `removeTrackAtState(state, index)` returning `{ tracks, currentTrackIndex, shuffleOrder, activeSource, revokedUrls, shouldPause }`.
  - [x] `removeTracksState(state, indices)` supporting future multi-select removal.
  - [x] `rebuildShuffleOrder({ tracks, currentTrackIndex })` extracted from current context logic.
- [x] Implement unit tests covering first/middle/last removal, shuffle on/off, repeat-one edge cases, and empty playlist scenarios.

#### Testing Suite
- **Automated:** Vitest unit tests for helper functions with snapshot/inline state assertions; run via `npm run test` (completed 2025-10-25).
- **Behavioral:** Developer sanity checks using temporary script to invoke helpers with mock data; confirm outputs match plan, including `revokedUrls` payload.
- **Lint/Test Additions:** Ensure helpers follow project lint rules (`npm run lint`), add coverage thresholds for new file, update any pre-commit hooks.

### Phase 2 — Playback Context Wiring (M2)
- [x] Extend `cleanupObjectUrls` in @src/context/PlaybackContext.jsx#223-229 to accept singular or array inputs.
- [x] Integrate helper module:
  - [x] Create `removeTrackAt` that bridges context state to helper outputs and batches state updates.
  - [x] Implement `removeTracks` leveraging the multi-index helper.
  - [x] Add `removeCurrentTrack` convenience method with guard for invalid indices.
- [x] Ensure shuffle order updates run synchronously with removal and repeat-one stops when active track is deleted.
- [x] Update provider value memo to expose the new APIs.
- [x] Add React Testing Library integration tests verifying context behaviour and URL cleanup calls.

#### Testing Suite
- **Automated:** RTL tests simulating consumer components; mock `URL.revokeObjectURL`; verify state transitions and event ordering; add regression test for shuffle rebuild effect (completed 2025-10-25).
- **Behavioral:** Manual smoke in app removing various tracks while observing playback and console warnings; check behavior with uploaded files and repeat-one mode.
- **Lint/Test Additions:** Update context-related ESLint paths, ensure Jest config includes new tests, and document commands in README if needed.

### Phase 3 — UI / Interaction (M3)
- [x] Update `Playlist.jsx` to accept `onRemoveTrack` prop and render inline remove icon button per item with accessible label.
- [x] Prevent click propagation between track selection and removal, and add keyboard Delete/Backspace binding when item focused.
- [x] Style remove affordance in `Playlist.css`, ensuring hover/focus states meet contrast requirements.
- [x] Optionally surface `removeCurrentTrack` in AudioPlayer overflow/extra actions (subject to UX sign-off) — inline overflow button wired to `removeCurrentTrack`, 2025-10-25.
- [x] Write UI interaction tests (RTL or Cypress) covering button click and keyboard removal while playback continues correctly (unit coverage via `handleTrackKeyDown` helper, 2025-10-25).

#### Testing Suite
- **Automated:** RTL component tests for `Playlist` ensuring removal callback usage, keyboard support, and focus management; Cypress e2e for full-player interaction.
- **Behavioral:** Manual run-through checking keyboard-only navigation, screen reader labels (with VoiceOver/NVDA), and ensuring drag/drop plus removal coexist.
- **Lint/Test Additions:** CSS lint/format commands, Storybook visual regression updates, accessibility linting if available (axe CI or similar).

### Phase 4 — QA & Launch (M4)
- [ ] Execute manual QA checklist from @docs/feature/2025-10-20-remove-track-plan.md#55-63.
- [ ] Verify uploaded track removal revokes object URLs via devtools memory panel.
- [ ] Confirm CI suites (unit + integration + e2e) pass and add new tests to required checks.
- [ ] Draft changelog entry and update user-facing documentation/screenshots if needed.

#### Testing Suite
- **Automated:** Run entire CI workflow (lint, unit, integration, e2e, accessibility if configured); ensure pipelines block on regressions and coverage drops.
- **Behavioral:** Conduct cross-browser/manual QA, audio playback endurance test (removing tracks during playback loops), and confirm no lingering object URLs via devtools.
- **Lint/Test Additions:** Finalize lint configuration updates, verify package scripts documented, ensure pre-commit hooks include new test commands.

## Open Questions
- Do we want an undo/toast mechanism in v1 or defer to future iteration?
- Should multi-select removal ship alongside single-item removal or wait for actual user demand?
- Is there a preferred iconography (trash vs. ×) that aligns with existing design language?
