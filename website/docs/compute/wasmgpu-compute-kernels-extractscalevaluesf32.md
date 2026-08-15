# WasmGPU.compute.kernels.extractScaleValuesF32

## Summary
WasmGPU.compute.kernels.extractScaleValuesF32 extracts scalar values and finite-value flags from packed float sources.
It supports component-based or magnitude-based extraction with configurable vector stride/offset.
The output contains two buffers: extracted values (`f32`) and validity flags (`u32`).
Use this as a preprocessing stage for scale-domain estimation and histogram/remap pipelines.

## Syntax
```ts
WasmGPU.compute.kernels.extractScaleValuesF32(src: BufferResource, opts: ScaleExtractOptions): ScaleExtractResult
const result = wgpu.compute.kernels.extractScaleValuesF32(src, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `src` | `BufferResource` | Yes | Source buffer containing float attributes. |
| `opts` | `ScaleExtractOptions` | Yes | Extraction config including `count` and optional component/stride/value-mode settings. |

## Returns
`ScaleExtractResult` - Object containing `values` and `flags` storage buffers.

## Type Details
```ts
type BufferResource = GPUBuffer | StorageBuffer | UniformBuffer;

type ScaleExtractOptions = {
    encoder?: GPUCommandEncoder;
    label?: string;
    validateLimits?: boolean;
    count: number;
    componentCount?: number;
    componentIndex?: number;
    valueMode?: "component" | "magnitude";
    stride?: number;
    offset?: number;
    values?: StorageBuffer;
    flags?: StorageBuffer;
};

type ScaleExtractResult = {
    values: StorageBuffer;
    flags: StorageBuffer;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const packed = wgpu.compute.createStorageBuffer({ data: new Float32Array([1, 2, 3, 4, 5, 6]), copySrc: true });
const result = wgpu.compute.kernels.extractScaleValuesF32(packed, {
    count: 2,
    componentCount: 3,
    componentIndex: 0,
    stride: 3,
    valueMode: "magnitude"
});

console.log(await wgpu.compute.readback.readF32(result.values, 0, 2));
```

## See Also
- [WasmGPU.compute.kernels.histogramF32](./wasmgpu-compute-kernels-histogramf32.md)
- [WasmGPU.compute.kernels.remapScaleF32](./wasmgpu-compute-kernels-remapscalef32.md)
- [WasmGPU.compute.kernels.copyF32](./wasmgpu-compute-kernels-copyf32.md)
- [WasmGPU.compute.readback.readF32](./wasmgpu-compute-readback-readf32.md)
- [WasmGPU.compute.kernels.reduceF32](./wasmgpu-compute-kernels-reducef32.md)
