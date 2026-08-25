# WasmGPU benchmark report

## Environment

- Timestamp: 2026-08-25T16:24:42.697Z
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
| compute/compute-dispatch-batch-throughput | 16 | 3.151e+05 dispatches/s | 3.193e+05 | 3.488e+05 |
| compute/compute-dispatch-batch-throughput | 256 | 1.084e+06 dispatches/s | 1.079e+06 | 1.096e+06 |
| compute/compute-dispatch-batch-throughput | 2,048 | 1.124e+06 dispatches/s | 1.122e+06 | 1.136e+06 |
| compute/cpundarray-index-get-set-throughput | 65,536 | 3.421e+07 operations/s | 3.418e+07 | 3.461e+07 |
| compute/cpundarray-index-get-set-throughput | 262,144 | 3.377e+07 operations/s | 3.374e+07 | 3.388e+07 |
| compute/cpundarray-index-get-set-throughput | 1,048,576 | 3.331e+07 operations/s | 3.316e+07 | 3.339e+07 |
| compute/cpundarray-upload-to-gpu-throughput | 4,194,304 | 8.83e+09 bytes/s | 8.552e+09 | 1.015e+10 |
| compute/cpundarray-upload-to-gpu-throughput | 16,777,216 | 2.856e+09 bytes/s | 2.862e+09 | 2.88e+09 |
| compute/cpundarray-upload-to-gpu-throughput | 33,554,432 | 2.874e+09 bytes/s | 2.873e+09 | 2.907e+09 |
| compute/gpundarray-readback-to-cpu-throughput | 16,777,216 | 4.972e+09 bytes/s | 5.027e+09 | 5.303e+09 |
| compute/gpundarray-readback-to-cpu-throughput | 25,165,824 | 5.27e+09 bytes/s | 5.264e+09 | 5.326e+09 |
| compute/gpundarray-readback-to-cpu-throughput | 33,554,432 | 5.222e+09 bytes/s | 5.226e+09 | 5.4e+09 |
| compute/kernels-argmax-f32-throughput | 65,536 | 1.25e+09 elements/s | 1.221e+09 | 1.407e+09 |
| compute/kernels-argmax-f32-throughput | 1,048,576 | 2.001e+10 elements/s | 1.961e+10 | 2.097e+10 |
| compute/kernels-argmax-f32-throughput | 8,388,608 | 4.428e+10 elements/s | 4.422e+10 | 4.432e+10 |
| compute/kernels-argmin-f32-throughput | 65,536 | 1.286e+09 elements/s | 1.23e+09 | 1.365e+09 |
| compute/kernels-argmin-f32-throughput | 1,048,576 | 2.02e+10 elements/s | 1.987e+10 | 2.146e+10 |
| compute/kernels-argmin-f32-throughput | 8,388,608 | 4.414e+10 elements/s | 4.36e+10 | 4.452e+10 |
| compute/kernels-compact-f32-throughput | 8,388,608 | 7.966e+09 elements/s | 7.969e+09 | 8.184e+09 |
| compute/kernels-compact-f32-throughput | 12,582,912 | 8.102e+09 elements/s | 8.101e+09 | 8.207e+09 |
| compute/kernels-compact-f32-throughput | 16,776,960 | 8.203e+09 elements/s | 8.187e+09 | 8.259e+09 |
| compute/kernels-compact-u32-throughput | 8,388,608 | 7.977e+09 elements/s | 7.923e+09 | 8.119e+09 |
| compute/kernels-compact-u32-throughput | 12,582,912 | 8.143e+09 elements/s | 8.151e+09 | 8.302e+09 |
| compute/kernels-compact-u32-throughput | 16,776,960 | 8.178e+09 elements/s | 8.172e+09 | 8.288e+09 |
| compute/kernels-copy-f32-throughput | 65,536 | 4.696 GB/s | 4.123 | 5.528 |
| compute/kernels-copy-f32-throughput | 1,048,576 | 90.86 GB/s | 83.73 | 96.96 |
| compute/kernels-copy-f32-throughput | 8,388,608 | 118.3 GB/s | 118.1 | 119.6 |
| compute/kernels-histogram-u32-throughput | 65,536 | 1.342e+09 elements/s | 1.315e+09 | 1.395e+09 |
| compute/kernels-histogram-u32-throughput | 1,048,576 | 2.225e+10 elements/s | 2.155e+10 | 2.303e+10 |
| compute/kernels-histogram-u32-throughput | 8,388,608 | 5.513e+10 elements/s | 5.511e+10 | 5.556e+10 |
| compute/kernels-min-f32-throughput | 65,536 | 1.311e+09 elements/s | 1.272e+09 | 1.355e+09 |
| compute/kernels-min-f32-throughput | 1,048,576 | 2.009e+10 elements/s | 1.978e+10 | 2.084e+10 |
| compute/kernels-min-f32-throughput | 8,388,608 | 4.96e+10 elements/s | 4.949e+10 | 4.968e+10 |
| compute/kernels-radix-sort-keys-u32-throughput | 16,384 | 3.675e+07 keys/s | 3.569e+07 | 3.911e+07 |
| compute/kernels-radix-sort-keys-u32-throughput | 262,144 | 4.179e+08 keys/s | 4.029e+08 | 4.228e+08 |
| compute/kernels-radix-sort-keys-u32-throughput | 2,097,152 | 5.565e+08 keys/s | 5.532e+08 | 5.743e+08 |
| compute/kernels-radix-sort-pairs-u32-throughput | 16,384 | 3.274e+07 elements/s | 3.267e+07 | 3.63e+07 |
| compute/kernels-radix-sort-pairs-u32-throughput | 262,144 | 3.755e+08 elements/s | 3.665e+08 | 3.841e+08 |
| compute/kernels-radix-sort-pairs-u32-throughput | 2,097,152 | 2.817e+08 elements/s | 2.843e+08 | 2.998e+08 |
| compute/kernels-scale-extract-f32-throughput | 65,536 | 1.267e+09 elements/s | 1.219e+09 | 1.322e+09 |
| compute/kernels-scale-extract-f32-throughput | 1,048,576 | 2.059e+10 elements/s | 2.008e+10 | 2.109e+10 |
| compute/kernels-scale-extract-f32-throughput | 8,388,608 | 1.021e+10 elements/s | 1.02e+10 | 1.028e+10 |
| compute/kernels-scale-histogram-f32-throughput | 65,536 | 1.289e+09 elements/s | 1.263e+09 | 1.313e+09 |
| compute/kernels-scale-histogram-f32-throughput | 1,048,576 | 2.058e+10 elements/s | 2.022e+10 | 2.271e+10 |
| compute/kernels-scale-histogram-f32-throughput | 8,388,608 | 5.444e+10 elements/s | 5.443e+10 | 5.492e+10 |
| compute/kernels-scale-remap-f32-throughput | 65,536 | 1.3e+09 elements/s | 1.294e+09 | 1.33e+09 |
| compute/kernels-scale-remap-f32-throughput | 1,048,576 | 2.138e+10 elements/s | 2.142e+10 | 2.298e+10 |
| compute/kernels-scale-remap-f32-throughput | 8,388,608 | 2.942e+10 elements/s | 2.941e+10 | 2.968e+10 |
| compute/kernels-scan-exclusive-u32-throughput | 65,536 | 1.19e+09 elements/s | 1.171e+09 | 1.255e+09 |
| compute/kernels-scan-exclusive-u32-throughput | 1,048,576 | 1.959e+10 elements/s | 1.888e+10 | 1.995e+10 |
| compute/kernels-scan-exclusive-u32-throughput | 8,388,608 | 1.508e+10 elements/s | 1.508e+10 | 1.519e+10 |
| compute/kernels-sum-f32-throughput | 65,536 | 1.252e+09 elements/s | 1.194e+09 | 1.302e+09 |
| compute/kernels-sum-f32-throughput | 1,048,576 | 1.981e+10 elements/s | 1.9e+10 | 2.12e+10 |
| compute/kernels-sum-f32-throughput | 8,388,608 | 4.954e+10 elements/s | 4.948e+10 | 4.971e+10 |
| compute/readbackring-read-throughput | 262,144 | 1.476e+08 bytes/s | 1.466e+08 | 1.808e+08 |
| compute/readbackring-read-throughput | 1,048,576 | 3.351e+08 bytes/s | 3.355e+08 | 3.737e+08 |
| compute/readbackring-read-throughput | 8,388,608 | 1.592e+09 bytes/s | 1.579e+09 | 1.64e+09 |
| compute/storagebuffer-write-throughput | 65,536 | 7.069e+09 bytes/s | 6.958e+09 | 7.214e+09 |
| compute/storagebuffer-write-throughput | 1,048,576 | 1.216e+10 bytes/s | 1.213e+10 | 1.222e+10 |
| compute/storagebuffer-write-throughput | 8,388,608 | 6.094e+09 bytes/s | 6.088e+09 | 6.181e+09 |
| gltf/accessors-read-interleaved-vec3-throughput | 262,144 | 1.176e+08 elements/s | 1.144e+08 | 1.241e+08 |
| gltf/accessors-read-interleaved-vec3-throughput | 1,048,576 | 1.147e+08 elements/s | 1.142e+08 | 1.168e+08 |
| gltf/accessors-read-interleaved-vec3-throughput | 4,194,304 | 1.119e+08 elements/s | 1.107e+08 | 1.164e+08 |
| interact/renderer-pointcloud-pick-latency | 65,536 | 2.5 ms | 2.875 | 3.95 |
| interact/renderer-pointcloud-pick-latency | 262,144 | 2.75 ms | 2.958 | 3.745 |
| interop/webassembly-view-copy-throughput | 1,048,576 | 37.87 GB/s | 37.66 | 38.36 |
| interop/webassembly-view-copy-throughput | 4,194,304 | 31.89 GB/s | 30.85 | 32.2 |
| interop/webassembly-view-copy-throughput | 16,777,216 | 19.85 GB/s | 19.38 | 20.09 |
| math/mat4-mul-throughput | 10,000 | 1.993e+06 operations/s | 1.971e+06 | 2.151e+06 |
| math/mat4-mul-throughput | 100,000 | 2.155e+06 operations/s | 2.148e+06 | 2.175e+06 |
| math/mat4-mul-throughput | 500,000 | 2.172e+06 operations/s | 2.164e+06 | 2.185e+06 |
| math/mat4d-mul-throughput | 250,000 | 5.865e+07 operations/s | 5.81e+07 | 5.886e+07 |
| math/mat4d-mul-throughput | 1,000,000 | 5.857e+07 operations/s | 5.813e+07 | 5.9e+07 |
| math/mat4d-mul-throughput | 4,000,000 | 5.874e+07 operations/s | 5.869e+07 | 5.903e+07 |
| math/mat4f-mul-throughput | 250,000 | 1.452e+08 operations/s | 1.445e+08 | 1.457e+08 |
| math/mat4f-mul-throughput | 1,000,000 | 1.381e+08 operations/s | 1.379e+08 | 1.39e+08 |
| math/mat4f-mul-throughput | 4,000,000 | 1.381e+08 operations/s | 1.374e+08 | 1.39e+08 |
| math/transform-set-position-update-all-throughput | 8,192 | 2.881e+07 transforms/s | 2.866e+07 | 2.939e+07 |
| math/transform-set-position-update-all-throughput | 32,768 | 2.865e+07 transforms/s | 2.851e+07 | 2.875e+07 |
| math/transform-set-position-update-all-throughput | 65,536 | 2.587e+07 transforms/s | 2.578e+07 | 2.704e+07 |
| objects/glyphfield-set-cpu-data-upload-throughput | 16,384 | 1.851e+08 instances/s | 1.813e+08 | 1.907e+08 |
| objects/glyphfield-set-cpu-data-upload-throughput | 131,072 | 1.595e+08 instances/s | 1.593e+08 | 1.605e+08 |
| objects/glyphfield-set-cpu-data-upload-throughput | 524,288 | 9.399e+07 instances/s | 9.328e+07 | 9.499e+07 |
| objects/latticespace-set-data-upload-throughput | 16,384 | 4.743e+08 cells/s | 5.018e+08 | 6.039e+08 |
| objects/latticespace-set-data-upload-throughput | 131,072 | 7.758e+08 cells/s | 7.789e+08 | 8.245e+08 |
| objects/latticespace-set-data-upload-throughput | 524,288 | 9.165e+08 cells/s | 9.291e+08 | 1.149e+09 |
| objects/nodelink-update-node-positions-upload-throughput | 16,384 | 1.041e+08 nodes/s | 1.056e+08 | 1.196e+08 |
| objects/nodelink-update-node-positions-upload-throughput | 131,072 | 1.029e+08 nodes/s | 1.026e+08 | 1.071e+08 |
| objects/nodelink-update-node-positions-upload-throughput | 524,288 | 1.059e+08 nodes/s | 1.061e+08 | 1.154e+08 |
| objects/pointcloud-set-data-upload-throughput | 16,384 | 6.484e+08 points/s | 6.548e+08 | 7.095e+08 |
| objects/pointcloud-set-data-upload-throughput | 131,072 | 6.237e+08 points/s | 6.157e+08 | 6.295e+08 |
| objects/pointcloud-set-data-upload-throughput | 524,288 | 3.82e+08 points/s | 3.789e+08 | 3.962e+08 |
| objects/splatfield-refresh-wasm-upload-throughput | 16,384 | 1.815e+08 splats/s | 1.785e+08 | 1.889e+08 |
| objects/splatfield-refresh-wasm-upload-throughput | 131,072 | 1.568e+08 splats/s | 1.558e+08 | 1.582e+08 |
| objects/splatfield-refresh-wasm-upload-throughput | 524,288 | 9.41e+07 splats/s | 9.356e+07 | 9.561e+07 |
| render/renderer-antialias-render-frame | 1,280 | 2.85 ms/frame | 2.833 | 3.325 |
| render/renderer-antialias-render-frame | 2,400 | 5.5 ms/frame | 5.533 | 5.79 |
| render/renderer-antialias-render-frame | 3,200 | 7.2 ms/frame | 7.033 | 8.015 |
| render/renderer-data-material-render-frame | 262,144 | 2.65 ms/frame | 2.542 | 2.845 |
| render/renderer-data-material-render-frame | 2,097,152 | 5.55 ms/frame | 5.333 | 6.35 |
| render/renderer-data-material-render-frame | 8,388,608 | 5.65 ms/frame | 5.575 | 6.1 |
| render/renderer-directional-shadows-render-frame | 8 | 2.8 ms/frame | 2.767 | 2.99 |
| render/renderer-directional-shadows-render-frame | 128 | 2.75 ms/frame | 2.767 | 3.305 |
| render/renderer-directional-shadows-render-frame | 512 | 2.75 ms/frame | 2.792 | 3.645 |
| render/renderer-frustum-culling-render-frame | 128 | 0.7 ms/frame | 1.383 | 2.935 |
| render/renderer-frustum-culling-render-frame | 2,048 | 2.25 ms/frame | 2.142 | 3.645 |
| render/renderer-frustum-culling-render-frame | 8,192 | 3.8 ms/frame | 3.042 | 4.215 |
| render/renderer-glyphfield-render-frame | 16,384 | 2.75 ms/frame | 2.792 | 3.145 |
| render/renderer-glyphfield-render-frame | 131,072 | 5.5 ms/frame | 5.533 | 5.7 |
| render/renderer-glyphfield-render-frame | 524,288 | 13.6 ms/frame | 13.82 | 14.88 |
| render/renderer-latticespace-render-frame | 32,768 | 2.55 ms/frame | 2.383 | 3.045 |
| render/renderer-latticespace-render-frame | 262,144 | 2.75 ms/frame | 2.817 | 3.245 |
| render/renderer-latticespace-render-frame | 1,000,000 | 6.95 ms/frame | 7.067 | 8.14 |
| render/renderer-many-meshes-render-frame | 64 | 2.5 ms/frame | 2.208 | 3.205 |
| render/renderer-many-meshes-render-frame | 1,024 | 2.6 ms/frame | 2.483 | 3.245 |
| render/renderer-many-meshes-render-frame | 4,096 | 2.75 ms/frame | 2.867 | 4.445 |
| render/renderer-many-pointclouds-render-frame | 16 | 2.55 ms/frame | 2.317 | 2.845 |
| render/renderer-many-pointclouds-render-frame | 256 | 2.85 ms/frame | 2.792 | 3.1 |
| render/renderer-many-pointclouds-render-frame | 1,024 | 4.3 ms/frame | 4.025 | 4.79 |
| render/renderer-mesh-render-frame | 262,144 | 5.45 ms/frame | 5.483 | 7.015 |
| render/renderer-mesh-render-frame | 2,097,152 | 3.05 ms/frame | 3.192 | 4.7 |
| render/renderer-mesh-render-frame | 8,388,608 | 3.85 ms/frame | 3.767 | 4.59 |
| render/renderer-mixed-materials-render-frame | 64 | 2.5 ms/frame | 1.825 | 2.945 |
| render/renderer-mixed-materials-render-frame | 1,024 | 2.8 ms/frame | 2.792 | 3.38 |
| render/renderer-mixed-materials-render-frame | 4,096 | 3.9 ms/frame | 3.492 | 4.39 |
| render/renderer-mixed-scientific-scene-render-frame | 4 | 2.8 ms/frame | 2.808 | 3.305 |
| render/renderer-mixed-scientific-scene-render-frame | 16 | 5.45 ms/frame | 5.292 | 5.935 |
| render/renderer-mixed-scientific-scene-render-frame | 64 | 10.4 ms/frame | 10.78 | 13.32 |
| render/renderer-nodelink-render-frame | 1,024 | 2.65 ms/frame | 2.6 | 3.46 |
| render/renderer-nodelink-render-frame | 16,384 | 2.8 ms/frame | 2.792 | 3.145 |
| render/renderer-nodelink-render-frame | 65,536 | 5.55 ms/frame | 5.692 | 6.535 |
| render/renderer-occlusion-culling-render-frame | 64 | 1.35 ms/frame | 1.658 | 2.945 |
| render/renderer-occlusion-culling-render-frame | 512 | 2.85 ms/frame | 2.75 | 3 |
| render/renderer-occlusion-culling-render-frame | 2,048 | 4.1 ms/frame | 3.342 | 4.335 |
| render/renderer-pointcloud-render-frame | 65,536 | 2.75 ms/frame | 2.583 | 3.035 |
| render/renderer-pointcloud-render-frame | 262,144 | 2.85 ms/frame | 2.825 | 3.2 |
| render/renderer-pointcloud-render-frame | 1,048,576 | 2.8 ms/frame | 2.808 | 3.445 |
| render/renderer-splatfield-render-frame | 65,536 | 2.65 ms/frame | 2.592 | 3.045 |
| render/renderer-splatfield-render-frame | 262,144 | 2.85 ms/frame | 2.817 | 3.145 |
| render/renderer-splatfield-render-frame | 1,048,576 | 2.85 ms/frame | 3.017 | 4.095 |
| render/renderer-transmission-mesh-render-frame | 16 | 2.75 ms/frame | 2.833 | 3.89 |
| render/renderer-transmission-mesh-render-frame | 256 | 2.85 ms/frame | 2.9 | 3.325 |
| render/renderer-transmission-mesh-render-frame | 1,024 | 3.6 ms/frame | 3.692 | 5.14 |
| render/renderer-transparent-mesh-render-frame | 64 | 2.7 ms/frame | 2.633 | 3.35 |
| render/renderer-transparent-mesh-render-frame | 1,024 | 3.5 ms/frame | 3.058 | 4.005 |
| render/renderer-transparent-mesh-render-frame | 4,096 | 6.6 ms/frame | 6.583 | 7.29 |
| scaling/scale-service-percentile-stats-latency | 65,536 | 7.3 ms | 7.142 | 10.54 |
| scaling/scale-service-percentile-stats-latency | 1,048,576 | 7 ms | 7.075 | 9.21 |
| scaling/scale-service-percentile-stats-latency | 8,388,608 | 15.4 ms | 15.35 | 17.7 |
