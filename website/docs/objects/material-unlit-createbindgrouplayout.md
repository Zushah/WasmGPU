# material.unlit#createBindGroupLayout

## Summary
material.unlit#createBindGroupLayout returns the layout for a fragment uniform buffer, filtering sampler, and sampled 2D base-color texture.

## Syntax
```ts
UnlitMaterial.createBindGroupLayout(device: GPUDevice): GPUBindGroupLayout
const result = material.createBindGroupLayout(device);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `device` | `GPUDevice` | Yes | Device on which to create the layout. |

## Returns
`GPUBindGroupLayout` - GPU bind-group layout describing required shader bindings for this object.

## See Also
- [material.unlit#baseColorTexture](./material-unlit-basecolortexture.md)
- [material.unlit#getShaderCode](./material-unlit-getshadercode.md)
- [material.unlit#getUniformData](./material-unlit-getuniformdata.md)
