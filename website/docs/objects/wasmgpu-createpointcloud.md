# WasmGPU.createPointCloud

## Summary
WasmGPU.createPointCloud creates a point cloud from packed CPU records, borrowed WebAssembly views, external GPU buffers, or an explicit count awaiting later data. CPU and Wasm inputs are uploaded lazily. Point appearance can come from scalar-to-colormap mapping or per-point RGBA colors.

Canonical documentation namepaths use `createPointCloud#*` for members of the point-cloud instance returned by this factory.

## Syntax
```ts
WasmGPU.createPointCloud(descriptor: PointCloudDescriptor): PointCloud
const result = wgpu.createPointCloud(descriptor);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `descriptor` | `PointCloudDescriptor` | Yes | Descriptor object used to configure point data, colors, bounds, and point rendering behavior. |

## Returns
`PointCloud` - Point cloud using the supplied source family, ownership rules, bounds, and scalar or RGBA appearance.

## Type Details
### PointCloudDescriptor

```ts
type PointCloudDescriptor = {
    data?: Float32Array;
    colors?: Float32Array;
    wasmData?: WasmMemoryView<Float32Array>;
    wasmColors?: WasmMemoryView<Float32Array>;
    wasmCapacity?: number;
    pointsBuffer?: GPUBuffer | { buffer: GPUBuffer };
    colorsBuffer?: GPUBuffer | { buffer: GPUBuffer };
    pointCount?: number;
    boundsMin?: [number, number, number];
    boundsMax?: [number, number, number];
    boundsCenter?: [number, number, number];
    boundsRadius?: number;
    blendMode?: BlendMode;
    depthWrite?: boolean;
    depthTest?: boolean;
    basePointSize?: number;
    minPointSize?: number;
    maxPointSize?: number;
    sizeAttenuation?: number;
    opacity?: number;
    colormap?: PointCloudColormap | Colormap;
    colormapStops?: Color4[];
    colorMode?: PointCloudColorMode;
    softness?: number;
    scaleTransform: ScaleTransformDescriptor;
    visible?: boolean;
    name?: string;
    keepCPUData?: boolean;
    ownBuffers?: boolean;
    ndShape?: number[];
};
```

#### PointCloudDescriptor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `data` | `Float32Array` | No | Packed point tuples in `[x, y, z, scalar]` order. This is the CPU-array path for point positions and scalar values. |
| `colors` | `Float32Array` | No | Packed per-point RGBA float tuples in `[r, g, b, a]` order. Use this with `colorMode: "rgba"` when each point already has final colors. |
| `wasmData` | `WasmMemoryView<Float32Array>` | No | Borrowed packed point source used when `data` is absent. Its active length must contain complete four-float records. |
| `wasmColors` | `WasmMemoryView<Float32Array>` | No | Borrowed packed RGBA source used when `colors` is absent. Its active range must cover the point count. |
| `wasmCapacity` | `number` | No | Non-negative safe-integer, grow-only GPU record-capacity hint shared by Wasm-backed point and color channels. |
| `pointsBuffer` | `GPUBuffer \| { buffer: GPUBuffer }` | No | External storage buffer used when neither `data` nor `wasmData` is supplied. It contains packed `[x, y, z, scalar]` tuples, and `pointCount` must be greater than zero. |
| `colorsBuffer` | `GPUBuffer \| { buffer: GPUBuffer }` | No | External storage buffer used when neither `colors` nor `wasmColors` is supplied. Point count must already be known. |
| `pointCount` | `number` | No | Active record count for Wasm prefixes, external GPU buffers, or an otherwise data-less cloud. |
| `colorMode` | `PointCloudColorMode` | No | `"scalar"` maps point data through `scaleTransform` and a colormap. `"rgba"` reads the separate color channel. The default is `"rgba"` when any color source is supplied and `"scalar"` otherwise. |
| `colormap` | `PointCloudColormap \| Colormap` | No | Colormap used when `colorMode` is `"scalar"`. |
| `colormapStops` | `Color4[]` | No | Explicit stop list for a custom scalar colormap. |
| `scaleTransform` | `ScaleTransformDescriptor` | Yes | Scalar mapping descriptor over packed point data. This is still part of the point cloud even if you later switch to RGBA colors. |
| `boundsMin`, `boundsMax`, `boundsCenter`, `boundsRadius` | Bounds fields | No | Optional explicit local bounds. A min/max pair defines the box and derives a sphere, optionally overridden by center/radius. Without a box, center/radius defines a sphere and its box. Explicit bounds are not replaced by Wasm recomputation. |
| `keepCPUData` | `boolean` | No | Retains CPU copies after upload. Without retained CPU data, helpers that inspect per-point records have less information to work with. |
| `ownBuffers` | `boolean` | No | When true, transfers destruction responsibility for caller-supplied GPU buffers. Wasm views remain borrowed. |
| `ndShape` | `number[]` | No | Optional multidimensional shape used to decode linear point indices into `ndIndex` values during picking. |

### PointCloudColorMode

```ts
type PointCloudColorMode = "rgba" | "scalar";
```

### PointCloudColormap

```ts
type PointCloudColormap = BuiltinColormapName | "custom";
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

Use `basePointSize`, `minPointSize`, `maxPointSize`, `sizeAttenuation`, `softness`, `opacity`, `blendMode`, `depthWrite`, `depthTest`, `visible`, and `name` to tune draw behavior and appearance.

Choose exactly one point source from `data`, `wasmData`, and `pointsBuffer`, and at most one color source from `colors`, `wasmColors`, and `colorsBuffer`. Competing sources in the same category are unsupported. External-buffer workflows avoid a JavaScript-side copy but do not provide CPU-readable point records or automatic bounds.

External GPU buffers are borrowed by default. Set `ownBuffers: true` to transfer destruction responsibility for whichever external buffers are selected. WebAssembly views remain borrowed and require explicit refresh after producer writes or memory growth. Defaults are additive blending, depth writes off, depth testing on, visible, scalar Viridis coloring, and point sizes `2`/`1`/`16` for base/min/max.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const cloud = wgpu.createPointCloud({
    data: new Float32Array([
        -1.0, 0.0, 0.0, 0.10,
         0.0, 0.9, 0.0, 0.35,
         0.9, 0.1, 0.0, 0.70,
         0.1, -0.8, 0.0, 0.95
    ]),
    colors: new Float32Array([
        0.20, 0.55, 0.95, 1.0,
        0.35, 0.80, 0.55, 1.0,
        0.95, 0.70, 0.25, 1.0,
        0.92, 0.30, 0.32, 1.0
    ]),
    colorMode: "rgba",
    scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 },
    basePointSize: 9,
    minPointSize: 3,
    maxPointSize: 18,
    keepCPUData: true
});
```

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [WasmGPU.createGlyphField](./wasmgpu-createglyphfield.md)
- [createPointCloud#scaleTransform](./createpointcloud-scaletransform.md)
- [colormap.fromStops](./colormap-fromstops.md)
- [createOverlay.legend](../world/createoverlay-legend.md)
- [createPointCloud#setData](./createpointcloud-setdata.md)
- [createPointCloud#setColors](./createpointcloud-setcolors.md)
- [createPointCloud#refreshFromWasm](./createpointcloud-refreshfromwasm.md)
