# Texture2D.getView

## Summary
Texture2D.getView returns the current view value derived from this Texture2D runtime state.

## Syntax
```ts
Texture2D.getView(device: GPUDevice, queue: GPUQueue, colorSpace: TextureColorSpace, fallbackView: GPUTextureView): GPUTextureView
const result = texture.getView(device, queue, colorSpace, fallbackView);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `device` | `GPUDevice` | Yes | GPUDevice used to allocate pipelines, buffers, layouts, or textures. |
| `queue` | `GPUQueue` | Yes | GPUQueue used for data uploads and command submissions. |
| `colorSpace` | `TextureColorSpace` | Yes | Color-space mode used by this conversion or lookup. |
| `fallbackView` | `GPUTextureView` | Yes | Fallback texture view returned while asynchronous upload is pending. |

## Returns
`GPUTextureView` - Result produced by this API call as `GPUTextureView`.

## Type Details
### TextureColorSpace

```ts
type TextureColorSpace = "srgb" | "linear";
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const texture = wgpu.texture.create2D({ source: { kind: "url", url: "./albedo.png" }, mipmaps: true });
const device = wgpu.gpu.device;
const queue = wgpu.gpu.queue;
const colorSpace = "linear";
const fallbackView = someFallbackTextureView;
const result = texture.getView(device, queue, colorSpace, fallbackView);
console.log(result);
```

## See Also
- [Texture2D.destroy](./texture2d-destroy.md)
- [Texture2D.ensureUploaded](./texture2d-ensureuploaded.md)
- [Texture2D.getSampler](./texture2d-getsampler.md)
- [Texture2D.height](./texture2d-height.md)
- [Texture2D.revision](./texture2d-revision.md)
- [Texture2D.uploaded](./texture2d-uploaded.md)
- [Texture2D.width](./texture2d-width.md)
