# material.data

## Summary
material.data creates a scalar/vector data-driven material backed by either a CPU `Float32Array` or a borrowed storage `GPUBuffer`. A normalized `scaleTransform` is required and defines record stride, component extraction, and value mapping; the default colormap is `"viridis"`. Supply exactly one of `data` and `dataBuffer`.

## Syntax
```ts
WasmGPU.material.data(options: DataMaterialDescriptor): DataMaterial
const result = wgpu.material.data(options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `DataMaterialDescriptor` | Yes | Required scale transform plus optional data source, colormap, shading, opacity, and render state. |

## Returns
`DataMaterial` - New `DataMaterial` runtime material instance.

## Type Details
### DataMaterialDescriptor

```ts
type DataMaterialDescriptor = MaterialDescriptor & {

    data?: Float32Array;

    dataBuffer?: GPUBuffer | { buffer: GPUBuffer } | null;

    keepCPUData?: boolean;

    scaleTransform: ScaleTransformDescriptor;

    opacity?: number;

    shading?: number;

    colormap?: BuiltinColormapName | Colormap;

};
```

#### DataMaterialDescriptor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `data` | `Float32Array` | No | Non-empty packed CPU records, retained by reference until upload. |
| `dataBuffer` | `GPUBuffer \| { buffer: GPUBuffer } \| null` | No | Borrowed storage buffer; mutually exclusive with `data`. |
| `keepCPUData` | `boolean` | No | Retain CPU data after upload; default `false`. |
| `scaleTransform` | `ScaleTransformDescriptor` | Yes | Record layout and scalar extraction/mapping descriptor. |
| `opacity` | `number` | No | Opacity packed to uniforms after clamping to `[0, 1]`; default `1`. |
| `shading` | `number` | No | Shading blend packed after clamping to `[0, 1]`; default `0`. |
| `colormap` | `BuiltinColormapName \| Colormap` | No | Built-in name or externally owned colormap; default `"viridis"`. |

### MaterialDescriptor

```ts
type MaterialDescriptor = {

    label?: string;

    blendMode?: BlendMode;

    cullMode?: CullMode;

    depthWrite?: boolean;

    depthTest?: boolean;

};
```

#### MaterialDescriptor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `label` | `string` | No | Debug label propagated to material GPU resources. |
| `blendMode` | `BlendMode` | No | Blend mode controlling fragment compositing behavior. |
| `cullMode` | `CullMode` | No | Face-culling mode used during rasterization. |
| `depthWrite` | `boolean` | No | Whether fragments update the depth buffer. |
| `depthTest` | `boolean` | No | Whether fragments are tested against the depth buffer. |

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

### ScaleValueMode

```ts
type ScaleValueMode = "component" | "magnitude";
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const options = { data: new Float32Array([0.2, 0.5, 0.8, 1.0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 }, colormap: "viridis" };
const result = wgpu.material.data(options);
console.log(result);
```

## See Also
- [material.custom](./material-custom.md)
- [material.standard](./material-standard.md)
- [material.unlit](./material-unlit.md)
