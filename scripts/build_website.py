"""
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""

from __future__ import annotations
import shutil
import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
WEBSITE_DIR = ROOT_DIR / "website"
BUILD_DIR = WEBSITE_DIR / "build"
HOME_SOURCE_DIR = WEBSITE_DIR / "src" / "home"
EXAMPLES_PAGE_SOURCE_DIR = WEBSITE_DIR / "src" / "examples"
ASSETS_SOURCE_DIR = ROOT_DIR / "assets"
EXAMPLES_SOURCE_DIR = ROOT_DIR / "examples"
EXAMPLES_BUILD_DIR = BUILD_DIR / "examples"
MKDOCS_CONFIG_PATH = ROOT_DIR / "mkdocs.yaml"
DOCS_ASSETS_BUILD_DIR = BUILD_DIR / "docs" / "assets"
DIST_MINIFIED_SOURCE = ROOT_DIR / "dist" / "WasmGPU.min.js"
DIST_MINIFIED_BUILD = BUILD_DIR / "WasmGPU.min.js"
IIFE_SCRIPT_OLD = '<script src="../dist/WasmGPU.iife.min.js"></script>'
IIFE_SCRIPT_NEW = '<script src="https://cdn.jsdelivr.net/gh/Zushah/WasmGPU@0.8.0/dist/WasmGPU.iife.min.js"></script>'
ESM_IMPORT_OLD = 'import { WasmGPU } from "../dist/WasmGPU.min.js";'
ESM_IMPORT_NEW = 'import { WasmGPU } from "https://cdn.jsdelivr.net/gh/Zushah/WasmGPU@0.8.0/dist/WasmGPU.min.js";'

def ensure_required_paths() -> None:
    required_paths = [
        HOME_SOURCE_DIR,
        EXAMPLES_PAGE_SOURCE_DIR / "index.html",
        EXAMPLES_PAGE_SOURCE_DIR / "style.css",
        EXAMPLES_PAGE_SOURCE_DIR / "script.js",
        ASSETS_SOURCE_DIR,
        EXAMPLES_SOURCE_DIR,
        MKDOCS_CONFIG_PATH,
        DIST_MINIFIED_SOURCE
    ]
    for path in required_paths:
        if not path.exists():
            raise FileNotFoundError(f"Required path not found: {path}")

def reset_build_directory() -> None:
    if BUILD_DIR.exists():
        shutil.rmtree(BUILD_DIR)
    BUILD_DIR.mkdir(parents=True, exist_ok=True)

def copy_homepage_files() -> None:
    for item in HOME_SOURCE_DIR.iterdir():
        destination = BUILD_DIR / item.name
        if item.is_dir():
            shutil.copytree(item, destination, dirs_exist_ok=True)
        else:
            shutil.copy2(item, destination)

def copy_assets() -> None:
    shutil.copytree(ASSETS_SOURCE_DIR, BUILD_DIR / "assets", dirs_exist_ok=True)

def copy_dist_bundle() -> None:
    shutil.copy2(DIST_MINIFIED_SOURCE, DIST_MINIFIED_BUILD)

def copy_examples() -> None:
    EXAMPLES_BUILD_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy2(EXAMPLES_PAGE_SOURCE_DIR / "index.html", EXAMPLES_BUILD_DIR / "index.html")
    shutil.copy2(EXAMPLES_PAGE_SOURCE_DIR / "style.css", EXAMPLES_BUILD_DIR / "style.css")
    shutil.copy2(EXAMPLES_PAGE_SOURCE_DIR / "script.js", EXAMPLES_BUILD_DIR / "script.js")
    for source_file in sorted(EXAMPLES_SOURCE_DIR.glob("*.html")):
        destination = EXAMPLES_BUILD_DIR / source_file.name
        shutil.copy2(source_file, destination)
        rewrite_example_import_paths(destination)

def rewrite_example_import_paths(file_path: Path) -> None:
    content = file_path.read_text(encoding="utf-8")
    content = content.replace(IIFE_SCRIPT_OLD, IIFE_SCRIPT_NEW)
    content = content.replace(ESM_IMPORT_OLD, ESM_IMPORT_NEW)
    file_path.write_text(content, encoding="utf-8")

def build_docs() -> None:
    subprocess.run(
        [sys.executable, "-m", "mkdocs", "build", "-f", str(MKDOCS_CONFIG_PATH)],
        check=True,
        cwd=ROOT_DIR
    )

def copy_docs_assets() -> None:
    shutil.copytree(ASSETS_SOURCE_DIR, DOCS_ASSETS_BUILD_DIR, dirs_exist_ok=True)

def main() -> int:
    ensure_required_paths()
    reset_build_directory()
    copy_homepage_files()
    copy_assets()
    copy_dist_bundle()
    copy_examples()
    build_docs()
    copy_docs_assets()
    print(f"Website build complete at: {BUILD_DIR}")
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Website build failed: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
