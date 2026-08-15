# SplatField.getUniformData

## Summary

`SplatField.getUniformData()` packs opacity scale, color decoding, SH activation, and SH degree for renderer upload.

## Syntax

```ts
SplatField.getUniformData(): Float32Array
```

## Returns

`Float32Array` - A newly allocated four-float uniform payload.

## See Also

- [SplatField.getUniformBufferSize](./splatfield-getuniformbuffersize.md)
- [SplatField.dirtyUniforms](./splatfield-dirtyuniforms.md)
