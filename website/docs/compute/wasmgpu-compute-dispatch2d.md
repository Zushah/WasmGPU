# WasmGPU.compute.dispatch2D

## Summary
WasmGPU.compute.dispatch2D dispatches a 2D workload using logical width/height and kernel workgroup dimensions.
It calculates workgroup counts with `workgroups2D` and then executes `dispatch`.
Use this for image processing, tiled grids, and matrix-style kernels.
Options allow auto-submit control and explicit limit validation.

## Syntax
```ts
WasmGPU.compute.dispatch2D(pipeline: GPUComputePipeline | ComputePipeline, bindGroups: ReadonlyArray<GPUBindGroup | null | undefined>, width: number, height: number, workgroupSizeX: number, workgroupSizeY: number, label?: string, opts?: ComputeDispatchOptions): GPUCommandBuffer
const commandBuffer = wgpu.compute.dispatch2D(pipeline, bindGroups, width, height, workgroupSizeX, workgroupSizeY, label, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `pipeline` | `GPUComputePipeline \| ComputePipeline` | Yes | Compute pipeline used for dispatch. |
| `bindGroups` | `ReadonlyArray<GPUBindGroup \| null \| undefined>` | Yes | Bind groups in pipeline layout order. |
| `width` | `number` | Yes | Logical width of the workload domain. |
| `height` | `number` | Yes | Logical height of the workload domain. |
| `workgroupSizeX` | `number` | Yes | Kernel workgroup X dimension. |
| `workgroupSizeY` | `number` | Yes | Kernel workgroup Y dimension. |
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

const width = 512;
const height = 512;
const storage = wgpu.compute.createStorageBuffer({ byteLength: width * height * 4, copySrc: true });
const pipeline = wgpu.compute.createPipeline({
    code: `@group(0) @binding(0) var<storage, read_write> img: array<f32>; @compute @workgroup_size(16, 16, 1) fn main(@builtin(global_invocation_id) gid: vec3<u32>) { if (gid.x < ${width}u && gid.y < ${height}u) { let i = gid.y * ${width}u + gid.x; img[i] = f32(i); } }`,
    bindGroups: [{ entries: [{ binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }] }]
});
const bindGroup = pipeline.createBindGroup(0, { 0: storage });

wgpu.compute.dispatch2D(pipeline, [bindGroup], width, height, 16, 16, "fill-image", { submit: true, validateLimits: true });
```

## See Also
- [WasmGPU.compute.dispatch](./wasmgpu-compute-dispatch.md)
- [WasmGPU.compute.dispatch1D](./wasmgpu-compute-dispatch1d.md)
- [WasmGPU.compute.dispatch3D](./wasmgpu-compute-dispatch3d.md)
- [WasmGPU.compute.workgroups2D](./wasmgpu-compute-workgroups2d.md)
- [WasmGPU.compute.encodeDispatch](./wasmgpu-compute-encodedispatch.md)
