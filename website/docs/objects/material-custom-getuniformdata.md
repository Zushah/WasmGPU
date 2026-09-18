# material.custom#getUniformData

## Summary
material.custom#getUniformData returns a new empty `Float32Array` because custom materials do not use the built-in material-uniform path. The call throws after final material release.

## Syntax
```ts
CustomMaterial.getUniformData(): Float32Array
const result = material.getUniformData();
```

## Returns
A new zero-length `Float32Array`.

## See Also
- [material.custom#createBindGroupLayout](./material-custom-createbindgrouplayout.md)
- [material.custom#getShaderCode](./material-custom-getshadercode.md)
- [material.custom#getUniformBufferSize](./material-custom-getuniformbuffersize.md)
- [material.custom#getBindGroupEntries](./material-custom-getbindgroupentries.md)
