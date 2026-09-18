# colormap#getGPUResources

## Summary
colormap#getGPUResources returns the one-dimensional texture view and sampler used for GPU lookup. CPU-backed colormaps return a stable resource pair for each `GPUDevice`; external colormaps return their borrowed view and sampler and require the device used at construction.

## Syntax
```ts
Colormap.getGPUResources(device: GPUDevice, queue: GPUQueue): ColormapGPUResources
const result = colormap.getGPUResources(device, queue);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `device` | `GPUDevice` | Yes | Device that owns or will own the returned texture view and sampler. |
| `queue` | `GPUQueue` | Yes | Queue used to upload a CPU-backed lookup table when first needed. |

## Returns
`ColormapGPUResources` - Texture (or `null` for an external view), view, sampler, width, and filter.

## See Also
- [colormap#filter](./colormap-filter.md)
- [colormap#width](./colormap-width.md)
