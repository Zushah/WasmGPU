# WasmGPU benchmark report

## Environment

- Timestamp: 2026-08-27T18:41:37.835Z
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
| compute/compute-dispatch-batch-throughput | 16 | 3.179e+05 dispatches/s | 3.263e+05 | 3.552e+05 |
| compute/compute-dispatch-batch-throughput | 256 | 1.073e+06 dispatches/s | 1.061e+06 | 1.08e+06 |
| compute/compute-dispatch-batch-throughput | 2,048 | 1.132e+06 dispatches/s | 1.131e+06 | 1.144e+06 |
| compute/cpundarray-index-get-set-throughput | 65,536 | 3.416e+07 operations/s | 3.386e+07 | 3.437e+07 |
| compute/cpundarray-index-get-set-throughput | 262,144 | 3.292e+07 operations/s | 3.289e+07 | 3.315e+07 |
| compute/cpundarray-index-get-set-throughput | 1,048,576 | 3.089e+07 operations/s | 3.062e+07 | 3.1e+07 |
| compute/cpundarray-upload-to-gpu-throughput | 4,194,304 | 9.869e+09 bytes/s | 9.734e+09 | 1.08e+10 |
| compute/cpundarray-upload-to-gpu-throughput | 16,777,216 | 2.552e+09 bytes/s | 2.548e+09 | 2.566e+09 |
| compute/cpundarray-upload-to-gpu-throughput | 33,554,432 | 2.918e+09 bytes/s | 2.866e+09 | 2.999e+09 |
| compute/gpundarray-readback-to-cpu-throughput | 16,777,216 | 5.065e+09 bytes/s | 4.985e+09 | 5.162e+09 |
| compute/gpundarray-readback-to-cpu-throughput | 25,165,824 | 4.947e+09 bytes/s | 4.968e+09 | 5.07e+09 |
| compute/gpundarray-readback-to-cpu-throughput | 33,554,432 | 5.233e+09 bytes/s | 5.248e+09 | 5.357e+09 |
| compute/kernels-add-f32-throughput | 65,536 | 17.2 GB/s | 16.61 | 17.53 |
| compute/kernels-add-f32-throughput | 1,048,576 | 294.4 GB/s | 287.7 | 309.3 |
| compute/kernels-add-f32-throughput | 8,388,608 | 244.3 GB/s | 243.5 | 245 |
| compute/kernels-argmax-f32-throughput | 65,536 | 1.302e+09 elements/s | 1.278e+09 | 1.344e+09 |
| compute/kernels-argmax-f32-throughput | 1,048,576 | 2.007e+10 elements/s | 1.984e+10 | 2.091e+10 |
| compute/kernels-argmax-f32-throughput | 8,388,608 | 4.421e+10 elements/s | 4.416e+10 | 4.436e+10 |
| compute/kernels-argmin-f32-throughput | 65,536 | 1.326e+09 elements/s | 1.281e+09 | 1.353e+09 |
| compute/kernels-argmin-f32-throughput | 1,048,576 | 2.036e+10 elements/s | 2.031e+10 | 2.255e+10 |
| compute/kernels-argmin-f32-throughput | 8,388,608 | 4.432e+10 elements/s | 4.432e+10 | 4.462e+10 |
| compute/kernels-axpy-f32-throughput | 65,536 | 15.55 GB/s | 15.13 | 16.07 |
| compute/kernels-axpy-f32-throughput | 1,048,576 | 248.5 GB/s | 246.5 | 272.3 |
| compute/kernels-axpy-f32-throughput | 8,388,608 | 242.4 GB/s | 242.4 | 244.5 |
| compute/kernels-compact-f32-throughput | 8,388,608 | 7.942e+09 elements/s | 7.929e+09 | 8.035e+09 |
| compute/kernels-compact-f32-throughput | 12,582,912 | 8.102e+09 elements/s | 8.107e+09 | 8.158e+09 |
| compute/kernels-compact-f32-throughput | 16,776,960 | 8.147e+09 elements/s | 8.131e+09 | 8.277e+09 |
| compute/kernels-compact-u32-throughput | 8,388,608 | 7.872e+09 elements/s | 7.884e+09 | 8e+09 |
| compute/kernels-compact-u32-throughput | 12,582,912 | 8.085e+09 elements/s | 8.081e+09 | 8.181e+09 |
| compute/kernels-compact-u32-throughput | 16,776,960 | 8.14e+09 elements/s | 8.131e+09 | 8.259e+09 |
| compute/kernels-copy-f32-throughput | 65,536 | 5.808 GB/s | 5.573 | 6.331 |
| compute/kernels-copy-f32-throughput | 1,048,576 | 97.61 GB/s | 96.77 | 107 |
| compute/kernels-copy-f32-throughput | 8,388,608 | 118.5 GB/s | 118.5 | 119.5 |
| compute/kernels-dot-f32-throughput | 65,536 | 1.255e+09 elements/s | 1.197e+09 | 1.298e+09 |
| compute/kernels-dot-f32-throughput | 1,048,576 | 2.015e+10 elements/s | 1.969e+10 | 2.097e+10 |
| compute/kernels-dot-f32-throughput | 8,388,608 | 2.974e+10 elements/s | 2.969e+10 | 2.986e+10 |
| compute/kernels-gemm-c64-throughput | 128 | 320.9 GFLOP/s | 322.2 | 333.3 |
| compute/kernels-gemm-c64-throughput | 256 | 2246 GFLOP/s | 2180 | 2256 |
| compute/kernels-gemm-c64-throughput | 512 | 2956 GFLOP/s | 2925 | 3039 |
| compute/kernels-gemm-f32-throughput | 128 | 82.91 GFLOP/s | 82.49 | 86.22 |
| compute/kernels-gemm-f32-throughput | 256 | 689.6 GFLOP/s | 673 | 709.2 |
| compute/kernels-gemm-f32-throughput | 512 | 1146 GFLOP/s | 1146 | 1155 |
| compute/kernels-gemm-f32-throughput | 1,024 | 1208 GFLOP/s | 1208 | 1249 |
| compute/kernels-gemm-u32-throughput | 128 | 82.6 Gops/s | 82.28 | 86 |
| compute/kernels-gemm-u32-throughput | 256 | 664.7 Gops/s | 645 | 685 |
| compute/kernels-gemm-u32-throughput | 512 | 1167 Gops/s | 1169 | 1177 |
| compute/kernels-gemm-u32-throughput | 1,024 | 1244 Gops/s | 1245 | 1274 |
| compute/kernels-histogram-u32-throughput | 65,536 | 1.37e+09 elements/s | 1.287e+09 | 1.407e+09 |
| compute/kernels-histogram-u32-throughput | 1,048,576 | 2.333e+10 elements/s | 2.347e+10 | 2.488e+10 |
| compute/kernels-histogram-u32-throughput | 8,388,608 | 5.485e+10 elements/s | 5.489e+10 | 5.522e+10 |
| compute/kernels-min-f32-throughput | 65,536 | 1.353e+09 elements/s | 1.317e+09 | 1.426e+09 |
| compute/kernels-min-f32-throughput | 1,048,576 | 2.122e+10 elements/s | 2.033e+10 | 2.299e+10 |
| compute/kernels-min-f32-throughput | 8,388,608 | 4.948e+10 elements/s | 4.93e+10 | 4.956e+10 |
| compute/kernels-radix-sort-keys-u32-throughput | 16,384 | 3.455e+07 keys/s | 3.484e+07 | 4.001e+07 |
| compute/kernels-radix-sort-keys-u32-throughput | 262,144 | 4.181e+08 keys/s | 4.052e+08 | 4.233e+08 |
| compute/kernels-radix-sort-keys-u32-throughput | 2,097,152 | 5.474e+08 keys/s | 5.418e+08 | 5.712e+08 |
| compute/kernels-radix-sort-pairs-u32-throughput | 16,384 | 3.231e+07 elements/s | 3.226e+07 | 3.637e+07 |
| compute/kernels-radix-sort-pairs-u32-throughput | 262,144 | 3.743e+08 elements/s | 3.653e+08 | 3.828e+08 |
| compute/kernels-radix-sort-pairs-u32-throughput | 2,097,152 | 2.801e+08 elements/s | 2.839e+08 | 2.994e+08 |
| compute/kernels-scale-extract-f32-throughput | 65,536 | 1.272e+09 elements/s | 1.228e+09 | 1.317e+09 |
| compute/kernels-scale-extract-f32-throughput | 1,048,576 | 1.609e+10 elements/s | 1.649e+10 | 1.803e+10 |
| compute/kernels-scale-extract-f32-throughput | 8,388,608 | 1.017e+10 elements/s | 1.017e+10 | 1.027e+10 |
| compute/kernels-scale-histogram-f32-throughput | 65,536 | 1.254e+09 elements/s | 1.212e+09 | 1.327e+09 |
| compute/kernels-scale-histogram-f32-throughput | 1,048,576 | 2.078e+10 elements/s | 2.029e+10 | 2.268e+10 |
| compute/kernels-scale-histogram-f32-throughput | 8,388,608 | 5.423e+10 elements/s | 5.41e+10 | 5.474e+10 |
| compute/kernels-scale-remap-f32-throughput | 65,536 | 1.318e+09 elements/s | 1.293e+09 | 1.381e+09 |
| compute/kernels-scale-remap-f32-throughput | 1,048,576 | 2.085e+10 elements/s | 2.035e+10 | 2.132e+10 |
| compute/kernels-scale-remap-f32-throughput | 8,388,608 | 2.94e+10 elements/s | 2.948e+10 | 2.97e+10 |
| compute/kernels-scan-exclusive-u32-throughput | 65,536 | 1.166e+09 elements/s | 1.119e+09 | 1.243e+09 |
| compute/kernels-scan-exclusive-u32-throughput | 1,048,576 | 1.954e+10 elements/s | 1.864e+10 | 2.007e+10 |
| compute/kernels-scan-exclusive-u32-throughput | 8,388,608 | 1.498e+10 elements/s | 1.497e+10 | 1.501e+10 |
| compute/kernels-sum-f32-throughput | 65,536 | 1.272e+09 elements/s | 1.177e+09 | 1.308e+09 |
| compute/kernels-sum-f32-throughput | 1,048,576 | 2.038e+10 elements/s | 1.994e+10 | 2.18e+10 |
| compute/kernels-sum-f32-throughput | 8,388,608 | 4.954e+10 elements/s | 4.946e+10 | 4.965e+10 |
| compute/readbackring-read-throughput | 262,144 | 1.476e+08 bytes/s | 1.556e+08 | 1.899e+08 |
| compute/readbackring-read-throughput | 1,048,576 | 2.991e+08 bytes/s | 3.051e+08 | 3.701e+08 |
| compute/readbackring-read-throughput | 8,388,608 | 1.497e+09 bytes/s | 1.491e+09 | 1.602e+09 |
| compute/storagebuffer-write-throughput | 65,536 | 6.679e+09 bytes/s | 6.65e+09 | 7.072e+09 |
| compute/storagebuffer-write-throughput | 1,048,576 | 1.171e+10 bytes/s | 1.16e+10 | 1.184e+10 |
| compute/storagebuffer-write-throughput | 8,388,608 | 6.287e+09 bytes/s | 6.234e+09 | 6.341e+09 |
| gltf/accessors-read-interleaved-vec3-throughput | 262,144 | 1.311e+08 elements/s | 1.311e+08 | 1.433e+08 |
| gltf/accessors-read-interleaved-vec3-throughput | 1,048,576 | 1.271e+08 elements/s | 1.27e+08 | 1.304e+08 |
| gltf/accessors-read-interleaved-vec3-throughput | 4,194,304 | 1.241e+08 elements/s | 1.251e+08 | 1.325e+08 |
| interact/renderer-pointcloud-pick-latency | 65,536 | 0.95 ms | 1.525 | 2.945 |
| interact/renderer-pointcloud-pick-latency | 262,144 | 2.85 ms | 3.025 | 3.58 |
| interop/python-to-cpundarray-throughput | 1,048,576 | 3.754e+10 bytes/s | 3.684e+10 | 3.797e+10 |
| interop/python-to-cpundarray-throughput | 4,194,304 | 3.074e+10 bytes/s | 2.995e+10 | 3.146e+10 |
| interop/python-to-cpundarray-throughput | 16,777,216 | 1.97e+10 bytes/s | 1.967e+10 | 1.988e+10 |
| interop/python-to-gpundarray-throughput | 1,048,576 | 1.049e+10 bytes/s | 1.102e+10 | 1.713e+10 |
| interop/python-to-gpundarray-throughput | 4,194,304 | 9.595e+09 bytes/s | 9.164e+09 | 1.049e+10 |
| interop/python-to-gpundarray-throughput | 16,777,216 | 9.726e+09 bytes/s | 9.716e+09 | 9.869e+09 |
| interop/webassembly-view-copy-throughput | 1,048,576 | 37.81 GB/s | 37.78 | 38.37 |
| interop/webassembly-view-copy-throughput | 4,194,304 | 31.72 GB/s | 30.88 | 32.23 |
| interop/webassembly-view-copy-throughput | 16,777,216 | 20.01 GB/s | 19.92 | 20.24 |
| math/mat4-mul-throughput | 10,000 | 2.233e+06 operations/s | 2.223e+06 | 2.254e+06 |
| math/mat4-mul-throughput | 100,000 | 1.963e+06 operations/s | 2.046e+06 | 2.288e+06 |
| math/mat4-mul-throughput | 500,000 | 2.272e+06 operations/s | 2.265e+06 | 2.289e+06 |
| math/mat4d-mul-throughput | 250,000 | 5.764e+07 operations/s | 5.737e+07 | 5.894e+07 |
| math/mat4d-mul-throughput | 1,000,000 | 5.874e+07 operations/s | 5.86e+07 | 5.89e+07 |
| math/mat4d-mul-throughput | 4,000,000 | 5.81e+07 operations/s | 5.801e+07 | 5.878e+07 |
| math/mat4f-mul-throughput | 250,000 | 1.448e+08 operations/s | 1.439e+08 | 1.455e+08 |
| math/mat4f-mul-throughput | 1,000,000 | 1.379e+08 operations/s | 1.375e+08 | 1.382e+08 |
| math/mat4f-mul-throughput | 4,000,000 | 1.377e+08 operations/s | 1.375e+08 | 1.385e+08 |
| math/transform-set-position-update-all-throughput | 8,192 | 2.846e+07 transforms/s | 2.846e+07 | 2.922e+07 |
| math/transform-set-position-update-all-throughput | 32,768 | 2.871e+07 transforms/s | 2.86e+07 | 2.894e+07 |
| math/transform-set-position-update-all-throughput | 65,536 | 2.718e+07 transforms/s | 2.72e+07 | 2.751e+07 |
| objects/glyphfield-set-cpu-data-upload-throughput | 16,384 | 1.859e+08 instances/s | 1.843e+08 | 1.898e+08 |
| objects/glyphfield-set-cpu-data-upload-throughput | 131,072 | 1.61e+08 instances/s | 1.595e+08 | 1.616e+08 |
| objects/glyphfield-set-cpu-data-upload-throughput | 524,288 | 9.399e+07 instances/s | 9.349e+07 | 9.575e+07 |
| objects/latticespace-set-data-upload-throughput | 16,384 | 5.047e+08 cells/s | 5.025e+08 | 5.42e+08 |
| objects/latticespace-set-data-upload-throughput | 131,072 | 8.27e+08 cells/s | 8.408e+08 | 9.668e+08 |
| objects/latticespace-set-data-upload-throughput | 524,288 | 9.366e+08 cells/s | 9.622e+08 | 1.217e+09 |
| objects/nodelink-update-node-positions-upload-throughput | 16,384 | 1.074e+08 nodes/s | 1.086e+08 | 1.239e+08 |
| objects/nodelink-update-node-positions-upload-throughput | 131,072 | 1.034e+08 nodes/s | 1.036e+08 | 1.068e+08 |
| objects/nodelink-update-node-positions-upload-throughput | 524,288 | 1.096e+08 nodes/s | 1.074e+08 | 1.123e+08 |
| objects/pointcloud-set-data-upload-throughput | 16,384 | 6.456e+08 points/s | 6.416e+08 | 6.912e+08 |
| objects/pointcloud-set-data-upload-throughput | 131,072 | 6.191e+08 points/s | 6.169e+08 | 6.3e+08 |
| objects/pointcloud-set-data-upload-throughput | 524,288 | 4.009e+08 points/s | 3.94e+08 | 4.044e+08 |
| objects/splatfield-refresh-wasm-upload-throughput | 16,384 | 1.859e+08 splats/s | 1.837e+08 | 1.893e+08 |
| objects/splatfield-refresh-wasm-upload-throughput | 131,072 | 1.534e+08 splats/s | 1.521e+08 | 1.59e+08 |
| objects/splatfield-refresh-wasm-upload-throughput | 524,288 | 9.538e+07 splats/s | 9.484e+07 | 9.614e+07 |
| render/renderer-antialias-render-frame | 1,280 | 2.8 ms/frame | 2.792 | 2.945 |
| render/renderer-antialias-render-frame | 2,400 | 5.55 ms/frame | 5.517 | 5.845 |
| render/renderer-antialias-render-frame | 3,200 | 6.55 ms/frame | 6.85 | 9.05 |
| render/renderer-data-material-render-frame | 262,144 | 2.75 ms/frame | 2.767 | 3.395 |
| render/renderer-data-material-render-frame | 2,097,152 | 5.5 ms/frame | 4.833 | 5.745 |
| render/renderer-data-material-render-frame | 8,388,608 | 5.55 ms/frame | 5.558 | 5.745 |
| render/renderer-directional-shadows-render-frame | 8 | 2.65 ms/frame | 2.533 | 2.9 |
| render/renderer-directional-shadows-render-frame | 128 | 2.7 ms/frame | 2.792 | 3.035 |
| render/renderer-directional-shadows-render-frame | 512 | 2.8 ms/frame | 2.783 | 3.29 |
| render/renderer-frustum-culling-render-frame | 128 | 2.5 ms/frame | 2.267 | 2.935 |
| render/renderer-frustum-culling-render-frame | 2,048 | 2.65 ms/frame | 2.475 | 3.395 |
| render/renderer-frustum-culling-render-frame | 8,192 | 3.8 ms/frame | 3.25 | 4.645 |
| render/renderer-glyphfield-render-frame | 16,384 | 2.75 ms/frame | 2.8 | 3.19 |
| render/renderer-glyphfield-render-frame | 131,072 | 5.5 ms/frame | 5.558 | 6.145 |
| render/renderer-glyphfield-render-frame | 524,288 | 13.65 ms/frame | 13.78 | 14.78 |
| render/renderer-latticespace-render-frame | 32,768 | 2.85 ms/frame | 3.025 | 4.065 |
| render/renderer-latticespace-render-frame | 262,144 | 2.85 ms/frame | 2.8 | 3.045 |
| render/renderer-latticespace-render-frame | 1,000,000 | 7.5 ms/frame | 7.617 | 8.59 |
| render/renderer-many-meshes-render-frame | 64 | 2.6 ms/frame | 2.267 | 3.115 |
| render/renderer-many-meshes-render-frame | 1,024 | 2.85 ms/frame | 2.775 | 3.8 |
| render/renderer-many-meshes-render-frame | 4,096 | 2.65 ms/frame | 2.75 | 4.445 |
| render/renderer-many-pointclouds-render-frame | 16 | 2.5 ms/frame | 2.192 | 3.52 |
| render/renderer-many-pointclouds-render-frame | 256 | 2.75 ms/frame | 2.758 | 3.245 |
| render/renderer-many-pointclouds-render-frame | 1,024 | 4.15 ms/frame | 3.733 | 4.645 |
| render/renderer-mesh-render-frame | 262,144 | 2.55 ms/frame | 2.583 | 3.915 |
| render/renderer-mesh-render-frame | 2,097,152 | 2.65 ms/frame | 2.917 | 4.365 |
| render/renderer-mesh-render-frame | 8,388,608 | 2.9 ms/frame | 3.233 | 4.65 |
| render/renderer-mixed-materials-render-frame | 64 | 2.6 ms/frame | 1.875 | 3.045 |
| render/renderer-mixed-materials-render-frame | 1,024 | 2.65 ms/frame | 2.242 | 3.405 |
| render/renderer-mixed-materials-render-frame | 4,096 | 3.9 ms/frame | 3.417 | 4.7 |
| render/renderer-mixed-scientific-scene-render-frame | 4 | 2.75 ms/frame | 2.792 | 3.18 |
| render/renderer-mixed-scientific-scene-render-frame | 16 | 3.9 ms/frame | 3.767 | 4.46 |
| render/renderer-mixed-scientific-scene-render-frame | 64 | 10.15 ms/frame | 10.58 | 12.95 |
| render/renderer-nodelink-render-frame | 1,024 | 2.65 ms/frame | 2.342 | 2.945 |
| render/renderer-nodelink-render-frame | 16,384 | 2.85 ms/frame | 2.792 | 3.19 |
| render/renderer-nodelink-render-frame | 65,536 | 5.6 ms/frame | 5.817 | 6.645 |
| render/renderer-occlusion-culling-render-frame | 64 | 2.6 ms/frame | 2.092 | 2.845 |
| render/renderer-occlusion-culling-render-frame | 512 | 2.8 ms/frame | 2.758 | 3 |
| render/renderer-occlusion-culling-render-frame | 2,048 | 4.1 ms/frame | 3.708 | 4.815 |
| render/renderer-pointcloud-render-frame | 65,536 | 2.5 ms/frame | 2.325 | 2.945 |
| render/renderer-pointcloud-render-frame | 262,144 | 2.6 ms/frame | 2.55 | 3 |
| render/renderer-pointcloud-render-frame | 1,048,576 | 2.85 ms/frame | 2.733 | 2.99 |
| render/renderer-splatfield-render-frame | 65,536 | 2.9 ms/frame | 2.833 | 3.245 |
| render/renderer-splatfield-render-frame | 262,144 | 2.8 ms/frame | 2.8 | 3.415 |
| render/renderer-splatfield-render-frame | 1,048,576 | 3.1 ms/frame | 3.283 | 4.78 |
| render/renderer-transmission-mesh-render-frame | 16 | 2.65 ms/frame | 2.583 | 3.09 |
| render/renderer-transmission-mesh-render-frame | 256 | 2.8 ms/frame | 2.758 | 3.045 |
| render/renderer-transmission-mesh-render-frame | 1,024 | 3.6 ms/frame | 3.708 | 4.59 |
| render/renderer-transparent-mesh-render-frame | 64 | 2.6 ms/frame | 2.325 | 2.9 |
| render/renderer-transparent-mesh-render-frame | 1,024 | 2.9 ms/frame | 2.808 | 3.69 |
| render/renderer-transparent-mesh-render-frame | 4,096 | 6.7 ms/frame | 6.942 | 8.05 |
| scaling/scale-service-percentile-stats-latency | 65,536 | 6.3 ms | 6.983 | 11.01 |
| scaling/scale-service-percentile-stats-latency | 1,048,576 | 7.55 ms | 7.942 | 9.78 |
| scaling/scale-service-percentile-stats-latency | 8,388,608 | 13.6 ms | 13.48 | 13.99 |
