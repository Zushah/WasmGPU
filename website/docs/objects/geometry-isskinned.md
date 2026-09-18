# geometry#isSkinned

## Summary
geometry#isSkinned is `true` when both first-set joint and weight GPU buffers currently exist. It reflects uploaded buffers rather than merely the presence of CPU or Wasm skin attributes.

## Syntax
```ts
Geometry.isSkinned: boolean
const value = geometry.isSkinned;
```

## Returns
`true` when the uploaded primary joint and weight buffers both exist; otherwise `false`.

## See Also
- [geometry#isIndexed](./geometry-isindexed.md)
- [geometry#isSkinned8](./geometry-isskinned8.md)
- [geometry#jointsBuffer](./geometry-jointsbuffer.md)
- [geometry#weightsBuffer](./geometry-weightsbuffer.md)
- [geometry#upload](./geometry-upload.md)
