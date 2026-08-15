# Texture2D.ensureUploaded

## Summary
Texture2D.ensureUploaded operates on a Texture2D runtime object to update state, query data, or manage lifecycle.

## Syntax
```ts
Texture2D.ensureUploaded(device: GPUDevice, queue: GPUQueue, colorSpace: TextureColorSpace = "linear"): void
texture.ensureUploaded(device, queue, colorSpace);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `device` | `GPUDevice` | Yes | GPUDevice used to allocate pipelines, buffers, layouts, or textures. |
| `queue` | `GPUQueue` | Yes | GPUQueue used for data uploads and command submissions. |
| `colorSpace` | `TextureColorSpace = "linear"` | Yes | Color-space mode used by this conversion or lookup. |

## Returns
`void` - No return value. The call applies side effects to runtime state and/or GPU resources.

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
texture.ensureUploaded(device, queue, colorSpace);
console.log("updated");
```

## See Also
- [Texture2D.destroy](./texture2d-destroy.md)
- [Texture2D.getSampler](./texture2d-getsampler.md)
- [Texture2D.getView](./texture2d-getview.md)
- [Texture2D.height](./texture2d-height.md)
- [Texture2D.revision](./texture2d-revision.md)
- [Texture2D.uploaded](./texture2d-uploaded.md)
- [Texture2D.width](./texture2d-width.md)
