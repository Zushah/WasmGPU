# Texture2D.ensureUploaded

## Summary
Texture2D.ensureUploaded starts the lazy asynchronous decode and GPU upload once. The call returns immediately; materials use fallback resources until upload completes.

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
| `colorSpace` | `TextureColorSpace` | No | Upload interpretation; default `"linear"`. The first upload request fixes the texture's mipmap color space. |

## Returns
`void` - No return value. A terminal asynchronous failure is exposed through `uploadError` and thrown by later upload/view requests.

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
- [Texture2D.uploadError](./texture2d-uploaderror.md)
