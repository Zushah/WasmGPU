<p align="center">
    <a href="https://zushah.github.io/WasmGPU">
        <picture>
            <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Zushah/WasmGPU/main/assets/logo-darkmode.png">
            <img alt="WasmGPU logo" src="https://raw.githubusercontent.com/Zushah/WasmGPU/main/assets/logo-lightmode.png" width="50%">
        </picture>
    </a>
</p>
<p align="center">
    <strong>WebGPU × WebAssembly rendering and computing engine for scientific workloads in the browser</strong><br>
    <a href="https://www.github.com/Zushah/WasmGPU/releases/tag/v0.9.0"><img src="https://img.shields.io/badge/release-v0.9.0-005a9c?logo=github&logoColor=white" alt="Latest release is v0.9.0"></a>
    <a href="https://raw.githubusercontent.com/Zushah/WasmGPU/v0.9.0/dist/WasmGPU.js"><img src="https://img.shields.io/badge/minified-1.105_MB-654ff0?logo=javascript&logoColor=white" alt="1.105 megabytes minified bundle size"></a>
    <a href="https://www.npmjs.com/package/@zushah/wasmgpu"><img src="https://img.shields.io/npm/dm/%40zushah%2Fwasmgpu?logo=npm&logoColor=white&color=9b8df5" alt="npm downloads per month"></a>
    <a href="https://www.jsdelivr.com/package/gh/Zushah/WasmGPU"><img src="https://img.shields.io/jsdelivr/gh/hm/Zushah/WasmGPU?color=654ff0&logo=jsdelivr&logoColor=white" alt="jsDelivr requests per month"></a>
    <a href="https://www.github.com/Zushah/WasmGPU/blob/main/LICENSE.md"><img src="https://img.shields.io/badge/license-MPL--2.0-005a9c?logo=gitbook&logoColor=white" alt="Mozilla Public License 2.0"></a><br>
    <a href="https://zushah.github.io/WasmGPU">https://zushah.github.io/WasmGPU</a><br>
</p><br>

## About

* ⚙️ WebGPU engine in TypeScript.
    - 🌐 **Scene & assets**: Meshes, pointclouds, glyphfields, nodelinks, splatfields, latticespaces, data materials, lights, cameras, glTF 2.0 assets with support for over a dozen extensions, mipmapped texture sampling, transparency including transmission rendering, animations, 4- or 8-influence skinning, and rich built-in geometry including cartesian and parametric curves and surfaces for mathematics.
    - 🖼️ **Rendering architecture**: WebAssembly-powered frustum culling, previous-frame occlusion culling, opaque draw batching with automatic instanced rendering, GPU sorting for order-dependent scientific primitives, optional subpixel morphological anti-aliasing, configurable canvas format selection, and GPU ID-pass picking across meshes and scientific primitives for individual or regional queries with typed results.
    - 🧭 **Interaction, overlays, & diagnostics**: Orbit, trackball, and fly controls for orthographic and perspective cameras with bounds-based scene framing and inspection views, plus a composable overlay and annotation toolkit with triads, grids, legends, markers, probes, and measurements.
    - 🧮 **Compute & interop**: Compute subsystem with reusable pipelines and buffers, an extensive kernels library spanning parallel primitives, sorting, scaling, statistics, and linear algebra, an ndarray abstraction, asynchronous readback utilities, a unified scale-transform model shared across rendering and computing workflows, direct uploads from external WebAssembly memory, and Python-in-the-browser interoperability.

* 🦀 WebAssembly driver in Rust.
    - 🧱 **Data layout & transforms**: Transforms stored in structure-of-arrays memory with per-index dirty tracking and partial local or world propagation plus model and normal matrix packing.
    - 🎞️ **Animation & asset hot paths**: Animation sampling and joint-matrix generation executed in WebAssembly together with glTF accessor deinterleaving, sparse patch application, numeric conversion, richer import-side data preparation, and mesh normal generation.
    - 👁️ **Bounds, culling, & visibility**: World-space bounds computation for geometry, pointclouds, glyphfields, nodelinks, splatfields, and latticespaces together with frustum plane extraction, sphere-frustum culling kernels, and CPU-side support for render-only occlusion filtering.
    - 🔗 **Array semantics & zero-copy staging**: Ndarray indexing utilities for explicit shape-and-stride byte-offset math plus uniforms and instance data staged as zero-copy views into WebAssembly memory with explicit typed-slice handles and refreshable views over external WebAssembly memories.
    - ⚡ **Performance envelope**: Transient work uses a frame arena while persistent allocations use reclaimable heap arenas with deterministic owning-object disposal, and builds are optimized through LLVM, Binaryen, and SIMD128 for higher throughput.

## Architecture Diagram

The diagram below reflects the implemented architecture of WasmGPU v0.9.0.

Solid arrows indicate creation, ownership, stored references, or call direction. Dashed arrows indicate data movement through WebAssembly memory or WebGPU resources.

Click [here](https://mermaid.live/view#pako:eNqVWFtz4rgS_isqb9U8KSliSEKYqq0yGDJUwqWAbGp2cx6EEeCNb0eSk7BT89-3W74ES3D2bF4Gf261uvvrm-eHE6Qb7vScbZS-B3smFHlcvIiXhMCfzNc7wbI98ebjP16ceb6OwgAfXpz_VDL4583n8PpJckG8LAMZpsI0MYSG03sQemYyvp8_kbfW5d1lyxAZeQMQGbFApeIAt4stC3iPyIAnnJKAxVww-DdNlEgjScmOpzFX4kBJzBQXIYsoUfxD5QLEYy73lGRpmKggSvMNiEeHbL8NeQS_E_A6CpNXSmQWMVWi8EuFAZcZ3AtP4W6vKGFSckXCOEsFPiVhrN2jJH3jImIHxJJUlSBcx0WaHXnGkw3-tIL6DHHAiPA1BmSY7MKEGwF5nM0wsiMBrpMobajFv8Vw6sP7BVzBBRfG2-XAexzC62XAwNUdAX7ewDtDavbbcAFCs8IZssW73lPxanI8nc5AzKtdJSpNo9dQGXLz8eABcyUMXvHOXIVRqA6G0GA2Qb8GaZzlimNI5EEqHpti_acRiPXz7RZSS3CZ5iLgQHbCdpa3g_l4ri_OkFhepUlkC_rjJQj6IdCsgj1BZ3cizTMCmZAktvyDDtADFwmPJGTFWjBheaSJmF5swpgnEsLDIsKEgIDGmGlkmwqw8Il8IUh2zOPUVrEYeqjEk4ck2Is0SXMJTrPNmgWvREA0zQPLwULTK7Qf6yJMGdDyf2Sf7608pH39Jw8UmOUzxcgEbbWyaKov4VZ2rpar2QITbCVYIsHDmEioXA41QJapd9rLyXD5DY5MoDrJe6j2_1DEqcj24DkFCyUkVGJHYX6P9s3_VZ1_aVS6GdaJVyRnBB6xLLOvXD6MdUxKg8BfqVgCmbmBIJp1UwXpqHJ0lEy5x5lm_zFlUMs6X3bRakTcy1bZgU4p94fYMb0APJFwYsOhm6NFX7Q01gCUtbSbsTfWBTjWTQ2vE2l8dA3UdtF166KTpoLJUOdPqWGjAy2x6yqGGih5Y8BlomTVuKUOO7ZUU9fzeLoqGqEHFsTr6HCii2qqvyPTB7WHGP6LPustJ4Z6X4RvVp0_fxtq4r9xlhEWRWkxxjQVGUYROlSiiDpk4O7J3H4eLSAudcNmgidMH1dYIOE_nV4tvOmyUU4ZeMh2p6bp88Rb6TpiSoQfEG2OQxND_N8cyyhBy6Gg9hynVWCF_Gy7CmGUfBQpJEH1hl-k2y3khbLL4Hk6W0yqWk6wWCKoZmigJw2-f1xhM9dJzcyExfJkQnKiW3JZ8EkOeQMLx9ksfvam44kurXImE8niLCqs_xM7AoYA4vM_zOrPnqY-Rr2f5slGwmU4k06KDp4eHzW5uVR5TII8ippBOZeBxaDvi_QdV6TFmZLyh7-B1D2eAMIgNDisNaE8t3qUN_g2bEw7FuxReA38FcNMI9a-sKznqazbrK5MHTlAzRNzb7msVwygB0pI6pyGzATLUAuma4bJrqqnOJRIl8T9S6oLSGPku6Q1xyDo8oVFzw7zoLyxWg6OrnwtRvD5iAcRCPt8C01MvK6jnJNtGEW9XzrD27vRiEJCp6-890ur7_a71ePFe7hR-56bfdAAWz68vrm6bvtfLaU7wXlSanRdv33rf2r0bvz24LzGTvvqyrM16nZ4ZOfV7aBhZ-t62G2d1-q6nXbb1nrg0LzeS5WjUd9td2uVd17Hb51Xee25g1bLVpnlArKjVNm_6npHVsKZkXdzVqU7vLq5Hp5QCVO5tvF66B3b6A5v3LMKOz7Q4361eMfPEApfGRQ-I-oEaN6rF2qKWzPVyzHF5Zfiaktxby0YNo7grkpxE6W4YVLcHimuhBRWPqp3NoqL2CeXxnnYn2ixKVHcfSjsKxRXDIpbBC3WA6qnP8VxTnE0Uz1eKQ5GOv9eEmro1eOKFiOHFrOD6qlAoblT3ZupbrpUt0ladjqq21hJqKESOhDVnQVCtKS69KkuR01WI-IQa3Jx8St-1VUQ_NQQhN-EMOwmhiyYGMbaxDRRJoi8mRjSWGGYAsXhqQkVXJgoUmNiwJQJaZ4scPxpdYUhdZa-78cRBNOsmyvs6GZ8fcJukDiBYkpZSrXNhaGQXzUKvy3r8bcZtxpr6KwF4UYL1NlboZjr1vkaPPJUE12kAby10VK0eoE5ZSVSDRZ1UcEoomHIcAvTGW-hUAE2hrVgodg5LPAogDXW5KqGdUHaaFGuNd_YniwbsAwsvqAMChYa19Xwsbk1WJ6v6ZmVTGLfs0HogzYIfdEGHz7L9BP8pOsTwz5qo9BXaxAsMYlBQ0qLjoKClpxAH8pQNdEqB479RFusq7DFW9djazxKq-pFQTS5uEQedWduVrPGsUGfgA3ascxP4EX16hfY4pv1r2Hs-Q0vi0v9ZqJdnikVjeMwaXKiYZw7FYxtroCPIwgj68KUrLDGZVqiOH8U10KmATvU2cHHiNNTIufUge-CmOGj8wOPvDj4nQPLbg9-4uR_cV6Sn3AmY8nvaRpXx2Av3u2d3pZFEp7yDD5UuR8yWNI_RfSeO4BvAeX0rrUGp_fD-XB6V1330m133NbNXbvdvXNd6hycXqdz2WnfXrdaN-1O17277f6kzl_6ytZl9xYU8E0IH2aT4j9Z9f-1_vwbrm9vLg) to interactively view the diagram if it doesn't properly appear below.

```mermaid
flowchart LR
    subgraph API["Public API"]
        APP["User Application"]
        ENG["WasmGPU v0.9.0"]
        FAC["Factory surface: scene, camera, controls, geometry, material, texture, mesh, pointcloud, glyphfield, nodelink, splatfield, latticespace, light, asset import, animation, overlay, annotation, interop"]
    end

    subgraph WGPU["WebGPU Engine"]
        LOOP["Frame loop"]
        REND["Renderer"]
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
        WINT["WebAssembly interop"]
        PY["Python interop"]
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
        RPASS["Render passes for opaques, transparents, transmissions, post-processing, & user interaction"]
        CPASS["Compute passes for kernels"]
    end

    classDef darkblue fill:#4E79FF,stroke:#0B2B8F,stroke-width:2px,color:#06153D;
    classDef green fill:#22D37D,stroke:#0A6D3C,stroke-width:2px,color:#04311A;
    classDef lightblue fill:#17C9FF,stroke:#005E80,stroke-width:2px,color:#022433;
    classDef yellow fill:#FFB238,stroke:#9A4D00,stroke-width:2px,color:#5A2C00;
    classDef purple fill:#B18AFF,stroke:#5A2FA6,stroke-width:2px,color:#2E165E;
    classDef pink fill:#FF5EA8,stroke:#9A2E62,stroke-width:2px,color:#4D1532;

    class APP,ENG,FAC darkblue;
    class LOOP,REND,SCALE,OVER,ANNO,PICK green;
    class COMP,CBUF,CPIP,CDIS,CKER,CND,CREAD,CSCR lightblue;
    class SCN,TSTORE,MESH,PGN,CMAP,SKIN,ASTORE,ALOAD,ADEC,AIMP,AMETA,WINT,PY yellow;
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
    FAC --> SCN
    FAC --> TSTORE
    FAC --> MESH
    FAC --> PGN
    FAC --> ALOAD
    FAC --> AIMP
    FAC --> WINT
    FAC --> PY

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
    PY --> WHEAP
    PY --> WFRAME
    WHEAP -.-> RES
    WFRAME -.-> RES
```

## Platform Compatibility

The two tables below reflect the fundamental requirements (as of July 27, 2026) for properly running the latest release of WasmGPU. They have been fact-checked against official online sources from the respective publishers of the web browsers, operating systems, runtimes, and hardware, but they are not a claim that WasmGPU has been tested on all combinations of them.

Browser and driver support naturally changes over time. Therefore, if an entry in the two tables below is inaccurate or misleading, please [open an issue](https://www.github.com/Zushah/WasmGPU/issues) with as much relevant information as possible, including the web browser, operating system, runtime, hardware devices and drivers, and a minimal reproduction.

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
| Firefox | Android | 🧪 | Disabled by default, and current beta or Nightly builds require an advanced configuration flag. |
| Safari | MacOS 26, iOS 26, iPadOS 26 | ✅ | Available by default from Safari 26 through WebKit's Metal implementation. |
| Other browsers and embedded webviews | Any | ⚠️ | Compatible only when the runtime exposes WebGPU, WebAssembly, and the required browser APIs. Engine support does not guarantee that a particular browser distribution or webview enables WebGPU. |

### Runtime and Hardware Requirements

| Requirement | Compatibility rule |
| :--- | :--- |
| **Secure context** | WebGPU is exposed only in a secure context, so deploy through HTTPS or use a browser-recognized local development origin such as `localhost`. |
| **Browser environment** | Rendering requires a main-thread browser page with `navigator.gpu`, `window`, and a DOM-backed `HTMLCanvasElement`. Offscreen worker rendering is not currently a supported WasmGPU entry point. |
| **WebGPU adapter** | A core WebGPU adapter must be available. WasmGPU does not request WebGPU compatibility mode. The `timestamp-query` and `primitive-index` features are requested only when advertised, as GPU timing needs the former, while mesh-element picking needs the latter. |
| **WebAssembly** | The distributed WebAssembly driver requires WebAssembly with SIMD128 support. Shared WebAssembly memory and cross-origin isolation are not required by the default build. |
| **Graphics card and driver** | Compatibility ultimately depends on the browser accepting the installed graphics card and driver. Unsupported, outdated, remotely virtualized, or browser-blocklisted adapters may cause adapter acquisition to fail even on an operating system marked as available above. |
| **Workload limits** | The adapter must satisfy the buffer and binding limits requested by the application. Large pointcloud, glyphfield, nodelink, splatfield, latticespace, texture, or compute workloads can exceed the resources of otherwise compatible devices. |

## Getting Started

Examples:
1. [`./examples/benchmark.html`](https://zushah.github.io/WasmGPU/examples/benchmark.html) to see how the performance of WasmGPU compares to Three.js and Babylon.js for both rendering and computing.
2. [`./examples/esm.html`](https://zushah.github.io/WasmGPU/examples/esm.html) to see how to get started with the ESM build.
3. [`./examples/iife.html`](https://zushah.github.io/WasmGPU/examples/iife.html) to see how to get started with the IIFE build.
4. [`./examples/gltf.html`](https://zushah.github.io/WasmGPU/examples/gltf.html) to see how a glTF model of a T-rex can be loaded and imported.
5. [`./examples/controls.html`](https://zushah.github.io/WasmGPU/examples/controls.html) to see how the camera controls and navigation functionalities work.
6. [`./examples/picking.html`](https://zushah.github.io/WasmGPU/examples/picking.html) to see how the picking, probing, and selecting utility works.
7. [`./examples/scaling.html`](https://zushah.github.io/WasmGPU/examples/scaling.html) to see how the scaling service and colormapping works.
8. [`./examples/overlay.html`](https://zushah.github.io/WasmGPU/examples/overlay.html) to see how the overlay framework and annotation toolkit works.
9. [`./examples/mandelbulb.html`](https://zushah.github.io/WasmGPU/examples/mandelbulb.html) to see how the compute subsystem can be used to render a Mandelbulb fractal.
10. [`./examples/galaxy.html`](https://zushah.github.io/WasmGPU/examples/galaxy.html) to see how a pointcloud can be used with Python intero via Pyodide and the compute subsystem to render a realistic galaxy.
11. [`./examples/fluid.html`](https://zushah.github.io/WasmGPU/examples/fluid.html) to see how a glyphfield and a pointcloud can be used with Python interop, the compute subsystem, navigation, selection, and overlay features to render a fluid dynamics demo.
12. [`./examples/graphing.html`](https://zushah.github.io/WasmGPU/examples/graphing.html) to see how the mathematical function primitives and data materials can be used with Python interop, navigation, selection, and overlay features to render for a 3D graphing calculator.
13. [`./examples/protein.html`](https://zushah.github.io/WasmGPU/examples/protein.html) to see how a nodelink can be used with Python interop, navigation, selection, colormap, and overlay features to render a visualization of a protein structure (hemoglobin) from the Protein Data Bank.
14. [`./examples/terrain.html`](https://zushah.github.io/WasmGPU/examples/terrain.html) to see how a Gaussian splatfield can be used with a custom material and fly controls to render a procedurally-generated terrain.
15. [`./examples/lego.html`](https://zushah.github.io/WasmGPU/examples/lego.html) to see how a Gaussian splatfield glTF model of a lego set can be loaded and imported.
16. [`./examples/quantum.html`](https://zushah.github.io/WasmGPU/examples/quantum.html) to see how a couple of latticespaces can be used with picking to create a quantum orbitals visualizer.

Here's a super basic example to render a cube:
```js
// Setup
import { WasmGPU } from "@zushah/wasmgpu"; // or from "https://cdn.jsdelivr.net/gh/Zushah/WasmGPU@0.9.0/dist/WasmGPU.min.js"
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

Using the IIFE bundle instead of the ESM bundle is exactly the same as above, except you must use an HTML `script` tag instead of a JavaScript `import` statement:
```html
<script src="https://cdn.jsdelivr.net/gh/Zushah/WasmGPU@0.9.0/dist/WasmGPU.iife.min.js"></script>
```

To get started with the comprehensive [documentation](https://zushah.github.io/WasmGPU/docs/), consider visiting the pages for these fundamentals first:
- [`WasmGPU.create`](https://zushah.github.io/WasmGPU/docs/render/wasmgpu-create/)
- [`WasmGPU.compute.createPipeline`](https://zushah.github.io/WasmGPU/docs/compute/wasmgpu-compute-createpipeline/)
- [`WasmGPU.createMesh`](https://zushah.github.io/WasmGPU/docs/objects/wasmgpu-createmesh/)
- [`WasmGPU.createCamera.perspective`](https://zushah.github.io/WasmGPU/docs/world/wasmgpu-createcamera-perspective/)
- [`WasmGPU.createControls.orbit`](https://zushah.github.io/WasmGPU/docs/interact/wasmgpu-createcontrols-orbit/)
- [`WasmGPU.webassembly`](https://zushah.github.io/WasmGPU/docs/interop/wasmgpu-webassembly/)
- [`WasmGPU.python`](https://zushah.github.io/WasmGPU/docs/interop/wasmgpu-python/)
- [`WasmGPU.math`](https://zushah.github.io/WasmGPU/docs/math/wasmgpu-math/)

## Contributing

Asking questions, reporting bugs, suggesting features, and contributing code is very welcome. The guidelines can be found [here](https://www.github.com/Zushah/WasmGPU/blob/main/CONTRIBUTING.md).

## Acknowledgements

- [@Zushah](https://www.github.com/Zushah): main author.
- [@ZacharyVarley](https://www.github.com/ZacharyVarley): LU factor and solve kernels ([#3](https://www.github.com/Zushah/WasmGPU/pull/3)) in [`v0.8.0`](https://www.github.com/Zushah/WasmGPU/releases/tag/v0.8.0).
- [@L1quidH2O](https://www.github.com/L1quidH2O): optimization of pointcloud shader ([#1](https://www.github.com/Zushah/WasmGPU/pull/1)) in [`v0.7.0`](https://www.github.com/Zushah/WasmGPU/releases/tag/v0.7.0).

## License

WasmGPU is available under the [Mozilla Public License 2.0](https://www.github.com/Zushah/WasmGPU/blob/main/LICENSE.md).
