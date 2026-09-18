# geometry.parametricCurve

## Summary
geometry.parametricCurve samples a 2D or 3D function and generates an indexed tube. It defaults to `t ∈ [0, 1]`, 256 segments, radius `0.01`, and 8 radial segments; non-finite samples split the tube by default.

## Syntax
```ts
WasmGPU.geometry.parametricCurve(descriptor: ParametricCurveDescriptor): Geometry
const result = wgpu.geometry.parametricCurve(descriptor);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `descriptor` | `ParametricCurveDescriptor` | Yes | 2D/3D sampling function, parameter interval, tube tessellation, orientation, closure, and invalid-sample policy. |

## Returns
`Geometry` - Indexed tube geometry for the finite sampled curve runs.

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
| `tMin` | `number` | No | First sampled parameter value. |
| `tMax` | `number` | No | Last sampled parameter value. |
| `segments` | `number` | No | Subdivision count controlling tessellation density. |
| `radius` | `number` | No | Radius value used by circular/spherical primitives. |
| `radialSegments` | `number` | No | Radial subdivision count for cylindrical/tube geometries. |
| `closed` | `boolean` | No | Whether to connect the final sample back to the first. |
| `plane` | `"xy" \| "xz" \| "yz"` | No | Plane in which 2D procedural geometry is embedded (`xy`, `xz`, or `yz`). |
| `up` | `[number, number, number]` | No | Reference up-direction used when generating tube/ribbon frames. |
| `breakOnInvalid` | `boolean` | No | Whether non-finite callback results split the curve into separate runs. |

## See Also
- [geometry.box](./geometry-box.md)
- [geometry.cartesianCurve](./geometry-cartesiancurve.md)
- [geometry.cartesianSurface](./geometry-cartesiansurface.md)
- [geometry.circle](./geometry-circle.md)
- [geometry.custom](./geometry-custom.md)
- [geometry.cylinder](./geometry-cylinder.md)
- [geometry.ellipse](./geometry-ellipse.md)
- [geometry.line](./geometry-line.md)
- [geometry.parametricSurface](./geometry-parametricsurface.md)
- [geometry.plane](./geometry-plane.md)
- [geometry.point](./geometry-point.md)
- [geometry.prism](./geometry-prism.md)
