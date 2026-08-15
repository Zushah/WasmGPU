# WasmGPU.geometry.cartesianSurface

## Summary
WasmGPU.geometry.cartesianSurface builds geometry data for a primitive or procedural shape. The returned Geometry can be reused by multiple meshes.

## Syntax
```ts
WasmGPU.geometry.cartesianSurface(descriptor: CartesianSurfaceDescriptor): Geometry
const result = wgpu.geometry.cartesianSurface(descriptor);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `descriptor` | `CartesianSurfaceDescriptor` | Yes | Descriptor object that defines the initial configuration for this runtime object. |

## Returns
`Geometry` - Generated Geometry object containing vertex/index data and computed bounds.

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
| `xMin` | `number` | No | Numeric input controlling `xMin` for this operation. |
| `xMax` | `number` | No | Numeric input controlling `xMax` for this operation. |
| `zMin` | `number` | No | Numeric input controlling `zMin` for this operation. |
| `zMax` | `number` | No | Numeric input controlling `zMax` for this operation. |
| `xSegments` | `number` | No | Numeric input controlling `xSegments` for this operation. |
| `zSegments` | `number` | No | Numeric input controlling `zSegments` for this operation. |
| `plane` | `"xy" \| "xz" \| "yz"` | No | Plane in which 2D procedural geometry is embedded (`xy`, `xz`, or `yz`). |
| `skipInvalid` | `boolean` | No | Boolean flag that toggles `skipInvalid` behavior. |
| `doubleSided` | `boolean` | No | Boolean flag that toggles `doubleSided` behavior. |

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const descriptor = { f: (x, z) => Math.sin(x) * Math.cos(z), xMin: -2, xMax: 2, zMin: -2, zMax: 2, xSegments: 64, zSegments: 64 };
const result = wgpu.geometry.cartesianSurface(descriptor);
console.log(result);
```

## See Also
- [WasmGPU.geometry.box](./wasmgpu-geometry-box.md)
- [WasmGPU.geometry.cartesianCurve](./wasmgpu-geometry-cartesiancurve.md)
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
