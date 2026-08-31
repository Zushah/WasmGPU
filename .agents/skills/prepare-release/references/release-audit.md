# Release preparation audit

Use this reference only for `audit` mode.

## Audit header

Record:

- target version;
- baseline release ref;
- target ref;
- intended release date;
- audit date;
- initial `git status --short`;
- current generated release-output paths;
- expected tracked release write paths.

Store the audit at `./.cache/release-v<target-version>-audit.md`.

Store the GitHub release-note candidate at `./.cache/release-v<target-version>-notes.md`.

## Audit summary

Keep the audit compact. Record:

| Field | Requirement |
| --- | --- |
| Release themes | Name the small set of major release themes in significance order. |
| Expected preparation | Name the release-facing files or categories that should change. |
| Version and path changes | Call out version propagation and any artifact/CDN path migration. |
| Generated artifacts | Name the expected `./wasm/` and `./release/` outputs. |
| Blockers | Record engine-source defects or other release-blocking failures. |
| Uncertainty | Record concrete unresolved questions; otherwise use `none`. |
| Validation | List the build, test, website-build, metric, stale-search, and diff checks expected during `prepare`. |
| Out of scope | Record engine-source repairs, documentation maintenance, benchmarks, publishing, and manual visual website approval. |

Do not build an exhaustive per-commit or per-file ledger. Use `git diff` and focused source inspection as the detailed evidence.

## Evidence passes

Perform all of these passes:

1. **History and diff:** inspect commit subjects, changed paths, renames, deletions, and focused diffs between baseline and target. Include staged and unstaged worktree changes when they are part of the release candidate.
2. **Public surface:** inspect `./typescript/index.ts`, `./typescript/core/engine.ts`, and relevant public descriptors, result shapes, classes, factories, and members when release claims depend on them.
3. **Behavior:** inspect owning source, callers, WGSL or Rust when relevant, tests, examples, defaults, errors, ownership, lifetime, and limitations.
4. **Release metadata:** inspect package/Cargo versions, the release-banner metadata in `./esbuild.config.js`, changelog history, README badges, release metadata, both platform-compatibility tables and their review date, website release state and footers, CDN pins, architecture release metadata, and generated-output conventions. Check compatibility claims against current first-party browser, platform, standards, and hardware-vendor sources.
5. **Reference migration:** search old version strings, old tags, release URLs, CDN URLs, and historical output paths. Decide whether each match is stale release-facing state, intentional history, documentation-owned content, or uncertainty.

Do not assume a previous release's file list or path layout is still correct. Extend the audit from the current architecture, source tree, and build configuration.

## Release-note candidate

Write `./.cache/release-v<target-version>-notes.md` with:

```markdown
## Overview

<Concise thematic release summary.>

[Compare changes](https://github.com/Zushah/WasmGPU/compare/v<baseline-version>...v<target-version>)

[Website](https://zushah.github.io/WasmGPU)

## Highlights

- Added <important grouped capability>. (`<sha>`, `<sha>`)
- Fixed <important grouped correctness issue>. (`<sha>`)
- Changed <important grouped behavior or architecture>. (`<sha>`)
```

Every highlight must begin with exactly `Added`, `Fixed`, `Removed`, or `Changed`.

Require:

- thematic grouping rather than one highlight per commit;
- most-significant-first ordering;
- concise, substantive prose;
- no shorthand or unexplained abbreviations;
- relevant real git SHAs;
- multiple SHAs when one highlight groups multiple commits.

The committed `CHANGELOG.md` entry later uses the same themes without SHA annotations. The homepage release panel later uses a shorter derivative of the changelog.

## Current release ripple checklist

Check only applicable items, but make an explicit decision for each:

- package and npm lockfile version;
- Rust crate and Cargo lockfile version;
- changelog version, date, ordinal, overview, compare link, and highlights;
- `./README.md` release badge, tagged artifact links, minified-size metadata, About bullets, platform-compatibility tables and review date, and architecture-diagram version labels;
- `./scripts/build_website.py` target-version CDN pins and artifact paths;
- homepage version, release date, shortened highlights, bundle link, release link, compare link, npm command, CDN URL, bundle metrics, and footer;
- examples/performance/docs-script footer version chrome;
- architecture latest-release metadata and unreleased baseline;
- generated `./wasm/` outputs;
- generated `./release/` outputs;
- release-banner version and date in `./esbuild.config.js` and the automatically generated banners on the four textual distributable artifacts;
- stale old-version or old-path matches in release-prep scope.

Do not assume this list names every future release-facing surface.

## Approval checkpoint

After writing both cache files:

1. summarize the major release themes;
2. summarize the expected tracked write set;
3. call out blockers and uncertainties;
4. state the validation sequence expected during `prepare`;
5. state that no tracked release files were edited;
6. stop and request approval.

Do not begin `prepare` from an unapproved or materially stale audit.
