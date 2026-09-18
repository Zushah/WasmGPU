# compute.kernels.remapScaleF32

## Summary
compute.kernels.remapScaleF32 remaps float values into normalized scale space using a scale transform.
It applies mode/clamp/gamma/invert settings defined by `transform`.
Output is an `f32` storage buffer with one remapped value per processed element.
Use this for GPU-side normalization before colormapping or threshold visualization.
The transform is normalized before use, and results are clamped to `[0, 1]`; non-finite inputs map to `0`. `count` defaults to full input capacity. This method rejects `opts.encoder` and submits its own work. An omitted output is caller-owned and readback-capable; a supplied output must be distinct from the input and have at least `count * 4` bytes.

## Syntax
```ts
WasmGPU.compute.kernels.remapScaleF32(input: StorageBuffer, opts: ScaleRemapOptions): StorageBuffer
const out = wgpu.compute.kernels.remapScaleF32(input, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `input` | `StorageBuffer` | Yes | Source `f32` values to remap. |
| `opts` | `ScaleRemapOptions` | Yes | Remap config including required `transform` plus optional `count`/`out` and dispatch options. |

## Returns
`StorageBuffer` - Output buffer containing remapped `f32` values.

## Type Details
```ts
type ScaleRemapOptions = {
    encoder?: GPUCommandEncoder;
    label?: string;
    validateLimits?: boolean;
    count?: number;
    out?: StorageBuffer;
    transform: {
        mode: "linear" | "log" | "symlog";
        clampMode: "none" | "range" | "percentile";
        valueMode: "component" | "magnitude";
        componentCount: number;
        componentIndex: number;
        stride: number;
        offset: number;
        domainMin: number;
        domainMax: number;
        clampMin: number;
        clampMax: number;
        percentileLow: number;
        percentileHigh: number;
        logBase: number;
        symlogLinThresh: number;
        gamma: number;
        invert: boolean;
    };
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const input = wgpu.compute.createStorageBuffer({ data: new Float32Array([0, 5, 10]), copySrc: true });
const out = wgpu.compute.kernels.remapScaleF32(input, {
    transform: {
        mode: "linear", clampMode: "none", valueMode: "component",
        componentCount: 1, componentIndex: 0, stride: 1, offset: 0,
        domainMin: 0, domainMax: 10, clampMin: 0, clampMax: 10,
        percentileLow: 2, percentileHigh: 98, logBase: 10,
        symlogLinThresh: 1, gamma: 1, invert: false
    }
});

console.log(Array.from(await wgpu.compute.readback.readF32(out)));
```

## See Also
- [compute.kernels.extractScaleValuesF32](./compute-kernels-extractscalevaluesf32.md)
- [compute.kernels.histogramF32](./compute-kernels-histogramf32.md)
- [compute.kernels.copyF32](./compute-kernels-copyf32.md)
- [compute.readback.readF32](./compute-readback-readf32.md)
- [compute.kernels.reduceF32](./compute-kernels-reducef32.md)
