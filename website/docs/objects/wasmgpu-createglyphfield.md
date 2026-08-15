# WasmGPU.createGlyphField

## Summary
WasmGPU.createGlyphField creates an instanced glyph field for vector/tensor visualization workloads. It supports CPU arrays, external buffers, or wasm-pointer data sources.

## Syntax
```ts
WasmGPU.createGlyphField(descriptor: GlyphFieldDescriptor): GlyphField
const result = wgpu.createGlyphField(descriptor);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `descriptor` | `GlyphFieldDescriptor` | Yes | Descriptor object that defines the initial configuration for this runtime object. |

## Returns
`GlyphField` - GlyphField runtime object configured for instanced glyph rendering.

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

External GPU buffers are borrowed by default. `ownBuffers: true` transfers responsibility for destroying the supplied instance buffers. Borrowed WebAssembly sources and their explicit-refresh contract are documented separately.

#### GlyphFieldDescriptor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `shape` | `GlyphShape` | No | Glyph shape preset used for instanced glyph rendering. |
| `geometry` | `Geometry` | No | Geometry instance that provides vertex/index buffers and bounds. |
| `instanceCount` | `number` | No | Number of instances represented by supplied data inputs. |
| `positions` | `Float32Array` | No | Packed per-instance positions. |
| `rotations` | `Float32Array` | No | Packed per-instance quaternion rotations. |
| `scales` | `Float32Array` | No | Packed per-instance scales. |
| `attributes` | `Float32Array` | No | Packed per-instance attribute values. |
| `wasmPositions`, `wasmRotations`, `wasmScales`, `wasmAttributes` | `WasmMemoryView<Float32Array>` | No | Borrowed packed vec4 channels. They are mutually exclusive with CPU, legacy-pointer, and GPU-buffer sources for the same data family. |
| `wasmCapacity` | `number` | No | Initial grow-only GPU capacity hint for Wasm-backed channels. |
| `positionsPtr` | `WasmPtr` | No | Wasm pointer to positions SoA data. |
| `rotationsPtr` | `WasmPtr` | No | Wasm pointer to rotations SoA data. |
| `scalesPtr` | `WasmPtr` | No | Wasm pointer to scales SoA data. |
| `attributesPtr` | `WasmPtr` | No | Wasm pointer to attributes SoA data. |
| `positionsBuffer` | `GPUBuffer \| { buffer: GPUBuffer }` | No | GPU buffer handle used by this operation. |
| `ownBuffers` | `boolean` | No | Transfers destruction responsibility for supplied GPU instance buffers. Wasm views remain borrowed. |

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
| `mode` | `ScaleMode` | No | Mode selector controlling behavior for this operation or descriptor. |
| `clampMode` | `ScaleClampMode` | No | Clamping mode used by scale transforms. |
| `valueMode` | `ScaleValueMode` | No | Value extraction mode used when mapping source data into scale inputs. |
| `componentCount` | `number` | No | Numeric input controlling `componentCount` for this operation. |
| `componentIndex` | `number` | No | Numeric input controlling `componentIndex` for this operation. |
| `stride` | `number` | No | Numeric input controlling `stride` for this operation. |
| `offset` | `number` | No | Numeric input controlling `offset` for this operation. |
| `domainMin` | `number` | No | Numeric input controlling `domainMin` for this operation. |
| `domainMax` | `number` | No | Numeric input controlling `domainMax` for this operation. |
| `clampMin` | `number` | No | Numeric input controlling `clampMin` for this operation. |
| `clampMax` | `number` | No | Numeric input controlling `clampMax` for this operation. |
| `percentileLow` | `number` | No | Numeric input controlling `percentileLow` for this operation. |

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

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const glyphField = wgpu.createGlyphField({ instanceCount: 1, positions: new Float32Array([0, 0, 0, 0]), rotations: new Float32Array([0, 0, 0, 1]), scales: new Float32Array([1, 1, 1, 0]), attributes: new Float32Array([0.5, 0, 0, 0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const descriptor = { instanceCount: 1, positions: new Float32Array([0, 0, 0, 0]), rotations: new Float32Array([0, 0, 0, 1]), scales: new Float32Array([1, 1, 1, 0]), attributes: new Float32Array([0.5, 0, 0, 0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } };
const result = wgpu.createGlyphField(descriptor);
console.log(result);
```

## See Also
- [GlyphField.setCPUData](./glyphfield-setcpudata.md)
- [GlyphField.setWasmPositions](./glyphfield-setwasmpositions.md)
- [GlyphField.refreshFromWasm](./glyphfield-refreshfromwasm.md)
- [WasmGPU.animation.createClip](./wasmgpu-animation-createclip.md)
- [WasmGPU.animation.createPlayer](./wasmgpu-animation-createplayer.md)
- [WasmGPU.animation.createSkin](./wasmgpu-animation-createskin.md)
- [WasmGPU.colormap.builtin](./wasmgpu-colormap-builtin.md)
- [WasmGPU.colormap.fromPalette](./wasmgpu-colormap-frompalette.md)
- [WasmGPU.colormap.fromStops](./wasmgpu-colormap-fromstops.md)
