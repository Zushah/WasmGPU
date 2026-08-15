# WasmGPU.compute.workgroups3D

## Summary
WasmGPU.compute.workgroups3D converts a 3D problem size into dispatch workgroup counts.
Each axis uses ceiling division against the corresponding workgroup size.
If any extent is zero, the function returns `[0, 1, 1]`.
Use this for volume processing, voxel operations, and tensor kernels with explicit 3D indexing.

## Syntax
```ts
WasmGPU.compute.workgroups3D(width: number, height: number, depth: number, workgroupSizeX: number, workgroupSizeY: number, workgroupSizeZ: number): WorkgroupCounts
const workgroups = wgpu.compute.workgroups3D(width, height, depth, workgroupSizeX, workgroupSizeY, workgroupSizeZ);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `width` | `number` | Yes | Logical X extent of the 3D workload. |
| `height` | `number` | Yes | Logical Y extent of the 3D workload. |
| `depth` | `number` | Yes | Logical Z extent of the 3D workload. |
| `workgroupSizeX` | `number` | Yes | Kernel workgroup size in X dimension. |
| `workgroupSizeY` | `number` | Yes | Kernel workgroup size in Y dimension. |
| `workgroupSizeZ` | `number` | Yes | Kernel workgroup size in Z dimension. |

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

const workgroups = wgpu.compute.workgroups3D(128, 64, 32, 8, 8, 4);
console.log(workgroups);
```

## See Also
- [WasmGPU.compute.workgroups1D](./wasmgpu-compute-workgroups1d.md)
- [WasmGPU.compute.workgroups2D](./wasmgpu-compute-workgroups2d.md)
- [WasmGPU.compute.dispatch3D](./wasmgpu-compute-dispatch3d.md)
- [WasmGPU.compute.dispatch](./wasmgpu-compute-dispatch.md)
- [WasmGPU.compute.encodeDispatch](./wasmgpu-compute-encodedispatch.md)
