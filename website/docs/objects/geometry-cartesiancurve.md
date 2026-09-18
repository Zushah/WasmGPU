# geometry.cartesianCurve

## Summary
geometry.cartesianCurve samples `y = f(x)` and generates an indexed tube along the selected plane. It defaults to `x ∈ [-1, 1]`, 256 segments, radius `0.01`, and 8 radial segments; non-finite samples split the tube by default.

## Syntax
```ts
WasmGPU.geometry.cartesianCurve(descriptor: CartesianCurveDescriptor): Geometry
const result = wgpu.geometry.cartesianCurve(descriptor);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `descriptor` | `CartesianCurveDescriptor` | Yes | Height function, X interval, tube tessellation, orientation, closure, and invalid-sample policy. |

## Returns
`Geometry` - Indexed tube geometry for the finite sampled curve runs.

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
| `xMin` | `number` | No | First sampled X coordinate. |
| `xMax` | `number` | No | Last sampled X coordinate. |
| `segments` | `number` | No | Subdivision count controlling tessellation density. |
| `radius` | `number` | No | Radius value used by circular/spherical primitives. |
| `radialSegments` | `number` | No | Radial subdivision count for cylindrical/tube geometries. |
| `closed` | `boolean` | No | Whether to connect the final sample back to the first. |
| `plane` | `"xy" \| "xz" \| "yz"` | No | Plane in which 2D procedural geometry is embedded (`xy`, `xz`, or `yz`). |
| `up` | `[number, number, number]` | No | Reference up-direction used when generating tube/ribbon frames. |
| `breakOnInvalid` | `boolean` | No | Whether non-finite callback results split the curve into separate runs. |

## See Also
- [geometry.box](./geometry-box.md)
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
- [geometry.prism](./geometry-prism.md)
