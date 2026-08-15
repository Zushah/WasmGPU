# WasmGPU.compute.createStorageBuffer(...).readAs

## Summary
WasmGPU.compute.createStorageBuffer(...).readAs reads buffer data and interprets it as a typed array.
It is a typed convenience wrapper over `read`.
Use this when the buffer stores homogeneous scalar elements (for example `Float32Array` or `Uint32Array`).
The returned array owns its own CPU memory and is safe after GPU commands complete.

## Syntax
```ts
WasmGPU.compute.createStorageBuffer(...).readAs<T extends ArrayBufferView<ArrayBuffer>>(ctor: TypedArrayConstructor<T>, srcOffsetBytes?: number, sizeBytes?: number): Promise<T>
const out = await storage.readAs(Float32Array, srcOffsetBytes, sizeBytes);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `ctor` | `TypedArrayConstructor<T>` | Yes | Typed-array constructor used to decode bytes (for example `Float32Array`). |
| `srcOffsetBytes` | `number` | No | Byte offset where readback starts. |
| `sizeBytes` | `number` | No | Byte count to decode; defaults to the remaining readable range. |

## Returns
`Promise<T>` - Resolves to a typed array view over a fresh CPU buffer.

## Type Details
```ts
interface TypedArrayConstructor<T extends ArrayBufferView<ArrayBuffer>> {
    readonly BYTES_PER_ELEMENT: number;
    new(buffer: ArrayBuffer, byteOffset?: number, length?: number): T;
}
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const storage = wgpu.compute.createStorageBuffer({
    data: new Float32Array([1.5, 2.5, 3.5, 4.5]),
    copySrc: true
});

const out = await storage.readAs(Float32Array);
console.log(Array.from(out));
```

## See Also
- [WasmGPU.compute.createStorageBuffer(...).read](./wasmgpu-compute-createstoragebuffer-read.md)
- [WasmGPU.compute.createStorageBuffer(...).canReadback](./wasmgpu-compute-createstoragebuffer-canreadback.md)
- [WasmGPU.compute.readback.readAs](./wasmgpu-compute-readback-readas.md)
- [WasmGPU.compute.readback.readF32](./wasmgpu-compute-readback-readf32.md)
- [WasmGPU.compute.readback.readU32](./wasmgpu-compute-readback-readu32.md)
