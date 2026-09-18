# geometry.sphere

## Summary
geometry.sphere creates an indexed UV sphere centered at the origin. Radius defaults to `0.5`, with `32` longitudinal and `16` latitudinal segments. Both segment counts must be positive integers.

## Syntax
```ts
WasmGPU.geometry.sphere(radius?: number, widthSegments?: number, heightSegments?: number): Geometry
const result = wgpu.geometry.sphere(radius, widthSegments, heightSegments);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `radius` | `number` | No | Radius value used by circular/spherical primitives. |
| `widthSegments` | `number` | No | Number of longitudinal subdivisions. |
| `heightSegments` | `number` | No | Number of latitudinal subdivisions. |

## Returns
`Geometry` - Indexed UV-sphere geometry with normals, UVs, and computed bounds.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const radius = 1;
const widthSegments = 32;
const heightSegments = 16;
const result = wgpu.geometry.sphere(radius, widthSegments, heightSegments);
console.log(result);
```

## See Also
- [geometry.box](./geometry-box.md)
- [geometry.cartesianCurve](./geometry-cartesiancurve.md)
- [geometry.cartesianSurface](./geometry-cartesiansurface.md)
- [geometry.circle](./geometry-circle.md)
- [geometry.custom](./geometry-custom.md)
- [geometry.cylinder](./geometry-cylinder.md)
- [geometry.ellipse](./geometry-ellipse.md)
- [geometry.line](./geometry-line.md)
- [geometry.parametricCurve](./geometry-parametriccurve.md)
- [geometry.parametricSurface](./geometry-parametricsurface.md)
- [geometry.plane](./geometry-plane.md)
- [geometry.point](./geometry-point.md)
