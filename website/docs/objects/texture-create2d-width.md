# texture.create2D#width

## Summary
texture.create2D#width is the decoded image width in pixels. It remains `0` until the asynchronous upload succeeds and is retained across `destroy()` calls.

## Syntax
```ts
Texture2D.width: number
const value = texture.width;
```

## Returns
`number` - Decoded pixel width, or `0` before upload succeeds.

## See Also
- [texture.create2D#ensureUploaded](./texture-create2d-ensureuploaded.md)
- [texture.create2D#height](./texture-create2d-height.md)
- [texture.create2D#uploaded](./texture-create2d-uploaded.md)
