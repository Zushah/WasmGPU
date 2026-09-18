# material.custom#createBindGroupLayout

## Summary
material.custom#createBindGroupLayout creates the immutable group-1 WebGPU layout declared at construction for the supplied device.

## Syntax
```ts
CustomMaterial.createBindGroupLayout(device: GPUDevice): GPUBindGroupLayout
const result = material.createBindGroupLayout(device);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `device` | `GPUDevice` | Yes | Device that creates the declared bind-group layout. |

## Returns
`GPUBindGroupLayout` - GPU bind-group layout describing required shader bindings for this object.

## See Also
- [material.custom#getShaderCode](./material-custom-getshadercode.md)
- [material.custom#getUniformBufferSize](./material-custom-getuniformbuffersize.md)
- [material.custom#getUniformData](./material-custom-getuniformdata.md)
- [material.custom#getBindGroupEntries](./material-custom-getbindgroupentries.md)
