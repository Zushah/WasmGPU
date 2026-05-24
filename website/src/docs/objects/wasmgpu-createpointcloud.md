# WasmGPU.createPointCloud

## Summary
WasmGPU.createPointCloud creates a GPU-backed point cloud from packed point data or external GPU buffers. Point appearance can come from scalar-to-colormap mapping or from per-point RGBA colors.

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
`PointCloud` - PointCloud runtime object configured for scalar-driven or RGBA-driven point rendering.

## Type Details
### PointCloudDescriptor

```ts
type PointCloudDescriptor = {
    data?: Float32Array;
    colors?: Float32Array;
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
    ndShape?: number[];
};
```

#### PointCloudDescriptor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `data` | `Float32Array` | No | Packed point tuples in `[x, y, z, scalar]` order. This is the CPU-array path for point positions and scalar values. |
| `colors` | `Float32Array` | No | Packed per-point RGBA float tuples in `[r, g, b, a]` order. Use this with `colorMode: "rgba"` when each point already has final colors. |
| `pointsBuffer` | `GPUBuffer \| { buffer: GPUBuffer }` | No | External GPU buffer containing packed `[x, y, z, scalar]` float tuples. When this path is used, `pointCount` is required because the runtime cannot infer it from the buffer. |
| `colorsBuffer` | `GPUBuffer \| { buffer: GPUBuffer }` | No | External GPU buffer containing packed `[r, g, b, a]` float tuples. Point count must already be known from `data`, `pointsBuffer`, or `pointCount`. |
| `pointCount` | `number` | No | Number of points represented by external GPU buffers. |
| `colorMode` | `PointCloudColorMode` | No | `"scalar"` maps the fourth component of each point through `scaleTransform` and a colormap. `"rgba"` uses `colors` or `colorsBuffer` directly. Supplying `colors` or `colorsBuffer` switches the default to `"rgba"`. |
| `colormap` | `PointCloudColormap \| Colormap` | No | Colormap used when `colorMode` is `"scalar"`. |
| `colormapStops` | `Color4[]` | No | Explicit stop list for a custom scalar colormap. |
| `scaleTransform` | `ScaleTransformDescriptor` | Yes | Scalar mapping descriptor over packed point data. This is still part of the point cloud even if you later switch to RGBA colors. |
| `boundsMin`, `boundsMax`, `boundsCenter`, `boundsRadius` | Bounds fields | No | Optional explicit bounds. These are useful when point positions live only in external GPU buffers or when CPU arrays are not retained after upload. |
| `keepCPUData` | `boolean` | No | Retains CPU copies after upload. Without retained CPU data, helpers that inspect per-point records have less information to work with. |
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

External-buffer workflows are useful when your data is already on the GPU. They avoid a JavaScript-side copy at creation time, but they do not automatically give the runtime CPU-readable point records or statistics.

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
- [PointCloud.scaleTransform](./wasmgpu-objects-pointcloud-scaletransform.md)
- [WasmGPU.colormap.fromStops](./wasmgpu-colormap-fromstops.md)
- [WasmGPU.createOverlay.legend](../world/wasmgpu-createoverlay-legend.md)
