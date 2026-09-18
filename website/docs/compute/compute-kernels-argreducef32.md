# compute.kernels.argReduceF32

## Summary
compute.kernels.argReduceF32 computes `argmin` or `argmax` over an `f32` input buffer.
The output is an 8-byte pair: value bits (`u32`) and index (`u32`).
Use `argminF32` and `argmaxF32` for convenience wrappers.
This is useful for peak detection and index-of-extremum queries.
Ties choose the lowest index, and NaNs are ignored. Non-empty selections must contain at least one finite value; all-NaN and infinity-only extrema are unsupported and need not return an input index. An empty argmin returns positive infinity with index `0xffffffff`, while an empty argmax returns negative infinity with that index.

## Syntax
```ts
WasmGPU.compute.kernels.argReduceF32(input: StorageBuffer, op: ArgReduceOp, opts?: ArgReduceOptions): StorageBuffer
const out = wgpu.compute.kernels.argReduceF32(input, op, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `input` | `StorageBuffer` | Yes | Source float buffer. |
| `op` | `ArgReduceOp` | Yes | Operation mode: `"argmin"` or `"argmax"`. |
| `opts` | `ArgReduceOptions` | No | Optional execution settings (`count`, `out`, encoder/label/validation). |

## Returns
`StorageBuffer` - 8-byte result buffer containing the f32 value in bytes 0–3 and its u32 index in bytes 4–7. A new result enables readback; a supplied `out` needs at least 8 bytes. `opts.count` defaults to full input capacity, and `opts.encoder` records non-empty work without submitting it.

## Type Details
```ts
type ArgReduceOp = "argmin" | "argmax";

type ArgReduceOptions = {
    encoder?: GPUCommandEncoder;
    label?: string;
    validateLimits?: boolean;
    count?: number;
    out?: StorageBuffer;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const input = wgpu.compute.createStorageBuffer({ data: new Float32Array([3, 9, 1, 8]), copySrc: true });
const out = wgpu.compute.kernels.argReduceF32(input, "argmax");
const bytes = await wgpu.compute.readback.read(out, 0, 8);
const view = new DataView(bytes);
console.log("value=", view.getFloat32(0, true), "index=", view.getUint32(4, true));
```

## See Also
- [compute.kernels.argmaxF32](./compute-kernels-argmaxf32.md)
- [compute.kernels.argminF32](./compute-kernels-argminf32.md)
- [compute.kernels.reduceF32](./compute-kernels-reducef32.md)
- [compute.readback.readU32](./compute-readback-readu32.md)
- [compute.kernels.maxF32](./compute-kernels-maxf32.md)
