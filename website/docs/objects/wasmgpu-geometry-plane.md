# WasmGPU.geometry.plane

## Summary
WasmGPU.geometry.plane builds geometry data for a primitive or procedural shape. The returned Geometry can be reused by multiple meshes.

## Syntax
```ts
WasmGPU.geometry.plane(width?: number, height?: number, widthSegments?: number, heightSegments?: number): Geometry
const result = wgpu.geometry.plane(width, height, widthSegments, heightSegments);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `width` | `number` | No | Width value used when generating geometry or textures. |
| `height` | `number` | No | Height value used when generating geometry or textures. |
| `widthSegments` | `number` | No | Numeric input controlling `widthSegments` for this operation. |
| `heightSegments` | `number` | No | Numeric input controlling `heightSegments` for this operation. |

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

const width = 1;
const height = 1;
const widthSegments = 1;
const heightSegments = 1;
const result = wgpu.geometry.plane(width, height, widthSegments, heightSegments);
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
- [WasmGPU.geometry.point](./wasmgpu-geometry-point.md)
- [WasmGPU.geometry.prism](./wasmgpu-geometry-prism.md)
