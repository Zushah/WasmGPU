# Release documentation audit

Use this reference only for `release` mode.

## Ledger header

Record:

- target version;
- baseline release ref;
- target ref;
- audit date;
- allowed write paths;
- initial `git status --short`;
- documentation sections present at audit time;
- explicit out-of-scope release files.

Store the ledger at `./.cache/docs-<target-version>-audit.md`.

## Ledger rows

Group rows by the documentation sections and cross-cutting systems visible in the current tree. Use these columns:

| Field | Requirement |
| --- | --- |
| ID | Assign a unique, stable identifier such as `R-01` or `OBJ-03`. |
| Change | Name the public feature, API, rename, removal, or behavior. |
| Source evidence | Give file paths and exact symbols. |
| Runtime connections | Name important callers, render/compute/interop paths, or ownership interactions. |
| Tests and examples | Give the focused evidence to inspect. |
| Documentation impact | Name existing, new, renamed, or removed pages and indexes. |
| Disposition | Use `add`, `update`, `remove`, `group`, or `no-op`. |
| Priority | Use `release-blocking`, `important`, or `optional`. |
| Stale or missing topic | Quote stale text or name the exact missing contract. |
| Uncertainty | Use `none` or a concrete `TODO(source needed: ...)`. |
| Batch | Assign one coherent writing batch. |
| Status | Use `pending`, `in progress`, `complete`, or `follow-up`. |

Require a row for every public-surface delta. Keep row IDs stable after the audit checkpoint so implementation reports and batch plans can refer to them. For a grouped page, enumerate every exact API it covers. For a no-op, explain why public documentation should not change.

## Evidence passes

Perform all of these passes:

1. **History and diff:** inspect commit subjects, changed paths, renames, deletions, and focused diffs between baseline and target. If the target is checked out with release changes in the worktree, inspect its staged and unstaged delta too.
2. **Public surface:** compare `./src/index.ts`, `./src/core/engine.ts`, public descriptors, result shapes, exported classes, and public members.
3. **Behavior:** inspect owners, callers, shaders or Rust where relevant, tests, examples, default values, validation, errors, ownership, and lifetime.
4. **Documentation topology:** inventory section indexes, factory pages, member-page families, grouped references, and current inbound links.
5. **Sibling parity:** compare a new or changed family with its closest documented siblings. Check factories, scene storage, traversal, bounds, picking, selection, overlays, scaling, upload, records, disposal, and indexes when applicable.
6. **Removal and rename:** identify obsolete pages, links, unions, result fields, examples, and terminology.

## Cross-cutting ripple checklist

Check only applicable items, but make an explicit decision for each:

- homepage version, overview, feature summary, and architecture diagram;
- runtime creation, renderer configuration, frame behavior, warmup, statistics, and performance notes;
- scene membership, queries, traversal, bounds, transforms, cameras, controls, and lights;
- object factories, descriptors, methods, ownership, upload, records, and destruction;
- picking, region picking, selection stores, annotations, and attribute availability;
- scaling, colormaps, legends, overlays, and data-source unions;
- materials, textures, asset import, metadata, variants, animation, skinning, and morphing;
- compute buffers, layouts, dispatch, readback, kernels, numerical limitations, and encoder restrictions;
- WebAssembly driver memory, external-module memory, Python interop, allocation kinds, epochs, and lifetime;
- section indexes, `See Also` links, filenames, deleted pages, and discoverability.

Do not assume this list names every future subsystem. Extend it from the current architecture and source.

## Batch plan

Give each batch:

- one subsystem goal;
- an exact documentation allowlist;
- source, test, and example evidence;
- audit row identifiers;
- expected additions, updates, removals, and grouped pages;
- focused verification searches.

Prefer a few existing pages or one coherent reference family. Permit a larger family only when the established documentation convention requires it. Never trade accuracy for an arbitrary file-count limit.

## Approval checkpoint

After writing the ledger:

1. summarize release-blocking rows;
2. call out uncertain rows and grouping choices;
3. propose batch order;
4. state that no documentation was edited or normalized;
5. stop and request approval.

Do not begin release implementation from an unapproved ledger.
