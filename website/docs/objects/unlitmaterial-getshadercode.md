# UnlitMaterial.getShaderCode

## Summary
UnlitMaterial.getShaderCode returns the current shader code value derived from this UnlitMaterial runtime state.

## Syntax
```ts
UnlitMaterial.getShaderCode(opts: { instanced?: boolean; skinned?: boolean; skinned8?: boolean } = {}): string
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

const material = wgpu.material.unlit({ color: [0.9, 0.6, 0.2], opacity: 1.0 });
const opts = { instanced: true, skinned: false, skinned8: false };
const result = material.getShaderCode(opts);
console.log(result);
```

## See Also
- [UnlitMaterial.alphaCutoff](./unlitmaterial-alphacutoff.md)
- [UnlitMaterial.baseColorTexture](./unlitmaterial-basecolortexture.md)
- [UnlitMaterial.color](./unlitmaterial-color.md)
- [UnlitMaterial.createBindGroupLayout](./unlitmaterial-createbindgrouplayout.md)
- [UnlitMaterial.getUniformBufferSize](./unlitmaterial-getuniformbuffersize.md)
- [UnlitMaterial.getUniformData](./unlitmaterial-getuniformdata.md)
- [UnlitMaterial.opacity](./unlitmaterial-opacity.md)
