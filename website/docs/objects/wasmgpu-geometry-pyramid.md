# WasmGPU.geometry.pyramid

## Summary
WasmGPU.geometry.pyramid builds geometry data for a primitive or procedural shape. The returned Geometry can be reused by multiple meshes.

## Syntax
```ts
WasmGPU.geometry.pyramid(baseWidth?: number, baseDepth?: number, height?: number): Geometry
const result = wgpu.geometry.pyramid(baseWidth, baseDepth, height);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `baseWidth` | `number` | No | Numeric input controlling `baseWidth` for this operation. |
| `baseDepth` | `number` | No | Numeric input controlling `baseDepth` for this operation. |
| `height` | `number` | No | Height value used when generating geometry or textures. |

## Returns
`Geometry` - Generated Geometry object containing vertex/index data and computed bounds.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const baseWidth = 1;
const baseDepth = 1;
const height = 1;
const result = wgpu.geometry.pyramid(baseWidth, baseDepth, height);
console.log(result);
```

## See Also
- [WasmGPU.geometry.box](./wasmgpu-geometry-box.md)
- [WasmGPU.geometry.cartesianCurve](./wasmgpu-geometry-cartesiancurve.md)
- [WasmGPU.geometry.cartesianSurface](./wasmgpu-geometry-cartesiansurface.md)
- [WasmGPU.geometry.circle](./wasmgpu-geometry-circle.md)
- [WasmGPU.geometry.custom](./wasmgpu-geometry-custom.md)
- [WasmGPU.geometry.cylinder](./wasmgpu-geometry-cylinder.md)
- [WasmGPU.geometry.ellipse](./wasmgpu-geometry-ellipse.md)
- [WasmGPU.geometry.line](./wasmgpu-geometry-line.md)
- [WasmGPU.geometry.parametricCurve](./wasmgpu-geometry-parametriccurve.md)
- [WasmGPU.geometry.parametricSurface](./wasmgpu-geometry-parametricsurface.md)
- [WasmGPU.geometry.plane](./wasmgpu-geometry-plane.md)
- [WasmGPU.geometry.point](./wasmgpu-geometry-point.md)
