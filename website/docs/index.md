# WasmGPU v0.10.0

WebGPU × WebAssembly rendering and computing engine for scientific workloads in the browser.

* ⚙️ WebGPU engine in TypeScript.
    - 🌐 **Scene & assets**: Meshes, pointclouds, glyphfields, nodelinks, splatfields, latticespaces, data materials, lights, cameras, glTF 2.0 assets with support for over a dozen extensions, mipmapped texture sampling, transparency including transmission rendering, animations, 4- or 8-influence skinning, and rich built-in geometry including cartesian and parametric curves and surfaces for mathematics.
    - 🖼️ **Rendering architecture**: WebAssembly-powered frustum culling, previous-frame occlusion culling, opaque draw batching with automatic instanced rendering, GPU sorting for order-dependent scientific primitives, directional shadow mapping, optional subpixel morphological anti-aliasing, configurable canvas format selection, and GPU ID-pass picking across meshes and scientific primitives for individual or regional queries with typed results.
    - 🧭 **Interaction, overlays, & diagnostics**: Orbit, trackball, and fly controls for orthographic and perspective cameras with bounds-based scene framing and inspection views, plus a composable overlay and annotation toolkit with configurable axis triads, annotated grids, adaptive legends, markers, probes, and measurements.
    - 🧮 **Compute & interop**: Compute subsystem with reusable pipelines and buffers, an extensive kernels library spanning parallel primitives, typed vector and matrix arithmetic, sorting, scaling, statistics, and linear algebra, a CPU & GPU ndarray abstraction, asynchronous readback utilities, a unified scale-transform model shared across rendering and computing workflows, declarative WebGPU bindings, direct uploads from external WebAssembly memory, and Python-in-the-browser interoperability.

* 🦀 WebAssembly driver in Rust.
    - 🧱 **Data layout & transforms**: Transforms stored in structure-of-arrays memory with per-index dirty tracking and partial local or world propagation plus model and normal matrix packing, alongside 32-bit and 64-bit vector, quaternion, and matrix floating point math.
    - 🎞️ **Animation & asset hot paths**: Animation sampling and joint-matrix generation executed in WebAssembly together with glTF accessor deinterleaving, sparse patch application, numeric conversion, richer import-side data preparation, and mesh normal generation.
    - 👁️ **Bounds, culling, & visibility**: World-space bounds computation for geometry, pointclouds, glyphfields, nodelinks, splatfields, and latticespaces together with frustum plane extraction, sphere-frustum culling kernels, and CPU-side support for render-only occlusion filtering.
    - 🔗 **Array semantics & zero-copy staging**: Ndarray indexing utilities for explicit shape-and-stride byte-offset math plus uniforms and instance data staged as zero-copy views into WebAssembly memory with scoped ABI borrowing, alias-safe fixed-width math operands, explicit typed-slice handles, and refreshable views over external WebAssembly memories.
    - ⚡ **Performance envelope**: Transient work uses a frame arena while persistent allocations use reclaimable heap arenas with deterministic owning-object disposal, and builds are optimized through LLVM, Binaryen, and SIMD128 for higher throughput.

## Install

```bash
npm install @zushah/wasmgpu@0.10.0
```

```html
<script src="https://cdn.jsdelivr.net/gh/Zushah/WasmGPU@0.10.0/release/WasmGPU.iife.min.js"></script>
```

## Quick Links

- [Main Website](../)
- [Examples Gallery](../examples/)
- [Architecture Guide](./architecture/)
- [Performance Benchmarks](../performance/)
- [GitHub Repository](https://github.com/Zushah/WasmGPU)

## Architecture

For an in-depth explanation of WasmGPU's software architecture, visit the [architecture guide](./architecture/index.md).

The diagram below reflects the implemented architecture of WasmGPU v0.10.0.

Solid arrows indicate creation, ownership, stored references, or call direction. Dashed arrows indicate data movement through WebAssembly memory or WebGPU resources.

```mermaid
flowchart LR
    subgraph API["Public API"]
        APP["User Application"]
        ENG["WasmGPU v0.10.0"]
        FAC["Factory surface: scene, camera, controls, light, effects, geometry, material, texture, mesh, pointcloud, glyphfield, nodelink, splatfield, latticespace, asset import, animation, overlay, annotation, interop"]
    end

    subgraph WGPU["WebGPU Engine"]
        LOOP["Frame loop"]
        REND["Renderer"]
        EFF["Effects facade"]
        SCALE["Scaling service"]
        OVER["Overlay framework"]
        ANNO["Annotation toolkit"]
        PICK["Picking utility"]
        COMP["Compute subsystem"]
        CBUF["Buffer resource manager"]
        CPIP["Pipeline controller"]
        CDIS["Dispatch workgroup planner"]
        CKER["Kernels library"]
        CND["N-dimensional array model for CPU & GPU memory"]
        CREAD["Asynchronous readback ring"]
        CSCR["Scratch buffer pool"]
    end

    subgraph DATA["Object & Data Model"]
        SCN["Scene"]
        TSTORE["Transform store in SoA memory"]
        MESH["Mesh with geometry, material, texture, morphing, & skinning"]
        PGN["Pointcloud, glyphfield, nodelink, splatfield, & latticespace"]
        CMAP["Colormapping"]
        SKIN["Skinning instance data"]
        ASTORE["Annotation store"]
        ALOAD["Loader for glTF 2.0 asset data"]
        ADEC["Accessor decoding & data conversion"]
        AIMP["Importer from asset data to scene resources"]
        AMETA["Imported nodes, metadata, variants, cameras, & lights"]
        GINT["WebGPU interop"]
        WINT["WebAssembly interop"]
        PYINT["Python interop"]
    end

    subgraph WASM["WebAssembly Driver"]
        WHEAP["Heap allocation for persistent typed memory"]
        WFRAME["Frame arena for transient typed memory"]
        WTRANS["Transform propagation"]
        WMATH["Matrix, vector, & quaternion mathematics"]
        WND["N-dimensional array indexing & stride-offsetting"]
        WNORM["Mesh normal generation"]
        WGLTF["glTF accessor decoding, sparse patching, & numeric conversion"]
        WANIM["Animation sampling & joint matrix generation"]
        WBOUNDS["Bounds computation"]
        WCULL["Frustum culling"]
    end

    subgraph GPU["Browser Resources"]
        DEV["Graphics device & queue"]
        CACHE["Pipeline cache & bindgroup cache"]
        RES["Buffers, textures, & samplers"]
        RPASS["Render passes for opaques, transparents, transmissions, effects, post-processing, & interaction"]
        CPASS["Compute passes for kernels"]
    end

    classDef darkblue fill:#4E79FF,stroke:#0B2B8F,stroke-width:2px,color:#06153D;
    classDef green fill:#22D37D,stroke:#0A6D3C,stroke-width:2px,color:#04311A;
    classDef lightblue fill:#17C9FF,stroke:#005E80,stroke-width:2px,color:#022433;
    classDef yellow fill:#FFB238,stroke:#9A4D00,stroke-width:2px,color:#5A2C00;
    classDef purple fill:#B18AFF,stroke:#5A2FA6,stroke-width:2px,color:#2E165E;
    classDef pink fill:#FF5EA8,stroke:#9A2E62,stroke-width:2px,color:#4D1532;

    class APP,ENG,FAC darkblue;
    class LOOP,REND,EFF,SCALE,OVER,ANNO,PICK green;
    class COMP,CBUF,CPIP,CDIS,CKER,CND,CREAD,CSCR lightblue;
    class SCN,TSTORE,MESH,PGN,CMAP,SKIN,ASTORE,ALOAD,ADEC,AIMP,AMETA,GINT,WINT,PYINT yellow;
    class WHEAP,WFRAME,WTRANS,WMATH,WND,WNORM,WGLTF,WANIM,WBOUNDS,WCULL purple;
    class DEV,CACHE,RES,RPASS,CPASS pink;

    APP --> ENG
    ENG --> FAC
    ENG --> LOOP
    ENG --> REND
    ENG --> COMP
    ENG --> SCALE
    ENG --> OVER
    ENG --> ANNO
    ENG --> PYINT
    FAC --> SCN
    FAC --> TSTORE
    FAC --> EFF
    FAC --> MESH
    FAC --> PGN
    FAC --> ALOAD
    FAC --> AIMP
    FAC --> GINT
    FAC --> WINT

    SCN --> MESH
    SCN --> PGN
    MESH --> TSTORE
    PGN --> TSTORE
    SKIN --> MESH
    ALOAD --> ADEC
    ADEC --> AIMP
    AIMP --> SCN
    AIMP --> MESH
    AIMP --> SKIN
    AIMP --> AMETA
    CMAP --> MESH
    CMAP --> PGN
    SCALE --> CMAP
    SCALE --> PGN

    LOOP --> REND
    LOOP --> WFRAME
    REND --> DEV
    REND --> CACHE
    REND --> RES
    REND --> RPASS
    REND --> EFF
    EFF --> RPASS
    REND --> PICK
    REND --> SCN
    REND --> TSTORE
    REND --> WCULL
    REND --> WBOUNDS
    PICK --> RPASS
    OVER --> SCN
    ANNO --> ASTORE
    ANNO --> PICK
    ANNO --> SCN

    COMP --> CBUF
    COMP --> CPIP
    COMP --> CDIS
    COMP --> CKER
    COMP --> CND
    COMP --> CREAD
    COMP --> CSCR
    CPIP --> GINT
    MESH --> GINT
    GINT -.-> RES
    CBUF --> RES
    CPIP --> CPASS
    CDIS --> CPASS
    CKER --> CPASS
    CND --> CBUF
    CREAD --> RES
    CSCR --> RES
    CPASS --> DEV

    TSTORE -.-> WTRANS
    MESH -.-> WNORM
    MESH -.-> WBOUNDS
    PGN -.-> WBOUNDS
    ADEC -.-> WGLTF
    SKIN -.-> WANIM
    CND -.-> WND
    REND -.-> WFRAME
    REND -.-> WMATH
    COMP -.-> WHEAP
    WINT -.-> CBUF
    PYINT --> COMP
    PYINT --> CND
    WHEAP -.-> RES
    WFRAME -.-> RES
```

## Platform Compatibility

The two tables below reflect the fundamental requirements (as of August 31, 2026) for properly running the latest release of WasmGPU. They have been fact-checked against official online sources from the respective publishers of the web browsers, operating systems, runtimes, and hardware, but they are not a claim that WasmGPU has been tested on all combinations of them.

Browser and driver support naturally changes over time. Therefore, if an entry in the two tables below is inaccurate or misleading, please [open an issue](https://github.com/Zushah/WasmGPU/issues) with as much relevant information as possible, including the web browser, operating system, runtime, hardware devices and drivers, and a minimal reproduction.

### Browser and System Requirements

| Browser | Platform | Status | WebGPU availability |
| :--- | :--- | :---: | :--- |
| Chromium | Windows (AMD64), MacOS, ChromeOS | ✅ | Available by default from Chromium 113 on Windows with a Direct3D 12 adapter, MacOS, and ChromeOS devices with Vulkan support. Use the latest stable browser and current graphics drivers. |
| Chromium | Windows (ARM64) | 🧪 | Disabled by default and available only through an unsafe WebGPU flag. |
| Chromium | Android | ⚠️ | Available from Chromium 121 on Android 12 or newer for supported ARM Mali, Qualcomm Adreno, and Intel GPUs, and from Chromium 139 on Android 16 or newer for supported Imagination GPUs. Samsung Xclipse and other GPU families are not yet generally supported. |
| Chromium | Linux | ⚠️ | Available by default from Chromium 144 on Intel Gen12 or newer GPUs, and from Chromium 147 on NVIDIA driver 535.183.01 or newer under Wayland. Other Linux configurations remain experimental and probably require unsafe browser flags. |
| Firefox | Windows | ✅ | Available by default from Firefox 141. |
| Firefox | MacOS | ⚠️ | Available by default on Apple Silicon from Firefox 145 on MacOS 26 and from Firefox 147 across supported MacOS versions. Other MacOS configurations remain limited to Firefox Nightly. |
| Firefox | Linux | 🧪 | Enabled in Firefox Nightly, but not in stable or beta releases. |
| Firefox | Android | 🧪 | Not enabled by default in Firefox release or beta builds. Firefox 143.0.3 and newer can expose WebGPU through the `dom.webgpu.enabled` advanced preference when the device passes Firefox's WebGPU blocklist. |
| Safari | MacOS 26, iOS 26, iPadOS 26 | ✅ | Available by default from Safari 26 through WebKit's Metal implementation. |
| Other browsers and embedded webviews | Any | ⚠️ | Compatible only when the runtime exposes WebGPU, WebAssembly, and the required browser APIs. Engine support does not guarantee that a particular browser distribution or webview enables WebGPU. |

### Runtime and Hardware Requirements

| Requirement | Compatibility rule |
| :--- | :--- |
| **Secure context** | WebGPU is exposed only in a secure context, so deploy through HTTPS or use a browser-recognized local development origin such as `localhost`, `127.0.0.1`, or a `*.localhost` subdomain. |
| **Browser environment** | Rendering requires a main-thread browser page with `navigator.gpu`, `window`, and a DOM-backed `HTMLCanvasElement`. Offscreen worker rendering is not currently a supported WasmGPU entry point. |
| **WebGPU adapter** | A core WebGPU adapter must be available. WasmGPU does not request WebGPU compatibility mode. The `timestamp-query` and `primitive-index` features are requested only when advertised, as GPU timing needs the former, while mesh-element picking needs the latter. |
| **WebAssembly** | The distributed WebAssembly driver requires WebAssembly with SIMD128 support. Shared WebAssembly memory and cross-origin isolation are not required by the default build. |
| **Graphics card and driver** | Compatibility ultimately depends on the browser accepting the installed graphics card and driver. Unsupported, outdated, remotely virtualized, or browser-blocklisted adapters may cause adapter acquisition to fail even on an operating system marked as available above. |
| **Workload limits** | The adapter must satisfy the buffer and binding limits requested by the application. Large pointcloud, glyphfield, nodelink, splatfield, latticespace, texture, or compute workloads can exceed the resources of otherwise compatible devices. |

## Getting Started

Check out the examples [here](../examples/).

Here's a super basic example to render a cube:
```js
// Setup
import { WasmGPU } from "@zushah/wasmgpu"; // or from "https://cdn.jsdelivr.net/gh/Zushah/WasmGPU@0.10.0/release/WasmGPU.min.js"
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas, { antialias: true});

// Scene, camera, and controls
const scene = wgpu.createScene([0.05, 0.05, 0.1]);
const camera = wgpu.createCamera.perspective({
    fov: 60,
    near: 0.1,
    far: 1000
});
camera.transform.setPosition(-2, 2, -2);
camera.lookAt(0, 0, 0);
const controls = wgpu.createControls.orbit(camera, canvas);

// Light
scene.addLight(wgpu.createLight.directional({
    direction: [1, -1, -1],
    color: [1, 1, 1],
    intensity: 1.5
}));

// Cube
const cube = wgpu.createMesh(
    wgpu.geometry.box(1, 1, 1),
    wgpu.material.standard({
        color: [1, 0, 0],
        metallic: 0.7
    })
);
scene.add(cube);

// Render
wgpu.run((dt, time) => {
    controls.update(dt);
    wgpu.render(scene, camera);
});
```

Suggested starting points:

- [WasmGPU.create](./render/wasmgpu-create.md)
- [WasmGPU.compute.createPipeline](./compute/wasmgpu-compute-createpipeline.md)
- [WasmGPU.createMesh](./objects/wasmgpu-createmesh.md)
- [WasmGPU.createCamera.perspective](./world/wasmgpu-createcamera-perspective.md)
- [WasmGPU.createControls.orbit](./interact/wasmgpu-createcontrols-orbit.md)
- [WasmGPU.webassembly](./interop/wasmgpu-webassembly.md)
- [WasmGPU.python](./interop/wasmgpu-python.md)
- [WasmGPU.math](./math/wasmgpu-math.md)
