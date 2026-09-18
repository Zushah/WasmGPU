# material.data#createBindGroupLayout

## Summary
material.data#createBindGroupLayout returns the four-binding layout for uniforms, a read-only storage data buffer, a filtering sampler, and a one-dimensional colormap texture.

## Syntax
```ts
DataMaterial.createBindGroupLayout(device: GPUDevice): GPUBindGroupLayout
const result = material.createBindGroupLayout(device);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `device` | `GPUDevice` | Yes | Device that creates the DataMaterial bind-group layout. |

## Returns
`GPUBindGroupLayout` - GPU bind-group layout describing required shader bindings for this object.

## See Also
- [material.data#colormap](./material-data-colormap.md)
- [material.data#getShaderCode](./material-data-getshadercode.md)
- [material.data#getUniformBufferSize](./material-data-getuniformbuffersize.md)
- [material.data#setDataBuffer](./material-data-setdatabuffer.md)
