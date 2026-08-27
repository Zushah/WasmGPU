# WasmGPU benchmark report

## Environment

- Timestamp: 2026-08-27T17:52:34.829Z
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
- Browser: chrome 151.0.7922.174 on windows via cdp
- WebGPU adapter: nvidia / lovelace
- Native adapter: True
- Fallback adapter: False
- Mode: full

## Results

| Benchmark | Size | Median | Mean | p95 |
|---|---:|---:|---:|---:|
| compute/compute-dispatch-batch-throughput | 16 | 3.071e+05 dispatches/s | 3.065e+05 | 3.526e+05 |
| compute/compute-dispatch-batch-throughput | 256 | 1.066e+06 dispatches/s | 1.065e+06 | 1.074e+06 |
| compute/compute-dispatch-batch-throughput | 2,048 | 1.113e+06 dispatches/s | 1.109e+06 | 1.128e+06 |
| compute/cpundarray-index-get-set-throughput | 65,536 | 3.472e+07 operations/s | 3.467e+07 | 3.486e+07 |
| compute/cpundarray-index-get-set-throughput | 262,144 | 3.374e+07 operations/s | 3.363e+07 | 3.396e+07 |
| compute/cpundarray-index-get-set-throughput | 1,048,576 | 3.35e+07 operations/s | 3.341e+07 | 3.366e+07 |
| compute/cpundarray-upload-to-gpu-throughput | 4,194,304 | 1.049e+10 bytes/s | 1.073e+10 | 1.118e+10 |
| compute/cpundarray-upload-to-gpu-throughput | 16,777,216 | 2.75e+09 bytes/s | 2.725e+09 | 2.88e+09 |
| compute/cpundarray-upload-to-gpu-throughput | 33,554,432 | 2.826e+09 bytes/s | 2.764e+09 | 2.871e+09 |
| compute/gpundarray-readback-to-cpu-throughput | 16,777,216 | 5.223e+09 bytes/s | 5.162e+09 | 5.303e+09 |
| compute/gpundarray-readback-to-cpu-throughput | 25,165,824 | 4.959e+09 bytes/s | 4.946e+09 | 5.17e+09 |
| compute/gpundarray-readback-to-cpu-throughput | 33,554,432 | 5.113e+09 bytes/s | 4.293e+09 | 5.326e+09 |
| compute/kernels-argmax-f32-throughput | 65,536 | 1.328e+09 elements/s | 1.284e+09 | 1.374e+09 |
| compute/kernels-argmax-f32-throughput | 1,048,576 | 2.046e+10 elements/s | 1.959e+10 | 2.161e+10 |
| compute/kernels-argmax-f32-throughput | 8,388,608 | 4.432e+10 elements/s | 4.428e+10 | 4.457e+10 |
| compute/kernels-argmin-f32-throughput | 65,536 | 1.294e+09 elements/s | 1.227e+09 | 1.388e+09 |
| compute/kernels-argmin-f32-throughput | 1,048,576 | 2.034e+10 elements/s | 1.993e+10 | 2.078e+10 |
| compute/kernels-argmin-f32-throughput | 8,388,608 | 4.442e+10 elements/s | 4.442e+10 | 4.464e+10 |
| compute/kernels-compact-f32-throughput | 8,388,608 | 7.93e+09 elements/s | 7.949e+09 | 8.17e+09 |
| compute/kernels-compact-f32-throughput | 12,582,912 | 8.045e+09 elements/s | 8.019e+09 | 8.181e+09 |
| compute/kernels-compact-f32-throughput | 16,776,960 | 8.153e+09 elements/s | 8.142e+09 | 8.265e+09 |
| compute/kernels-compact-u32-throughput | 8,388,608 | 7.93e+09 elements/s | 7.923e+09 | 8e+09 |
| compute/kernels-compact-u32-throughput | 12,582,912 | 8.159e+09 elements/s | 8.089e+09 | 8.231e+09 |
| compute/kernels-compact-u32-throughput | 16,776,960 | 8.147e+09 elements/s | 8.142e+09 | 8.24e+09 |
| compute/kernels-copy-f32-throughput | 65,536 | 5.839 GB/s | 5.492 | 5.961 |
| compute/kernels-copy-f32-throughput | 1,048,576 | 98.51 GB/s | 97.97 | 106 |
| compute/kernels-copy-f32-throughput | 8,388,608 | 118.6 GB/s | 118.9 | 120.3 |
| compute/kernels-histogram-u32-throughput | 65,536 | 1.367e+09 elements/s | 1.332e+09 | 1.471e+09 |
| compute/kernels-histogram-u32-throughput | 1,048,576 | 2.217e+10 elements/s | 2.145e+10 | 2.357e+10 |
| compute/kernels-histogram-u32-throughput | 8,388,608 | 5.492e+10 elements/s | 5.508e+10 | 5.549e+10 |
| compute/kernels-min-f32-throughput | 65,536 | 1.323e+09 elements/s | 1.286e+09 | 1.399e+09 |
| compute/kernels-min-f32-throughput | 1,048,576 | 2.124e+10 elements/s | 2.075e+10 | 2.281e+10 |
| compute/kernels-min-f32-throughput | 8,388,608 | 4.96e+10 elements/s | 4.943e+10 | 4.968e+10 |
| compute/kernels-radix-sort-keys-u32-throughput | 16,384 | 3.537e+07 keys/s | 3.461e+07 | 3.99e+07 |
| compute/kernels-radix-sort-keys-u32-throughput | 262,144 | 4.218e+08 keys/s | 4.083e+08 | 4.241e+08 |
| compute/kernels-radix-sort-keys-u32-throughput | 2,097,152 | 5.369e+08 keys/s | 5.395e+08 | 5.52e+08 |
| compute/kernels-radix-sort-pairs-u32-throughput | 16,384 | 3.214e+07 elements/s | 3.319e+07 | 3.659e+07 |
| compute/kernels-radix-sort-pairs-u32-throughput | 262,144 | 3.667e+08 elements/s | 3.637e+08 | 3.83e+08 |
| compute/kernels-radix-sort-pairs-u32-throughput | 2,097,152 | 2.827e+08 elements/s | 2.84e+08 | 2.978e+08 |
| compute/kernels-scale-extract-f32-throughput | 65,536 | 1.307e+09 elements/s | 1.229e+09 | 1.361e+09 |
| compute/kernels-scale-extract-f32-throughput | 1,048,576 | 1.834e+10 elements/s | 1.811e+10 | 1.855e+10 |
| compute/kernels-scale-extract-f32-throughput | 8,388,608 | 1.017e+10 elements/s | 1.016e+10 | 1.029e+10 |
| compute/kernels-scale-histogram-f32-throughput | 65,536 | 1.253e+09 elements/s | 1.206e+09 | 1.321e+09 |
| compute/kernels-scale-histogram-f32-throughput | 1,048,576 | 1.947e+10 elements/s | 1.83e+10 | 2.09e+10 |
| compute/kernels-scale-histogram-f32-throughput | 8,388,608 | 5.416e+10 elements/s | 5.413e+10 | 5.463e+10 |
| compute/kernels-scale-remap-f32-throughput | 65,536 | 1.282e+09 elements/s | 1.186e+09 | 1.319e+09 |
| compute/kernels-scale-remap-f32-throughput | 1,048,576 | 2.114e+10 elements/s | 2.093e+10 | 2.328e+10 |
| compute/kernels-scale-remap-f32-throughput | 8,388,608 | 2.934e+10 elements/s | 2.937e+10 | 2.957e+10 |
| compute/kernels-scan-exclusive-u32-throughput | 65,536 | 1.214e+09 elements/s | 1.169e+09 | 1.257e+09 |
| compute/kernels-scan-exclusive-u32-throughput | 1,048,576 | 1.945e+10 elements/s | 1.907e+10 | 2.024e+10 |
| compute/kernels-scan-exclusive-u32-throughput | 8,388,608 | 1.499e+10 elements/s | 1.496e+10 | 1.507e+10 |
| compute/kernels-sum-f32-throughput | 65,536 | 1.349e+09 elements/s | 1.304e+09 | 1.375e+09 |
| compute/kernels-sum-f32-throughput | 1,048,576 | 2.094e+10 elements/s | 2.029e+10 | 2.139e+10 |
| compute/kernels-sum-f32-throughput | 8,388,608 | 4.948e+10 elements/s | 4.944e+10 | 4.977e+10 |
| compute/readbackring-read-throughput | 262,144 | 1.54e+08 bytes/s | 1.578e+08 | 2.137e+08 |
| compute/readbackring-read-throughput | 1,048,576 | 3.105e+08 bytes/s | 3.132e+08 | 3.461e+08 |
| compute/readbackring-read-throughput | 8,388,608 | 1.349e+09 bytes/s | 1.306e+09 | 1.387e+09 |
| compute/storagebuffer-write-throughput | 65,536 | 7.064e+09 bytes/s | 7.04e+09 | 7.31e+09 |
| compute/storagebuffer-write-throughput | 1,048,576 | 1.211e+10 bytes/s | 1.209e+10 | 1.219e+10 |
| compute/storagebuffer-write-throughput | 8,388,608 | 6.094e+09 bytes/s | 6.036e+09 | 6.16e+09 |
| gltf/accessors-read-interleaved-vec3-throughput | 262,144 | 1.131e+08 elements/s | 1.125e+08 | 1.188e+08 |
| gltf/accessors-read-interleaved-vec3-throughput | 1,048,576 | 1.111e+08 elements/s | 1.115e+08 | 1.16e+08 |
| gltf/accessors-read-interleaved-vec3-throughput | 4,194,304 | 1.157e+08 elements/s | 1.106e+08 | 1.171e+08 |
| interact/renderer-pointcloud-pick-latency | 65,536 | 1 ms | 1.375 | 2.9 |
| interact/renderer-pointcloud-pick-latency | 262,144 | 2.55 ms | 2.6 | 2.9 |
| interop/python-to-cpundarray-throughput | 1,048,576 | 3.483e+10 bytes/s | 3.508e+10 | 3.639e+10 |
| interop/python-to-cpundarray-throughput | 4,194,304 | 3.101e+10 bytes/s | 3.06e+10 | 3.164e+10 |
| interop/python-to-cpundarray-throughput | 16,777,216 | 1.963e+10 bytes/s | 1.955e+10 | 1.994e+10 |
| interop/python-to-gpundarray-throughput | 1,048,576 | 1.049e+10 bytes/s | 1.159e+10 | 1.398e+10 |
| interop/python-to-gpundarray-throughput | 4,194,304 | 9.321e+09 bytes/s | 8.561e+09 | 9.567e+09 |
| interop/python-to-gpundarray-throughput | 16,777,216 | 5.836e+09 bytes/s | 5.807e+09 | 5.887e+09 |
| interop/webassembly-view-copy-throughput | 1,048,576 | 37.45 GB/s | 37.16 | 38.62 |
| interop/webassembly-view-copy-throughput | 4,194,304 | 33.61 GB/s | 33.11 | 33.84 |
| interop/webassembly-view-copy-throughput | 16,777,216 | 20 GB/s | 19.95 | 20.28 |
| math/mat4-mul-throughput | 10,000 | 1.932e+06 operations/s | 1.902e+06 | 2.074e+06 |
| math/mat4-mul-throughput | 100,000 | 2.142e+06 operations/s | 2.14e+06 | 2.174e+06 |
| math/mat4-mul-throughput | 500,000 | 2.168e+06 operations/s | 2.162e+06 | 2.179e+06 |
| math/mat4d-mul-throughput | 250,000 | 5.801e+07 operations/s | 5.816e+07 | 5.869e+07 |
| math/mat4d-mul-throughput | 1,000,000 | 5.735e+07 operations/s | 5.735e+07 | 5.801e+07 |
| math/mat4d-mul-throughput | 4,000,000 | 5.533e+07 operations/s | 5.518e+07 | 5.57e+07 |
| math/mat4f-mul-throughput | 250,000 | 1.451e+08 operations/s | 1.444e+08 | 1.456e+08 |
| math/mat4f-mul-throughput | 1,000,000 | 1.381e+08 operations/s | 1.374e+08 | 1.385e+08 |
| math/mat4f-mul-throughput | 4,000,000 | 1.369e+08 operations/s | 1.366e+08 | 1.378e+08 |
| math/transform-set-position-update-all-throughput | 8,192 | 2.865e+07 transforms/s | 2.849e+07 | 2.914e+07 |
| math/transform-set-position-update-all-throughput | 32,768 | 2.853e+07 transforms/s | 2.842e+07 | 2.882e+07 |
| math/transform-set-position-update-all-throughput | 65,536 | 2.69e+07 transforms/s | 2.684e+07 | 2.724e+07 |
| objects/glyphfield-set-cpu-data-upload-throughput | 16,384 | 1.877e+08 instances/s | 1.848e+08 | 1.906e+08 |
| objects/glyphfield-set-cpu-data-upload-throughput | 131,072 | 1.59e+08 instances/s | 1.569e+08 | 1.607e+08 |
| objects/glyphfield-set-cpu-data-upload-throughput | 524,288 | 9.415e+07 instances/s | 9.276e+07 | 9.57e+07 |
| objects/latticespace-set-data-upload-throughput | 16,384 | 5.825e+08 cells/s | 5.787e+08 | 6.111e+08 |
| objects/latticespace-set-data-upload-throughput | 131,072 | 8.654e+08 cells/s | 8.512e+08 | 9.031e+08 |
| objects/latticespace-set-data-upload-throughput | 524,288 | 8.802e+08 cells/s | 8.801e+08 | 9.578e+08 |
| objects/nodelink-update-node-positions-upload-throughput | 16,384 | 1.082e+08 nodes/s | 1.071e+08 | 1.231e+08 |
| objects/nodelink-update-node-positions-upload-throughput | 131,072 | 1.027e+08 nodes/s | 1.021e+08 | 1.043e+08 |
| objects/nodelink-update-node-positions-upload-throughput | 524,288 | 1.002e+08 nodes/s | 1.013e+08 | 1.094e+08 |
| objects/pointcloud-set-data-upload-throughput | 16,384 | 6.301e+08 points/s | 6.261e+08 | 6.557e+08 |
| objects/pointcloud-set-data-upload-throughput | 131,072 | 6.26e+08 points/s | 6.265e+08 | 6.371e+08 |
| objects/pointcloud-set-data-upload-throughput | 524,288 | 3.87e+08 points/s | 3.829e+08 | 3.924e+08 |
| objects/splatfield-refresh-wasm-upload-throughput | 16,384 | 1.714e+08 splats/s | 1.75e+08 | 1.891e+08 |
| objects/splatfield-refresh-wasm-upload-throughput | 131,072 | 1.562e+08 splats/s | 1.551e+08 | 1.611e+08 |
| objects/splatfield-refresh-wasm-upload-throughput | 524,288 | 9.352e+07 splats/s | 9.315e+07 | 9.478e+07 |
| render/renderer-antialias-render-frame | 1,280 | 2.75 ms/frame | 2.775 | 3 |
| render/renderer-antialias-render-frame | 2,400 | 5.5 ms/frame | 5.483 | 6.005 |
| render/renderer-antialias-render-frame | 3,200 | 2.8 ms/frame | 2.775 | 3.1 |
| render/renderer-data-material-render-frame | 262,144 | 2.75 ms/frame | 2.742 | 3.125 |
| render/renderer-data-material-render-frame | 2,097,152 | 2.8 ms/frame | 2.792 | 3.045 |
| render/renderer-data-material-render-frame | 8,388,608 | 3.9 ms/frame | 3.7 | 4.39 |
| render/renderer-directional-shadows-render-frame | 8 | 2.7 ms/frame | 2.55 | 2.99 |
| render/renderer-directional-shadows-render-frame | 128 | 2.8 ms/frame | 2.758 | 3 |
| render/renderer-directional-shadows-render-frame | 512 | 2.8 ms/frame | 2.775 | 3.525 |
| render/renderer-frustum-culling-render-frame | 128 | 0.55 ms/frame | 0.6833 | 1.045 |
| render/renderer-frustum-culling-render-frame | 2,048 | 2.8 ms/frame | 2.775 | 3.89 |
| render/renderer-frustum-culling-render-frame | 8,192 | 3.7 ms/frame | 3.525 | 4.545 |
| render/renderer-glyphfield-render-frame | 16,384 | 2.8 ms/frame | 2.717 | 3.29 |
| render/renderer-glyphfield-render-frame | 131,072 | 5.6 ms/frame | 5.567 | 6.545 |
| render/renderer-glyphfield-render-frame | 524,288 | 14.2 ms/frame | 14.47 | 15.78 |
| render/renderer-latticespace-render-frame | 32,768 | 2.85 ms/frame | 2.767 | 3.225 |
| render/renderer-latticespace-render-frame | 262,144 | 2.95 ms/frame | 3.275 | 5.14 |
| render/renderer-latticespace-render-frame | 1,000,000 | 6.7 ms/frame | 6.917 | 7.645 |
| render/renderer-many-meshes-render-frame | 64 | 0.5 ms/frame | 0.8667 | 2.77 |
| render/renderer-many-meshes-render-frame | 1,024 | 2.75 ms/frame | 2.308 | 3 |
| render/renderer-many-meshes-render-frame | 4,096 | 2.7 ms/frame | 2.808 | 4.345 |
| render/renderer-many-pointclouds-render-frame | 16 | 1.45 ms/frame | 1.65 | 3.215 |
| render/renderer-many-pointclouds-render-frame | 256 | 2.9 ms/frame | 2.775 | 3.245 |
| render/renderer-many-pointclouds-render-frame | 1,024 | 4.45 ms/frame | 4.125 | 5 |
| render/renderer-mesh-render-frame | 262,144 | 2.6 ms/frame | 2.567 | 3.335 |
| render/renderer-mesh-render-frame | 2,097,152 | 2.8 ms/frame | 2.783 | 3.47 |
| render/renderer-mesh-render-frame | 8,388,608 | 5.4 ms/frame | 4.992 | 5.79 |
| render/renderer-mixed-materials-render-frame | 64 | 0.8 ms/frame | 1.492 | 3.545 |
| render/renderer-mixed-materials-render-frame | 1,024 | 2.75 ms/frame | 2.608 | 3.625 |
| render/renderer-mixed-materials-render-frame | 4,096 | 3.7 ms/frame | 3.25 | 4.69 |
| render/renderer-mixed-scientific-scene-render-frame | 4 | 2.7 ms/frame | 2.75 | 3.2 |
| render/renderer-mixed-scientific-scene-render-frame | 16 | 3.65 ms/frame | 3.808 | 5.19 |
| render/renderer-mixed-scientific-scene-render-frame | 64 | 11.3 ms/frame | 11.43 | 12.34 |
| render/renderer-nodelink-render-frame | 1,024 | 2.7 ms/frame | 2.333 | 3.38 |
| render/renderer-nodelink-render-frame | 16,384 | 2.8 ms/frame | 2.783 | 3.045 |
| render/renderer-nodelink-render-frame | 65,536 | 5.55 ms/frame | 5.65 | 6.335 |
| render/renderer-occlusion-culling-render-frame | 64 | 0.5 ms/frame | 0.55 | 0.935 |
| render/renderer-occlusion-culling-render-frame | 512 | 2.65 ms/frame | 2.317 | 3.48 |
| render/renderer-occlusion-culling-render-frame | 2,048 | 3.9 ms/frame | 3.308 | 4.425 |
| render/renderer-pointcloud-render-frame | 65,536 | 2.65 ms/frame | 2.292 | 3.39 |
| render/renderer-pointcloud-render-frame | 262,144 | 2.7 ms/frame | 2.775 | 3.235 |
| render/renderer-pointcloud-render-frame | 1,048,576 | 2.8 ms/frame | 2.75 | 3.345 |
| render/renderer-splatfield-render-frame | 65,536 | 2.75 ms/frame | 2.758 | 3.57 |
| render/renderer-splatfield-render-frame | 262,144 | 2.7 ms/frame | 2.792 | 3.535 |
| render/renderer-splatfield-render-frame | 1,048,576 | 2.85 ms/frame | 3.067 | 4.125 |
| render/renderer-transmission-mesh-render-frame | 16 | 2.8 ms/frame | 2.808 | 3.1 |
| render/renderer-transmission-mesh-render-frame | 256 | 2.75 ms/frame | 2.742 | 3.225 |
| render/renderer-transmission-mesh-render-frame | 1,024 | 3.6 ms/frame | 3.767 | 5.05 |
| render/renderer-transparent-mesh-render-frame | 64 | 1.05 ms/frame | 1.492 | 2.8 |
| render/renderer-transparent-mesh-render-frame | 1,024 | 2.8 ms/frame | 2.767 | 3.645 |
| render/renderer-transparent-mesh-render-frame | 4,096 | 6.5 ms/frame | 6.367 | 6.6 |
| scaling/scale-service-percentile-stats-latency | 65,536 | 6.9 ms | 6.942 | 8.76 |
| scaling/scale-service-percentile-stats-latency | 1,048,576 | 5.85 ms | 6.85 | 11.09 |
| scaling/scale-service-percentile-stats-latency | 8,388,608 | 14.15 ms | 14.81 | 17.96 |
