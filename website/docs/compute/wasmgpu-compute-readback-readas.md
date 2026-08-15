# WasmGPU.compute.readback.readAs

## Summary
WasmGPU.compute.readback.readAs reads bytes from a GPU source and decodes them as a typed array.
It is a typed convenience wrapper over `read`.
Use this when the source holds homogeneous scalar elements and you want typed output directly.
Byte length must be divisible by `ctor.BYTES_PER_ELEMENT`.

## Syntax
```ts
WasmGPU.compute.readback.readAs<T extends ArrayBufferView<ArrayBuffer>>(ctor: TypedArrayConstructor<T>, src: ReadbackSource, srcOffsetBytes?: number, sizeBytes?: number, opts?: { label?: string }): Promise<T>
const out = await wgpu.compute.readback.readAs(Float32Array, src, srcOffsetBytes, sizeBytes, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `ctor` | `TypedArrayConstructor<T>` | Yes | Typed-array constructor to interpret returned bytes. |
| `src` | `ReadbackSource` | Yes | Source GPU buffer to read from. |
| `srcOffsetBytes` | `number` | No | Byte offset in source buffer. |
| `sizeBytes` | `number` | No | Byte count to decode; defaults to remaining readable bytes. |
| `opts` | `{ label?: string }` | No | Optional debug label for copy instrumentation. |

## Returns
`Promise<T>` - Resolves to typed data backed by CPU memory.

## Type Details
```ts
interface TypedArrayConstructor<T extends ArrayBufferView<ArrayBuffer>> {
    readonly BYTES_PER_ELEMENT: number;
    new(buffer: ArrayBuffer, byteOffset?: number, length?: number): T;
}

type ReadbackSource = GPUBuffer | StorageBuffer;
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const storage = wgpu.compute.createStorageBuffer({ data: new Float32Array([0.25, 0.5, 0.75]), copySrc: true });
const out = await wgpu.compute.readback.readAs(Float32Array, storage);

console.log(Array.from(out));
```

## See Also
- [WasmGPU.compute.readback.read](./wasmgpu-compute-readback-read.md)
- [WasmGPU.compute.readback.readF32](./wasmgpu-compute-readback-readf32.md)
- [WasmGPU.compute.readback.readU32](./wasmgpu-compute-readback-readu32.md)
- [WasmGPU.compute.readback.readScalarF32](./wasmgpu-compute-readback-readscalarf32.md)
- [WasmGPU.compute.readback.readScalarU32](./wasmgpu-compute-readback-readscalaru32.md)
