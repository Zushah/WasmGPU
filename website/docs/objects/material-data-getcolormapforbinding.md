# material.data#getColormapForBinding

## Summary
material.data#getColormapForBinding returns the assigned `Colormap` instance or resolves a built-in name to its shared singleton. The returned resource is not owned by the material.

## Syntax
```ts
DataMaterial.getColormapForBinding(): Colormap
const result = material.getColormapForBinding();
```

## Returns
`Colormap` - Assigned instance unchanged, or the singleton resolved from the assigned built-in name.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const material = wgpu.material.data({ data: new Float32Array([0.2, 0.4, 0.7, 1.0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 }, colormap: "viridis" });
const colormap = material.getColormapForBinding();
console.log(colormap === wgpu.colormap.viridis()); // true
```

## See Also
- [material.data#colormap](./material-data-colormap.md)
- [material.data#createBindGroupLayout](./material-data-createbindgrouplayout.md)
- [material.data#destroy](./material-data-destroy.md)
- [material.data#dropCPUData](./material-data-dropcpudata.md)
- [material.data#getColormapKey](./material-data-getcolormapkey.md)
- [material.data#getScaleSourceDescriptor](./material-data-getscalesourcedescriptor.md)
- [material.data#getShaderCode](./material-data-getshadercode.md)
- [material.data#getUniformBufferSize](./material-data-getuniformbuffersize.md)
- [material.data#getUniformData](./material-data-getuniformdata.md)
- [material.data#onVisualChange](./material-data-onvisualchange.md)
- [material.data#opacity](./material-data-opacity.md)
- [material.data#scaleTransform](./material-data-scaletransform.md)
