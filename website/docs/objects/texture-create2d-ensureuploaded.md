# texture.create2D#ensureUploaded

## Summary
texture.create2D#ensureUploaded starts the lazy asynchronous decode and GPU upload once. The call returns immediately; materials use fallback resources until upload completes.

## Syntax
```ts
Texture2D.ensureUploaded(device: GPUDevice, queue: GPUQueue, colorSpace: TextureColorSpace = "linear"): void
texture.ensureUploaded(device, queue, colorSpace);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `device` | `GPUDevice` | Yes | Device that owns the uploaded texture. The first call fixes the device for this upload. |
| `queue` | `GPUQueue` | Yes | Queue used to copy decoded pixels and generate mipmaps. |
| `colorSpace` | `TextureColorSpace` | No | Upload interpretation; default `"linear"`. The first upload request fixes the texture's mipmap color space. |

## Returns
`void` - No return value. A terminal asynchronous failure is exposed through `uploadError` and thrown by later upload/view requests.

## Type Details
### TextureColorSpace

```ts
type TextureColorSpace = "srgb" | "linear";
```

## See Also
- [texture.create2D#destroy](./texture-create2d-destroy.md)
- [texture.create2D#getSampler](./texture-create2d-getsampler.md)
- [texture.create2D#getView](./texture-create2d-getview.md)
- [texture.create2D#height](./texture-create2d-height.md)
- [texture.create2D#revision](./texture-create2d-revision.md)
- [texture.create2D#uploaded](./texture-create2d-uploaded.md)
- [texture.create2D#width](./texture-create2d-width.md)
- [texture.create2D#uploadError](./texture-create2d-uploaderror.md)
