# material.data#getColormapKey

## Summary
material.data#getColormapKey returns an opaque string identifying the current colormap selection. Equal keys identify the same selection; do not parse or persist their format.

## Syntax
```ts
DataMaterial.getColormapKey(): string
const result = material.getColormapKey();
```

## Parameters
This API does not take parameters.

## Returns
`string` - String result produced by this operation.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const material = wgpu.material.data({ data: new Float32Array([0.2, 0.4, 0.7, 1.0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 }, colormap: "viridis" });
const result = material.getColormapKey();
console.log(result);
```

## See Also
- [material.data#colormap](./material-data-colormap.md)
- [material.data#createBindGroupLayout](./material-data-createbindgrouplayout.md)
- [material.data#destroy](./material-data-destroy.md)
- [material.data#dropCPUData](./material-data-dropcpudata.md)
- [material.data#getColormapForBinding](./material-data-getcolormapforbinding.md)
- [material.data#getScaleSourceDescriptor](./material-data-getscalesourcedescriptor.md)
- [material.data#getShaderCode](./material-data-getshadercode.md)
- [material.data#getUniformBufferSize](./material-data-getuniformbuffersize.md)
- [material.data#getUniformData](./material-data-getuniformdata.md)
- [material.data#onVisualChange](./material-data-onvisualchange.md)
- [material.data#opacity](./material-data-opacity.md)
- [material.data#scaleTransform](./material-data-scaletransform.md)
