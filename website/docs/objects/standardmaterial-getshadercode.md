# StandardMaterial.getShaderCode

## Summary
StandardMaterial.getShaderCode returns the current shader code value derived from this StandardMaterial runtime state.

## Syntax
```ts
StandardMaterial.getShaderCode(opts: { instanced?: boolean; skinned?: boolean; skinned8?: boolean } = {}): string
const result = material.getShaderCode(opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `opts` | `{ instanced?: boolean; skinned?: boolean; skinned8?: boolean } = {}` | Yes | Optional configuration object that customizes behavior for this call. |

## Returns
`string` - String result produced by this operation.

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
| `instanced` | `boolean` | No | Boolean flag that toggles `instanced` behavior. |
| `skinned` | `boolean` | No | Boolean flag that toggles `skinned` behavior. |
| `skinned8` | `boolean` | No | Boolean flag that toggles `skinned8` behavior. |

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
- [StandardMaterial.alphaCutoff](./standardmaterial-alphacutoff.md)
- [StandardMaterial.baseColorTexture](./standardmaterial-basecolortexture.md)
- [StandardMaterial.color](./standardmaterial-color.md)
- [StandardMaterial.createBindGroupLayout](./standardmaterial-createbindgrouplayout.md)
- [StandardMaterial.emissive](./standardmaterial-emissive.md)
- [StandardMaterial.emissiveIntensity](./standardmaterial-emissiveintensity.md)
- [StandardMaterial.emissiveTexture](./standardmaterial-emissivetexture.md)
- [StandardMaterial.getUniformBufferSize](./standardmaterial-getuniformbuffersize.md)
- [StandardMaterial.getUniformData](./standardmaterial-getuniformdata.md)
- [StandardMaterial.metallic](./standardmaterial-metallic.md)
- [StandardMaterial.metallicRoughnessTexture](./standardmaterial-metallicroughnesstexture.md)
- [StandardMaterial.normalScale](./standardmaterial-normalscale.md)
