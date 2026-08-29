---
name: prepare-release
description: Audit, prepare, and verify WasmGPU releases with source-backed versioning, release notes, release-facing website and README updates, generated artifacts, and final validation. Use for versioned release preparation after engine source is finalized. Support audit, prepare, and verify modes. In audit mode, stop for approval after producing the audit and release-note files and before editing tracked release files.
---

# Prepare Release

Prepare a WasmGPU release around engine source that the human considers finalized. Treat current source, tests, examples, and history as evidence; use `./ARCHITECTURE.md` as a map rather than a substitute for inspecting them.

## Select a mode

- Use `audit` to inspect a release delta, identify release-facing work, create the audit and release-note files under `./.cache/`, and stop for approval before editing tracked files.
- Use `prepare` after approval to update release metadata and release-facing prose, build the finalized source, prepare generated artifacts, compute release metrics, and validate the candidate release worktree.
- Use `verify` to review an already-prepared release worktree without rebuilding or editing tracked files.

Require or clearly infer a baseline release ref, target ref, and target version. If the release date is omitted, record the local calendar date during `audit` and reuse that date consistently in later modes.

Examples:

```text
$prepare-release release: audit v0.9.0...HEAD for v0.10.0
$prepare-release release: prepare v0.9.0...HEAD for v0.10.0
$prepare-release release: verify v0.9.0...HEAD for v0.10.0
```

If the mode is omitted, infer it from the request and state the choice. Ask only when the distinction would materially change the work.

## Preserve boundaries

1. Snapshot `git status --short` before working. Preserve all pre-existing changes and never use blanket restore commands.
2. Treat this skill as release housekeeping, not release development. Inspect engine source as evidence, but do not modify TypeScript source, Rust source, WGSL source, Python source, tests source, examples source, or benchmarks source merely to make the release succeed.
3. Treat discovered engine source defects as release blockers. Report them and stop instead of silently repairing them.
4. Keep `$prepare-release` independent from `$maintain-docs`. Do not invoke it, read its workflow, delegate to it, or assume it has run. The human may run it separately after release preparation.
5. Do not perform documentation maintenance under `./website/docs/**/*.md`. Only `./website/docs/script.js` is release-owned because it provides site-wide footer/version info rather than documentation prose.
6. Never commit, tag, push, publish to npm, create a GitHub release, or otherwise publish the release.
7. Never run `npm run bench`. Do not run `npm run dev` or `npm run restore` during release preparation.
8. Never use blind repository-wide version replacement. Update release references by surrounding context and preserve intentional historical references.
9. In `prepare` mode, run `npm run build` exactly where the release workflow calls for it. After release banners are added, do not run `npm run build` again.
10. In `verify` mode, do not run `npm run build`; it would overwrite the prepared textual release artifacts.
11. Leave `./release/wasm.wasm` as a valid binary. Never prepend a text banner to it.
12. Preserve the repository's current formatting, terminology, release-note voice, and file structure unless release preparation itself requires a contextual path update.

## Build evidence

Before writing:

1. Read the relevant release/build sections of `./ARCHITECTURE.md`, then inspect the live files they describe.
2. Inspect release history, commit subjects, changed paths, renames, deletions, and focused diffs between baseline and target. If the checked-out worktree contains additional release changes, inspect staged and unstaged diffs too.
3. Inspect `./typescript/index.ts`, public factories in `./typescript/core/engine.ts`, and relevant subsystem source when needed to support release claims.
4. Inspect focused tests and representative examples for important user-visible additions, fixes, removals, and changes.
5. Inspect current package/cargo metadata, build configuration, generated artifact paths, `./README.md` release state, changelog style, website release panels, version numbers, and current version references.
6. Prefer current source when release-facing prose describes an older release. Mark uncertainty instead of inventing behavior.

## Run audit mode

### Audit

1. Read [`./.agents/skills/prepare-release/references/release-audit.md`](references/release-audit.md) completely.
2. Establish the baseline release ref, target ref, target version, intended release date, and initial worktree state.
3. Inspect the release delta and group it into a small number of meaningful themes. Do not map one release-note bullet to every commit.
4. Inspect enough current source, tests, examples, and history to substantiate each important release claim.
5. Audit contextual release references: package/Cargo versions, README badges and tagged artifact links, website release state and footers, `./scripts/build_website.py` version numbers, `./ARCHITECTURE.md` release metadata, and historical artifact paths that may no longer match the current build layout.
6. Identify engine-source defects, unsupported release claims, broken release paths, and material uncertainties as blockers or follow-ups. Do not repair engine source.
7. Write only: `./.cache/release-v<target-version>-audit.md` and `./.cache/release-v<target-version>-notes.md`
8. Do not edit tracked release files during the audit turn.
9. Report release themes, expected write scope, blockers, uncertainties, and validation expectations. Stop and request approval.

### Release-note style

Use the established WasmGPU release notes style as a hard requirement.

The cache release notes file must contain `## Overview` and `## Highlights`, a comparison link, and the WasmGPU website link.

Every highlight must begin with exactly one of:

- `Added`
- `Fixed`
- `Removed`
- `Changed`

Also:

- group related commits by theme;
- do not create one highlight per commit;
- order highlights from most significant to least significant;
- avoid shorthand and unexplained abbreviations;
- keep prose concise but substantive;
- attach relevant git SHAs to the cache release-note highlights;
- attach multiple SHAs when one highlight synthesizes multiple commits;
- never invent SHAs.

The committed `CHANGELOG.md` entry must use the same release themes but omit SHA annotations. The homepage release highlights must be a shorter derivative of the changelog rather than independent release copy.

## Run prepare mode

### Reconcile the audit

1. Re-read the approved cache audit and release-note files.
2. Re-check `git status --short`, the baseline, target, target version, and intended release date.
3. Reconcile intervening worktree changes.
4. If engine-source changes materially changed the audited release semantics, refresh the audit and stop for renewed approval instead of silently preparing a different release.

### Update release metadata and prose

1. Update WasmGPU's own version metadata in:
   - `./package.json`
   - `./package-lock.json`
   - `./rust/Cargo.toml`
   - `./rust/Cargo.lock`

   Do not disturb dependency versions.

2. Add the new release entry to `./CHANGELOG.md`. Preserve the established changelog structure, release ordinal when it can be confidently derived, release date style, compare link, thematic ordering, and mandatory `Added` / `Fixed` / `Removed` / `Changed` prefixes. Keep SHA annotations out of the committed changelog.

3. Update `./README.md`:
   - latest-release badge, links, tagged artifact paths, and release-size metadata;
   - release-version labels in the architecture section and diagram;
   - the encoded Mermaid link when its diagram content changes;
   - small, integrated refinements to the existing `## About` bullets under `WebGPU engine in TypeScript` and `WebAssembly driver in Rust`.

   Keep `About` an overview of WasmGPU as a whole. Prefer adding or refactoring small relevant phrases over removing existing capabilities. Do not rewrite it as release notes.

4. Update `./scripts/build_website.py` release-specific CDN imports. Derive tagged artifact paths from the current build/output layout rather than preserving historical paths blindly. For the current tree, new release URLs should use `release/` rather than the old `dist/` layout.

5. Update `./website/home/index.html` without redesigning the panel:
   - target version and full release date;
   - shortened changelog-derived release highlights;
   - tagged JavaScript bundle link;
   - release-notes link;
   - compare link;
   - npm install command;
   - CDN bundle URL;
   - footer release version.

   Defer final bundle-size, line-count, and workspace-diff numbers until after the build and final tracked edits.

6. Update only contextual release chrome in:
   - `./website/examples/index.html`
   - `./website/performance/index.html`
   - `./website/docs/script.js`

   Do not rewrite example descriptions, benchmark report data, benchmark dates, documentation prose, or benchmark claims.

7. Update only release-state metadata in `./ARCHITECTURE.md`, such as:
   - latest release and release date;
   - unreleased comparison baseline;
   - statements about which release README/website metadata reflects;
   - release-version labels in diagrams;
   - encoded Mermaid links when those labels change;
   - release/output path descriptions when current release mechanics changed.

   Do not use release preparation to catch up substantive architecture prose.

8. Search for old versions, tags, release URLs, CDN URLs, historical output paths, and "latest release" labels. Update stale release-facing references in this skill's scope. Classify remaining matches as intentional history, documentation-owned content, or uncertainty.

### Build and prepare artifacts

1. Run:

   ```bash
   npm run build
   ```

2. Treat generated `./wasm/` files as build outputs. Do not manually release-edit:
   - `./wasm/wasm.d.ts`
   - `./wasm/wasm.js`
   - `./wasm/wasm.wasm`
   - `./wasm/wasm.wat`

3. Treat these as generated release outputs:
   - `./release/WasmGPU.js`
   - `./release/WasmGPU.min.js`
   - `./release/WasmGPU.iife.min.js`
   - `./release/wasm.js`
   - `./release/wasm.wasm`

4. After the final build, prepend this exact banner, followed by exactly one empty line, to the four textual release artifacts:

   ```text
   /*!
    * WasmGPU v<target-version>
    * Released on <weekday-name>, <month-name> <month-day-number>, <year-number>
    * WebGPU × WebAssembly rendering and computing engine for scientific workloads in the browser
    * Copyright (c) Zushah and contributors
    * SPDX-License-Identifier: MPL-2.0
    * Source: https://github.com/Zushah/WasmGPU
    * Website: https://zushah.github.io/WasmGPU
    */

   ```

   Apply it to:
   - `./release/WasmGPU.js`
   - `./release/WasmGPU.min.js`
   - `./release/WasmGPU.iife.min.js`
   - `./release/wasm.js`

   If a leading WasmGPU release banner already exists, replace it rather than stacking another banner.

5. Do not add a banner to `./release/wasm.wasm` or to files under `./wasm/`.

6. Do not run `npm run build` again after adding the banners.

### Validate the candidate release

1. Run:

   ```bash
   npm run test
   ```

   If testing exposes an engine defect, report a release blocker instead of repairing engine source. Distinguish environment/toolchain failures from source defects.

2. Compute final bundle metrics from the bannered artifacts:
   - physical line count from `./release/WasmGPU.js`;
   - byte size from `./release/WasmGPU.min.js`.

   Use four significant figures and preserve the surrounding `k` / `mb` presentation conventions.

3. Use the final minified size consistently in the README and homepage.

4. Compute release-diff metrics from the baseline release to the complete current workspace, including committed changes, staged and unstaged tracked changes, and intended nonignored untracked release files. Exclude cache files and ignored ephemeral output.

5. Record additions and deletions to four significant figures and changed-file count as a whole integer in the homepage compare row.

6. Because editing that row changes the workspace diff, recalculate after writing it and correct the displayed numbers once if necessary. Confirm the result is stable.

7. Run:

   ```bash
   npm run website
   ```

   Treat this only as build-process verification. The human performs manual visual website inspection.

8. Run contextual stale-version and stale-path searches, then:

   ```bash
   git diff --check
   ```

9. Inspect `git diff --name-status`, the complete final diff, and final `git status --short`.

10. Report changed files, generated artifacts, validation results, intentional old-version matches, blockers, uncertainties, and out-of-scope follow-ups. State explicitly that the skill did not commit, tag, push, publish, create a GitHub release, run benchmarks, or visually approve the website.

## Run verify mode

1. Keep the pass read-only unless the user explicitly asks to prepare fixes in a separate `prepare` run.
2. Re-read the release cache files when available and establish the baseline, target, version, and intended date.
3. Verify package/Cargo version consistency, changelog structure and style, README release state, homepage release state, website footers, CDN pins, and architecture release metadata.
4. Verify all expected generated files exist.
5. Verify the exact target banner and one empty line at the start of:
   - `./release/WasmGPU.js`
   - `./release/WasmGPU.min.js`
   - `./release/WasmGPU.iife.min.js`
   - `./release/wasm.js`
6. Verify `./release/wasm.wasm` has no text banner and remains a binary WebAssembly artifact.
7. Verify README/homepage bundle metrics and homepage workspace-diff metrics against the current prepared worktree.
8. Run contextual stale-version and stale-path searches.
9. Run:

   ```bash
   npm run test
   npm run website
   git diff --check
   ```

10. Do not run `npm run build`, `npm run bench`, `npm run restore`, or `npm run dev`.
11. Treat failures as findings and engine defects as release blockers; do not repair engine source.
12. Report findings, validation results, remaining intentional old-version matches, and release readiness.

## Expected release write set

For the current repository, expect release preparation to touch some or all of:

- `./package.json`
- `./package-lock.json`
- `./rust/Cargo.toml`
- `./rust/Cargo.lock`
- `./CHANGELOG.md`
- `./README.md`
- `./scripts/build_website.py`
- `./website/home/index.html`
- `./website/examples/index.html`
- `./website/performance/index.html`
- `./website/docs/script.js`
- `./ARCHITECTURE.md`
- `./wasm/wasm.d.ts`
- `./wasm/wasm.js`
- `./wasm/wasm.wasm`
- `./wasm/wasm.wat`
- `./release/WasmGPU.js`
- `./release/WasmGPU.min.js`
- `./release/WasmGPU.iife.min.js`
- `./release/wasm.js`
- `./release/wasm.wasm`

Treat this as the current expected set, not a permanent whitelist. Derive future release-facing additions or removals from the current tree and release mechanics.
