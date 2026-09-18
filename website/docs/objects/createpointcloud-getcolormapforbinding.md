# createPointCloud#getColormapForBinding

## Summary
createPointCloud#getColormapForBinding resolves the texture-backed `Colormap` used for GPU binding. Existing `Colormap` objects are returned unchanged, built-in names resolve through `Colormap.builtin()`, and `"custom"` returns the grayscale fallback because custom stops are carried in uniforms instead of a texture.

## Syntax
```ts
PointCloud.getColormapForBinding(): Colormap
const result = pointCloud.getColormapForBinding();
```

## Returns
The borrowed `Colormap` used for texture binding.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const pointCloud = wgpu.createPointCloud({ data: new Float32Array([0, 0, 0, 0.1, 1, 0, 0, 0.8]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const colormap = pointCloud.getColormapForBinding();
console.log(colormap === wgpu.colormap.viridis()); // true
```

## See Also
- [createPointCloud#colormap](./createpointcloud-colormap.md)
- [createPointCloud#colormapStops](./createpointcloud-colormapstops.md)
- [createPointCloud#getColormapKey](./createpointcloud-getcolormapkey.md)
