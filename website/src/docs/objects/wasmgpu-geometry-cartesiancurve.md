# WasmGPU.geometry.cartesianCurve

## Summary
WasmGPU.geometry.cartesianCurve builds geometry data for a primitive or procedural shape. The returned Geometry can be reused by multiple meshes.

## Syntax
```ts
WasmGPU.geometry.cartesianCurve(descriptor: CartesianCurveDescriptor): Geometry
const result = wgpu.geometry.cartesianCurve(descriptor);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `descriptor` | `CartesianCurveDescriptor` | Yes | Descriptor object that defines the initial configuration for this runtime object. |

## Returns
`Geometry` - Generated Geometry object containing vertex/index data and computed bounds.

## Type Details
### CartesianCurveDescriptor

```ts
type CartesianCurveDescriptor = {

    f: (x: number) => number;

    xMin?: number;

    xMax?: number;

    segments?: number;

    radius?: number;

    radialSegments?: number;

    closed?: boolean;

    plane?: "xy" | "xz" | "yz";

    up?: [number, number, number];

    breakOnInvalid?: boolean;

};
```

#### CartesianCurveDescriptor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `f` | `(x: number) => number` | Yes | Sampling callback used during procedural curve/surface generation. |
| `xMin` | `number` | No | Numeric input controlling `xMin` for this operation. |
| `xMax` | `number` | No | Numeric input controlling `xMax` for this operation. |
| `segments` | `number` | No | Subdivision count controlling tessellation density. |
| `radius` | `number` | No | Radius value used by circular/spherical primitives. |
| `radialSegments` | `number` | No | Radial subdivision count for cylindrical/tube geometries. |
| `closed` | `boolean` | No | Boolean flag that toggles `closed` behavior. |
| `plane` | `"xy" \| "xz" \| "yz"` | No | Plane in which 2D procedural geometry is embedded (`xy`, `xz`, or `yz`). |
| `up` | `[number, number, number]` | No | Reference up-direction used when generating tube/ribbon frames. |
| `breakOnInvalid` | `boolean` | No | Boolean flag that toggles `breakOnInvalid` behavior. |

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const descriptor = { f: (x) => Math.sin(x), xMin: -Math.PI, xMax: Math.PI, segments: 128, radius: 0.03 };
const result = wgpu.geometry.cartesianCurve(descriptor);
console.log(result);
```

## See Also
- [WasmGPU.geometry.box](./wasmgpu-geometry-box.md)
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
- [WasmGPU.geometry.prism](./wasmgpu-geometry-prism.md)
