# material.unlit#getUniformBufferSize

## Summary
material.unlit#getUniformBufferSize returns `64` bytes for the 16-float base color, opacity, alpha cutoff, and texture-transform block.

## Syntax
```ts
UnlitMaterial.getUniformBufferSize(): number
const result = material.getUniformBufferSize();
```

## Returns
`number` - Always `64`.

## See Also
- [material.unlit#createBindGroupLayout](./material-unlit-createbindgrouplayout.md)
- [material.unlit#getUniformData](./material-unlit-getuniformdata.md)
