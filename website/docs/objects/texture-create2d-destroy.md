# texture.create2D#destroy

## Summary
texture.create2D#destroy releases GPU resources, clears any recorded upload error, and invalidates pending asynchronous upload work. Call it when the object is no longer needed.

## Syntax
```ts
Texture2D.destroy(): void
texture.destroy();
```

## See Also
- [texture.create2D#ensureUploaded](./texture-create2d-ensureuploaded.md)
- [texture.create2D#getSampler](./texture-create2d-getsampler.md)
- [texture.create2D#getView](./texture-create2d-getview.md)
- [texture.create2D#height](./texture-create2d-height.md)
- [texture.create2D#revision](./texture-create2d-revision.md)
- [texture.create2D#uploaded](./texture-create2d-uploaded.md)
- [texture.create2D#width](./texture-create2d-width.md)
- [texture.create2D#uploadError](./texture-create2d-uploaderror.md)
