# DataMaterial.colormap

## Summary
DataMaterial.colormap reads the current `colormap` value from this DataMaterial instance. Use it to inspect runtime state without mutating resources.

## Syntax
```ts
DataMaterial.colormap: BuiltinColormapName | Colormap
const value = material.colormap;
```

## Parameters
This API does not take parameters.

## Returns
`BuiltinColormapName | Colormap` - Current accessor value exposed by the runtime object.

## Type Details
### BuiltinColormapName

```ts
type BuiltinColormapName = "grayscale" | "turbo" | "viridis" | "magma" | "plasma" | "inferno";
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const material = wgpu.material.data({ data: new Float32Array([0.2, 0.4, 0.7, 1.0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 }, colormap: "viridis" });
const value = material.colormap;
console.log(value);
```

## See Also
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
- [DataMaterial.scaleTransform](./datamaterial-scaletransform.md)
