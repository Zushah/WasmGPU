# material.data#getUniformBufferSize

## Summary
material.data#getUniformBufferSize returns `96`, the byte size of the packed 24-float scale-transform, opacity, and shading block.

## Syntax
```ts
DataMaterial.getUniformBufferSize(): number
const result = material.getUniformBufferSize();
```

## Returns
`96`

## See Also
- [material.data#createBindGroupLayout](./material-data-createbindgrouplayout.md)
- [material.data#getUniformData](./material-data-getuniformdata.md)
