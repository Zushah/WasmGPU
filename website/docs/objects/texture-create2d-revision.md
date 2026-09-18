# texture.create2D#revision

## Summary
texture.create2D#revision is a monotonically increasing change counter. It increments after a successful upload and whenever `destroy()` invalidates the current GPU resources; it does not increment merely when an upload starts or fails.

## Syntax
```ts
Texture2D.revision: number
const value = texture.revision;
```

## Returns
`number` - Current monotonically increasing change counter.

## See Also
- [texture.create2D#destroy](./texture-create2d-destroy.md)
- [texture.create2D#ensureUploaded](./texture-create2d-ensureuploaded.md)
- [texture.create2D#uploaded](./texture-create2d-uploaded.md)
