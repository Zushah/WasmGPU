# WasmGPU benchmark report

## Environment

- Timestamp: 2026-08-23T14:46:36.827Z
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
| compute/compute-dispatch-batch-throughput | 16 | 2.958e+05 dispatches/s | 2.878e+05 | 3.164e+05 |
| compute/compute-dispatch-batch-throughput | 256 | 1.005e+06 dispatches/s | 9.925e+05 | 1.054e+06 |
| compute/compute-dispatch-batch-throughput | 2,048 | 1.111e+06 dispatches/s | 1.107e+06 | 1.124e+06 |
| compute/cpundarray-index-get-set-throughput | 65,536 | 1.973e+07 operations/s | 1.959e+07 | 1.995e+07 |
| compute/cpundarray-index-get-set-throughput | 262,144 | 1.901e+07 operations/s | 1.892e+07 | 1.941e+07 |
| compute/cpundarray-index-get-set-throughput | 1,048,576 | 1.936e+07 operations/s | 1.938e+07 | 1.956e+07 |
| compute/cpundarray-upload-to-gpu-throughput | 4,194,304 | 6.851e+09 bytes/s | 6.643e+09 | 7.127e+09 |
| compute/cpundarray-upload-to-gpu-throughput | 16,777,216 | 2.427e+09 bytes/s | 2.415e+09 | 2.467e+09 |
| compute/cpundarray-upload-to-gpu-throughput | 33,554,432 | 2.463e+09 bytes/s | 2.443e+09 | 2.496e+09 |
| compute/gpundarray-readback-to-cpu-throughput | 16,777,216 | 2.486e+09 bytes/s | 2.471e+09 | 2.573e+09 |
| compute/gpundarray-readback-to-cpu-throughput | 25,165,824 | 2.542e+09 bytes/s | 2.532e+09 | 2.618e+09 |
| compute/gpundarray-readback-to-cpu-throughput | 33,554,432 | 2.739e+09 bytes/s | 2.58e+09 | 2.861e+09 |
| compute/kernels-argmax-f32-throughput | 65,536 | 1.328e+09 elements/s | 1.305e+09 | 1.41e+09 |
| compute/kernels-argmax-f32-throughput | 1,048,576 | 2.043e+10 elements/s | 1.935e+10 | 2.143e+10 |
| compute/kernels-argmax-f32-throughput | 8,388,608 | 4.428e+10 elements/s | 4.425e+10 | 4.446e+10 |
| compute/kernels-argmin-f32-throughput | 65,536 | 1.258e+09 elements/s | 1.17e+09 | 1.32e+09 |
| compute/kernels-argmin-f32-throughput | 1,048,576 | 2.015e+10 elements/s | 1.9e+10 | 2.037e+10 |
| compute/kernels-argmin-f32-throughput | 8,388,608 | 4.414e+10 elements/s | 4.415e+10 | 4.441e+10 |
| compute/kernels-compact-f32-throughput | 8,388,608 | 6.579e+09 elements/s | 6.542e+09 | 6.683e+09 |
| compute/kernels-compact-f32-throughput | 12,582,912 | 6.412e+09 elements/s | 6.46e+09 | 6.743e+09 |
| compute/kernels-compact-f32-throughput | 16,776,960 | 6.616e+09 elements/s | 6.597e+09 | 6.847e+09 |
| compute/kernels-compact-u32-throughput | 8,388,608 | 6.612e+09 elements/s | 6.593e+09 | 6.693e+09 |
| compute/kernels-compact-u32-throughput | 12,582,912 | 6.683e+09 elements/s | 6.678e+09 | 6.755e+09 |
| compute/kernels-compact-u32-throughput | 16,776,960 | 6.783e+09 elements/s | 6.785e+09 | 6.848e+09 |
| compute/kernels-copy-f32-throughput | 65,536 | 5.764 GB/s | 5.606 | 6.086 |
| compute/kernels-copy-f32-throughput | 1,048,576 | 95.82 GB/s | 94.62 | 97.44 |
| compute/kernels-copy-f32-throughput | 8,388,608 | 118.2 GB/s | 118 | 119.3 |
| compute/kernels-histogram-u32-throughput | 65,536 | 1.311e+09 elements/s | 1.321e+09 | 1.468e+09 |
| compute/kernels-histogram-u32-throughput | 1,048,576 | 2.868e+09 elements/s | 2.858e+09 | 2.879e+09 |
| compute/kernels-histogram-u32-throughput | 8,388,608 | 2.969e+09 elements/s | 2.972e+09 | 3.001e+09 |
| compute/kernels-min-f32-throughput | 65,536 | 1.327e+09 elements/s | 1.217e+09 | 1.372e+09 |
| compute/kernels-min-f32-throughput | 1,048,576 | 2.055e+10 elements/s | 1.975e+10 | 2.121e+10 |
| compute/kernels-min-f32-throughput | 8,388,608 | 4.948e+10 elements/s | 4.944e+10 | 4.965e+10 |
| compute/kernels-radix-sort-keys-u32-throughput | 16,384 | 2.273e+07 keys/s | 2.231e+07 | 2.36e+07 |
| compute/kernels-radix-sort-keys-u32-throughput | 262,144 | 2.203e+08 keys/s | 2.067e+08 | 2.235e+08 |
| compute/kernels-radix-sort-keys-u32-throughput | 2,097,152 | 2.322e+08 keys/s | 2.317e+08 | 2.426e+08 |
| compute/kernels-radix-sort-pairs-u32-throughput | 16,384 | 2.097e+07 elements/s | 2.117e+07 | 2.372e+07 |
| compute/kernels-radix-sort-pairs-u32-throughput | 262,144 | 2.095e+08 elements/s | 2.048e+08 | 2.124e+08 |
| compute/kernels-radix-sort-pairs-u32-throughput | 2,097,152 | 1.673e+08 elements/s | 1.702e+08 | 1.835e+08 |
| compute/kernels-scale-extract-f32-throughput | 65,536 | 8.83e+08 elements/s | 9.095e+08 | 9.731e+08 |
| compute/kernels-scale-extract-f32-throughput | 1,048,576 | 1.394e+10 elements/s | 1.355e+10 | 1.507e+10 |
| compute/kernels-scale-extract-f32-throughput | 8,388,608 | 1.027e+10 elements/s | 1.026e+10 | 1.035e+10 |
| compute/kernels-scale-histogram-f32-throughput | 65,536 | 8.654e+08 elements/s | 8.336e+08 | 9.391e+08 |
| compute/kernels-scale-histogram-f32-throughput | 1,048,576 | 4.612e+09 elements/s | 4.481e+09 | 4.632e+09 |
| compute/kernels-scale-histogram-f32-throughput | 8,388,608 | 4.944e+09 elements/s | 4.943e+09 | 5.029e+09 |
| compute/kernels-scale-remap-f32-throughput | 65,536 | 8.778e+08 elements/s | 8.872e+08 | 9.826e+08 |
| compute/kernels-scale-remap-f32-throughput | 1,048,576 | 1.448e+10 elements/s | 1.445e+10 | 1.565e+10 |
| compute/kernels-scale-remap-f32-throughput | 8,388,608 | 2.956e+10 elements/s | 2.96e+10 | 2.989e+10 |
| compute/kernels-scan-exclusive-u32-throughput | 65,536 | 1.208e+09 elements/s | 1.176e+09 | 1.248e+09 |
| compute/kernels-scan-exclusive-u32-throughput | 1,048,576 | 1.385e+10 elements/s | 1.336e+10 | 1.416e+10 |
| compute/kernels-scan-exclusive-u32-throughput | 8,388,608 | 1.359e+10 elements/s | 1.357e+10 | 1.39e+10 |
| compute/kernels-sum-f32-throughput | 65,536 | 1.269e+09 elements/s | 1.213e+09 | 1.328e+09 |
| compute/kernels-sum-f32-throughput | 1,048,576 | 2.067e+10 elements/s | 1.986e+10 | 2.122e+10 |
| compute/kernels-sum-f32-throughput | 8,388,608 | 4.945e+10 elements/s | 4.942e+10 | 4.96e+10 |
| compute/readbackring-read-throughput | 262,144 | 1.188e+08 bytes/s | 1.25e+08 | 1.605e+08 |
| compute/readbackring-read-throughput | 1,048,576 | 3.253e+08 bytes/s | 3.245e+08 | 3.759e+08 |
| compute/readbackring-read-throughput | 8,388,608 | 1.516e+09 bytes/s | 1.552e+09 | 1.822e+09 |
| compute/storagebuffer-write-throughput | 65,536 | 6.698e+09 bytes/s | 6.786e+09 | 7.052e+09 |
| compute/storagebuffer-write-throughput | 1,048,576 | 1.213e+10 bytes/s | 1.207e+10 | 1.223e+10 |
| compute/storagebuffer-write-throughput | 8,388,608 | 6.217e+09 bytes/s | 6.151e+09 | 6.297e+09 |
| gltf/accessors-read-interleaved-vec3-throughput | 262,144 | 1.182e+08 elements/s | 1.154e+08 | 1.227e+08 |
| gltf/accessors-read-interleaved-vec3-throughput | 1,048,576 | 1.115e+08 elements/s | 1.087e+08 | 1.143e+08 |
| gltf/accessors-read-interleaved-vec3-throughput | 4,194,304 | 1.11e+08 elements/s | 1.096e+08 | 1.137e+08 |
| interact/renderer-pointcloud-pick-latency | 65,536 | 0.8 ms | 1.225 | 2.7 |
| interact/renderer-pointcloud-pick-latency | 262,144 | 2.85 ms | 2.933 | 3.2 |
| interop/webassembly-view-copy-throughput | 1,048,576 | 37.94 GB/s | 37.28 | 38.78 |
| interop/webassembly-view-copy-throughput | 4,194,304 | 33.17 GB/s | 32.82 | 33.84 |
| interop/webassembly-view-copy-throughput | 16,777,216 | 19.67 GB/s | 19.66 | 20.09 |
| math/mat4-mul-throughput | 10,000 | 1.98e+06 operations/s | 1.957e+06 | 2.121e+06 |
| math/mat4-mul-throughput | 100,000 | 2.095e+06 operations/s | 2.055e+06 | 2.156e+06 |
| math/mat4-mul-throughput | 500,000 | 2.092e+06 operations/s | 2.063e+06 | 2.165e+06 |
| math/mat4d-mul-throughput | 250,000 | 5.735e+07 operations/s | 5.66e+07 | 5.848e+07 |
| math/mat4d-mul-throughput | 1,000,000 | 5.69e+07 operations/s | 5.634e+07 | 5.776e+07 |
| math/mat4d-mul-throughput | 4,000,000 | 5.658e+07 operations/s | 5.534e+07 | 5.809e+07 |
| math/mat4f-mul-throughput | 250,000 | 1.416e+08 operations/s | 1.384e+08 | 1.453e+08 |
| math/mat4f-mul-throughput | 1,000,000 | 1.314e+08 operations/s | 1.277e+08 | 1.376e+08 |
| math/mat4f-mul-throughput | 4,000,000 | 1.364e+08 operations/s | 1.356e+08 | 1.373e+08 |
| math/transform-set-position-update-all-throughput | 8,192 | 2.741e+07 transforms/s | 2.727e+07 | 2.817e+07 |
| math/transform-set-position-update-all-throughput | 32,768 | 2.756e+07 transforms/s | 2.751e+07 | 2.823e+07 |
| math/transform-set-position-update-all-throughput | 65,536 | 2.651e+07 transforms/s | 2.649e+07 | 2.677e+07 |
| objects/glyphfield-set-cpu-data-upload-throughput | 16,384 | 1.786e+08 instances/s | 1.76e+08 | 1.872e+08 |
| objects/glyphfield-set-cpu-data-upload-throughput | 131,072 | 1.562e+08 instances/s | 1.536e+08 | 1.599e+08 |
| objects/glyphfield-set-cpu-data-upload-throughput | 524,288 | 9.29e+07 instances/s | 9.222e+07 | 9.42e+07 |
| objects/latticespace-set-data-upload-throughput | 16,384 | 4.739e+08 cells/s | 4.746e+08 | 5.52e+08 |
| objects/latticespace-set-data-upload-throughput | 131,072 | 8.056e+08 cells/s | 8.204e+08 | 9.826e+08 |
| objects/latticespace-set-data-upload-throughput | 524,288 | 9.373e+08 cells/s | 9.471e+08 | 1.143e+09 |
| objects/nodelink-update-node-positions-upload-throughput | 16,384 | 1.059e+08 nodes/s | 1.081e+08 | 1.237e+08 |
| objects/nodelink-update-node-positions-upload-throughput | 131,072 | 1.021e+08 nodes/s | 1.042e+08 | 1.165e+08 |
| objects/nodelink-update-node-positions-upload-throughput | 524,288 | 1.057e+08 nodes/s | 1.019e+08 | 1.108e+08 |
| objects/pointcloud-set-data-upload-throughput | 16,384 | 6.385e+08 points/s | 6.312e+08 | 6.832e+08 |
| objects/pointcloud-set-data-upload-throughput | 131,072 | 6.225e+08 points/s | 6.175e+08 | 6.3e+08 |
| objects/pointcloud-set-data-upload-throughput | 524,288 | 3.936e+08 points/s | 3.9e+08 | 3.997e+08 |
| objects/splatfield-refresh-wasm-upload-throughput | 16,384 | 1.694e+08 splats/s | 1.682e+08 | 1.814e+08 |
| objects/splatfield-refresh-wasm-upload-throughput | 131,072 | 1.52e+08 splats/s | 1.515e+08 | 1.574e+08 |
| objects/splatfield-refresh-wasm-upload-throughput | 524,288 | 9.336e+07 splats/s | 9.27e+07 | 9.446e+07 |
| render/renderer-antialias-render-frame | 1,280 | 2.75 ms/frame | 2.758 | 3.045 |
| render/renderer-antialias-render-frame | 2,400 | 2.75 ms/frame | 2.633 | 3.435 |
| render/renderer-antialias-render-frame | 3,200 | 2.8 ms/frame | 2.842 | 3.835 |
| render/renderer-data-material-render-frame | 262,144 | 2.65 ms/frame | 2.5 | 2.945 |
| render/renderer-data-material-render-frame | 2,097,152 | 2.8 ms/frame | 2.825 | 3.78 |
| render/renderer-data-material-render-frame | 8,388,608 | 3.8 ms/frame | 3.783 | 4.97 |
| render/renderer-directional-shadows-render-frame | 8 | 2.75 ms/frame | 2.558 | 2.945 |
| render/renderer-directional-shadows-render-frame | 128 | 2.8 ms/frame | 2.8 | 3.2 |
| render/renderer-directional-shadows-render-frame | 512 | 2.75 ms/frame | 2.825 | 3.49 |
| render/renderer-frustum-culling-render-frame | 128 | 1.1 ms/frame | 1.4 | 2.745 |
| render/renderer-frustum-culling-render-frame | 2,048 | 2.8 ms/frame | 2.533 | 4.35 |
| render/renderer-frustum-culling-render-frame | 8,192 | 3.9 ms/frame | 3.692 | 4.245 |
| render/renderer-glyphfield-render-frame | 16,384 | 2.75 ms/frame | 2.8 | 3.47 |
| render/renderer-glyphfield-render-frame | 131,072 | 2.75 ms/frame | 3.008 | 4.25 |
| render/renderer-glyphfield-render-frame | 524,288 | 8.95 ms/frame | 9.083 | 10.11 |
| render/renderer-latticespace-render-frame | 32,768 | 3.45 ms/frame | 3.417 | 4.545 |
| render/renderer-latticespace-render-frame | 262,144 | 5.6 ms/frame | 5.55 | 5.935 |
| render/renderer-latticespace-render-frame | 1,000,000 | 13.8 ms/frame | 13.8 | 14.2 |
| render/renderer-many-meshes-render-frame | 64 | 2.15 ms/frame | 1.683 | 2.745 |
| render/renderer-many-meshes-render-frame | 1,024 | 2.8 ms/frame | 2.767 | 3.315 |
| render/renderer-many-meshes-render-frame | 4,096 | 2.95 ms/frame | 2.917 | 4.345 |
| render/renderer-many-pointclouds-render-frame | 16 | 2.55 ms/frame | 2.133 | 3.35 |
| render/renderer-many-pointclouds-render-frame | 256 | 3.8 ms/frame | 3.725 | 5.005 |
| render/renderer-many-pointclouds-render-frame | 1,024 | 5.6 ms/frame | 5.85 | 7.235 |
| render/renderer-mesh-render-frame | 262,144 | 5.65 ms/frame | 5.858 | 7.16 |
| render/renderer-mesh-render-frame | 2,097,152 | 2.75 ms/frame | 2.717 | 3.445 |
| render/renderer-mesh-render-frame | 8,388,608 | 4 ms/frame | 3.992 | 5.035 |
| render/renderer-mixed-materials-render-frame | 64 | 2.65 ms/frame | 2.25 | 2.99 |
| render/renderer-mixed-materials-render-frame | 1,024 | 2.8 ms/frame | 2.767 | 3.045 |
| render/renderer-mixed-materials-render-frame | 4,096 | 4 ms/frame | 3.717 | 4.645 |
| render/renderer-mixed-scientific-scene-render-frame | 4 | 2.85 ms/frame | 2.808 | 2.945 |
| render/renderer-mixed-scientific-scene-render-frame | 16 | 5.5 ms/frame | 5.525 | 5.7 |
| render/renderer-mixed-scientific-scene-render-frame | 64 | 10.1 ms/frame | 10.02 | 10.93 |
| render/renderer-nodelink-render-frame | 1,024 | 2.65 ms/frame | 2.558 | 3.09 |
| render/renderer-nodelink-render-frame | 16,384 | 2.75 ms/frame | 2.775 | 3.38 |
| render/renderer-nodelink-render-frame | 65,536 | 6.85 ms/frame | 7.183 | 8.435 |
| render/renderer-occlusion-culling-render-frame | 64 | 3.2 ms/frame | 3.033 | 4.2 |
| render/renderer-occlusion-culling-render-frame | 512 | 5.3 ms/frame | 5.058 | 5.645 |
| render/renderer-occlusion-culling-render-frame | 2,048 | 12.15 ms/frame | 11.81 | 12.92 |
| render/renderer-pointcloud-render-frame | 65,536 | 2.65 ms/frame | 2.55 | 3 |
| render/renderer-pointcloud-render-frame | 262,144 | 2.85 ms/frame | 2.758 | 3.145 |
| render/renderer-pointcloud-render-frame | 1,048,576 | 2.8 ms/frame | 2.792 | 3.535 |
| render/renderer-splatfield-render-frame | 65,536 | 3.65 ms/frame | 3.708 | 4.545 |
| render/renderer-splatfield-render-frame | 262,144 | 5.6 ms/frame | 5.558 | 5.7 |
| render/renderer-splatfield-render-frame | 1,048,576 | 8.5 ms/frame | 8.6 | 10.33 |
| render/renderer-transmission-mesh-render-frame | 16 | 2.8 ms/frame | 2.833 | 3.845 |
| render/renderer-transmission-mesh-render-frame | 256 | 3.5 ms/frame | 3.125 | 4.06 |
| render/renderer-transmission-mesh-render-frame | 1,024 | 7.1 ms/frame | 7.208 | 8.06 |
| render/renderer-transparent-mesh-render-frame | 64 | 2.8 ms/frame | 2.783 | 3.2 |
| render/renderer-transparent-mesh-render-frame | 1,024 | 5.6 ms/frame | 5.558 | 5.745 |
| render/renderer-transparent-mesh-render-frame | 4,096 | 17.1 ms/frame | 17.15 | 18.32 |
| scaling/scale-service-percentile-stats-latency | 65,536 | 5.7 ms | 5.6 | 9.495 |
| scaling/scale-service-percentile-stats-latency | 1,048,576 | 8.6 ms | 8.242 | 11.19 |
| scaling/scale-service-percentile-stats-latency | 8,388,608 | 16.1 ms | 16 | 18.1 |
