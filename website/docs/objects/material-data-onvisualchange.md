# material.data#onVisualChange

## Summary
material.data#onVisualChange registers a listener for visual-state changes and returns an unsubscribe callback.

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
- [material.data#colormap](./material-data-colormap.md)
- [material.data#createBindGroupLayout](./material-data-createbindgrouplayout.md)
- [material.data#destroy](./material-data-destroy.md)
- [material.data#dropCPUData](./material-data-dropcpudata.md)
- [material.data#getColormapForBinding](./material-data-getcolormapforbinding.md)
- [material.data#getColormapKey](./material-data-getcolormapkey.md)
- [material.data#getScaleSourceDescriptor](./material-data-getscalesourcedescriptor.md)
- [material.data#getShaderCode](./material-data-getshadercode.md)
- [material.data#getUniformBufferSize](./material-data-getuniformbuffersize.md)
- [material.data#getUniformData](./material-data-getuniformdata.md)
- [material.data#opacity](./material-data-opacity.md)
- [material.data#scaleTransform](./material-data-scaletransform.md)
