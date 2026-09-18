# material.unlit#getShaderCode

## Summary
material.unlit#getShaderCode returns the built-in unlit WGSL for ordinary, instanced, four-influence skinned, or eight-influence skinned meshes. Select at most one specialized geometry mode; combinations of `instanced`, `skinned`, and `skinned8` are unsupported.

## Syntax
```ts
UnlitMaterial.getShaderCode(opts: { instanced?: boolean; skinned?: boolean; skinned8?: boolean } = {}): string
const result = material.getShaderCode(opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `opts` | `{ instanced?: boolean; skinned?: boolean; skinned8?: boolean } = {}` | No | Selects the ordinary, instanced, four-influence skinned, or eight-influence skinned shader variant. Set at most one flag. |

## Returns
The WGSL source for the selected unlit material variant.

## Type Details
### GetShaderCodeopts

```ts
type GetShaderCodeopts = {

    instanced?: boolean;

    skinned?: boolean;

    skinned8?: boolean;

};
```

#### GetShaderCodeopts Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `instanced` | `boolean` | No | Selects the instanced vertex-input variant. |
| `skinned` | `boolean` | No | Selects the four-influence skinning variant. |
| `skinned8` | `boolean` | No | Selects the eight-influence skinning variant; it implies skinned geometry. |

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const material = wgpu.material.unlit({ color: [0.9, 0.6, 0.2], opacity: 1.0 });
const opts = { instanced: true, skinned: false, skinned8: false };
const result = material.getShaderCode(opts);
console.log(result);
```

## See Also
- [material.unlit#alphaCutoff](./material-unlit-alphacutoff.md)
- [material.unlit#baseColorTexture](./material-unlit-basecolortexture.md)
- [material.unlit#color](./material-unlit-color.md)
- [material.unlit#createBindGroupLayout](./material-unlit-createbindgrouplayout.md)
- [material.unlit#getUniformBufferSize](./material-unlit-getuniformbuffersize.md)
- [material.unlit#getUniformData](./material-unlit-getuniformdata.md)
- [material.unlit#opacity](./material-unlit-opacity.md)
