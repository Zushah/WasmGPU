# DataMaterial.onVisualChange

## Summary
DataMaterial.onVisualChange registers a listener for visual-state changes and returns an unsubscribe callback.

## Syntax
```ts
DataMaterial.onVisualChange(listener: (kind: DataMaterialVisualChangeKind) => void): () => void
const result = material.onVisualChange(listener);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `listener` | `(kind: DataMaterialVisualChangeKind) => void` | Yes | Callback invoked when visual-relevant state changes. |

## Returns
`() => void` - Function that unsubscribes or unregisters the listener created by this call.

## Type Details
### DataMaterialVisualChangeKind

```ts
type DataMaterialVisualChangeKind = "scale" | "colormap" | "visual";
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const material = wgpu.material.data({ data: new Float32Array([0.2, 0.4, 0.7, 1.0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 }, colormap: "viridis" });
const listener = (kind) => console.log(kind);
const result = material.onVisualChange(listener);
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
- [DataMaterial.getShaderCode](./datamaterial-getshadercode.md)
- [DataMaterial.getUniformBufferSize](./datamaterial-getuniformbuffersize.md)
- [DataMaterial.getUniformData](./datamaterial-getuniformdata.md)
- [DataMaterial.opacity](./datamaterial-opacity.md)
- [DataMaterial.scaleTransform](./datamaterial-scaletransform.md)
