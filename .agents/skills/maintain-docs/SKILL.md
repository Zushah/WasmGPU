---
name: maintain-docs
description: Audit, write, maintain, and verify WasmGPU Markdown documentation under ./website/docs/ with source-backed release and maintenance workflows. Use for release documentation preparation, API or member-page creation and updates, stale-doc cleanup, documentation coverage audits, link and index checks, or verification of documentation diffs. Support release, maintain, and verify modes. In release mode, stop for approval after producing the audit and before editing documentation.
---

# Maintain Docs

Maintain `./website/docs/` as a hand-written, source-backed reference for WasmGPU. Treat current source, tests, and examples as evidence; use `./ARCHITECTURE.md` as a map rather than a substitute for inspecting them.

## Select a mode

- Use `release` for a versioned documentation update across the repository. Require or clearly infer a baseline release ref, target ref, and target version. Produce the audit ledger and stop for approval before editing.
- Use `maintain` for a focused addition, correction, or cleanup. Keep the write set narrowly tied to the request; do not require a release audit checkpoint.
- Use `verify` to review coverage, source accuracy, links, discoverability, formatting, and scope. Make no edits unless the user explicitly asks for fixes.

If the mode is omitted, infer it from the request and state the choice. Ask only when the distinction would materially change the work.

## Preserve boundaries

1. Snapshot `git status --short` before working. Preserve all pre-existing changes and never use blanket restore commands.
2. Default documentation writes to `./website/docs/**`. In `release` mode, also write the audit ledger under `./.cache/`, which is intentionally gitignored.
3. Treat `./ARCHITECTURE.md`, `./README.md`, `./CHANGELOG.md`, `./website/home/`, `./website/examples/`, `./website/build/`, `./wasm/`, `./release/`, `./mkdocs.yaml`, `./scripts/`, source, tests, examples, assets, and package files as read-only unless the user explicitly expands the task.
4. Do not run `npm run website` or `./scripts/build_website.py`.
5. Do not generate Markdown prose from declarations or use a script to bulk-create reference pages. Write and review prose manually.
6. Create new or touched documentation files with LF line endings and exactly one final newline.
7. Preserve the current documentation layout, filename patterns, headings, tables, examples, terminology, and `See Also` conventions unless the task explicitly corrects a convention.

## Build evidence

Before editing:

1. Read `./CONTRIBUTING.md` and the relevant documentation and subsystem sections of `./ARCHITECTURE.md`.
2. Inspect `./typescript/index.ts`, public factories in `./typescript/core/engine.ts`, the source that owns the behavior, important callers, related WGSL or Rust when applicable, focused tests, and at least one representative example.
3. Inspect the affected documentation page, its section index, sibling member pages, and nearby cross-links.
4. Inspect relevant history and renames. For release work, use commit history, a three-dot diff from the baseline to the target, and the target-to-worktree diff when the checked-out worktree contains release changes.
5. Prefer current source when release-facing prose describes an older release. Mark uncertainty instead of inventing behavior.

## Run release mode

### Audit

1. Read [`./references/release-audit.md`](references/release-audit.md) completely.
2. Establish the baseline release ref, target ref, and target version. Record them in `./.cache/docs-<target-version>-audit.md`.
3. Inventory the current documentation tree and the public API. Compare new object families, factories, properties, and methods with documented sibling surfaces.
4. Map each release-visible addition, change, rename, and removal to its source symbols, callers, tests, examples, affected pages, cross-cutting effects, priority, and documentation disposition.
5. Give every public-surface delta one disposition: `add`, `update`, `remove`, `group`, or `no-op`. For `group` and `no-op`, record the exact APIs and rationale.
6. Derive stale searches from old names, removed names, old version strings, and changed unions or result shapes. Do not rely on a hard-coded list from a previous release.
7. Write only the ledger. Do not edit or normalize `./website/docs/` during the audit turn.
8. Report the proposed subsystem batches, uncertainties, and out-of-scope follow-ups. Stop and request approval.

### Implement after approval

1. Re-read the approved ledger and current working-tree state. Reconcile intervening source changes before writing.
2. At the start of the first approved implementation turn, normalize every Markdown file under `./website/docs/` to LF with:

   ```bash
   python ./.agents/skills/maintain-docs/scripts/validate_docs.py --all --normalize-lf
   ```

3. Work through one coherent subsystem batch at a time. Define an exact documentation allowlist and the source, test, and example evidence for that batch.
4. Re-read the relevant source immediately before writing. Explain user-visible behavior, defaults, ownership, lifetime, limitations, and practical caveats.
5. Use concise, adaptable examples. Do not expose private details unless they are necessary to explain a public contract.
6. Label performance thresholds, render-path choices, and other changeable internals as implementation notes rather than stable guarantees.
7. Group paired or closely related APIs when that matches the documentation design, but list every real API name prominently. Never let a conceptual page title obscure the source-level surface.
8. Update section indexes and useful inbound and outbound links in the same batch.
9. Pass every newly added page to `--require-inbound` and confirm that another documentation page links to it.
10. Mark ledger rows complete and record intentional skips or follow-ups after each batch.

### Close the release

1. Resolve every ledger row or leave an explicit, justified follow-up.
2. Re-run the public-surface and sibling-parity comparison to catch omissions.
3. Run the validator across the complete documentation tree and pass all added pages to `--require-inbound`.
4. Run `git diff --check`, inspect `git diff --name-status`, and compare the final status with the initial snapshot.
5. Search for the dynamically derived stale terms and old target-version strings.
6. Report changed pages, removed pages, validation results, unresolved uncertainty, and out-of-scope release work.

## Run maintain mode

1. Establish the exact behavior or pages in scope and inspect their live evidence.
2. Compare sibling pages before deciding whether to add a dedicated page, group related APIs, update an existing page, or make no documentation change.
3. Edit only the smallest coherent page set, including necessary index and `See Also` updates.
4. Normalize only the documentation files changed in this task:

   ```bash
   python ./.agents/skills/maintain-docs/scripts/validate_docs.py --files <changed-doc.md>... --normalize-lf
   ```

5. If the task adds pages, pass them to `--require-inbound` during validation.
6. Run link checks, `git diff --check`, focused stale-term searches, and a source-claim review.
7. Report the evidence consulted, files changed, validation results, and follow-ups.

Do not normalize untouched documentation in `maintain` mode.

## Run verify mode

1. Keep the pass read-only unless fixes are explicitly requested.
2. Review each changed claim against current source, tests, and examples.
3. Check public additions, removals, factory families, sibling member coverage, grouped-page API names, indexes, and cross-subsystem references.
4. Run:

   ```bash
   python ./.agents/skills/maintain-docs/scripts/validate_docs.py --all
   git diff --check
   ```

5. Treat validation failures as findings; do not normalize files in `verify` mode.
6. If fixes are requested, apply narrow maintain-style edits and validate only owned changes.

## Use the validator

Run `./.agents/skills/maintain-docs/scripts/validate_docs.py` from the repository root.

- Pass `--all` to select every Markdown file under `./website/docs/`.
- Pass `--files <path>...` to select an explicit subset inside that directory.
- Add `--normalize-lf` only in approved release implementation or for files owned by a maintain task.
- Add `--require-inbound <path>...` for new pages that must be linked from another Markdown page.
- Add `--max-errors <count>` to cap reported error details; use `0` for no cap.
- Add `--skip-format` only for a diagnostic link pass over known legacy formatting.
- Add `--skip-links` only when testing formatting in isolation.

The validator never writes unless `--normalize-lf` is present. It validates UTF-8, LF-only endings, exactly one final newline, inline local `.md` links, and requested inbound links from other pages while ignoring Markdown-looking text inside fenced code, inline code, and HTML comments. The documentation uses inline `.md` links; if that convention changes, extend the validator before relying on it for the new syntax. It does not validate documentation truth, so perform the evidence review separately.
