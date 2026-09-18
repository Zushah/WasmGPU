# texture.create2D#getView

## Summary
texture.create2D#getView returns the uploaded linear or sRGB view. Before upload completes it starts the asynchronous upload and returns `fallbackView`; a recorded terminal upload error is thrown on the next call. If the requested view is unexpectedly unavailable after upload, the fallback is returned.

## Syntax
```ts
Texture2D.getView(device: GPUDevice, queue: GPUQueue, colorSpace: TextureColorSpace, fallbackView: GPUTextureView): GPUTextureView
const result = texture.getView(device, queue, colorSpace, fallbackView);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `device` | `GPUDevice` | Yes | Device on which to begin the texture upload when needed. |
| `queue` | `GPUQueue` | Yes | Queue used for that asynchronous upload. |
| `colorSpace` | `TextureColorSpace` | Yes | Selects the linear or sRGB texture view. |
| `fallbackView` | `GPUTextureView` | Yes | Fallback texture view returned while asynchronous upload is pending. |

## Returns
`GPUTextureView` - Uploaded texture view, or `fallbackView` while upload is pending or when that format view is unavailable. Terminal upload errors throw instead of returning the fallback.

## Type Details
### TextureColorSpace

```ts
type TextureColorSpace = "srgb" | "linear";
```

## See Also
- [texture.create2D#ensureUploaded](./texture-create2d-ensureuploaded.md)
- [texture.create2D#uploaded](./texture-create2d-uploaded.md)
- [texture.create2D#uploadError](./texture-create2d-uploaderror.md)
