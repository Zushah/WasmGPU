# compute.createReadbackRing

## Summary
compute.createReadbackRing creates a dedicated staged readback helper for async GPU-to-CPU copies.
A ring uses multiple staging slots so repeated readbacks can overlap more smoothly.
Use this when you need frequent CPU readback of storage-buffer results without repeatedly creating temporary map-read buffers.
Each created ring is independent from `WasmGPU.compute.readback`.
The default configuration uses three staging slots and the label prefix `"WasmGPU:readback"`. A ring created here is caller-owned and is not destroyed by `WasmGPU.compute.destroy()`.

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
- [compute.readback.read](./compute-readback-read.md)
- [compute.readback.readF32](./compute-readback-readf32.md)
- [compute.readback.readU32](./compute-readback-readu32.md)
- [compute.dispatch](./compute-dispatch.md)
- [compute.createStorageBuffer](./compute-createstoragebuffer.md)
