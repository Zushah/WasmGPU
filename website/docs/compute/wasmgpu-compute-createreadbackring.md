# WasmGPU.compute.createReadbackRing

## Summary
WasmGPU.compute.createReadbackRing creates a dedicated staged readback helper for async GPU-to-CPU copies.
A ring uses multiple staging slots so repeated readbacks can overlap more smoothly.
Use this when you need frequent CPU readback of storage-buffer results without repeatedly creating temporary map-read buffers.
Each created ring is independent from `WasmGPU.compute.readback`.

## Syntax
```ts
WasmGPU.compute.createReadbackRing(desc?: ReadbackRingDescriptor): ReadbackRing
const ring = wgpu.compute.createReadbackRing(desc);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `desc` | `ReadbackRingDescriptor` | No | Optional readback ring configuration including slot count and label prefix. |

## Returns
`ReadbackRing` - New readback ring instance.

## Type Details
### ReadbackRingDescriptor
```ts
type ReadbackRingDescriptor = {
    slots?: number;
    labelPrefix?: string;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const ring = wgpu.compute.createReadbackRing({
    slots: 4,
    labelPrefix: "my-readback"
});

console.log(ring);
```

## See Also
- [WasmGPU.compute.readback.read](./wasmgpu-compute-readback-read.md)
- [WasmGPU.compute.readback.readF32](./wasmgpu-compute-readback-readf32.md)
- [WasmGPU.compute.readback.readU32](./wasmgpu-compute-readback-readu32.md)
- [WasmGPU.compute.dispatch](./wasmgpu-compute-dispatch.md)
- [WasmGPU.compute.createStorageBuffer](./wasmgpu-compute-createstoragebuffer.md)
