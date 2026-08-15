# WasmGPU.geometry.torus

## Summary
WasmGPU.geometry.torus builds geometry data for a primitive or procedural shape. The returned Geometry can be reused by multiple meshes.

## Syntax
```ts
WasmGPU.geometry.torus(radius?: number, tube?: number, radialSegments?: number, tubularSegments?: number): Geometry
const result = wgpu.geometry.torus(radius, tube, radialSegments, tubularSegments);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `radius` | `number` | No | Radius value used by circular/spherical primitives. |
| `tube` | `number` | No | Numeric input controlling `tube` for this operation. |
| `radialSegments` | `number` | No | Radial subdivision count for cylindrical/tube geometries. |
| `tubularSegments` | `number` | No | Numeric input controlling `tubularSegments` for this operation. |

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

const radius = 1;
const tube = 1;
const radialSegments = 1;
const tubularSegments = 1;
const result = wgpu.geometry.torus(radius, tube, radialSegments, tubularSegments);
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
