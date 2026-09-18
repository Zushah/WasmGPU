# createSplatField#getUniformData

## Summary

`createSplatField#getUniformData()` returns a new four-float payload: clamped opacity scale, an sRGB-decode flag, an SH-enabled flag, and SH degree. The decode flag covers external/Wasm direct colors and sRGB spherical-harmonic output; CPU direct colors are converted to linear while packing and therefore do not set it.

## Syntax

```ts
SplatField.getUniformData(): Float32Array
```

## Returns

`Float32Array` - A newly allocated four-float uniform payload.

## See Also

- [createSplatField#getUniformBufferSize](./createsplatfield-getuniformbuffersize.md)
- [createSplatField#dirtyUniforms](./createsplatfield-dirtyuniforms.md)
