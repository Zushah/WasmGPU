# WasmGPU.compute.dispatch3D

## Summary
WasmGPU.compute.dispatch3D dispatches a 3D workload using logical volume dimensions and kernel workgroup dimensions.
It computes dispatch counts with `workgroups3D` and then runs `dispatch`.
Use this for volumetric data, voxel processing, and 3D tensor kernels.
Options control submission and device-limit validation.

## Syntax
```ts
WasmGPU.compute.dispatch3D(pipeline: GPUComputePipeline | ComputePipeline, bindGroups: ReadonlyArray<GPUBindGroup | null | undefined>, width: number, height: number, depth: number, workgroupSizeX: number, workgroupSizeY: number, workgroupSizeZ: number, label?: string, opts?: ComputeDispatchOptions): GPUCommandBuffer
const commandBuffer = wgpu.compute.dispatch3D(pipeline, bindGroups, width, height, depth, workgroupSizeX, workgroupSizeY, workgroupSizeZ, label, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `pipeline` | `GPUComputePipeline \| ComputePipeline` | Yes | Compute pipeline used for dispatch. |
| `bindGroups` | `ReadonlyArray<GPUBindGroup \| null \| undefined>` | Yes | Bind groups in pipeline layout order. |
| `width` | `number` | Yes | Logical X extent. |
| `height` | `number` | Yes | Logical Y extent. |
| `depth` | `number` | Yes | Logical Z extent. |
| `workgroupSizeX` | `number` | Yes | Kernel workgroup X dimension. |
| `workgroupSizeY` | `number` | Yes | Kernel workgroup Y dimension. |
| `workgroupSizeZ` | `number` | Yes | Kernel workgroup Z dimension. |
| `label` | `string` | No | Optional debug label. |
| `opts` | `ComputeDispatchOptions` | No | Dispatch behavior flags (`submit`, `validateLimits`). |

## Returns
`GPUCommandBuffer` - Encoded command buffer for the dispatch.

## Type Details
```ts
type ComputeDispatchOptions = {
    submit?: boolean;
    validateLimits?: boolean;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const nx = 64, ny = 32, nz = 16;
const storage = wgpu.compute.createStorageBuffer({ byteLength: nx * ny * nz * 4, copySrc: true });
const pipeline = wgpu.compute.createPipeline({
    code: `@group(0) @binding(0) var<storage, read_write> vol: array<f32>; @compute @workgroup_size(8, 4, 4) fn main(@builtin(global_invocation_id) gid: vec3<u32>) { if (gid.x < ${nx}u && gid.y < ${ny}u && gid.z < ${nz}u) { let i = (gid.z * ${ny}u + gid.y) * ${nx}u + gid.x; vol[i] = f32(i); } }`,
    bindGroups: [{ entries: [{ binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }] }]
});
const bindGroup = pipeline.createBindGroup(0, { 0: storage });

wgpu.compute.dispatch3D(pipeline, [bindGroup], nx, ny, nz, 8, 4, 4, "fill-volume", { submit: true, validateLimits: true });
```

## See Also
- [WasmGPU.compute.dispatch](./wasmgpu-compute-dispatch.md)
- [WasmGPU.compute.dispatch1D](./wasmgpu-compute-dispatch1d.md)
- [WasmGPU.compute.dispatch2D](./wasmgpu-compute-dispatch2d.md)
- [WasmGPU.compute.workgroups3D](./wasmgpu-compute-workgroups3d.md)
- [WasmGPU.compute.encodeDispatch](./wasmgpu-compute-encodedispatch.md)
