#!/usr/bin/env python3
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""Validate and optionally normalize WasmGPU Markdown documentation."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

MARKDOWN_LINK_RE = re.compile(r"(?<!!)\[[^\]]*\]\(([^)\n]+)\)")
HTML_COMMENT_RE = re.compile(r"<!--.*?-->", re.DOTALL)
INLINE_CODE_RE = re.compile(r"(`+)[^\n]*?\1")
EXTERNAL_SCHEMES = {"http", "https", "mailto", "tel", "data"}

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Validate UTF-8, LF endings, final newlines, local Markdown links, "
            "and optional inbound links under ./website/src/docs/.")
    )
    parser.add_argument(
        "--docs-root",
        type=Path,
        default=Path("website/src/docs"),
        help="Documentation root relative to the current directory.",
    )
    selection = parser.add_mutually_exclusive_group(required=True)
    selection.add_argument(
        "--all",
        action="store_true",
        help="Select every Markdown file under the documentation root.",
    )
    selection.add_argument(
        "--files",
        nargs="+",
        type=Path,
        help="Select explicit Markdown files inside the documentation root.",
    )
    parser.add_argument(
        "--normalize-lf",
        action="store_true",
        help="Normalize selected files to LF with exactly one final newline.",
    )
    parser.add_argument(
        "--require-inbound",
        nargs="+",
        type=Path,
        default=[],
        help="Require each listed Markdown page to have an inbound Markdown link.",
    )
    parser.add_argument(
        "--skip-format",
        action="store_true",
        help="Skip UTF-8 and line-ending validation.",
    )
    parser.add_argument(
        "--skip-links",
        action="store_true",
        help="Skip local Markdown link and inbound-link validation.",
    )
    parser.add_argument(
        "--max-errors",
        type=int,
        default=50,
        help="Maximum error details to print; use 0 for no limit (default: 50).",
    )
    args = parser.parse_args()
    if args.normalize_lf and args.skip_format:
        parser.error("--normalize-lf cannot be combined with --skip-format")
    if args.require_inbound and args.skip_links:
        parser.error("--require-inbound cannot be combined with --skip-links")
    if args.max_errors < 0:
        parser.error("--max-errors must be zero or greater")
    return args

def resolve_inside(root: Path, path: Path) -> Path:
    if path.is_absolute():
        candidates = [path]
    else:
        cwd_candidate = Path.cwd() / path
        candidates = [cwd_candidate]
        if not cwd_candidate.exists():
            candidates.append(root / path)
    for candidate in candidates:
        resolved = candidate.resolve()
        try:
            resolved.relative_to(root)
        except ValueError:
            continue
        return resolved
    raise ValueError(f"path is outside documentation root: {path}")

def select_files(root: Path, args: argparse.Namespace) -> list[Path]:
    if args.all:
        files = sorted(root.rglob("*.md"))
    else:
        files = [resolve_inside(root, path) for path in args.files]
    errors: list[str] = []
    unique: list[Path] = []
    seen: set[Path] = set()
    for path in files:
        if path in seen:
            continue
        seen.add(path)
        if path.suffix.lower() != ".md":
            errors.append(f"{path}: expected a .md file")
        elif not path.is_file():
            errors.append(f"{path}: file does not exist")
        else:
            unique.append(path)
    if errors:
        raise ValueError("\n".join(errors))
    if not unique:
        raise ValueError("no Markdown files selected")
    return unique

def prepare_normalized_lf(path: Path) -> bytes:
    data = path.read_bytes()
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ValueError(f"{path}: invalid UTF-8: {exc}") from exc
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    normalized = normalized.rstrip("\n") + "\n"
    return normalized.encode("utf-8")

def validate_format(path: Path) -> list[str]:
    errors: list[str] = []
    data = path.read_bytes()
    try:
        data.decode("utf-8")
    except UnicodeDecodeError as exc:
        return [f"{path}: invalid UTF-8: {exc}"]
    if b"\r" in data:
        errors.append(f"{path}: contains CR or CRLF line endings; expected LF")
    if not data.endswith(b"\n"):
        errors.append(f"{path}: missing final LF newline")
    elif data.endswith(b"\n\n"):
        errors.append(f"{path}: has more than one trailing newline")
    return errors

def extract_target(raw_target: str) -> str:
    target = raw_target.strip()
    if target.startswith("<") and ">" in target:
        return target[1 : target.index(">")]
    if " " in target:
        target = target.split(" ", 1)[0]
    return target

def resolve_markdown_target(source: Path, raw_target: str) -> Path | None:
    target = extract_target(raw_target)
    if not target or target.startswith("#") or target.startswith("/"):
        return None
    split = urlsplit(target)
    if split.scheme.lower() in EXTERNAL_SCHEMES or split.netloc:
        return None
    decoded_path = unquote(split.path)
    if not decoded_path.lower().endswith(".md"):
        return None
    return (source.parent / decoded_path).resolve()

def linkable_markdown(text: str) -> str:
    visible: list[str] = []
    fence_char: str | None = None
    fence_length = 0
    for line in text.splitlines(keepends=True):
        stripped = line.lstrip()
        marker_char = stripped[:1]
        marker_length = (
            len(stripped) - len(stripped.lstrip(marker_char))
            if marker_char in {"`", "~"}
            else 0
        )
        if fence_char is not None:
            if (
                marker_char == fence_char
                and marker_length >= fence_length
                and not stripped[marker_length:].strip()
            ):
                fence_char = None
                fence_length = 0
            if line.endswith("\n"):
                visible.append("\n")
            continue
        if marker_length >= 3:
            fence_char = marker_char
            fence_length = marker_length
            if line.endswith("\n"):
                visible.append("\n")
            continue
        visible.append(line)
    without_comments = HTML_COMMENT_RE.sub("", "".join(visible))
    return INLINE_CODE_RE.sub("", without_comments)

def build_link_graph(root: Path) -> tuple[list[str], dict[Path, set[Path]]]:
    errors: list[str] = []
    inbound: dict[Path, set[Path]] = {}
    for source in sorted(root.rglob("*.md")):
        try:
            text = source.read_text(encoding="utf-8")
        except UnicodeDecodeError as exc:
            errors.append(f"{source}: invalid UTF-8 while checking links: {exc}")
            continue
        for raw_target in MARKDOWN_LINK_RE.findall(linkable_markdown(text)):
            target = resolve_markdown_target(source, raw_target)
            if target is None:
                continue
            try:
                target.relative_to(root)
            except ValueError:
                continue
            if not target.is_file():
                errors.append(
                    f"{source}: broken local Markdown link to {extract_target(raw_target)}"
                )
                continue
            inbound.setdefault(target, set()).add(source)
    return errors, inbound

def main() -> int:
    args = parse_args()
    root = args.docs_root.resolve()
    if not root.is_dir():
        print(f"error: documentation root does not exist: {root}", file=sys.stderr)
        return 2
    try:
        selected = select_files(root, args)
        required_inbound = [
            resolve_inside(root, path) for path in args.require_inbound
        ]
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    errors: list[str] = []
    normalization_preflight_failed = False
    if args.normalize_lf:
        prepared: dict[Path, bytes] = {}
        for path in selected:
            try:
                prepared[path] = prepare_normalized_lf(path)
            except ValueError as exc:
                errors.append(str(exc))
        normalization_preflight_failed = bool(errors)
        if not normalization_preflight_failed:
            for path, data in prepared.items():
                path.write_bytes(data)
    if not normalization_preflight_failed and not args.skip_format:
        for path in selected:
            errors.extend(validate_format(path))
    if not normalization_preflight_failed and not args.skip_links:
        link_errors, inbound = build_link_graph(root)
        errors.extend(link_errors)
        for path in required_inbound:
            if not path.is_file():
                errors.append(f"{path}: required inbound page does not exist")
            elif not (inbound.get(path, set()) - {path}):
                errors.append(f"{path}: no inbound Markdown link found from another page")
    if errors:
        shown_errors = errors if args.max_errors == 0 else errors[: args.max_errors]
        for error in shown_errors:
            print(f"ERROR: {error}", file=sys.stderr)
        omitted = len(errors) - len(shown_errors)
        if omitted:
            print(f"... {omitted} additional error(s) omitted.", file=sys.stderr)
        print(
            f"Validation failed with {len(errors)} error(s) across "
            f"{len(selected)} selected file(s).",
            file=sys.stderr,
        )
        return 1
    action = "Normalized and validated" if args.normalize_lf else "Validated"
    print(f"{action} {len(selected)} Markdown file(s) under {root}.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
