# WasmGPU changelog
All release notes of WasmGPU are recorded in this file.

## [v0.9.0](https://www.github.com/Zushah/WasmGPU/releases/tag/v0.9.0) - 07/27/2026
The tenth release of WasmGPU. Commits: [`v0.8.0...v0.9.0`](https://www.github.com/Zushah/WasmGPU/compare/v0.8.0...v0.9.0)
- Added Gaussian splatfields with camera-distance sorting, covariance-based projection, spherical harmonic colors through degree three, scene integration, typed picking, and glTF import support, enabling rich point-based radiance-field assets to participate in WasmGPU workflows alongside its existing scientific primitives.
- Added 2D/3D latticespaces for structured grids, including scalar, explicit color, and solid color modes, cell masks, colormaps, GPU sorting, scene integration, occlusion culling, and picking, extending WasmGPU into arranged volumetric visualization.
- Added direct uploads from external WebAssembly memory for geometry, pointclouds, glyphfields, nodelinks, splatfields, and latticespaces, with stable handling when foreign memories grow, so data produced by other WebAssembly modules can reach render paths without first being reorganized through ordinary JavaScript arrays.
- Changed externally supplied GPU buffer handling for pointclouds, glyphfields, and nodelinks to match the new handling convention set by splatfields and latticespaces, by allowing applications to transfer ownership to WasmGPU, giving callers explicit control over whether object destruction also destroys the supplied resources.
- Fixed WebAssembly resource management by reclaiming freed heap allocations and adding deterministic disposal for allocation-backed objects, reducing long-running memory growth and making resource lifetimes predictable instead of dependent on garbage collection.
- Added fly camera controls with pointer-look and keyboard movement for freely navigating scenes from a first-person perspective.
- Added key-value pair radix sorting to the compute kernels library, which complements the already-existing key-only radix sorting.
- Changed the renderer to be split into smaller modules for drawlist construction, materials, objects, occlusion, picking, postprocessing, resources, timing, transmission, and shared types, making the rendering pipeline easier to maintain and extend as new object families are added.
- Added automated Node testing across Windows, MacOS, and Linux, as well as full Rust testing coverage, and WGSL compilation testing.
- Added terrain, lego, and quantum examples showcasing a procedurally-generated terrain with fly controls, an imported glTF splatfield asset, and a latticespace quantum orbitals visualization.

## [v0.8.0](https://www.github.com/Zushah/WasmGPU/releases/tag/v0.8.0) - 05/24/2026
The ninth release of WasmGPU. Commits: [`v0.7.0...v0.8.0`](https://www.github.com/Zushah/WasmGPU/compare/v0.7.0...v0.8.0)
- Added substantially broader glTF 2.0 runtime fidelity with morph-target import, base and per-node morph weights, morph-weight animation playback, imported node records, extension metadata, safe imported-asset shutdown, texture transforms, material variants, XMP metadata, bound punctual lights, spot lights, node visibility, and animation pointers.
- Added much richer glTF 2.0 material support covering clearcoat, specular, index of refraction, sheen, iridescence, anisotropy, transmission, diffuse transmission, volume, and dispersion, which makes the physically based material model substantially closer to modern glTF assets and more useful for real asset inspection rather than only simple demonstration scenes.
- Added the nodelink scientific visualization primitive, with node and edge rendering paths that can represent graph, molecule, and relationship data alongside meshes, pointclouds, glyphfields, overlays, picking, scaling, and colormaps.
- Added LU factorization and solve compute kernels for real and complex systems, expanding the compute subsystem from general-purpose parallel primitives toward domain-relevant computational science.
- Added external WebAssembly interoperability, as a sibling to the existing Python interoperability, so WasmGPU can wrap foreign WebAssembly instances, exports, or memories and create typed views over other linear memories, making it easier to connect additional WebAssembly modules to WasmGPU workflows.
- Added occlusion culling using previous-frame hierarchical Z-buffer data, with explicit culling statistics and safety rules that keep picking and warmup unfiltered while conservatively excluding ambiguous occluders from capture.
- Added renderer warmup and configurable WebGPU device-limit requests, so applications can prepare render paths more deliberately and request larger buffer or binding limits when the workload requires them.
- Added per-point coloring for point clouds, allowing point cloud data to use explicit RGBA color buffers in addition to scalar-driven colormaps, just like glyphfields and nodelinks.
- Fixed glTF animation robustness by refreshing animation sampler views after WebAssembly allocations, preventing stale memory views from corrupting animation playback after importer-side allocation activity.
- Fixed close-range camera inspection by further relaxing the perspective near clip.
- Added a benchmark example that exercises both rendering and computing and compares WasmGPU's performance against Three.js and Babylon.js.

## [v0.7.0](https://www.github.com/Zushah/WasmGPU/releases/tag/v0.7.0) - 03/30/2026
The eighth release of WasmGPU. Commits: [`v0.6.0...v0.7.0`](https://www.github.com/Zushah/WasmGPU/compare/v0.6.0...v0.7.0)
- Added an interactive analysis stack built around GPU ID-pass picking, rectangular and lasso region selection, composable overlay layers, and an annotation toolkit, so applications can move from raw hits to typed selections, legends, triads, probes, markers, and distance or angle measurements.
- Added richer geometry coverage with 2D primitives plus cartesian and parametric curves/surfaces, which makes WasmGPU much more usable for analytical plotting and procedural scenes.
- Added a unified scale transform model shared across pointclouds, glyphfields, data materials, and compute-powered statistics, so scalar remapping, clamping, percentiles, log or symlog domains, gamma, and inversion behave consistently across programs.
- Changed camera interaction from separate modes into a unified navigation system with bounds-based scene/object framing, canonical inspection views, and corrected orbit behavior around the poles, which makes interaction and inspection much more coherent across camera frameworks.
- Changed frame and load pipelines to have greater performance by moving transform propagation hot paths, frustum culling preparation, pointcloud/glyphfield/geometry bounds computation, and glTF accessor decoding/converting into the Rust WebAssembly driver, while also optimizing the pointcloud shader, reducing JavaScript overhead on several of the frequently exercised visualization workloads.
- Changed renderer presentation configuration by allowing the swap chain format to be set explicitly.
- Fixed glyphfields appearing pitch black by making them unlit by default.
- Added controls, picking, scaling, overlay, fluid, graphing, and protein examples, as well as the new website.

## [v0.6.0](https://www.github.com/Zushah/WasmGPU/releases/tag/v0.6.0) - 03/06/2026
The seventh release of WasmGPU. Commits: [`v0.5.0...v0.6.0`](https://www.github.com/Zushah/WasmGPU/compare/v0.5.0...v0.6.0)
- Added first-class scientific visualization primitives with dedicated WebGPU render paths for point clouds and glyph fields, including storage-buffer-backed per-element data, engine-level scene integration, and correct participation in frustum culling and transparent sorting.
- Added a colormap system and a data-driven mesh material so scalar and vector fields can be mapped to color in a principled way, including built-in colormaps and custom palettes or stops, plus domain, clipping, gamma, inversion, and optional lighting blend controls for scientific rendering.
- Added an ndarray abstraction spanning WebAssembly memory and WebGPU storage buffers, and added Python-in-the-browser interoperability utilities so numerical arrays can be transferred with explicit dtype and shape semantics across Python, JavaScript, WebAssembly, and WebGPU compute pipelines.
- Added asynchronous WebGPU readback utilities based on a persistent ring of staging buffers so repeated buffer readbacks can be pipelined without creating new staging resources for every read.
- Changed engine ergonomics by adding high-level factories for math primitives, textures, transforms, glTF utilities, and animation objects, and added trackball camera controls as an additional navigation mode alongside orbit controls.
- Fixed correctness and robustness in core compute and shader paths by correcting WebGPU queue write ranges for typed array views, replacing fragile NaN handling in argreduce kernels, and improving WebAssembly allocation alignment to 16 bytes for safer high-throughput data access.
- Changed build output by minifying WGSL at buildtime to reduce bundled file sizes.

## [v0.5.0](https://www.github.com/Zushah/WasmGPU/releases/tag/v0.5.0) - 02/23/2026
The sixth release of WasmGPU. Commits: [`v0.4.0...v0.5.0`](https://www.github.com/Zushah/WasmGPU/compare/v0.4.0...v0.5.0)
- Added a sophisticated WebGPU compute API (pipelines, storage/uniform buffers, dispatch helpers, batching, and limit validation) so GPGPU workloads can be run alongside rendering.
- Added a library of GPU parallel primitives (reduce/argreduce, exclusive scan, stream compaction, radix sort, and histogram) so common data workloads don’t require rewriting core kernels per project.
- Added camera controls for orbit/pan/zoom navigation and a configurable HUD for FPS, CPU, GPU, memory, and culling stats.
- Changed core performance paths to reduce unnecessary work and CPU overhead by skipping projection dirtying when camera parameters are unchanged, adding per-index transform dirty tracking with partial updates, and optimizing frustum culling as well as renderer buffer-view hot paths.
- Changed the build/runtime performance envelope by enabling SIMD128 on the WebAssembly driver, optimizing it with Binaryen's wasm-opt.exe, and bumping the TypeScript target to ES2023.
- Fixed glTF correctness and coverage by allocating normal scratch indices as u32, adding 8-influence skinning support, supporting the specular glossiness material extension, improving the UV-set selection, and correcting skinning to use the mesh bind matrix rather than the current world inverse.
- Fixed robustness and shader correctness by hardening texture upload handling and correcting SMAA uniform layout alignment and fullscreen UV winding.

## [v0.4.0](https://www.github.com/Zushah/WasmGPU/releases/tag/v0.4.0) - 02/15/2026
The fifth release of WasmGPU. Commits: [`v0.3.0...v0.4.0`](https://www.github.com/Zushah/WasmGPU/compare/v0.3.0...v0.4.0)
- Added a glTF 2.0 loading & importing pipeline that constructs runtime scenes/meshes/materials from `.gltf` & `.glb` files, including PBR/unlit material translation and a real texture abstraction with mipmaps and sampler mapping.
- Added glTF animation and skinning support, with TRS sampling executed in WebAssembly and per-skin joint matrices generated and streamed to WebGPU storage buffers.
- Added frustum culling to skip submitting off-screen meshes, using world-space bounds with a WebAssembly sphere-frustum kernel and optional culling stats for visibility debugging.
- Added SMAA as an optional post-process anti-aliasing path (offscreen scene-color & edge/weight/neighborhood passes) to improve visual quality on single-sampled swapchains.
- Fixed renderer internals to eliminate per-frame WebAssembly allocations in camera/lighting/model uniform staging buffers, pipeline cache keys, uniform packing, per-mesh world matrix reads, instanced pointer allocations, material uniform arrays, and bind group layouts.

## [v0.3.0](https://www.github.com/Zushah/WasmGPU/releases/tag/v0.3.0) - 02/08/2026
The fourth release of WasmGPU. Commits: [`v0.2.1...v0.3.0`](https://www.github.com/Zushah/WasmGPU/compare/v0.2.1...v0.3.0)
- Changed the WebAssembly backend from AssemblyScript to Rust and expanded the WebAssembly integration into a pointer-first runtime layer suitable for high-performance engine subsystems.
- Changed renderer data flow to be WebAssembly-memory-first: uniform data is staged in WebAssembly and uploaded zero-copy to WebGPU buffers, with model matrices uploaded directly from Transform WebAssembly storage and normal matrices computed in WebAssembly.
- Changed Transform into a WebAssembly-owned structure-of-arrays (SoA) store with batched local/world matrix updates, enabling fewer allocations and fewer cross-boundary calls in the hot path.
- Added bounded per-frame scratch allocation via a WebAssembly frame arena (reset every frame) to avoid unbounded heap growth and keep transient buffers in WebAssembly memory.
- Changed renderer submission to reduce CPU overhead by caching global bind groups, batching opaque draw submission, and adding WebGPU instancing support for large runs of identical pipeline/material/geometry.
- Fixed Transform lifetime management by adding disposal and slot reuse via a free list, preventing long-running scenes from leaking Transform slots.

## [v0.2.1](https://www.github.com/Zushah/WasmGPU/releases/tag/v0.2.1) - 02/05/2026
The third release of WasmGPU. Commits: [`v0.2.0...v0.2.1`](https://www.github.com/Zushah/WasmGPU/compare/v0.2.0...v0.2.1)
- Added base64 backup for WebAssembly embedded in `./dist/math.js` so that it can be utilized even if `./dist/math.wasm` is unavailable or inaccessible to the client.
- Fixed distorted cylinder and prism geometry.
- Fixed incorrect normal matrix calculation.

## [v0.2.0](https://www.github.com/Zushah/WasmGPU/releases/tag/v0.2.0) - 02/03/2026
The second release of WasmGPU. Commits: [`v0.1.0...v0.2.0`](https://www.github.com/Zushah/WasmGPU/compare/v0.1.0...v0.2.0)
- Engine and scene graph: new engine/renderer separation with a high-level render loop, scene/mesh/transform primitives and parented transforms, built-in geometry helpers (box, plane, sphere, torus, cylinder, pyramid, prism), and perspective/orthographic camera functions with `lookAt()` and aspect handling.
- Materials and lighting: PBR-ish `StandardMaterial` (color, metallic, roughness, emissive) as well as `UnlitMaterial` and `CustomMaterial` support, material uniform and bind-group management, texture/sampler support, and proper model/normal matrix handling for lighting.
- Builds, WebAssembly, and runtime: AssemblyScript math module (`./build/math.wasm` and `./build/math.js`) with lazy initialization, both ESM and IIFE `./dist/` bundles ready for CDN use, and shader/pipeline and GPU buffer (vertex/index/uniform) management.

## [v0.1.0](https://www.github.com/Zushah/WasmGPU/releases/tag/v0.1.0) - 02/01/2026
The first release of WasmGPU. Commits: [`v0.0.0...v0.1.0`](https://www.github.com/Zushah/WasmGPU/compare/ae3c900860a218f8c52db1d86f9ce54163e9bb6a...v0.1.0)
- WebGPU renderer is up and running with a rotating cube demo.
- AssemblyScript → WebAssembly math module integrated and callable from TypeScript.
- Build outputs provided for both ESM and CDN consumers.
