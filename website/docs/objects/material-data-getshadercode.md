# material.data#getShaderCode

## Summary
material.data#getShaderCode returns the fixed data-material WGSL module. Instancing and skinning options are accepted for the common material interface but do not select variants.

## Syntax
```ts
DataMaterial.getShaderCode(opts: { instanced?: boolean; skinned?: boolean; skinned8?: boolean } = {}): string
const result = material.getShaderCode(opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `opts` | `{ instanced?: boolean; skinned?: boolean; skinned8?: boolean } = {}` | No | Compatibility flags accepted by the common material interface; DataMaterial ignores them. |

## Returns
The fixed DataMaterial WGSL source.

## Type Details
### GetShaderCodeOptions

```ts
type GetShaderCodeOptions = {

    instanced?: boolean;

    skinned?: boolean;

    skinned8?: boolean;

};
```

#### GetShaderCodeOptions Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `instanced` | `boolean` | No | Selects the instanced vertex-input variant. |
| `skinned` | `boolean` | No | Selects the four-influence skinning variant. |
| `skinned8` | `boolean` | No | Selects the eight-influence skinning variant; it implies skinned geometry. |

## See Also
- [material.data#createBindGroupLayout](./material-data-createbindgrouplayout.md)
- [material.data#getUniformBufferSize](./material-data-getuniformbuffersize.md)
- [material.data#getUniformData](./material-data-getuniformdata.md)
