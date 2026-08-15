# DataMaterial.getShaderCode

## Summary
DataMaterial.getShaderCode returns the current shader code value derived from this DataMaterial runtime state.

## Syntax
```ts
DataMaterial.getShaderCode(_opts: { instanced?: boolean; skinned?: boolean; skinned8?: boolean } = {}): string
const result = material.getShaderCode(_opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `_opts` | `{ instanced?: boolean; skinned?: boolean; skinned8?: boolean } = {}` | Yes | Internal options object forwarded by this method. |

## Returns
`string` - String result produced by this operation.

## Type Details
### GetShaderCode_opts

```ts
type GetShaderCode_opts = {

    instanced?: boolean;

    skinned?: boolean;

    skinned8?: boolean;

};
```

#### GetShaderCode_opts Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `instanced` | `boolean` | No | Boolean flag that toggles `instanced` behavior. |
| `skinned` | `boolean` | No | Boolean flag that toggles `skinned` behavior. |
| `skinned8` | `boolean` | No | Boolean flag that toggles `skinned8` behavior. |

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const material = wgpu.material.data({ data: new Float32Array([0.2, 0.4, 0.7, 1.0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 }, colormap: "viridis" });
const _opts = {};
const result = material.getShaderCode(_opts);
console.log(result);
```

## See Also
- [DataMaterial.colormap](./datamaterial-colormap.md)
- [DataMaterial.createBindGroupLayout](./datamaterial-createbindgrouplayout.md)
- [DataMaterial.destroy](./datamaterial-destroy.md)
- [DataMaterial.dropCPUData](./datamaterial-dropcpudata.md)
- [DataMaterial.getColormapForBinding](./datamaterial-getcolormapforbinding.md)
- [DataMaterial.getColormapKey](./datamaterial-getcolormapkey.md)
- [DataMaterial.getScaleSourceDescriptor](./datamaterial-getscalesourcedescriptor.md)
- [DataMaterial.getUniformBufferSize](./datamaterial-getuniformbuffersize.md)
- [DataMaterial.getUniformData](./datamaterial-getuniformdata.md)
- [DataMaterial.onVisualChange](./datamaterial-onvisualchange.md)
- [DataMaterial.opacity](./datamaterial-opacity.md)
- [DataMaterial.scaleTransform](./datamaterial-scaletransform.md)
