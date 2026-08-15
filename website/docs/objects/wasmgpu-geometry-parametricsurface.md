# WasmGPU.geometry.parametricSurface

## Summary
WasmGPU.geometry.parametricSurface builds geometry data for a primitive or procedural shape. The returned Geometry can be reused by multiple meshes.

## Syntax
```ts
WasmGPU.geometry.parametricSurface(descriptor: ParametricSurfaceDescriptor): Geometry
const result = wgpu.geometry.parametricSurface(descriptor);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `descriptor` | `ParametricSurfaceDescriptor` | Yes | Descriptor object that defines the initial configuration for this runtime object. |

## Returns
`Geometry` - Generated Geometry object containing vertex/index data and computed bounds.

## Type Details
### ParametricSurfaceDescriptor

```ts
type ParametricSurfaceDescriptor = {

    f: (u: number, v: number) => [number, number, number];

    uMin?: number;

    uMax?: number;

    vMin?: number;

    vMax?: number;

    uSegments?: number;

    vSegments?: number;

    plane?: "xy" | "xz" | "yz";

    skipInvalid?: boolean;

    doubleSided?: boolean;

};
```

#### ParametricSurfaceDescriptor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `f` | `(u: number, v: number) => [number, number, number]` | Yes | Sampling callback used during procedural curve/surface generation. |
| `uMin` | `number` | No | Numeric input controlling `uMin` for this operation. |
| `uMax` | `number` | No | Numeric input controlling `uMax` for this operation. |
| `vMin` | `number` | No | Numeric input controlling `vMin` for this operation. |
| `vMax` | `number` | No | Numeric input controlling `vMax` for this operation. |
| `uSegments` | `number` | No | Numeric input controlling `uSegments` for this operation. |
| `vSegments` | `number` | No | Numeric input controlling `vSegments` for this operation. |
| `plane` | `"xy" \| "xz" \| "yz"` | No | Plane in which 2D procedural geometry is embedded (`xy`, `xz`, or `yz`). |
| `skipInvalid` | `boolean` | No | Boolean flag that toggles `skipInvalid` behavior. |
| `doubleSided` | `boolean` | No | Boolean flag that toggles `doubleSided` behavior. |

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const descriptor = { f: (u, v) => [Math.cos(u * Math.PI * 2), Math.sin(v * Math.PI * 2), 0.25 * Math.sin((u + v) * Math.PI * 2)], uMin: 0, uMax: 1, vMin: 0, vMax: 1, uSegments: 64, vSegments: 64 };
const result = wgpu.geometry.parametricSurface(descriptor);
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
- [WasmGPU.geometry.plane](./wasmgpu-geometry-plane.md)
- [WasmGPU.geometry.point](./wasmgpu-geometry-point.md)
- [WasmGPU.geometry.prism](./wasmgpu-geometry-prism.md)
