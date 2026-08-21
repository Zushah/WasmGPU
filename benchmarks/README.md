# WasmGPU benchmarks

WasmGPU's benchmark suite in `./benchmarks/` measures performance-sensitive engine paths in a native Chromium-based browser. Runs require a verified hardware WebGPU adapter, as software, fallback, and unidentified adapters are rejected.

## Setup

Build the production bundle in `./release/`, copy `./benchmarks/machine.example.json` to `./benchmarks/machine.local.json`, and replace every value with the machine's actual facts. The browser-reported WebGPU adapter is captured separately and fallback/software adapters are rejected by normal runs.

```sh
npm run build
npm run bench
npm run restore
```

## Browser execution

On native hosts, Playwright launches the local Chromium browser with platform-appropriate WebGPU options. Adapter validation, rather than the launch path, determines whether a run is acceptable for performance reporting.

### WSL compatibility

In the Windows Subsystem for Linux (WSL), the launcher automatically bridges to native Windows Chrome or Edge over CDP so WebGPU can use the Windows graphics stack. Chrome's debugging endpoint remains on Windows loopback, and the bridge listens only on the private Windows WSL interface needed by the controller. Node, Playwright, the static server, repository files, and reports remain inside WSL, as the Windows browser loads the WSL-served page without another checkout or copied benchmark files. The launcher removes its isolated Windows browser profile and managed processes after the run.

The launcher checks system and per-user Chrome locations before Edge. If autodetection fails, pass a Windows or WSL executable path directly, or set the equivalent environment variable:

```sh
npm run bench -- --windows-browser="C:\Program Files\Google\Chrome\Application\chrome.exe"
WASMGPU_WINDOWS_BROWSER="/mnt/c/Program Files/Google/Chrome/Application/chrome.exe" npm run bench
```

Pass `--linux-browser` to force local Linux Chromium instead of the automatic Windows bridge. The same hardware/fallback adapter verification applies to this path, so it can produce a normal result whenever the Linux browser exposes a verifiable native adapter:

```sh
npm run bench -- --linux-browser
```

Add `--allow-fallback` only when intentionally diagnosing the harness with a software adapter.

## Modes

`npm run bench` uses the quick workloads. Use `npm run bench -- --full` for larger workloads and more samples. Subsystem commands include `npm run bench:render`, `npm run bench:compute`, `npm run bench:math`, `npm run bench:objects`, `npm run bench:scaling`, `npm run bench:gltf`, `npm run bench:interop`, and `npm run bench:interact`, and each one also accepts `--full`.

Benchmarks are located in `./benchmarks/<subsystem>/<owner>-<operation>-<type>.bench.js`. Each file contains its own setup, quick/full sizes, timed operation, metric, and cleanup. The manifest only registers those definitions; shared harness modules contain generic execution, statistics, and deterministic data helpers.

## Reports

Runs are located in `./benchmarks/reports/YYYY-MM-DD/HH-MM-SS/` with one environment manifest and one JSON file per benchmark. Ordinary files contain `.local` and are ignored by Git. Running with `--tracked` omits that marker so an archival report can be committed. Note that `--tracked` cannot be combined with `--allow-fallback`.

Each result preserves raw samples plus count, median, mean, p95, standard deviation, minimum, and maximum. Throughput and microbenchmarks batch repeated work until a meaningful minimum measurement interval is reached, whereas latency, frame, and end-to-end measurements are single-operation samples. Prefer the median for comparisons, inspect scaling across sizes, and remember that browser, backend, drivers, thermals, and machine load affect results.

Note that `--allow-fallback` exists only to diagnose the harness on machines without native WebGPU. The local run manifest records the override, as software-adapter results are not comparable performance baselines and cannot be tracked by the benchmark command. Reports also distinguish the controller environment from the browser host and record whether Playwright launched locally or attached over CDP.

## Analysis

Python analysis automatically occurs after benchmarking is complete, but JSON measurement succeeds independently of it. Install NumPy and Matplotlib, then generate a summary and plots for any run:

```sh
python -m pip install numpy matplotlib
python benchmarks/analysis/report.py benchmarks/reports/YYYY-MM-DD/HH-MM-SS
```

Tracked runs produce `./benchmarks/reports/YYYY-MM-DD/HH-MM-SS/SUMMARY.md` and `./benchmarks/reports/YYYY-MM-DD/HH-MM-SS/plots/`, whereas untracked runs produce the same but with `.local` in the filenames.
