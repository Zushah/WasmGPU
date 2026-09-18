# compute.kernels.compactF32

## Summary
compute.kernels.compactF32 compacts float values using a `u32` flag buffer.
`flags` must contain only `0` (drop) or `1` (keep) for every selected element. Other flag values are unsupported and can produce invalid output and counts.
The method returns both compacted output and selected-count buffer.
Use this for filtering float datasets before downstream kernels.
`count` defaults from both input buffers, whose selected logical lengths must match. The count buffer is always newly allocated and caller-owned; an omitted output is also caller-owned. With `opts.encoder`, work is recorded without submission.

## Syntax
```ts
WasmGPU.compute.kernels.compactF32(input: StorageBuffer, flags: StorageBuffer, opts?: CompactOptions): CompactResult
const result = wgpu.compute.kernels.compactF32(input, flags, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `input` | `StorageBuffer` | Yes | Source `f32` values to compact. |
| `flags` | `StorageBuffer` | Yes | `u32` keep/discard mask aligned with `input`. |
| `opts` | `CompactOptions` | No | Optional compaction settings (`count`, `out`, encoder/label/validation). |

## Returns
`{ output: StorageBuffer; count: StorageBuffer }` - Compacted float output plus one-scalar selected-count buffer.

## Type Details
```ts
type CompactOptions = {
    encoder?: GPUCommandEncoder;
    label?: string;
    validateLimits?: boolean;
    count?: number;
    out?: StorageBuffer;
};

type CompactResult = {
    output: StorageBuffer;
    count: StorageBuffer;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const input = wgpu.compute.createStorageBuffer({ data: new Float32Array([1.0, 2.0, 3.0, 4.0]), copySrc: true });
const flags = wgpu.compute.createStorageBuffer({ data: new Uint32Array([0, 1, 1, 0]), copySrc: true });
const result = wgpu.compute.kernels.compactF32(input, flags);

console.log(await wgpu.compute.readback.readScalarU32(result.count));
```

## See Also
- [compute.kernels.compactU32](./compute-kernels-compactu32.md)
- [compute.kernels.scanExclusiveU32](./compute-kernels-scanexclusiveu32.md)
- [compute.kernels.copyF32](./compute-kernels-copyf32.md)
- [compute.readback.readScalarU32](./compute-readback-readscalaru32.md)
- [compute.kernels.reduceF32](./compute-kernels-reducef32.md)
