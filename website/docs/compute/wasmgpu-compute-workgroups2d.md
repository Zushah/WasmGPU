# WasmGPU.compute.workgroups2D

## Summary
WasmGPU.compute.workgroups2D converts a 2D problem size into dispatch workgroup counts.
It computes X and Y counts by ceiling division with the kernel workgroup sizes.
If width or height is zero, it returns `[0, 1, 1]`.
Use this when building manual dispatch commands for image and grid workloads.

## Syntax
```ts
WasmGPU.compute.workgroups2D(width: number, height: number, workgroupSizeX: number, workgroupSizeY: number): WorkgroupCounts
const workgroups = wgpu.compute.workgroups2D(width, height, workgroupSizeX, workgroupSizeY);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `width` | `number` | Yes | Logical X extent of the 2D workload. |
| `height` | `number` | Yes | Logical Y extent of the 2D workload. |
| `workgroupSizeX` | `number` | Yes | Kernel workgroup size in X dimension. |
| `workgroupSizeY` | `number` | Yes | Kernel workgroup size in Y dimension. |

## Returns
`WorkgroupCounts` - Three-component dispatch counts `[x, y, z]`.

## Type Details
```ts
type WorkgroupCounts = readonly [number, number, number];
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const width = 1920;
const height = 1080;
const workgroups = wgpu.compute.workgroups2D(width, height, 16, 16);

console.log(workgroups);
```

## See Also
- [WasmGPU.compute.workgroups1D](./wasmgpu-compute-workgroups1d.md)
- [WasmGPU.compute.workgroups3D](./wasmgpu-compute-workgroups3d.md)
- [WasmGPU.compute.dispatch2D](./wasmgpu-compute-dispatch2d.md)
- [WasmGPU.compute.dispatch](./wasmgpu-compute-dispatch.md)
- [WasmGPU.compute.encodeDispatch](./wasmgpu-compute-encodedispatch.md)
