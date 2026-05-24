# WasmGPU.texture.create2D

## Summary
WasmGPU.texture.create2D constructs a `Texture2D` wrapper that defers GPU upload until the texture is first used or explicitly uploaded. Use it for manually authored textures and as the runtime texture container that glTF import maps images and sampler state into.

## Syntax
```ts
WasmGPU.texture.create2D(descriptor: Texture2DDescriptor): Texture2D
const result = wgpu.texture.create2D(descriptor);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `descriptor` | `Texture2DDescriptor` | Yes | Descriptor object for the source image, mipmap preference, and sampler behavior. |

## Returns
`Texture2D` - Texture wrapper that owns the upload source, sampler descriptor, and lazily created GPU texture views.

## Type Details
### Texture2DDescriptor

```ts
type Texture2DDescriptor = {
    source: TextureSource;
    mipmaps?: boolean;
    sampler?: TextureSamplerOptions;
};
```

#### Texture2DDescriptor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `source` | `TextureSource` | Yes | Image source. Use URL loading, raw bytes with an optional MIME type, or a prebuilt `ImageBitmap`. |
| `mipmaps` | `boolean` | No | Whether the texture should generate mipmaps after upload. The default is `true`. |
| `sampler` | `TextureSamplerOptions` | No | Sampler state used when materials sample the texture. |

### TextureSource

```ts
type TextureSource =
    | { kind: "bytes"; bytes: ArrayBuffer; mimeType?: string }
    | { kind: "url"; url: string; mimeType?: string }
    | { kind: "bitmap"; bitmap: ImageBitmap };
```

`kind: "bytes"` is useful for in-memory image payloads such as loaded GLB images or fetched binary assets. `kind: "url"` keeps the texture self-contained as a URL-backed source. `kind: "bitmap"` lets you supply a pre-decoded image.

### TextureSamplerOptions

```ts
type TextureSamplerOptions = {
    addressModeU?: GPUAddressMode;
    addressModeV?: GPUAddressMode;
    addressModeW?: GPUAddressMode;
    magFilter?: GPUFilterMode;
    minFilter?: GPUFilterMode;
    mipmapFilter?: GPUMipmapFilterMode;
    lodMinClamp?: number;
    lodMaxClamp?: number;
};
```

#### TextureSamplerOptions Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `addressModeU` | `GPUAddressMode` | No | Horizontal wrap mode. |
| `addressModeV` | `GPUAddressMode` | No | Vertical wrap mode. |
| `addressModeW` | `GPUAddressMode` | No | Third-axis wrap mode for completeness. |
| `magFilter` | `GPUFilterMode` | No | Magnification filter. |
| `minFilter` | `GPUFilterMode` | No | Minification filter. |
| `mipmapFilter` | `GPUMipmapFilterMode` | No | Mipmap selection filter. |
| `lodMinClamp` | `number` | No | Minimum level-of-detail clamp. |
| `lodMaxClamp` | `number` | No | Maximum level-of-detail clamp. |

glTF import creates `Texture2D` instances with sampler settings derived from the glTF sampler block, including wrap modes, magnification/minification filters, and whether mipmapped sampling is expected.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const result = wgpu.texture.create2D({
    source: { kind: "url", url: "./albedo.png" },
    mipmaps: true,
    sampler: {
        addressModeU: "repeat",
        addressModeV: "repeat",
        magFilter: "linear",
        minFilter: "linear",
        mipmapFilter: "linear"
    }
});
```

## See Also
- [WasmGPU.material.standard](./wasmgpu-material-standard.md)
- [WasmGPU.material.unlit](./wasmgpu-material-unlit.md)
- [WasmGPU.gltf.load](./wasmgpu-gltf-load.md)
- [WasmGPU.gltf.import](./wasmgpu-gltf-import.md)
