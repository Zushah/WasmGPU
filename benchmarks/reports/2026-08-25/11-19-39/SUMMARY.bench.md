# WasmGPU benchmark report

## Environment

- Timestamp: 2026-08-25T15:19:39.608Z
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
| compute/compute-dispatch-batch-throughput | 16 | 2.877e+05 dispatches/s | 2.761e+05 | 2.983e+05 |
| compute/compute-dispatch-batch-throughput | 256 | 1.039e+06 dispatches/s | 1.041e+06 | 1.065e+06 |
| compute/compute-dispatch-batch-throughput | 2,048 | 1.094e+06 dispatches/s | 1.095e+06 | 1.105e+06 |
| compute/cpundarray-index-get-set-throughput | 65,536 | 2.841e+07 operations/s | 2.898e+07 | 3.289e+07 |
| compute/cpundarray-index-get-set-throughput | 262,144 | 3.026e+07 operations/s | 2.997e+07 | 3.246e+07 |
| compute/cpundarray-index-get-set-throughput | 1,048,576 | 3.226e+07 operations/s | 3.187e+07 | 3.274e+07 |
| compute/cpundarray-upload-to-gpu-throughput | 4,194,304 | 9.595e+09 bytes/s | 9.395e+09 | 9.869e+09 |
| compute/cpundarray-upload-to-gpu-throughput | 16,777,216 | 2.905e+09 bytes/s | 2.762e+09 | 2.956e+09 |
| compute/cpundarray-upload-to-gpu-throughput | 33,554,432 | 2.915e+09 bytes/s | 2.91e+09 | 2.983e+09 |
| compute/gpundarray-readback-to-cpu-throughput | 16,777,216 | 4.566e+09 bytes/s | 4.503e+09 | 4.809e+09 |
| compute/gpundarray-readback-to-cpu-throughput | 25,165,824 | 4.771e+09 bytes/s | 4.68e+09 | 4.874e+09 |
| compute/gpundarray-readback-to-cpu-throughput | 33,554,432 | 5.123e+09 bytes/s | 5.109e+09 | 5.241e+09 |
| compute/kernels-argmax-f32-throughput | 65,536 | 1.155e+09 elements/s | 1.134e+09 | 1.324e+09 |
| compute/kernels-argmax-f32-throughput | 1,048,576 | 2.002e+10 elements/s | 1.979e+10 | 2.089e+10 |
| compute/kernels-argmax-f32-throughput | 8,388,608 | 4.394e+10 elements/s | 4.399e+10 | 4.423e+10 |
| compute/kernels-argmin-f32-throughput | 65,536 | 1.256e+09 elements/s | 1.222e+09 | 1.285e+09 |
| compute/kernels-argmin-f32-throughput | 1,048,576 | 1.974e+10 elements/s | 1.931e+10 | 2.079e+10 |
| compute/kernels-argmin-f32-throughput | 8,388,608 | 4.369e+10 elements/s | 4.356e+10 | 4.412e+10 |
| compute/kernels-compact-f32-throughput | 8,388,608 | 7.977e+09 elements/s | 7.965e+09 | 8.072e+09 |
| compute/kernels-compact-f32-throughput | 12,582,912 | 8.094e+09 elements/s | 8.098e+09 | 8.214e+09 |
| compute/kernels-compact-f32-throughput | 16,776,960 | 8.165e+09 elements/s | 8.159e+09 | 8.196e+09 |
| compute/kernels-compact-u32-throughput | 8,388,608 | 7.942e+09 elements/s | 7.89e+09 | 8.024e+09 |
| compute/kernels-compact-u32-throughput | 12,582,912 | 8.029e+09 elements/s | 8.042e+09 | 8.172e+09 |
| compute/kernels-compact-u32-throughput | 16,776,960 | 8.128e+09 elements/s | 8.123e+09 | 8.252e+09 |
| compute/kernels-copy-f32-throughput | 65,536 | 5.509 GB/s | 5.314 | 5.846 |
| compute/kernels-copy-f32-throughput | 1,048,576 | 94.5 GB/s | 94.86 | 100.9 |
| compute/kernels-copy-f32-throughput | 8,388,608 | 117.6 GB/s | 117.8 | 118.9 |
| compute/kernels-histogram-u32-throughput | 65,536 | 1.261e+09 elements/s | 1.216e+09 | 1.338e+09 |
| compute/kernels-histogram-u32-throughput | 1,048,576 | 2.206e+10 elements/s | 2.214e+10 | 2.407e+10 |
| compute/kernels-histogram-u32-throughput | 8,388,608 | 5.45e+10 elements/s | 5.467e+10 | 5.524e+10 |
| compute/kernels-min-f32-throughput | 65,536 | 1.239e+09 elements/s | 1.191e+09 | 1.292e+09 |
| compute/kernels-min-f32-throughput | 1,048,576 | 1.959e+10 elements/s | 1.895e+10 | 2.065e+10 |
| compute/kernels-min-f32-throughput | 8,388,608 | 4.911e+10 elements/s | 4.909e+10 | 4.942e+10 |
| compute/kernels-radix-sort-keys-u32-throughput | 16,384 | 3.654e+07 keys/s | 3.507e+07 | 3.911e+07 |
| compute/kernels-radix-sort-keys-u32-throughput | 262,144 | 4.184e+08 keys/s | 4.077e+08 | 4.236e+08 |
| compute/kernels-radix-sort-keys-u32-throughput | 2,097,152 | 5.63e+08 keys/s | 5.574e+08 | 5.786e+08 |
| compute/kernels-radix-sort-pairs-u32-throughput | 16,384 | 3.229e+07 elements/s | 3.14e+07 | 3.522e+07 |
| compute/kernels-radix-sort-pairs-u32-throughput | 262,144 | 3.671e+08 elements/s | 3.638e+08 | 3.825e+08 |
| compute/kernels-radix-sort-pairs-u32-throughput | 2,097,152 | 2.908e+08 elements/s | 2.895e+08 | 3.015e+08 |
| compute/kernels-scale-extract-f32-throughput | 65,536 | 1.244e+09 elements/s | 1.194e+09 | 1.301e+09 |
| compute/kernels-scale-extract-f32-throughput | 1,048,576 | 2.005e+10 elements/s | 2.015e+10 | 2.058e+10 |
| compute/kernels-scale-extract-f32-throughput | 8,388,608 | 1.02e+10 elements/s | 1.018e+10 | 1.027e+10 |
| compute/kernels-scale-histogram-f32-throughput | 65,536 | 1.23e+09 elements/s | 1.21e+09 | 1.268e+09 |
| compute/kernels-scale-histogram-f32-throughput | 1,048,576 | 2.018e+10 elements/s | 2.005e+10 | 2.151e+10 |
| compute/kernels-scale-histogram-f32-throughput | 8,388,608 | 5.392e+10 elements/s | 5.339e+10 | 5.443e+10 |
| compute/kernels-scale-remap-f32-throughput | 65,536 | 1.273e+09 elements/s | 1.22e+09 | 1.305e+09 |
| compute/kernels-scale-remap-f32-throughput | 1,048,576 | 2.021e+10 elements/s | 1.99e+10 | 2.114e+10 |
| compute/kernels-scale-remap-f32-throughput | 8,388,608 | 2.758e+10 elements/s | 2.738e+10 | 2.908e+10 |
| compute/kernels-scan-exclusive-u32-throughput | 65,536 | 1.161e+09 elements/s | 1.141e+09 | 1.199e+09 |
| compute/kernels-scan-exclusive-u32-throughput | 1,048,576 | 1.902e+10 elements/s | 1.859e+10 | 1.995e+10 |
| compute/kernels-scan-exclusive-u32-throughput | 8,388,608 | 1.494e+10 elements/s | 1.496e+10 | 1.505e+10 |
| compute/kernels-sum-f32-throughput | 65,536 | 1.292e+09 elements/s | 1.221e+09 | 1.311e+09 |
| compute/kernels-sum-f32-throughput | 1,048,576 | 2.001e+10 elements/s | 1.972e+10 | 2.105e+10 |
| compute/kernels-sum-f32-throughput | 8,388,608 | 4.923e+10 elements/s | 4.919e+10 | 4.934e+10 |
| compute/readbackring-read-throughput | 262,144 | 9.895e+07 bytes/s | 9.993e+07 | 1.251e+08 |
| compute/readbackring-read-throughput | 1,048,576 | 3.497e+08 bytes/s | 3.52e+08 | 3.781e+08 |
| compute/readbackring-read-throughput | 8,388,608 | 1.652e+09 bytes/s | 1.665e+09 | 1.809e+09 |
| compute/storagebuffer-write-throughput | 65,536 | 4.622e+09 bytes/s | 4.647e+09 | 5.355e+09 |
| compute/storagebuffer-write-throughput | 1,048,576 | 8.33e+09 bytes/s | 8.297e+09 | 9.976e+09 |
| compute/storagebuffer-write-throughput | 8,388,608 | 5.348e+09 bytes/s | 5.236e+09 | 5.644e+09 |
| gltf/accessors-read-interleaved-vec3-throughput | 262,144 | 1.098e+08 elements/s | 1.081e+08 | 1.152e+08 |
| gltf/accessors-read-interleaved-vec3-throughput | 1,048,576 | 1.042e+08 elements/s | 1.05e+08 | 1.103e+08 |
| gltf/accessors-read-interleaved-vec3-throughput | 4,194,304 | 1.075e+08 elements/s | 1.082e+08 | 1.156e+08 |
| interact/renderer-pointcloud-pick-latency | 65,536 | 2.8 ms | 3.025 | 4.39 |
| interact/renderer-pointcloud-pick-latency | 262,144 | 2.95 ms | 2.892 | 3.505 |
| interop/webassembly-view-copy-throughput | 1,048,576 | 34.5 GB/s | 34.91 | 37.33 |
| interop/webassembly-view-copy-throughput | 4,194,304 | 27.2 GB/s | 27.32 | 28.23 |
| interop/webassembly-view-copy-throughput | 16,777,216 | 18.74 GB/s | 18.79 | 19.52 |
| math/mat4-mul-throughput | 10,000 | 1.99e+06 operations/s | 1.947e+06 | 2.157e+06 |
| math/mat4-mul-throughput | 100,000 | 2.131e+06 operations/s | 2.129e+06 | 2.163e+06 |
| math/mat4-mul-throughput | 500,000 | 2.137e+06 operations/s | 2.132e+06 | 2.145e+06 |
| math/mat4d-mul-throughput | 250,000 | 5.793e+07 operations/s | 5.731e+07 | 5.839e+07 |
| math/mat4d-mul-throughput | 1,000,000 | 5.785e+07 operations/s | 5.756e+07 | 5.825e+07 |
| math/mat4d-mul-throughput | 4,000,000 | 5.827e+07 operations/s | 5.823e+07 | 5.857e+07 |
| math/mat4f-mul-throughput | 250,000 | 1.361e+08 operations/s | 1.356e+08 | 1.365e+08 |
| math/mat4f-mul-throughput | 1,000,000 | 1.196e+08 operations/s | 1.189e+08 | 1.199e+08 |
| math/mat4f-mul-throughput | 4,000,000 | 6.494e+07 operations/s | 6.464e+07 | 6.514e+07 |
| math/transform-set-position-update-all-throughput | 8,192 | 2.819e+07 transforms/s | 2.818e+07 | 2.886e+07 |
| math/transform-set-position-update-all-throughput | 32,768 | 2.794e+07 transforms/s | 2.797e+07 | 2.827e+07 |
| math/transform-set-position-update-all-throughput | 65,536 | 2.623e+07 transforms/s | 2.621e+07 | 2.666e+07 |
| objects/glyphfield-set-cpu-data-upload-throughput | 16,384 | 1.596e+08 instances/s | 1.577e+08 | 1.648e+08 |
| objects/glyphfield-set-cpu-data-upload-throughput | 131,072 | 1.473e+08 instances/s | 1.39e+08 | 1.533e+08 |
| objects/glyphfield-set-cpu-data-upload-throughput | 524,288 | 8.958e+07 instances/s | 8.919e+07 | 9.305e+07 |
| objects/latticespace-set-data-upload-throughput | 16,384 | 4.247e+08 cells/s | 4.261e+08 | 4.953e+08 |
| objects/latticespace-set-data-upload-throughput | 131,072 | 7.767e+08 cells/s | 7.767e+08 | 8.537e+08 |
| objects/latticespace-set-data-upload-throughput | 524,288 | 8.62e+08 cells/s | 8.774e+08 | 1.115e+09 |
| objects/nodelink-update-node-positions-upload-throughput | 16,384 | 1.073e+08 nodes/s | 1.058e+08 | 1.162e+08 |
| objects/nodelink-update-node-positions-upload-throughput | 131,072 | 1.005e+08 nodes/s | 9.935e+07 | 1.027e+08 |
| objects/nodelink-update-node-positions-upload-throughput | 524,288 | 1.038e+08 nodes/s | 1.038e+08 | 1.104e+08 |
| objects/pointcloud-set-data-upload-throughput | 16,384 | 5.992e+08 points/s | 5.942e+08 | 6.105e+08 |
| objects/pointcloud-set-data-upload-throughput | 131,072 | 5.872e+08 points/s | 5.85e+08 | 6.151e+08 |
| objects/pointcloud-set-data-upload-throughput | 524,288 | 3.749e+08 points/s | 3.672e+08 | 3.828e+08 |
| objects/splatfield-refresh-wasm-upload-throughput | 16,384 | 1.511e+08 splats/s | 1.457e+08 | 1.546e+08 |
| objects/splatfield-refresh-wasm-upload-throughput | 131,072 | 1.193e+08 splats/s | 1.208e+08 | 1.402e+08 |
| objects/splatfield-refresh-wasm-upload-throughput | 524,288 | 7.437e+07 splats/s | 7.462e+07 | 7.924e+07 |
| render/renderer-antialias-render-frame | 1,280 | 2.75 ms/frame | 2.742 | 3.2 |
| render/renderer-antialias-render-frame | 2,400 | 4.25 ms/frame | 4.217 | 6.105 |
| render/renderer-antialias-render-frame | 3,200 | 5.5 ms/frame | 5.45 | 6.8 |
| render/renderer-data-material-render-frame | 262,144 | 2.7 ms/frame | 2.75 | 3.235 |
| render/renderer-data-material-render-frame | 2,097,152 | 5.75 ms/frame | 5.5 | 6.645 |
| render/renderer-data-material-render-frame | 8,388,608 | 7.4 ms/frame | 7.517 | 8.805 |
| render/renderer-directional-shadows-render-frame | 8 | 2.8 ms/frame | 2.767 | 3.27 |
| render/renderer-directional-shadows-render-frame | 128 | 2.8 ms/frame | 2.783 | 3.49 |
| render/renderer-directional-shadows-render-frame | 512 | 3.1 ms/frame | 3.033 | 4.305 |
| render/renderer-frustum-culling-render-frame | 128 | 0.5 ms/frame | 0.5 | 0.69 |
| render/renderer-frustum-culling-render-frame | 2,048 | 1.8 ms/frame | 2.058 | 3.245 |
| render/renderer-frustum-culling-render-frame | 8,192 | 4.55 ms/frame | 7.433 | 22.79 |
| render/renderer-glyphfield-render-frame | 16,384 | 2.65 ms/frame | 2.517 | 2.935 |
| render/renderer-glyphfield-render-frame | 131,072 | 3.15 ms/frame | 3.525 | 5.335 |
| render/renderer-glyphfield-render-frame | 524,288 | 9.45 ms/frame | 9.433 | 10.19 |
| render/renderer-latticespace-render-frame | 32,768 | 3.7 ms/frame | 3.642 | 4.49 |
| render/renderer-latticespace-render-frame | 262,144 | 5.5 ms/frame | 5.642 | 6.835 |
| render/renderer-latticespace-render-frame | 1,000,000 | 12.6 ms/frame | 12.68 | 14.55 |
| render/renderer-many-meshes-render-frame | 64 | 0.5 ms/frame | 1.05 | 2.87 |
| render/renderer-many-meshes-render-frame | 1,024 | 2.9 ms/frame | 2.775 | 3.745 |
| render/renderer-many-meshes-render-frame | 4,096 | 3.75 ms/frame | 3.525 | 4.68 |
| render/renderer-many-pointclouds-render-frame | 16 | 2.25 ms/frame | 1.992 | 2.845 |
| render/renderer-many-pointclouds-render-frame | 256 | 3.7 ms/frame | 3.358 | 4.2 |
| render/renderer-many-pointclouds-render-frame | 1,024 | 7.5 ms/frame | 7.225 | 8.85 |
| render/renderer-mesh-render-frame | 262,144 | 3.5 ms/frame | 3.267 | 4.595 |
| render/renderer-mesh-render-frame | 2,097,152 | 9 ms/frame | 7.575 | 11.28 |
| render/renderer-mesh-render-frame | 8,388,608 | 4.05 ms/frame | 4.367 | 6.17 |
| render/renderer-mixed-materials-render-frame | 64 | 1.4 ms/frame | 1.55 | 2.845 |
| render/renderer-mixed-materials-render-frame | 1,024 | 2.75 ms/frame | 2.783 | 3.845 |
| render/renderer-mixed-materials-render-frame | 4,096 | 4.5 ms/frame | 4.308 | 5.305 |
| render/renderer-mixed-scientific-scene-render-frame | 4 | 2.9 ms/frame | 2.775 | 3.09 |
| render/renderer-mixed-scientific-scene-render-frame | 16 | 5.6 ms/frame | 5.933 | 7.59 |
| render/renderer-mixed-scientific-scene-render-frame | 64 | 9.45 ms/frame | 9.85 | 12.37 |
| render/renderer-nodelink-render-frame | 1,024 | 2.7 ms/frame | 2.542 | 3.335 |
| render/renderer-nodelink-render-frame | 16,384 | 2.8 ms/frame | 2.75 | 3.39 |
| render/renderer-nodelink-render-frame | 65,536 | 6.8 ms/frame | 6.6 | 7.6 |
| render/renderer-occlusion-culling-render-frame | 64 | 2.85 ms/frame | 2.792 | 3.68 |
| render/renderer-occlusion-culling-render-frame | 512 | 5.45 ms/frame | 4.958 | 5.935 |
| render/renderer-occlusion-culling-render-frame | 2,048 | 12.85 ms/frame | 12.2 | 13.85 |
| render/renderer-pointcloud-render-frame | 65,536 | 2.7 ms/frame | 2.525 | 3.245 |
| render/renderer-pointcloud-render-frame | 262,144 | 2.75 ms/frame | 3 | 3.965 |
| render/renderer-pointcloud-render-frame | 1,048,576 | 2.75 ms/frame | 2.8 | 3.545 |
| render/renderer-splatfield-render-frame | 65,536 | 3.75 ms/frame | 3.708 | 4.735 |
| render/renderer-splatfield-render-frame | 262,144 | 5.55 ms/frame | 5.583 | 6.47 |
| render/renderer-splatfield-render-frame | 1,048,576 | 8.3 ms/frame | 8.183 | 9.005 |
| render/renderer-transmission-mesh-render-frame | 16 | 2.8 ms/frame | 2.767 | 3.225 |
| render/renderer-transmission-mesh-render-frame | 256 | 3.9 ms/frame | 3.858 | 4.84 |
| render/renderer-transmission-mesh-render-frame | 1,024 | 7.25 ms/frame | 7.242 | 7.835 |
| render/renderer-transparent-mesh-render-frame | 64 | 2.75 ms/frame | 2.733 | 3.425 |
| render/renderer-transparent-mesh-render-frame | 1,024 | 5.55 ms/frame | 5.55 | 5.89 |
| render/renderer-transparent-mesh-render-frame | 4,096 | 18.85 ms/frame | 18.84 | 19.34 |
| scaling/scale-service-percentile-stats-latency | 65,536 | 8.85 ms | 8.8 | 11.19 |
| scaling/scale-service-percentile-stats-latency | 1,048,576 | 10.9 ms | 10.87 | 13.81 |
| scaling/scale-service-percentile-stats-latency | 8,388,608 | 16.05 ms | 16.23 | 18.3 |
