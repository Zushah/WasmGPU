# WasmGPU benchmark report

## Environment

- Timestamp: 2026-08-31T11:32:36.505Z
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
- Browser: chrome 152.0.7977.65 on windows via cdp
- WebGPU adapter: nvidia / lovelace
- Native adapter: True
- Fallback adapter: False
- Mode: full

## Results

| Benchmark | Size | Median | Mean | p95 |
|---|---:|---:|---:|---:|
| compute/compute-dispatch-batch-throughput | 16 | 3.14e+05 dispatches/s | 3.124e+05 | 3.427e+05 |
| compute/compute-dispatch-batch-throughput | 256 | 1.082e+06 dispatches/s | 1.082e+06 | 1.089e+06 |
| compute/compute-dispatch-batch-throughput | 2,048 | 1.114e+06 dispatches/s | 1.111e+06 | 1.126e+06 |
| compute/cpundarray-index-get-set-throughput | 65,536 | 3.432e+07 operations/s | 3.426e+07 | 3.461e+07 |
| compute/cpundarray-index-get-set-throughput | 262,144 | 3.345e+07 operations/s | 3.343e+07 | 3.372e+07 |
| compute/cpundarray-index-get-set-throughput | 1,048,576 | 3.313e+07 operations/s | 3.306e+07 | 3.331e+07 |
| compute/cpundarray-upload-to-gpu-throughput | 4,194,304 | 1.049e+10 bytes/s | 1.067e+10 | 1.118e+10 |
| compute/cpundarray-upload-to-gpu-throughput | 16,777,216 | 2.868e+09 bytes/s | 2.847e+09 | 2.893e+09 |
| compute/cpundarray-upload-to-gpu-throughput | 33,554,432 | 2.986e+09 bytes/s | 2.835e+09 | 3.016e+09 |
| compute/gpundarray-readback-to-cpu-throughput | 16,777,216 | 3.575e+09 bytes/s | 3.605e+09 | 5.162e+09 |
| compute/gpundarray-readback-to-cpu-throughput | 25,165,824 | 5.084e+09 bytes/s | 5.028e+09 | 5.122e+09 |
| compute/gpundarray-readback-to-cpu-throughput | 33,554,432 | 5.347e+09 bytes/s | 5.303e+09 | 5.4e+09 |
| compute/kernels-add-f32-throughput | 65,536 | 17.17 GB/s | 16.9 | 18.39 |
| compute/kernels-add-f32-throughput | 1,048,576 | 280.6 GB/s | 282.8 | 321.1 |
| compute/kernels-add-f32-throughput | 8,388,608 | 244.5 GB/s | 243.7 | 245 |
| compute/kernels-argmax-f32-throughput | 65,536 | 1.288e+09 elements/s | 1.195e+09 | 1.319e+09 |
| compute/kernels-argmax-f32-throughput | 1,048,576 | 2.032e+10 elements/s | 2.022e+10 | 2.172e+10 |
| compute/kernels-argmax-f32-throughput | 8,388,608 | 4.432e+10 elements/s | 4.439e+10 | 4.465e+10 |
| compute/kernels-argmin-f32-throughput | 65,536 | 1.277e+09 elements/s | 1.224e+09 | 1.339e+09 |
| compute/kernels-argmin-f32-throughput | 1,048,576 | 2.051e+10 elements/s | 1.968e+10 | 2.113e+10 |
| compute/kernels-argmin-f32-throughput | 8,388,608 | 4.453e+10 elements/s | 4.453e+10 | 4.474e+10 |
| compute/kernels-axpy-f32-throughput | 65,536 | 15.44 GB/s | 15.33 | 15.87 |
| compute/kernels-axpy-f32-throughput | 1,048,576 | 252.2 GB/s | 251.2 | 270.7 |
| compute/kernels-axpy-f32-throughput | 8,388,608 | 244.5 GB/s | 244.2 | 245.2 |
| compute/kernels-compact-f32-throughput | 8,388,608 | 7.849e+09 elements/s | 7.875e+09 | 8.037e+09 |
| compute/kernels-compact-f32-throughput | 12,582,912 | 8.234e+09 elements/s | 8.23e+09 | 8.283e+09 |
| compute/kernels-compact-f32-throughput | 16,776,960 | 8.116e+09 elements/s | 8.107e+09 | 8.219e+09 |
| compute/kernels-compact-u32-throughput | 8,388,608 | 7.966e+09 elements/s | 7.956e+09 | 8.048e+09 |
| compute/kernels-compact-u32-throughput | 12,582,912 | 8.029e+09 elements/s | 8.02e+09 | 8.093e+09 |
| compute/kernels-compact-u32-throughput | 16,776,960 | 8.153e+09 elements/s | 8.173e+09 | 8.302e+09 |
| compute/kernels-copy-f32-throughput | 65,536 | 5.736 GB/s | 5.65 | 6.136 |
| compute/kernels-copy-f32-throughput | 1,048,576 | 95.18 GB/s | 92.45 | 101.9 |
| compute/kernels-copy-f32-throughput | 8,388,608 | 118.6 GB/s | 118.6 | 119.1 |
| compute/kernels-dot-f32-throughput | 65,536 | 1.293e+09 elements/s | 1.146e+09 | 1.378e+09 |
| compute/kernels-dot-f32-throughput | 1,048,576 | 2.095e+10 elements/s | 1.985e+10 | 2.13e+10 |
| compute/kernels-dot-f32-throughput | 8,388,608 | 2.968e+10 elements/s | 2.973e+10 | 2.995e+10 |
| compute/kernels-gemm-c64-throughput | 128 | 316.6 GFLOP/s | 303.1 | 357 |
| compute/kernels-gemm-c64-throughput | 256 | 1958 GFLOP/s | 1984 | 2214 |
| compute/kernels-gemm-c64-throughput | 512 | 2965 GFLOP/s | 2958 | 3028 |
| compute/kernels-gemm-f32-throughput | 128 | 81.19 GFLOP/s | 79.57 | 85.46 |
| compute/kernels-gemm-f32-throughput | 256 | 652.6 GFLOP/s | 614.5 | 696.3 |
| compute/kernels-gemm-f32-throughput | 512 | 1147 GFLOP/s | 1148 | 1163 |
| compute/kernels-gemm-f32-throughput | 1,024 | 1217 GFLOP/s | 1215 | 1256 |
| compute/kernels-gemm-u32-throughput | 128 | 78.66 Gops/s | 76.6 | 80.93 |
| compute/kernels-gemm-u32-throughput | 256 | 691.7 Gops/s | 666 | 711.7 |
| compute/kernels-gemm-u32-throughput | 512 | 1177 Gops/s | 1175 | 1179 |
| compute/kernels-gemm-u32-throughput | 1,024 | 1245 Gops/s | 1246 | 1268 |
| compute/kernels-histogram-u32-throughput | 65,536 | 1.348e+09 elements/s | 1.299e+09 | 1.438e+09 |
| compute/kernels-histogram-u32-throughput | 1,048,576 | 2.256e+10 elements/s | 2.306e+10 | 2.511e+10 |
| compute/kernels-histogram-u32-throughput | 8,388,608 | 5.499e+10 elements/s | 5.514e+10 | 5.549e+10 |
| compute/kernels-min-f32-throughput | 65,536 | 1.324e+09 elements/s | 1.289e+09 | 1.352e+09 |
| compute/kernels-min-f32-throughput | 1,048,576 | 2.041e+10 elements/s | 2.076e+10 | 2.24e+10 |
| compute/kernels-min-f32-throughput | 8,388,608 | 4.965e+10 elements/s | 4.957e+10 | 4.974e+10 |
| compute/kernels-radix-sort-keys-u32-throughput | 16,384 | 3.67e+07 keys/s | 3.477e+07 | 3.792e+07 |
| compute/kernels-radix-sort-keys-u32-throughput | 262,144 | 4.205e+08 keys/s | 4.049e+08 | 4.237e+08 |
| compute/kernels-radix-sort-keys-u32-throughput | 2,097,152 | 5.51e+08 keys/s | 5.482e+08 | 5.69e+08 |
| compute/kernels-radix-sort-pairs-u32-throughput | 16,384 | 3.385e+07 elements/s | 3.364e+07 | 3.659e+07 |
| compute/kernels-radix-sort-pairs-u32-throughput | 262,144 | 3.815e+08 elements/s | 3.715e+08 | 3.859e+08 |
| compute/kernels-radix-sort-pairs-u32-throughput | 2,097,152 | 2.803e+08 elements/s | 2.819e+08 | 2.913e+08 |
| compute/kernels-scale-extract-f32-throughput | 65,536 | 1.328e+09 elements/s | 1.312e+09 | 1.423e+09 |
| compute/kernels-scale-extract-f32-throughput | 1,048,576 | 1.899e+10 elements/s | 1.849e+10 | 1.905e+10 |
| compute/kernels-scale-extract-f32-throughput | 8,388,608 | 1.02e+10 elements/s | 1.02e+10 | 1.031e+10 |
| compute/kernels-scale-histogram-f32-throughput | 65,536 | 1.332e+09 elements/s | 1.325e+09 | 1.38e+09 |
| compute/kernels-scale-histogram-f32-throughput | 1,048,576 | 2.066e+10 elements/s | 2.112e+10 | 2.326e+10 |
| compute/kernels-scale-histogram-f32-throughput | 8,388,608 | 5.464e+10 elements/s | 5.377e+10 | 5.492e+10 |
| compute/kernels-scale-remap-f32-throughput | 65,536 | 1.343e+09 elements/s | 1.34e+09 | 1.412e+09 |
| compute/kernels-scale-remap-f32-throughput | 1,048,576 | 2.291e+10 elements/s | 2.251e+10 | 2.394e+10 |
| compute/kernels-scale-remap-f32-throughput | 8,388,608 | 2.944e+10 elements/s | 2.947e+10 | 2.976e+10 |
| compute/kernels-scan-exclusive-u32-throughput | 65,536 | 1.22e+09 elements/s | 1.161e+09 | 1.248e+09 |
| compute/kernels-scan-exclusive-u32-throughput | 1,048,576 | 1.983e+10 elements/s | 1.928e+10 | 2.038e+10 |
| compute/kernels-scan-exclusive-u32-throughput | 8,388,608 | 1.498e+10 elements/s | 1.497e+10 | 1.507e+10 |
| compute/kernels-sum-f32-throughput | 65,536 | 1.317e+09 elements/s | 1.29e+09 | 1.346e+09 |
| compute/kernels-sum-f32-throughput | 1,048,576 | 2.059e+10 elements/s | 2.037e+10 | 2.126e+10 |
| compute/kernels-sum-f32-throughput | 8,388,608 | 4.937e+10 elements/s | 4.934e+10 | 4.971e+10 |
| compute/readbackring-read-throughput | 262,144 | 1.786e+08 bytes/s | 1.687e+08 | 2.096e+08 |
| compute/readbackring-read-throughput | 1,048,576 | 3.331e+08 bytes/s | 3.401e+08 | 3.839e+08 |
| compute/readbackring-read-throughput | 8,388,608 | 1.437e+09 bytes/s | 1.453e+09 | 1.605e+09 |
| compute/storagebuffer-write-throughput | 65,536 | 3.504e+09 bytes/s | 3.453e+09 | 3.543e+09 |
| compute/storagebuffer-write-throughput | 1,048,576 | 4.152e+09 bytes/s | 4.141e+09 | 4.191e+09 |
| compute/storagebuffer-write-throughput | 8,388,608 | 6.084e+09 bytes/s | 6.078e+09 | 6.148e+09 |
| gltf/accessors-read-interleaved-vec3-throughput | 262,144 | 1.361e+08 elements/s | 1.369e+08 | 1.426e+08 |
| gltf/accessors-read-interleaved-vec3-throughput | 1,048,576 | 1.284e+08 elements/s | 1.282e+08 | 1.323e+08 |
| gltf/accessors-read-interleaved-vec3-throughput | 4,194,304 | 1.3e+08 elements/s | 1.291e+08 | 1.368e+08 |
| interact/renderer-pointcloud-pick-latency | 65,536 | 2.95 ms | 3.05 | 3.915 |
| interact/renderer-pointcloud-pick-latency | 262,144 | 2.95 ms | 2.958 | 3.545 |
| interop/python-to-cpundarray-throughput | 1,048,576 | 3.818e+10 bytes/s | 3.797e+10 | 3.841e+10 |
| interop/python-to-cpundarray-throughput | 4,194,304 | 3.133e+10 bytes/s | 3.06e+10 | 3.213e+10 |
| interop/python-to-cpundarray-throughput | 16,777,216 | 1.95e+10 bytes/s | 1.931e+10 | 1.979e+10 |
| interop/python-to-gpundarray-throughput | 1,048,576 | 1.049e+10 bytes/s | 1.054e+10 | 1.398e+10 |
| interop/python-to-gpundarray-throughput | 4,194,304 | 9.869e+09 bytes/s | 9.424e+09 | 1.08e+10 |
| interop/python-to-gpundarray-throughput | 16,777,216 | 9.587e+09 bytes/s | 9.625e+09 | 9.869e+09 |
| interop/webassembly-view-copy-throughput | 1,048,576 | 38.35 GB/s | 38.24 | 39.26 |
| interop/webassembly-view-copy-throughput | 4,194,304 | 32.71 GB/s | 32.27 | 34.44 |
| interop/webassembly-view-copy-throughput | 16,777,216 | 20.11 GB/s | 20.06 | 20.31 |
| math/mat4-mul-throughput | 10,000 | 2.207e+06 operations/s | 2.186e+06 | 2.436e+06 |
| math/mat4-mul-throughput | 100,000 | 2.363e+06 operations/s | 2.361e+06 | 2.401e+06 |
| math/mat4-mul-throughput | 500,000 | 2.371e+06 operations/s | 2.366e+06 | 2.401e+06 |
| math/mat4d-mul-throughput | 250,000 | 5.253e+07 operations/s | 5.242e+07 | 5.34e+07 |
| math/mat4d-mul-throughput | 1,000,000 | 5.249e+07 operations/s | 5.254e+07 | 5.311e+07 |
| math/mat4d-mul-throughput | 4,000,000 | 5.384e+07 operations/s | 5.344e+07 | 5.391e+07 |
| math/mat4f-mul-throughput | 250,000 | 1.283e+08 operations/s | 1.282e+08 | 1.289e+08 |
| math/mat4f-mul-throughput | 1,000,000 | 1.246e+08 operations/s | 1.244e+08 | 1.249e+08 |
| math/mat4f-mul-throughput | 4,000,000 | 1.246e+08 operations/s | 1.244e+08 | 1.25e+08 |
| math/transform-set-position-update-all-throughput | 8,192 | 2.873e+07 transforms/s | 2.867e+07 | 2.908e+07 |
| math/transform-set-position-update-all-throughput | 32,768 | 2.847e+07 transforms/s | 2.853e+07 | 2.912e+07 |
| math/transform-set-position-update-all-throughput | 65,536 | 2.743e+07 transforms/s | 2.743e+07 | 2.777e+07 |
| objects/glyphfield-set-cpu-data-upload-throughput | 16,384 | 6.803e+07 instances/s | 6.805e+07 | 6.876e+07 |
| objects/glyphfield-set-cpu-data-upload-throughput | 131,072 | 6.533e+07 instances/s | 6.45e+07 | 6.572e+07 |
| objects/glyphfield-set-cpu-data-upload-throughput | 524,288 | 9.259e+07 instances/s | 9.266e+07 | 9.369e+07 |
| objects/latticespace-set-data-upload-throughput | 16,384 | 3.718e+08 cells/s | 3.759e+08 | 4.09e+08 |
| objects/latticespace-set-data-upload-throughput | 131,072 | 4.909e+08 cells/s | 4.894e+08 | 4.959e+08 |
| objects/latticespace-set-data-upload-throughput | 524,288 | 5.673e+08 cells/s | 5.67e+08 | 6.141e+08 |
| objects/nodelink-update-node-positions-upload-throughput | 16,384 | 7.757e+07 nodes/s | 7.831e+07 | 8.467e+07 |
| objects/nodelink-update-node-positions-upload-throughput | 131,072 | 8.192e+07 nodes/s | 8.067e+07 | 8.665e+07 |
| objects/nodelink-update-node-positions-upload-throughput | 524,288 | 1.052e+08 nodes/s | 1.049e+08 | 1.094e+08 |
| objects/pointcloud-set-data-upload-throughput | 16,384 | 2.567e+08 points/s | 2.555e+08 | 2.579e+08 |
| objects/pointcloud-set-data-upload-throughput | 131,072 | 2.73e+08 points/s | 2.715e+08 | 2.75e+08 |
| objects/pointcloud-set-data-upload-throughput | 524,288 | 3.895e+08 points/s | 3.882e+08 | 3.939e+08 |
| objects/splatfield-refresh-wasm-upload-throughput | 16,384 | 6.695e+07 splats/s | 6.689e+07 | 6.737e+07 |
| objects/splatfield-refresh-wasm-upload-throughput | 131,072 | 6.214e+07 splats/s | 6.223e+07 | 6.571e+07 |
| objects/splatfield-refresh-wasm-upload-throughput | 524,288 | 9.254e+07 splats/s | 9.207e+07 | 9.3e+07 |
| render/renderer-antialias-render-frame | 1,280 | 2.8 ms/frame | 2.783 | 3.36 |
| render/renderer-antialias-render-frame | 2,400 | 5.55 ms/frame | 5.542 | 5.88 |
| render/renderer-antialias-render-frame | 3,200 | 7.1 ms/frame | 7.308 | 8.835 |
| render/renderer-data-material-render-frame | 262,144 | 2.75 ms/frame | 2.567 | 2.9 |
| render/renderer-data-material-render-frame | 2,097,152 | 5.65 ms/frame | 5.9 | 7.16 |
| render/renderer-data-material-render-frame | 8,388,608 | 5.35 ms/frame | 5.008 | 5.645 |
| render/renderer-directional-shadows-render-frame | 8 | 2.7 ms/frame | 2.333 | 2.89 |
| render/renderer-directional-shadows-render-frame | 128 | 2.8 ms/frame | 2.775 | 2.9 |
| render/renderer-directional-shadows-render-frame | 512 | 2.75 ms/frame | 2.758 | 3.625 |
| render/renderer-frustum-culling-render-frame | 128 | 0.5 ms/frame | 0.85 | 2.69 |
| render/renderer-frustum-culling-render-frame | 2,048 | 0.8 ms/frame | 0.7917 | 0.9 |
| render/renderer-frustum-culling-render-frame | 8,192 | 3.6 ms/frame | 3.275 | 5.015 |
| render/renderer-glyphfield-render-frame | 16,384 | 2.8 ms/frame | 2.783 | 3.135 |
| render/renderer-glyphfield-render-frame | 131,072 | 5.6 ms/frame | 5.625 | 6 |
| render/renderer-glyphfield-render-frame | 524,288 | 15.05 ms/frame | 15.23 | 16.16 |
| render/renderer-latticespace-render-frame | 32,768 | 2.7 ms/frame | 2.783 | 3.2 |
| render/renderer-latticespace-render-frame | 262,144 | 2.75 ms/frame | 2.75 | 3.145 |
| render/renderer-latticespace-render-frame | 1,000,000 | 7 ms/frame | 7.033 | 7.97 |
| render/renderer-many-meshes-render-frame | 64 | 0.5 ms/frame | 0.5167 | 0.69 |
| render/renderer-many-meshes-render-frame | 1,024 | 1.3 ms/frame | 1.592 | 3.145 |
| render/renderer-many-meshes-render-frame | 4,096 | 2.8 ms/frame | 2.758 | 3.645 |
| render/renderer-many-pointclouds-render-frame | 16 | 2.05 ms/frame | 1.625 | 2.7 |
| render/renderer-many-pointclouds-render-frame | 256 | 2.85 ms/frame | 2.775 | 3.045 |
| render/renderer-many-pointclouds-render-frame | 1,024 | 4.25 ms/frame | 3.908 | 4.9 |
| render/renderer-mesh-render-frame | 262,144 | 2.8 ms/frame | 2.775 | 3.245 |
| render/renderer-mesh-render-frame | 2,097,152 | 2.7 ms/frame | 2.675 | 3.145 |
| render/renderer-mesh-render-frame | 8,388,608 | 3 ms/frame | 3.492 | 4.96 |
| render/renderer-mixed-materials-render-frame | 64 | 0.5 ms/frame | 1.225 | 2.845 |
| render/renderer-mixed-materials-render-frame | 1,024 | 2.55 ms/frame | 2.367 | 4.495 |
| render/renderer-mixed-materials-render-frame | 4,096 | 3.9 ms/frame | 3.167 | 4 |
| render/renderer-mixed-scientific-scene-render-frame | 4 | 2.8 ms/frame | 2.783 | 3.045 |
| render/renderer-mixed-scientific-scene-render-frame | 16 | 5.5 ms/frame | 5.558 | 5.8 |
| render/renderer-mixed-scientific-scene-render-frame | 64 | 10.35 ms/frame | 10.43 | 11.67 |
| render/renderer-nodelink-render-frame | 1,024 | 2.65 ms/frame | 2.525 | 3.035 |
| render/renderer-nodelink-render-frame | 16,384 | 2.85 ms/frame | 3 | 4.235 |
| render/renderer-nodelink-render-frame | 65,536 | 5.6 ms/frame | 5.992 | 7.195 |
| render/renderer-occlusion-culling-render-frame | 64 | 1.8 ms/frame | 1.775 | 2.945 |
| render/renderer-occlusion-culling-render-frame | 512 | 1.85 ms/frame | 2.25 | 3.845 |
| render/renderer-occlusion-culling-render-frame | 2,048 | 4.2 ms/frame | 3.6 | 4.535 |
| render/renderer-pointcloud-render-frame | 65,536 | 2.5 ms/frame | 2.075 | 2.9 |
| render/renderer-pointcloud-render-frame | 262,144 | 2.85 ms/frame | 2.8 | 3.045 |
| render/renderer-pointcloud-render-frame | 1,048,576 | 2.75 ms/frame | 2.758 | 3.1 |
| render/renderer-splatfield-render-frame | 65,536 | 2.6 ms/frame | 2.508 | 2.945 |
| render/renderer-splatfield-render-frame | 262,144 | 2.7 ms/frame | 2.75 | 3.305 |
| render/renderer-splatfield-render-frame | 1,048,576 | 2.95 ms/frame | 3.033 | 4.03 |
| render/renderer-transmission-mesh-render-frame | 16 | 2.8 ms/frame | 2.75 | 3 |
| render/renderer-transmission-mesh-render-frame | 256 | 2.85 ms/frame | 2.775 | 3.225 |
| render/renderer-transmission-mesh-render-frame | 1,024 | 4.4 ms/frame | 4.275 | 5.435 |
| render/renderer-transparent-mesh-render-frame | 64 | 0.65 ms/frame | 1.125 | 2.735 |
| render/renderer-transparent-mesh-render-frame | 1,024 | 3.4 ms/frame | 3.233 | 4.585 |
| render/renderer-transparent-mesh-render-frame | 4,096 | 6.4 ms/frame | 6.342 | 6.645 |
| scaling/scale-service-percentile-stats-latency | 65,536 | 7.45 ms | 6.75 | 9.08 |
| scaling/scale-service-percentile-stats-latency | 1,048,576 | 8.25 ms | 7.667 | 10.13 |
| scaling/scale-service-percentile-stats-latency | 8,388,608 | 15.25 ms | 15.41 | 17.17 |
