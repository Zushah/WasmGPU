# WasmGPU.material.data

## Summary
WasmGPU.material.data creates a material configured for the selected shading model. Use the result to control appearance and shader behavior.

## Syntax
```ts
WasmGPU.material.data(options: DataMaterialDescriptor): DataMaterial
const result = wgpu.material.data(options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `DataMaterialDescriptor` | Yes | Optional configuration object that customizes behavior for this call. |

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
| `data` | `Float32Array` | No | Packed numeric data consumed by this API. |
| `dataBuffer` | `GPUBuffer \| { buffer: GPUBuffer } \| null` | No | GPU buffer handle used by this operation. |
| `keepCPUData` | `boolean` | No | When true, CPU arrays are retained after upload. |
| `scaleTransform` | `ScaleTransformDescriptor` | Yes | Descriptor/options object controlling structure and behavior for this operation. |
| `opacity` | `number` | No | Numeric input controlling `opacity` for this operation. |
| `shading` | `number` | No | Numeric input controlling `shading` for this operation. |
| `colormap` | `BuiltinColormapName \| Colormap` | No | Builtin colormap name or custom colormap runtime object. |

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
| `depthWrite` | `boolean` | No | Boolean flag that toggles `depthWrite` behavior. |
| `depthTest` | `boolean` | No | Boolean flag that toggles `depthTest` behavior. |

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
- [WasmGPU.material.custom](./wasmgpu-material-custom.md)
- [WasmGPU.material.standard](./wasmgpu-material-standard.md)
- [WasmGPU.material.unlit](./wasmgpu-material-unlit.md)
