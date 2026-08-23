# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import json
import os
import sys
from pathlib import Path

os.environ.setdefault("MPLCONFIGDIR", "/tmp/wasmgpu-matplotlib")

try:
    import matplotlib.pyplot as plt
    import numpy as np
except ImportError as error:
    raise SystemExit(f"Analysis dependencies are unavailable ({error}). Install with: python3 -m pip install numpy matplotlib")

def load_run(run_dir):
    logs_dir = run_dir / "logs"
    manifests = [
        path for path in [
            logs_dir / "run.bench.json",
            logs_dir / "run.bench.local.json",
            run_dir / "run.json",
            run_dir / "run.local.json",
        ] if path.exists()
    ]
    if len(manifests) != 1:
        raise ValueError("Expected exactly one tracked or local benchmark run manifest.")
    manifest = json.loads(manifests[0].read_text())
    local = manifests[0].name.endswith(".local.json")
    modern = manifests[0].parent == logs_dir
    suffix = (".bench.local.json" if local else ".bench.json") if modern else (".local.json" if local else ".json")
    results_dir = logs_dir if modern else run_dir
    results = []
    for path in sorted(results_dir.glob(f"*{suffix}")):
        if path == manifests[0]:
            continue
        result = json.loads(path.read_text())
        if not {"name", "subsystem", "unit", "cases"} <= result.keys():
            raise ValueError(f"Malformed benchmark result: {path.name}")
        results.append(result)
    return manifest, results, local

def generate(run_dir):
    manifest, results, local = load_run(run_dir)
    artifact_marker = ".bench.local" if local else ".bench"
    plots = run_dir / "plots"
    plots.mkdir(exist_ok=True)
    adapter = manifest["adapter"]
    adapter_label = adapter.get("description") or adapter.get("device") or " / ".join(filter(None, [adapter.get("vendor"), adapter.get("architecture")])) or "unreported"
    machine = manifest["machine"]
    controller = manifest.get("controller", {"environment": "unknown", "platform": manifest.get("platform", "unknown"), "distro": None, "kernel": "unknown"})
    controller_label = " / ".join(filter(None, [controller.get("environment"), controller.get("platform"), controller.get("distro")]))
    browser = manifest["browser"]
    lines = [
        "# WasmGPU benchmark report",
        "",
        "## Environment",
        "",
        f"- Timestamp: {manifest['timestamp']}",
        f"- Machine: {machine['label']}",
        f"- Host OS: {machine['hostOS']}",
        f"- Environment: {machine['environment']}",
        f"- CPU: {machine['cpu']}",
        f"- GPU: {machine['gpu']}",
        f"- RAM: {machine['ram']}",
        f"- Storage: {machine['storage']}",
        f"- Controller: {controller_label}",
        f"- Controller kernel: {controller.get('kernel')}",
        f"- Node: {manifest['node']}",
        f"- Browser: {browser['name']} {browser['version']} on {browser.get('hostPlatform', 'unknown')} via {browser.get('connection', 'unknown')}",
        f"- WebGPU adapter: {adapter_label}",
        f"- Native adapter: {adapter.get('isNativeAdapter')}",
        f"- Fallback adapter: {adapter.get('isFallbackAdapter')}",
        f"- Mode: {manifest['mode']}",
        "",
        "## Results",
        "",
        "| Benchmark | Size | Median | Mean | p95 |", "|---|---:|---:|---:|---:|"
    ]
    for result in results:
        x, y = [], []
        for case in result["cases"]:
            stats = case["statistics"]
            lines.append(f"| {result['subsystem']}/{result['name']} | {case['size']:,} | {stats['median']:.4g} {result['unit']} | {stats['mean']:.4g} | {stats['p95']:.4g} |")
            x.append(case["size"])
            y.append(stats["median"])
        if len(x) > 1:
            figure, axis = plt.subplots(figsize=(7, 4))
            axis.plot(np.asarray(x), np.asarray(y), marker="o")
            axis.set_xscale("log")
            axis.set_xlabel("Workload size")
            axis.set_ylabel(f"Median ({result['unit']})")
            axis.set_title(result["name"])
            axis.grid(True, alpha=0.25)
            figure.tight_layout()
            figure.savefig(plots / f"{result['subsystem']}-{result['name']}{artifact_marker}.png", dpi=140)
            plt.close(figure)
    summary = run_dir / f"SUMMARY{artifact_marker}.md"
    summary.write_text("\n".join(lines) + "\n")
    print(f"Summary: {summary}")
    print(f"Plots: {plots}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python benchmarks/analysis/report.py <run-directory>")
    generate(Path(sys.argv[1]).resolve())
