# DataMaterial.setData

## Summary
DataMaterial.setData updates data state on this DataMaterial and marks dependent GPU data for refresh.

## Syntax
```ts
DataMaterial.setData(data: Float32Array, opts: { keepCPUData?: boolean } = {}): void
material.setData(data, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `data` | `Float32Array` | Yes | Packed numeric data consumed by this API. |
| `opts` | `{ keepCPUData?: boolean } = {}` | Yes | Optional configuration object that customizes behavior for this call. |

## Returns
`void` - No return value. The call applies side effects to runtime state and/or GPU resources.

## Type Details
### SetDataopts

```ts
type SetDataopts = {

    keepCPUData?: boolean;

};
```

#### SetDataopts Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `keepCPUData` | `boolean` | No | When true, CPU arrays are retained after upload. |

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const material = wgpu.material.data({ data: new Float32Array([0.2, 0.4, 0.7, 1.0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 }, colormap: "viridis" });
const data = new Float32Array([0, 0, 0, 0.1, 1, 0, 0, 0.8]);
const opts = { keepCPUData: true };
material.setData(data, opts);
console.log("updated");
```

## See Also
- [DataMaterial.colormap](./datamaterial-colormap.md)
- [DataMaterial.createBindGroupLayout](./datamaterial-createbindgrouplayout.md)
- [DataMaterial.destroy](./datamaterial-destroy.md)
- [DataMaterial.dropCPUData](./datamaterial-dropcpudata.md)
- [DataMaterial.getColormapForBinding](./datamaterial-getcolormapforbinding.md)
- [DataMaterial.getColormapKey](./datamaterial-getcolormapkey.md)
- [DataMaterial.getScaleSourceDescriptor](./datamaterial-getscalesourcedescriptor.md)
- [DataMaterial.getShaderCode](./datamaterial-getshadercode.md)
- [DataMaterial.getUniformBufferSize](./datamaterial-getuniformbuffersize.md)
- [DataMaterial.getUniformData](./datamaterial-getuniformdata.md)
- [DataMaterial.onVisualChange](./datamaterial-onvisualchange.md)
- [DataMaterial.opacity](./datamaterial-opacity.md)
