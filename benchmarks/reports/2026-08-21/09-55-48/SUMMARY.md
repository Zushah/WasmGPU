# WasmGPU benchmark report

## Environment

- Timestamp: 2026-08-21T13:55:48.525Z
- Machine: Zushah's PC
- Host OS: Windows 11
- Environment: Ubuntu 24.04 under WSL2
- CPU: Intel Core i5-14400F
- GPU: NVIDIA GeForce RTX 4060
- RAM: 32 GB DDR5
- Storage: 1 TB NVMe
- Controller: wsl / linux / Ubuntu-24.04
- Controller kernel: 6.6.87.2-microsoft-standard-WSL2
- Node: v24.18.0
- Browser: chrome 151.0.7922.173 on windows via cdp
- WebGPU adapter: nvidia / lovelace
- Native adapter: True
- Fallback adapter: False
- Mode: full

## Results

| Benchmark | Size | Median | Mean | p95 |
|---|---:|---:|---:|---:|
| compute/cpundarray-index-get-set-throughput | 65,536 | 8.911e+06 operations/s | 8.779e+06 | 9.161e+06 |
| compute/cpundarray-index-get-set-throughput | 262,144 | 9.032e+06 operations/s | 8.705e+06 | 9.122e+06 |
| compute/cpundarray-index-get-set-throughput | 1,048,576 | 8.795e+06 operations/s | 8.661e+06 | 8.988e+06 |
| compute/kernels-copy-f32-throughput | 65,536 | 2.1 GB/s | 2.108 | 2.217 |
| compute/kernels-copy-f32-throughput | 1,048,576 | 34.95 GB/s | 34.34 | 35.76 |
| compute/kernels-copy-f32-throughput | 8,388,608 | 118.3 GB/s | 118.3 | 119.6 |
| compute/kernels-radix-sort-keys-u32-throughput | 16,384 | 1.018e+07 keys/s | 1.015e+07 | 1.123e+07 |
| compute/kernels-radix-sort-keys-u32-throughput | 262,144 | 1.619e+08 keys/s | 1.75e+08 | 2.138e+08 |
| compute/kernels-radix-sort-keys-u32-throughput | 2,097,152 | 2.257e+08 keys/s | 2.258e+08 | 2.419e+08 |
| compute/kernels-sum-f32-throughput | 65,536 | 5.276e+08 elements/s | 5.424e+08 | 5.907e+08 |
| compute/kernels-sum-f32-throughput | 1,048,576 | 7.922e+09 elements/s | 7.804e+09 | 8.397e+09 |
| compute/kernels-sum-f32-throughput | 8,388,608 | 4.937e+10 elements/s | 4.741e+10 | 4.971e+10 |
| gltf/accessors-read-interleaved-vec3-throughput | 262,144 | 6.374e+07 elements/s | 6.28e+07 | 6.801e+07 |
| gltf/accessors-read-interleaved-vec3-throughput | 1,048,576 | 6.658e+07 elements/s | 6.479e+07 | 7.048e+07 |
| gltf/accessors-read-interleaved-vec3-throughput | 4,194,304 | 6.754e+07 elements/s | 6.557e+07 | 7.175e+07 |
| interact/renderer-pointcloud-pick-latency | 65,536 | 0.65 ms | 0.725 | 1.205 |
| interact/renderer-pointcloud-pick-latency | 262,144 | 0.7 ms | 0.7333 | 0.99 |
| interop/webassembly-view-copy-throughput | 1,048,576 | 9.296 GB/s | 9.283 | 9.416 |
| interop/webassembly-view-copy-throughput | 4,194,304 | 8.766 GB/s | 8.272 | 8.952 |
| interop/webassembly-view-copy-throughput | 16,777,216 | 8.067 GB/s | 8.051 | 8.128 |
| math/mat4-mul-throughput | 10,000 | 1.774e+06 operations/s | 1.758e+06 | 2.126e+06 |
| math/mat4-mul-throughput | 100,000 | 9.064e+05 operations/s | 9.023e+05 | 9.746e+05 |
| math/mat4-mul-throughput | 500,000 | 9.059e+05 operations/s | 9.193e+05 | 9.839e+05 |
| math/mat4d-mul-throughput | 250,000 | 3.956e+07 operations/s | 3.922e+07 | 3.98e+07 |
| math/mat4d-mul-throughput | 1,000,000 | 3.949e+07 operations/s | 3.836e+07 | 3.972e+07 |
| math/mat4d-mul-throughput | 4,000,000 | 4.022e+07 operations/s | 4.002e+07 | 4.038e+07 |
| math/mat4f-mul-throughput | 250,000 | 7.168e+07 operations/s | 7.183e+07 | 7.435e+07 |
| math/mat4f-mul-throughput | 1,000,000 | 6.536e+07 operations/s | 6.502e+07 | 6.551e+07 |
| math/mat4f-mul-throughput | 4,000,000 | 5.225e+07 operations/s | 5.22e+07 | 5.249e+07 |
| math/transform-set-position-update-all-throughput | 8,192 | 1.33e+07 transforms/s | 1.297e+07 | 1.369e+07 |
| math/transform-set-position-update-all-throughput | 32,768 | 1.358e+07 transforms/s | 1.319e+07 | 1.381e+07 |
| math/transform-set-position-update-all-throughput | 65,536 | 1.342e+07 transforms/s | 1.292e+07 | 1.363e+07 |
| objects/glyphfield-set-cpu-data-upload-throughput | 16,384 | 5.86e+07 instances/s | 6.151e+07 | 7.504e+07 |
| objects/glyphfield-set-cpu-data-upload-throughput | 131,072 | 1.171e+08 instances/s | 1.137e+08 | 1.578e+08 |
| objects/glyphfield-set-cpu-data-upload-throughput | 524,288 | 4.932e+07 instances/s | 5.222e+07 | 6.366e+07 |
| objects/latticespace-set-data-upload-throughput | 16,384 | 2.798e+08 cells/s | 2.821e+08 | 3.095e+08 |
| objects/latticespace-set-data-upload-throughput | 131,072 | 4.673e+08 cells/s | 4.663e+08 | 5.032e+08 |
| objects/latticespace-set-data-upload-throughput | 524,288 | 5.05e+08 cells/s | 5.14e+08 | 6.056e+08 |
| objects/nodelink-update-node-positions-upload-throughput | 16,384 | 5.619e+07 nodes/s | 5.458e+07 | 5.932e+07 |
| objects/nodelink-update-node-positions-upload-throughput | 131,072 | 5.734e+07 nodes/s | 5.8e+07 | 6.543e+07 |
| objects/nodelink-update-node-positions-upload-throughput | 524,288 | 5.472e+07 nodes/s | 5.581e+07 | 6.201e+07 |
| objects/pointcloud-set-data-upload-throughput | 16,384 | 2.876e+08 points/s | 2.837e+08 | 3.467e+08 |
| objects/pointcloud-set-data-upload-throughput | 131,072 | 3.07e+08 points/s | 3.274e+08 | 4.89e+08 |
| objects/pointcloud-set-data-upload-throughput | 524,288 | 1.975e+08 points/s | 2.035e+08 | 2.518e+08 |
| objects/splatfield-refresh-wasm-upload-throughput | 16,384 | 5.846e+07 splats/s | 5.843e+07 | 5.991e+07 |
| objects/splatfield-refresh-wasm-upload-throughput | 131,072 | 7.621e+07 splats/s | 9.336e+07 | 1.425e+08 |
| objects/splatfield-refresh-wasm-upload-throughput | 524,288 | 4.979e+07 splats/s | 5.293e+07 | 7.109e+07 |
| render/renderer-pointcloud-render-frame | 65,536 | 2.75 ms/frame | 2.825 | 3.27 |
| render/renderer-pointcloud-render-frame | 262,144 | 1.85 ms/frame | 1.758 | 2.615 |
| render/renderer-pointcloud-render-frame | 1,048,576 | 1.1 ms/frame | 1.092 | 1.445 |
| scaling/scale-service-percentile-stats-latency | 65,536 | 4.1 ms | 5.225 | 10.02 |
| scaling/scale-service-percentile-stats-latency | 1,048,576 | 8.7 ms | 8.392 | 10.5 |
| scaling/scale-service-percentile-stats-latency | 8,388,608 | 16.2 ms | 16.47 | 19.08 |
