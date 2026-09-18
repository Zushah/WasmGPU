# material.standard#createBindGroupLayout

## Summary
material.standard#createBindGroupLayout creates a group-1 layout from the material's current texture-feature plan. It validates required sampled-texture and sampler counts against device limits and throws when the active feature set exceeds them.

## Syntax
```ts
StandardMaterial.createBindGroupLayout(device: GPUDevice): GPUBindGroupLayout
const result = material.createBindGroupLayout(device);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `device` | `GPUDevice` | Yes | Device on which to create the layout. |

## Returns
`GPUBindGroupLayout` - GPU bind-group layout describing required shader bindings for this object.

## See Also
- [material.standard#baseColorTexture](./material-standard-basecolortexture.md)
- [material.standard#getShaderCode](./material-standard-getshadercode.md)
- [material.standard#getUniformBufferSize](./material-standard-getuniformbuffersize.md)
