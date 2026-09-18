# WasmGPU.texture

## Summary
WasmGPU.texture is the texture factory facade. It creates asynchronous 2D texture objects from encoded bytes, URLs, or pre-decoded `ImageBitmap` sources; returned textures expose upload state, views, samplers, and explicit destruction.

## Syntax
```ts
const texture = wgpu.texture.create2D({
    source: { kind: "bitmap", bitmap: imageBitmap }
});
```

## Available APIs
- [texture.create2D](./texture-create2d.md) creates a `Texture2D` from its descriptor.
- [texture.create2D#ensureUploaded](./texture-create2d-ensureuploaded.md) awaits upload completion.
- [texture.create2D#getView](./texture-create2d-getview.md) and [texture.create2D#getSampler](./texture-create2d-getsampler.md) expose GPU binding resources.
- [texture.create2D#destroy](./texture-create2d-destroy.md) releases texture-owned GPU resources.

## See Also
- [WasmGPU.material](./wasmgpu-material.md)
- [material.standard#baseColorTexture](./material-standard-basecolortexture.md)
