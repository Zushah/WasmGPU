# WasmGPU benchmark report

## Environment

- Timestamp: 2026-08-29T21:16:37.732Z
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
- Browser: chrome 151.0.7922.175 on windows via cdp
- WebGPU adapter: nvidia / lovelace
- Native adapter: True
- Fallback adapter: False
- Mode: full

## Results

| Benchmark | Size | Median | Mean | p95 |
|---|---:|---:|---:|---:|
| compute/compute-dispatch-batch-throughput | 16 | 2.841e+05 dispatches/s | 2.821e+05 | 3.15e+05 |
| compute/compute-dispatch-batch-throughput | 256 | 1.082e+06 dispatches/s | 1.08e+06 | 1.087e+06 |
| compute/compute-dispatch-batch-throughput | 2,048 | 1.122e+06 dispatches/s | 1.121e+06 | 1.134e+06 |
| compute/cpundarray-index-get-set-throughput | 65,536 | 3.324e+07 operations/s | 3.278e+07 | 3.358e+07 |
| compute/cpundarray-index-get-set-throughput | 262,144 | 3.342e+07 operations/s | 3.343e+07 | 3.366e+07 |
| compute/cpundarray-index-get-set-throughput | 1,048,576 | 3.324e+07 operations/s | 3.318e+07 | 3.342e+07 |
| compute/cpundarray-upload-to-gpu-throughput | 4,194,304 | 9.869e+09 bytes/s | 9.627e+09 | 1.08e+10 |
| compute/cpundarray-upload-to-gpu-throughput | 16,777,216 | 2.523e+09 bytes/s | 2.527e+09 | 2.586e+09 |
| compute/cpundarray-upload-to-gpu-throughput | 33,554,432 | 2.976e+09 bytes/s | 2.902e+09 | 3.012e+09 |
| compute/gpundarray-readback-to-cpu-throughput | 16,777,216 | 5.203e+09 bytes/s | 5.169e+09 | 5.284e+09 |
| compute/gpundarray-readback-to-cpu-throughput | 25,165,824 | 5.097e+09 bytes/s | 4.924e+09 | 5.323e+09 |
| compute/gpundarray-readback-to-cpu-throughput | 33,554,432 | 5.305e+09 bytes/s | 5.267e+09 | 5.39e+09 |
| compute/kernels-add-f32-throughput | 65,536 | 17.09 GB/s | 16.55 | 17.36 |
| compute/kernels-add-f32-throughput | 1,048,576 | 285.6 GB/s | 277.6 | 293.1 |
| compute/kernels-add-f32-throughput | 8,388,608 | 243.6 GB/s | 242.9 | 244.7 |
| compute/kernels-argmax-f32-throughput | 65,536 | 1.286e+09 elements/s | 1.175e+09 | 1.329e+09 |
| compute/kernels-argmax-f32-throughput | 1,048,576 | 1.985e+10 elements/s | 1.94e+10 | 2.079e+10 |
| compute/kernels-argmax-f32-throughput | 8,388,608 | 4.41e+10 elements/s | 4.41e+10 | 4.421e+10 |
| compute/kernels-argmin-f32-throughput | 65,536 | 1.276e+09 elements/s | 1.214e+09 | 1.319e+09 |
| compute/kernels-argmin-f32-throughput | 1,048,576 | 1.977e+10 elements/s | 1.914e+10 | 2.09e+10 |
| compute/kernels-argmin-f32-throughput | 8,388,608 | 4.419e+10 elements/s | 4.423e+10 | 4.442e+10 |
| compute/kernels-axpy-f32-throughput | 65,536 | 14.89 GB/s | 13.79 | 15.44 |
| compute/kernels-axpy-f32-throughput | 1,048,576 | 246.9 GB/s | 240.2 | 255.2 |
| compute/kernels-axpy-f32-throughput | 8,388,608 | 244.5 GB/s | 243.6 | 245 |
| compute/kernels-compact-f32-throughput | 8,388,608 | 8.001e+09 elements/s | 7.989e+09 | 8.17e+09 |
| compute/kernels-compact-f32-throughput | 12,582,912 | 8.11e+09 elements/s | 8.082e+09 | 8.151e+09 |
| compute/kernels-compact-f32-throughput | 16,776,960 | 8.171e+09 elements/s | 8.177e+09 | 8.221e+09 |
| compute/kernels-compact-u32-throughput | 8,388,608 | 7.965e+09 elements/s | 7.982e+09 | 8.143e+09 |
| compute/kernels-compact-u32-throughput | 12,582,912 | 8.069e+09 elements/s | 8.09e+09 | 8.214e+09 |
| compute/kernels-compact-u32-throughput | 16,776,960 | 8.165e+09 elements/s | 8.144e+09 | 8.208e+09 |
| compute/kernels-copy-f32-throughput | 65,536 | 5.783 GB/s | 5.568 | 5.901 |
| compute/kernels-copy-f32-throughput | 1,048,576 | 95.73 GB/s | 92.61 | 100.2 |
| compute/kernels-copy-f32-throughput | 8,388,608 | 116.3 GB/s | 115.5 | 117.8 |
| compute/kernels-dot-f32-throughput | 65,536 | 1.293e+09 elements/s | 1.26e+09 | 1.326e+09 |
| compute/kernels-dot-f32-throughput | 1,048,576 | 1.976e+10 elements/s | 1.833e+10 | 2.039e+10 |
| compute/kernels-dot-f32-throughput | 8,388,608 | 2.974e+10 elements/s | 2.976e+10 | 2.989e+10 |
| compute/kernels-gemm-c64-throughput | 128 | 321.7 GFLOP/s | 316.6 | 350.8 |
| compute/kernels-gemm-c64-throughput | 256 | 2229 GFLOP/s | 2148 | 2258 |
| compute/kernels-gemm-c64-throughput | 512 | 2954 GFLOP/s | 2934 | 3007 |
| compute/kernels-gemm-f32-throughput | 128 | 77.88 GFLOP/s | 76.74 | 83.54 |
| compute/kernels-gemm-f32-throughput | 256 | 671.2 GFLOP/s | 632.1 | 697 |
| compute/kernels-gemm-f32-throughput | 512 | 1147 GFLOP/s | 1148 | 1154 |
| compute/kernels-gemm-f32-throughput | 1,024 | 1216 GFLOP/s | 1217 | 1241 |
| compute/kernels-gemm-u32-throughput | 128 | 79.39 Gops/s | 78.68 | 82.9 |
| compute/kernels-gemm-u32-throughput | 256 | 677.5 Gops/s | 641.8 | 709.3 |
| compute/kernels-gemm-u32-throughput | 512 | 1169 Gops/s | 1170 | 1174 |
| compute/kernels-gemm-u32-throughput | 1,024 | 1235 Gops/s | 1236 | 1273 |
| compute/kernels-histogram-u32-throughput | 65,536 | 1.316e+09 elements/s | 1.219e+09 | 1.392e+09 |
| compute/kernels-histogram-u32-throughput | 1,048,576 | 2.263e+10 elements/s | 2.124e+10 | 2.397e+10 |
| compute/kernels-histogram-u32-throughput | 8,388,608 | 5.492e+10 elements/s | 5.499e+10 | 5.526e+10 |
| compute/kernels-min-f32-throughput | 65,536 | 1.311e+09 elements/s | 1.224e+09 | 1.391e+09 |
| compute/kernels-min-f32-throughput | 1,048,576 | 2.022e+10 elements/s | 1.987e+10 | 2.207e+10 |
| compute/kernels-min-f32-throughput | 8,388,608 | 4.926e+10 elements/s | 4.884e+10 | 4.968e+10 |
| compute/kernels-radix-sort-keys-u32-throughput | 16,384 | 3.673e+07 keys/s | 3.525e+07 | 3.88e+07 |
| compute/kernels-radix-sort-keys-u32-throughput | 262,144 | 4.221e+08 keys/s | 4.06e+08 | 4.261e+08 |
| compute/kernels-radix-sort-keys-u32-throughput | 2,097,152 | 5.542e+08 keys/s | 5.509e+08 | 5.707e+08 |
| compute/kernels-radix-sort-pairs-u32-throughput | 16,384 | 3.218e+07 elements/s | 3.197e+07 | 3.703e+07 |
| compute/kernels-radix-sort-pairs-u32-throughput | 262,144 | 3.804e+08 elements/s | 3.662e+08 | 3.848e+08 |
| compute/kernels-radix-sort-pairs-u32-throughput | 2,097,152 | 3.042e+08 elements/s | 3.034e+08 | 3.078e+08 |
| compute/kernels-scale-extract-f32-throughput | 65,536 | 1.256e+09 elements/s | 1.19e+09 | 1.326e+09 |
| compute/kernels-scale-extract-f32-throughput | 1,048,576 | 1.954e+10 elements/s | 1.902e+10 | 1.977e+10 |
| compute/kernels-scale-extract-f32-throughput | 8,388,608 | 1.023e+10 elements/s | 1.024e+10 | 1.032e+10 |
| compute/kernels-scale-histogram-f32-throughput | 65,536 | 1.271e+09 elements/s | 1.253e+09 | 1.282e+09 |
| compute/kernels-scale-histogram-f32-throughput | 1,048,576 | 2.062e+10 elements/s | 2.012e+10 | 2.227e+10 |
| compute/kernels-scale-histogram-f32-throughput | 8,388,608 | 5.43e+10 elements/s | 5.432e+10 | 5.47e+10 |
| compute/kernels-scale-remap-f32-throughput | 65,536 | 1.269e+09 elements/s | 1.25e+09 | 1.353e+09 |
| compute/kernels-scale-remap-f32-throughput | 1,048,576 | 2.043e+10 elements/s | 1.997e+10 | 2.149e+10 |
| compute/kernels-scale-remap-f32-throughput | 8,388,608 | 2.964e+10 elements/s | 2.956e+10 | 2.974e+10 |
| compute/kernels-scan-exclusive-u32-throughput | 65,536 | 1.146e+09 elements/s | 1.089e+09 | 1.212e+09 |
| compute/kernels-scan-exclusive-u32-throughput | 1,048,576 | 1.828e+10 elements/s | 1.739e+10 | 1.98e+10 |
| compute/kernels-scan-exclusive-u32-throughput | 8,388,608 | 1.505e+10 elements/s | 1.508e+10 | 1.517e+10 |
| compute/kernels-sum-f32-throughput | 65,536 | 1.294e+09 elements/s | 1.193e+09 | 1.349e+09 |
| compute/kernels-sum-f32-throughput | 1,048,576 | 2e+10 elements/s | 1.929e+10 | 2.063e+10 |
| compute/kernels-sum-f32-throughput | 8,388,608 | 4.96e+10 elements/s | 4.957e+10 | 4.965e+10 |
| compute/readbackring-read-throughput | 262,144 | 1.424e+08 bytes/s | 1.467e+08 | 1.817e+08 |
| compute/readbackring-read-throughput | 1,048,576 | 3.071e+08 bytes/s | 3.071e+08 | 3.324e+08 |
| compute/readbackring-read-throughput | 8,388,608 | 1.506e+09 bytes/s | 1.481e+09 | 1.575e+09 |
| compute/storagebuffer-write-throughput | 65,536 | 6.644e+09 bytes/s | 6.618e+09 | 6.823e+09 |
| compute/storagebuffer-write-throughput | 1,048,576 | 1.211e+10 bytes/s | 1.21e+10 | 1.216e+10 |
| compute/storagebuffer-write-throughput | 8,388,608 | 6.032e+09 bytes/s | 6.023e+09 | 6.149e+09 |
| gltf/accessors-read-interleaved-vec3-throughput | 262,144 | 1.361e+08 elements/s | 1.346e+08 | 1.415e+08 |
| gltf/accessors-read-interleaved-vec3-throughput | 1,048,576 | 1.289e+08 elements/s | 1.266e+08 | 1.304e+08 |
| gltf/accessors-read-interleaved-vec3-throughput | 4,194,304 | 1.251e+08 elements/s | 1.243e+08 | 1.359e+08 |
| interact/renderer-pointcloud-pick-latency | 65,536 | 2.75 ms | 2.5 | 4.3 |
| interact/renderer-pointcloud-pick-latency | 262,144 | 2.7 ms | 2.775 | 3.08 |
| interop/python-to-cpundarray-throughput | 1,048,576 | 3.771e+10 bytes/s | 3.765e+10 | 3.824e+10 |
| interop/python-to-cpundarray-throughput | 4,194,304 | 3.149e+10 bytes/s | 3.139e+10 | 3.179e+10 |
| interop/python-to-cpundarray-throughput | 16,777,216 | 1.949e+10 bytes/s | 1.928e+10 | 1.961e+10 |
| interop/python-to-gpundarray-throughput | 1,048,576 | 6.491e+09 bytes/s | 7.82e+09 | 1.398e+10 |
| interop/python-to-gpundarray-throughput | 4,194,304 | 5.243e+09 bytes/s | 5.306e+09 | 5.592e+09 |
| interop/python-to-gpundarray-throughput | 16,777,216 | 5.785e+09 bytes/s | 5.731e+09 | 5.836e+09 |
| interop/webassembly-view-copy-throughput | 1,048,576 | 37.68 GB/s | 37.56 | 38.07 |
| interop/webassembly-view-copy-throughput | 4,194,304 | 31.3 GB/s | 30.82 | 31.62 |
| interop/webassembly-view-copy-throughput | 16,777,216 | 19.63 GB/s | 19.37 | 19.94 |
| math/mat4-mul-throughput | 10,000 | 2.025e+06 operations/s | 2.007e+06 | 2.214e+06 |
| math/mat4-mul-throughput | 100,000 | 2.265e+06 operations/s | 2.266e+06 | 2.302e+06 |
| math/mat4-mul-throughput | 500,000 | 2.287e+06 operations/s | 2.285e+06 | 2.314e+06 |
| math/mat4d-mul-throughput | 250,000 | 5.78e+07 operations/s | 5.721e+07 | 5.842e+07 |
| math/mat4d-mul-throughput | 1,000,000 | 5.827e+07 operations/s | 5.796e+07 | 5.86e+07 |
| math/mat4d-mul-throughput | 4,000,000 | 5.801e+07 operations/s | 5.796e+07 | 5.83e+07 |
| math/mat4f-mul-throughput | 250,000 | 1.441e+08 operations/s | 1.437e+08 | 1.456e+08 |
| math/mat4f-mul-throughput | 1,000,000 | 1.372e+08 operations/s | 1.37e+08 | 1.382e+08 |
| math/mat4f-mul-throughput | 4,000,000 | 1.371e+08 operations/s | 1.371e+08 | 1.384e+08 |
| math/transform-set-position-update-all-throughput | 8,192 | 2.855e+07 transforms/s | 2.846e+07 | 2.89e+07 |
| math/transform-set-position-update-all-throughput | 32,768 | 2.819e+07 transforms/s | 2.822e+07 | 2.853e+07 |
| math/transform-set-position-update-all-throughput | 65,536 | 2.656e+07 transforms/s | 2.658e+07 | 2.716e+07 |
| objects/glyphfield-set-cpu-data-upload-throughput | 16,384 | 1.849e+08 instances/s | 1.826e+08 | 1.865e+08 |
| objects/glyphfield-set-cpu-data-upload-throughput | 131,072 | 1.587e+08 instances/s | 1.583e+08 | 1.598e+08 |
| objects/glyphfield-set-cpu-data-upload-throughput | 524,288 | 9.316e+07 instances/s | 9.211e+07 | 9.42e+07 |
| objects/latticespace-set-data-upload-throughput | 16,384 | 4.693e+08 cells/s | 4.766e+08 | 5.479e+08 |
| objects/latticespace-set-data-upload-throughput | 131,072 | 8.129e+08 cells/s | 8.488e+08 | 9.579e+08 |
| objects/latticespace-set-data-upload-throughput | 524,288 | 8.985e+08 cells/s | 9.176e+08 | 1.184e+09 |
| objects/nodelink-update-node-positions-upload-throughput | 16,384 | 1.058e+08 nodes/s | 1.047e+08 | 1.162e+08 |
| objects/nodelink-update-node-positions-upload-throughput | 131,072 | 1.04e+08 nodes/s | 1.041e+08 | 1.111e+08 |
| objects/nodelink-update-node-positions-upload-throughput | 524,288 | 1.012e+08 nodes/s | 1.02e+08 | 1.112e+08 |
| objects/pointcloud-set-data-upload-throughput | 16,384 | 6.22e+08 points/s | 6.249e+08 | 6.513e+08 |
| objects/pointcloud-set-data-upload-throughput | 131,072 | 6.22e+08 points/s | 6.106e+08 | 6.284e+08 |
| objects/pointcloud-set-data-upload-throughput | 524,288 | 3.893e+08 points/s | 3.861e+08 | 3.942e+08 |
| objects/splatfield-refresh-wasm-upload-throughput | 16,384 | 1.824e+08 splats/s | 1.797e+08 | 1.843e+08 |
| objects/splatfield-refresh-wasm-upload-throughput | 131,072 | 1.544e+08 splats/s | 1.526e+08 | 1.571e+08 |
| objects/splatfield-refresh-wasm-upload-throughput | 524,288 | 9.244e+07 splats/s | 9.172e+07 | 9.404e+07 |
| render/renderer-antialias-render-frame | 1,280 | 2.8 ms/frame | 3.217 | 5.15 |
| render/renderer-antialias-render-frame | 2,400 | 5.6 ms/frame | 5.692 | 6.395 |
| render/renderer-antialias-render-frame | 3,200 | 6.6 ms/frame | 6.8 | 7.6 |
| render/renderer-data-material-render-frame | 262,144 | 2.75 ms/frame | 2.775 | 3 |
| render/renderer-data-material-render-frame | 2,097,152 | 5.25 ms/frame | 5.217 | 6.18 |
| render/renderer-data-material-render-frame | 8,388,608 | 5.55 ms/frame | 5.55 | 6.2 |
| render/renderer-directional-shadows-render-frame | 8 | 2.7 ms/frame | 2.542 | 2.99 |
| render/renderer-directional-shadows-render-frame | 128 | 2.85 ms/frame | 2.8 | 2.945 |
| render/renderer-directional-shadows-render-frame | 512 | 3.3 ms/frame | 3.058 | 3.945 |
| render/renderer-frustum-culling-render-frame | 128 | 0.5 ms/frame | 0.5 | 0.745 |
| render/renderer-frustum-culling-render-frame | 2,048 | 2.85 ms/frame | 2.808 | 3.09 |
| render/renderer-frustum-culling-render-frame | 8,192 | 3.4 ms/frame | 3 | 4.37 |
| render/renderer-glyphfield-render-frame | 16,384 | 2.7 ms/frame | 2.733 | 3.145 |
| render/renderer-glyphfield-render-frame | 131,072 | 5.6 ms/frame | 5.608 | 6.16 |
| render/renderer-glyphfield-render-frame | 524,288 | 14.8 ms/frame | 14.9 | 16.59 |
| render/renderer-latticespace-render-frame | 32,768 | 2.75 ms/frame | 2.775 | 3.1 |
| render/renderer-latticespace-render-frame | 262,144 | 2.85 ms/frame | 2.883 | 3.4 |
| render/renderer-latticespace-render-frame | 1,000,000 | 6.8 ms/frame | 7.167 | 8.445 |
| render/renderer-many-meshes-render-frame | 64 | 0.7 ms/frame | 1.333 | 2.845 |
| render/renderer-many-meshes-render-frame | 1,024 | 2.85 ms/frame | 2.808 | 3.3 |
| render/renderer-many-meshes-render-frame | 4,096 | 2.7 ms/frame | 2.833 | 4.6 |
| render/renderer-many-pointclouds-render-frame | 16 | 2.8 ms/frame | 2.583 | 3 |
| render/renderer-many-pointclouds-render-frame | 256 | 2.85 ms/frame | 2.792 | 3 |
| render/renderer-many-pointclouds-render-frame | 1,024 | 4.1 ms/frame | 3.708 | 4.6 |
| render/renderer-mesh-render-frame | 262,144 | 2.75 ms/frame | 2.583 | 3.39 |
| render/renderer-mesh-render-frame | 2,097,152 | 2.8 ms/frame | 2.767 | 2.945 |
| render/renderer-mesh-render-frame | 8,388,608 | 4.85 ms/frame | 4.7 | 5.68 |
| render/renderer-mixed-materials-render-frame | 64 | 1.55 ms/frame | 1.658 | 3.08 |
| render/renderer-mixed-materials-render-frame | 1,024 | 2.2 ms/frame | 2.083 | 3.145 |
| render/renderer-mixed-materials-render-frame | 4,096 | 4 ms/frame | 3.592 | 4.79 |
| render/renderer-mixed-scientific-scene-render-frame | 4 | 2.75 ms/frame | 2.783 | 3.145 |
| render/renderer-mixed-scientific-scene-render-frame | 16 | 5.5 ms/frame | 5.542 | 6.305 |
| render/renderer-mixed-scientific-scene-render-frame | 64 | 12.9 ms/frame | 12.71 | 15 |
| render/renderer-nodelink-render-frame | 1,024 | 2.6 ms/frame | 2.092 | 2.745 |
| render/renderer-nodelink-render-frame | 16,384 | 2.85 ms/frame | 2.817 | 3.045 |
| render/renderer-nodelink-render-frame | 65,536 | 6.25 ms/frame | 6.3 | 7.51 |
| render/renderer-occlusion-culling-render-frame | 64 | 2.3 ms/frame | 1.892 | 3.28 |
| render/renderer-occlusion-culling-render-frame | 512 | 2.8 ms/frame | 2.758 | 3 |
| render/renderer-occlusion-culling-render-frame | 2,048 | 4.05 ms/frame | 3.667 | 4.905 |
| render/renderer-pointcloud-render-frame | 65,536 | 2.55 ms/frame | 2.533 | 3.09 |
| render/renderer-pointcloud-render-frame | 262,144 | 2.8 ms/frame | 2.8 | 3.045 |
| render/renderer-pointcloud-render-frame | 1,048,576 | 2.8 ms/frame | 2.783 | 3.545 |
| render/renderer-splatfield-render-frame | 65,536 | 2.45 ms/frame | 2.275 | 2.935 |
| render/renderer-splatfield-render-frame | 262,144 | 2.75 ms/frame | 2.758 | 3.1 |
| render/renderer-splatfield-render-frame | 1,048,576 | 2.7 ms/frame | 2.8 | 3.49 |
| render/renderer-transmission-mesh-render-frame | 16 | 2.75 ms/frame | 2.575 | 3.415 |
| render/renderer-transmission-mesh-render-frame | 256 | 2.8 ms/frame | 3.008 | 4.385 |
| render/renderer-transmission-mesh-render-frame | 1,024 | 3.55 ms/frame | 3.842 | 5.6 |
| render/renderer-transparent-mesh-render-frame | 64 | 2.6 ms/frame | 2.267 | 2.845 |
| render/renderer-transparent-mesh-render-frame | 1,024 | 3.4 ms/frame | 3.183 | 3.99 |
| render/renderer-transparent-mesh-render-frame | 4,096 | 6.7 ms/frame | 6.758 | 7.335 |
| scaling/scale-service-percentile-stats-latency | 65,536 | 8 ms | 7.992 | 11.44 |
| scaling/scale-service-percentile-stats-latency | 1,048,576 | 2.85 ms | 4.517 | 10.53 |
| scaling/scale-service-percentile-stats-latency | 8,388,608 | 14 ms | 14.5 | 16.73 |
