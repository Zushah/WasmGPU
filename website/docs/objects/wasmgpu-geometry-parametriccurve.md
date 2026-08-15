# WasmGPU.geometry.parametricCurve

## Summary
WasmGPU.geometry.parametricCurve builds geometry data for a primitive or procedural shape. The returned Geometry can be reused by multiple meshes.

## Syntax
```ts
WasmGPU.geometry.parametricCurve(descriptor: ParametricCurveDescriptor): Geometry
const result = wgpu.geometry.parametricCurve(descriptor);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `descriptor` | `ParametricCurveDescriptor` | Yes | Descriptor object that defines the initial configuration for this runtime object. |

## Returns
`Geometry` - Generated Geometry object containing vertex/index data and computed bounds.

## Type Details
### ParametricCurveDescriptor

```ts
type ParametricCurveDescriptor = {

    f: (t: number) => [number, number] | [number, number, number];

    tMin?: number;

    tMax?: number;

    segments?: number;

    radius?: number;

    radialSegments?: number;

    closed?: boolean;

    plane?: "xy" | "xz" | "yz";

    up?: [number, number, number];

    breakOnInvalid?: boolean;

};
```

#### ParametricCurveDescriptor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `f` | `(t: number) => [number, number] \| [number, number, number]` | Yes | Sampling callback used during procedural curve/surface generation. |
| `tMin` | `number` | No | Numeric input controlling `tMin` for this operation. |
| `tMax` | `number` | No | Numeric input controlling `tMax` for this operation. |
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

const descriptor = { f: (t) => [Math.cos(t), Math.sin(t), 0.2 * t], tMin: 0, tMax: Math.PI * 4, segments: 256, radius: 0.02 };
const result = wgpu.geometry.parametricCurve(descriptor);
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
- [WasmGPU.geometry.parametricSurface](./wasmgpu-geometry-parametricsurface.md)
- [WasmGPU.geometry.plane](./wasmgpu-geometry-plane.md)
- [WasmGPU.geometry.point](./wasmgpu-geometry-point.md)
- [WasmGPU.geometry.prism](./wasmgpu-geometry-prism.md)
