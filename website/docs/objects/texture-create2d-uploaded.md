# texture.create2D#uploaded

## Summary
texture.create2D#uploaded is `true` only while a successfully created GPU texture is present. It remains `false` during decode/upload and becomes `false` again after `destroy()`.

## Syntax
```ts
Texture2D.uploaded: boolean
const value = texture.uploaded;
```

## Returns
`boolean` - Whether the GPU texture is currently available.

## See Also
- [texture.create2D#destroy](./texture-create2d-destroy.md)
- [texture.create2D#ensureUploaded](./texture-create2d-ensureuploaded.md)
- [texture.create2D#revision](./texture-create2d-revision.md)
