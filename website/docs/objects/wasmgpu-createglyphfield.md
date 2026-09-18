# WasmGPU.createGlyphField

## Summary
WasmGPU.createGlyphField creates an instanced ellipsoid, arrow, or custom-geometry field from independently selectable CPU, safe Wasm-view, legacy raw-pointer, and external GPU-buffer channels. CPU, pointer, and Wasm inputs upload lazily; external buffers are used directly.

## Syntax
```ts
WasmGPU.createGlyphField(descriptor: GlyphFieldDescriptor): GlyphField
const result = wgpu.createGlyphField(descriptor);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `descriptor` | `GlyphFieldDescriptor` | Yes | Glyph geometry plus CPU, Wasm, pointer, or GPU-buffer channels, bounds, appearance, ownership, and retention settings. |

## Returns
`GlyphField` - Glyph field using the selected geometry, channels, ownership rules, and visual settings.

## Type Details
### GlyphFieldDescriptor

```ts
type GlyphFieldDescriptor = {
    shape?: GlyphShape;
    geometry?: Geometry;
    instanceCount?: number;
    positions?: Float32Array;
    rotations?: Float32Array;
    scales?: Float32Array;
    attributes?: Float32Array;
    wasmPositions?: WasmMemoryView<Float32Array>;
    wasmRotations?: WasmMemoryView<Float32Array>;
    wasmScales?: WasmMemoryView<Float32Array>;
    wasmAttributes?: WasmMemoryView<Float32Array> | null;
    wasmCapacity?: number;
    positionsPtr?: WasmPtr;
    rotationsPtr?: WasmPtr;
    scalesPtr?: WasmPtr;
    attributesPtr?: WasmPtr;
    positionsBuffer?: GPUBuffer | { buffer: GPUBuffer };
    rotationsBuffer?: GPUBuffer | { buffer: GPUBuffer };
    scalesBuffer?: GPUBuffer | { buffer: GPUBuffer };
    attributesBuffer?: GPUBuffer | { buffer: GPUBuffer };
    boundsMin?: [number, number, number];
    boundsMax?: [number, number, number];
    boundsCenter?: [number, number, number];
    boundsRadius?: number;
    blendMode?: BlendMode;
    cullMode?: CullMode;
    depthWrite?: boolean;
    depthTest?: boolean;
    colorMode?: GlyphColorMode;
    colormap?: GlyphColormap | Colormap;
    colormapStops?: Color4[];
    scaleTransform: ScaleTransformDescriptor;
    opacity?: number;
    lit?: boolean;
    solidColor?: Color4;
    visible?: boolean;
    name?: string;
    keepCPUData?: boolean;
    ownBuffers?: boolean;
    ndShape?: number[];
};
```

External GPU buffers are borrowed by default. `ownBuffers: true` transfers responsibility for destroying the selected instance buffers. Geometry is always borrowed: destroying the field neither releases nor destroys it. Borrowed WebAssembly views require explicit refresh after producer writes or memory growth; legacy pointers assume the engine's current Wasm memory and cannot track growth safely.

#### GlyphFieldDescriptor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `shape` | `GlyphShape` | No | Built-in `"ellipsoid"` (default) or `"arrow"`; `"custom"` without `geometry` currently falls back to ellipsoid geometry. |
| `geometry` | `Geometry` | No | Borrowed geometry overriding the shape preset. Its local bounds participate in instance-bound computation. |
| `instanceCount` | `number` | No | Active records. Required and positive for external-buffer or raw-pointer modes; otherwise derived from arrays/views when omitted. |
| `positions` | `Float32Array` | No | Packed `[x, y, z, _]` records. |
| `rotations` | `Float32Array` | No | Packed quaternion `[x, y, z, w]` records. |
| `scales` | `Float32Array` | No | Packed `[sx, sy, sz, _]` records. |
| `attributes` | `Float32Array` | No | Optional packed four-component application attributes used by RGBA/scalar coloring and picking. |
| `wasmPositions`, `wasmRotations`, `wasmScales`, `wasmAttributes` | `WasmMemoryView<Float32Array>` | No | Borrowed packed vec4 channels. A Wasm view takes precedence for its channel; other channels may still come from buffers, pointers, or CPU arrays. |
| `wasmCapacity` | `number` | No | Non-negative safe-integer, grow-only GPU record-capacity hint applied to Wasm-view channels. |
| `positionsPtr` | `WasmPtr` | No | Legacy pointer to packed position vec4 records; all three core pointers and `instanceCount` are required for pointer mode. |
| `rotationsPtr` | `WasmPtr` | No | Legacy pointer to packed quaternion records. |
| `scalesPtr` | `WasmPtr` | No | Legacy pointer to packed scale vec4 records. |
| `attributesPtr` | `WasmPtr` | No | Optional legacy pointer to attribute vec4 records; zero means absent. |
| `positionsBuffer` | `GPUBuffer \| { buffer: GPUBuffer }` | No | External storage buffer. Pure buffer mode requires position, rotation, and scale buffers plus a positive count. |
| `ownBuffers` | `boolean` | No | Transfers destruction responsibility for supplied GPU instance buffers. Wasm views remain borrowed. |
| `boundsMin`, `boundsMax`, `boundsCenter`, `boundsRadius` | Bounds fields | No | Explicit local bounds for GPU-only data. A min/max pair defines the effective box; otherwise center/radius defines a sphere-derived box. |
| `colorMode` | `GlyphColorMode` | No | `"rgba"` reads attributes as color, `"scalar"` maps an attribute component through the scale/colormap, and `"solid"` uses `solidColor`. Default `"rgba"`. |
| `colormap`, `colormapStops` | `GlyphColormap \| Colormap`, `Color4[]` | No | Built-in/object colormap or two-to-eight normalized custom stops for scalar mode. |
| `scaleTransform` | `ScaleTransformDescriptor` | Yes | Required attribute extraction and scalar mapping descriptor; layout defaults to four components, component zero, stride four, offset zero. |
| `opacity`, `lit`, `solidColor` | Visual fields | No | Global alpha (default `1`), lighting toggle (default `false`), and solid-mode RGBA (default white). |
| `blendMode`, `cullMode`, `depthWrite`, `depthTest` | Render-state fields | No | Pipeline/depth configuration; defaults are opaque, back-face culling, depth writes on, and depth testing on. |
| `keepCPUData` | `boolean` | No | Retains copied/array channel records after upload for bounds, attribute picking, and inspection. |
| `ndShape` | `number[]` | No | Optional positive-integer logical shape for row-major pick-index decoding. |

All active channels contain one `vec4<f32>` per instance and must agree on count. For CPU-backed nonempty fields, positions, rotations, and scales are required. Supply at most one CPU array, WebAssembly view, legacy pointer, or external GPU buffer for each channel; competing per-channel sources are unsupported. Defaults are opaque blending, back-face culling, depth test/write enabled, unlit RGBA mode, Viridis, full opacity, and white solid color.

### GlyphShape

```ts
type GlyphShape = "ellipsoid" | "arrow" | "custom";
```

### WasmPtr

```ts
type WasmPtr = number;
```

### GlyphColorMode

```ts
type GlyphColorMode = "rgba" | "scalar" | "solid";
```

### GlyphColormap

```ts
type GlyphColormap = BuiltinColormapName | "custom";
```

### Color4

```ts
type Color4 = [number, number, number, number];
```

### ScaleTransformDescriptor

```ts
type ScaleTransformDescriptor = {
    mode?: ScaleMode;
    clampMode?: ScaleClampMode;
    valueMode?: ScaleValueMode;
    componentCount?: number;
    componentIndex?: number;
    stride?: number;
    offset?: number;
    domainMin?: number;
    domainMax?: number;
    clampMin?: number;
    clampMax?: number;
    percentileLow?: number;
    percentileHigh?: number;
    logBase?: number;
    symlogLinThresh?: number;
    gamma?: number;
    invert?: boolean;
};
```

#### ScaleTransformDescriptor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `mode` | `ScaleMode` | No | Numeric transform applied before domain normalization. |
| `clampMode` | `ScaleClampMode` | No | Clamping mode used by scale transforms. |
| `valueMode` | `ScaleValueMode` | No | Value extraction mode used when mapping source data into scale inputs. |
| `componentCount` | `number` | No | Number of components considered when extracting each value. |
| `componentIndex` | `number` | No | Selected component for `"component"` value mode. |
| `stride` | `number` | No | Distance, in `f32` values, between source records. |
| `offset` | `number` | No | Initial source offset in `f32` values. |
| `domainMin` | `number` | No | Lower bound mapped into the normalized color domain. |
| `domainMax` | `number` | No | Upper bound mapped into the normalized color domain. |
| `clampMin` | `number` | No | Lower value clamp used when clamping is enabled. |
| `clampMax` | `number` | No | Upper value clamp used when clamping is enabled. |
| `percentileLow` | `number` | No | Requested lower percentile, expressed from `0` to `100`. |

### BuiltinColormapName

```ts
type BuiltinColormapName = "grayscale" | "turbo" | "viridis" | "magma" | "plasma" | "inferno";
```

### ScaleMode

```ts
type ScaleMode = "linear" | "log" | "symlog";
```

### ScaleClampMode

```ts
type ScaleClampMode = "none" | "range" | "percentile";
```

## See Also
- [createGlyphField#setCPUData](./createglyphfield-setcpudata.md)
- [createGlyphField#setWasmPositions](./createglyphfield-setwasmpositions.md)
- [createGlyphField#refreshFromWasm](./createglyphfield-refreshfromwasm.md)
