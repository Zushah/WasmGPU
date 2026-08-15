# WasmGPU.compute.createStorageBuffer(...).canReadback

## Summary
WasmGPU.compute.createStorageBuffer(...).canReadback reports whether a storage buffer can be copied back to CPU memory.
This is `true` only when the buffer usage includes `GPUBufferUsage.COPY_SRC`.
For buffers created through WasmGPU, that typically means `copySrc: true` in the descriptor.
Use this as a quick guard before calling `read` or `readAs`.

## Syntax
```ts
WasmGPU.compute.createStorageBuffer(...).canReadback: boolean
const ok = storage.canReadback;
```

## Parameters
This API does not take parameters.

## Returns
`boolean` - `true` when readback is supported for this storage buffer.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const readable = wgpu.compute.createStorageBuffer({ data: new Float32Array(16), copySrc: true });
const writeOnly = wgpu.compute.createStorageBuffer({ data: new Float32Array(16), copySrc: false });

console.log(readable.canReadback, writeOnly.canReadback);
```

## See Also
- [WasmGPU.compute.createStorageBuffer](./wasmgpu-compute-createstoragebuffer.md)
- [WasmGPU.compute.createStorageBuffer(...).read](./wasmgpu-compute-createstoragebuffer-read.md)
- [WasmGPU.compute.createStorageBuffer(...).readAs](./wasmgpu-compute-createstoragebuffer-readas.md)
- [WasmGPU.compute.readback.read](./wasmgpu-compute-readback-read.md)
- [WasmGPU.compute.createReadbackRing](./wasmgpu-compute-createreadbackring.md)
