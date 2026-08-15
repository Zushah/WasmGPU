# WasmGPU.compute.workgroups1D

## Summary
WasmGPU.compute.workgroups1D converts a 1D invocation count into dispatch workgroup counts.
This helper applies ceiling division so all requested invocations are covered.
If `invocations` is `0`, it returns `[0, 1, 1]` to represent an empty dispatch.
Use this for explicit command construction before `dispatch` or `encodeDispatch`.

## Syntax
```ts
WasmGPU.compute.workgroups1D(invocations: number, workgroupSizeX: number): WorkgroupCounts
const workgroups = wgpu.compute.workgroups1D(invocations, workgroupSizeX);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `invocations` | `number` | Yes | Total 1D logical thread count you want to process. |
| `workgroupSizeX` | `number` | Yes | `@workgroup_size` X dimension declared in the WGSL kernel. |

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

const invocations = 100000;
const groupSizeX = 256;
const workgroups = wgpu.compute.workgroups1D(invocations, groupSizeX);

console.log(workgroups);
```

## See Also
- [WasmGPU.compute.workgroups2D](./wasmgpu-compute-workgroups2d.md)
- [WasmGPU.compute.workgroups3D](./wasmgpu-compute-workgroups3d.md)
- [WasmGPU.compute.dispatch1D](./wasmgpu-compute-dispatch1d.md)
- [WasmGPU.compute.dispatch](./wasmgpu-compute-dispatch.md)
- [WasmGPU.compute.encodeDispatch](./wasmgpu-compute-encodedispatch.md)
