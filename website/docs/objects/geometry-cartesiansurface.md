# geometry.cartesianSurface

## Summary
geometry.cartesianSurface samples a height function over a rectangular grid and computes indexed triangles, normals, and UVs. It defaults to `[-1, 1]` on both inputs, `128 × 128` cells, and the XZ plane; cells touching non-finite samples are skipped by default.

## Syntax
```ts
WasmGPU.geometry.cartesianSurface(descriptor: CartesianSurfaceDescriptor): Geometry
const result = wgpu.geometry.cartesianSurface(descriptor);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `descriptor` | `CartesianSurfaceDescriptor` | Yes | Height function, sampled X/Z ranges, grid resolution, coordinate plane, sidedness, and invalid-cell policy. |

## Returns
`Geometry` - Indexed sampled surface with computed normals, UVs, and bounds.

## Type Details
### CartesianSurfaceDescriptor

```ts
type CartesianSurfaceDescriptor = {

    f: (x: number, z: number) => number;

    xMin?: number;

    xMax?: number;

    zMin?: number;

    zMax?: number;

    xSegments?: number;

    zSegments?: number;

    plane?: "xy" | "xz" | "yz";

    skipInvalid?: boolean;

    doubleSided?: boolean;

};
```

#### CartesianSurfaceDescriptor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `f` | `(x: number, z: number) => number` | Yes | Sampling callback used during procedural curve/surface generation. |
| `xMin` | `number` | No | Lower bound of the sampled X interval. |
| `xMax` | `number` | No | Upper bound of the sampled X interval. |
| `zMin` | `number` | No | Lower bound of the sampled Z interval. |
| `zMax` | `number` | No | Upper bound of the sampled Z interval. |
| `xSegments` | `number` | No | Number of subdivisions along X. |
| `zSegments` | `number` | No | Number of subdivisions along Z. |
| `plane` | `"xy" \| "xz" \| "yz"` | No | Plane in which 2D procedural geometry is embedded (`xy`, `xz`, or `yz`). |
| `skipInvalid` | `boolean` | No | Whether cells touching non-finite callback results are omitted. |
| `doubleSided` | `boolean` | No | Whether indices are emitted for both winding directions. |

## See Also
- [geometry.box](./geometry-box.md)
- [geometry.cartesianCurve](./geometry-cartesiancurve.md)
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
