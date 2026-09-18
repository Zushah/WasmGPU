# material.custom#getUniformBufferSize

## Summary
material.custom#getUniformBufferSize returns `0`: custom materials do not receive an automatic material uniform buffer. Declare and bind any custom buffers explicitly in the group-1 layout and resources.

## Syntax
```ts
CustomMaterial.getUniformBufferSize(): number
const result = material.getUniformBufferSize();
```

## Returns
`0`

## See Also
- [material.custom#createBindGroupLayout](./material-custom-createbindgrouplayout.md)
- [material.custom#getShaderCode](./material-custom-getshadercode.md)
- [material.custom#getUniformData](./material-custom-getuniformdata.md)
- [material.custom#getBindGroupEntries](./material-custom-getbindgroupentries.md)
