# material.custom#getShaderCode

## Summary
material.custom#getShaderCode concatenates the vertex WGSL captured at construction (or the built-in custom-material vertex shader) with the required fragment WGSL. The current `opts` flags are accepted for interface compatibility but do not specialize custom shader text.

## Syntax
```ts
CustomMaterial.getShaderCode(opts: { instanced?: boolean; skinned?: boolean; skinned8?: boolean } = {}): string
const result = material.getShaderCode(opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `opts` | `{ instanced?: boolean; skinned?: boolean; skinned8?: boolean }` | No | Compatibility options currently ignored by `CustomMaterial`. |

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
| `instanced` | `boolean` | No | Selects the instanced vertex-input variant. |
| `skinned` | `boolean` | No | Selects the four-influence skinning variant. |
| `skinned8` | `boolean` | No | Selects the eight-influence skinning variant; it implies skinned geometry. |

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const material = wgpu.material.custom({ fragmentShader: "@fragment fn fs_main() -> @location(0) vec4f { return vec4f(1.0, 0.8, 0.2, 1.0); }" });
const opts = { instanced: true, skinned: false, skinned8: false };
const result = material.getShaderCode(opts);
console.log(result);
```

## See Also
- [material.custom#createBindGroupLayout](./material-custom-createbindgrouplayout.md)
- [material.custom#getUniformBufferSize](./material-custom-getuniformbuffersize.md)
- [material.custom#getUniformData](./material-custom-getuniformdata.md)
- [material.custom#getResource](./material-custom-getresource.md)
