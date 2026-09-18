# material.standard#getShaderCode

## Summary
material.standard#getShaderCode returns the canonical standard-material WGSL for ordinary, instanced, or skinned geometry, specialized for the active texture and extension features with optional shadow bindings. Select at most one of `instanced`, `skinned`, and `skinned8`; combinations are unsupported. Unsupported canonical shader structure or texture-slot specialization throws.

## Syntax
```ts
StandardMaterial.getShaderCode(opts: StandardMaterialShaderOptions = {}): string
const result = material.getShaderCode(opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `opts` | `StandardMaterialShaderOptions` | No | Geometry variant plus optional directional-shadow receiver bindings. |

## Returns
`string` - String result produced by this operation.

## Type Details
### StandardMaterialShaderOptions

```ts
type StandardMaterialShaderOptions = {

    instanced?: boolean;

    skinned?: boolean;

    skinned8?: boolean;

    shadows?: boolean;

    shadowGroup?: number;

};
```

#### GetShaderCodeopts Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `instanced` | `boolean` | No | Selects the instanced vertex-input variant. |
| `skinned` | `boolean` | No | Selects the four-influence skinning variant. |
| `skinned8` | `boolean` | No | Selects the eight-influence skinning variant; it implies skinned geometry. |
| `shadows` | `boolean` | No | Include directional-shadow receiver bindings and visibility logic. |
| `shadowGroup` | `number` | No | Bind-group index for shadow resources; defaults to `2`, or `3` for a skinned variant. |

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const material = wgpu.material.standard({ color: [0.8, 0.8, 0.9], roughness: 0.5, metallic: 0.2 });
const opts = { instanced: true, skinned: false, skinned8: false };
const result = material.getShaderCode(opts);
console.log(result);
```

## See Also
- [material.standard#alphaCutoff](./material-standard-alphacutoff.md)
- [material.standard#baseColorTexture](./material-standard-basecolortexture.md)
- [material.standard#color](./material-standard-color.md)
- [material.standard#createBindGroupLayout](./material-standard-createbindgrouplayout.md)
- [material.standard#emissive](./material-standard-emissive.md)
- [material.standard#emissiveIntensity](./material-standard-emissiveintensity.md)
- [material.standard#emissiveTexture](./material-standard-emissivetexture.md)
- [material.standard#getUniformBufferSize](./material-standard-getuniformbuffersize.md)
- [material.standard#getUniformData](./material-standard-getuniformdata.md)
- [material.standard#metallic](./material-standard-metallic.md)
- [material.standard#metallicRoughnessTexture](./material-standard-metallicroughnesstexture.md)
- [material.standard#normalScale](./material-standard-normalscale.md)
