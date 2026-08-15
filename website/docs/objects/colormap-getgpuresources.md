# Colormap.getGPUResources

## Summary
Colormap.getGPUResources returns the current gpuresources value derived from this Colormap runtime state.

## Syntax
```ts
Colormap.getGPUResources(device: GPUDevice, queue: GPUQueue): ColormapGPUResources
const result = colormap.getGPUResources(device, queue);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `device` | `GPUDevice` | Yes | GPUDevice used to allocate pipelines, buffers, layouts, or textures. |
| `queue` | `GPUQueue` | Yes | GPUQueue used for data uploads and command submissions. |

## Returns
`ColormapGPUResources` - Result produced by this API call as `ColormapGPUResources`.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const colormap = wgpu.colormap.viridis();
const device = wgpu.gpu.device;
const queue = wgpu.gpu.queue;
const result = colormap.getGPUResources(device, queue);
console.log(result);
```

## See Also
- [Colormap.canSampleCPU](./colormap-cansamplecpu.md)
- [Colormap.filter](./colormap-filter.md)
- [Colormap.getRGBA8LinearLUT](./colormap-getrgba8linearlut.md)
- [Colormap.sampleCPU](./colormap-samplecpu.md)
- [Colormap.toUniformStops](./colormap-touniformstops.md)
- [Colormap.width](./colormap-width.md)
