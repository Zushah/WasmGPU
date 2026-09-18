# texture.create2D#height

## Summary
texture.create2D#height is the decoded image height in pixels. It remains `0` until the asynchronous upload succeeds and is retained across `destroy()` calls.

## Syntax
```ts
Texture2D.height: number
const value = texture.height;
```

## Returns
`number` - Decoded pixel height, or `0` before upload succeeds.

## See Also
- [texture.create2D#ensureUploaded](./texture-create2d-ensureuploaded.md)
- [texture.create2D#uploaded](./texture-create2d-uploaded.md)
- [texture.create2D#width](./texture-create2d-width.md)
