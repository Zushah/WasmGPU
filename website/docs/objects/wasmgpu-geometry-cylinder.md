# WasmGPU.geometry.cylinder

## Summary
WasmGPU.geometry.cylinder builds geometry data for a primitive or procedural shape. The returned Geometry can be reused by multiple meshes.

## Syntax
```ts
WasmGPU.geometry.cylinder(radiusTop?: number, radiusBottom?: number, height?: number, radialSegments?: number, heightSegments?: number, openEnded?: boolean): Geometry
const result = wgpu.geometry.cylinder(radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `radiusTop` | `number` | No | Numeric input controlling `radiusTop` for this operation. |
| `radiusBottom` | `number` | No | Numeric input controlling `radiusBottom` for this operation. |
| `height` | `number` | No | Height value used when generating geometry or textures. |
| `radialSegments` | `number` | No | Radial subdivision count for cylindrical/tube geometries. |
| `heightSegments` | `number` | No | Numeric input controlling `heightSegments` for this operation. |
| `openEnded` | `boolean` | No | Boolean flag that toggles `openEnded` behavior. |

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

const radiusTop = 1;
const radiusBottom = 1;
const height = 1;
const radialSegments = 1;
const heightSegments = 1;
const openEnded = true;
const result = wgpu.geometry.cylinder(radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded);
console.log(result);
```

## See Also
- [WasmGPU.geometry.box](./wasmgpu-geometry-box.md)
- [WasmGPU.geometry.cartesianCurve](./wasmgpu-geometry-cartesiancurve.md)
- [WasmGPU.geometry.cartesianSurface](./wasmgpu-geometry-cartesiansurface.md)
- [WasmGPU.geometry.circle](./wasmgpu-geometry-circle.md)
- [WasmGPU.geometry.custom](./wasmgpu-geometry-custom.md)
- [WasmGPU.geometry.ellipse](./wasmgpu-geometry-ellipse.md)
- [WasmGPU.geometry.line](./wasmgpu-geometry-line.md)
- [WasmGPU.geometry.parametricCurve](./wasmgpu-geometry-parametriccurve.md)
- [WasmGPU.geometry.parametricSurface](./wasmgpu-geometry-parametricsurface.md)
- [WasmGPU.geometry.plane](./wasmgpu-geometry-plane.md)
- [WasmGPU.geometry.point](./wasmgpu-geometry-point.md)
- [WasmGPU.geometry.prism](./wasmgpu-geometry-prism.md)
