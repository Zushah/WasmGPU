# material.data#getUniformData

## Summary
material.data#getUniformData returns a reused 24-float array containing the packed scale transform, clamped opacity, and clamped shading value. A later call overwrites the same array, so copy it when retaining a snapshot.

## Syntax
```ts
DataMaterial.getUniformData(): Float32Array
const result = material.getUniformData();
```

## Returns
The reused 24-element uniform array.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const material = wgpu.material.data({ data: new Float32Array([0.2, 0.4, 0.7, 1.0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 }, colormap: "viridis" });
const uniforms = material.getUniformData();
console.log(uniforms.length, uniforms[20], uniforms[21]); // 24, 1, 1
```

## See Also
- [material.data#createBindGroupLayout](./material-data-createbindgrouplayout.md)
- [material.data#getUniformBufferSize](./material-data-getuniformbuffersize.md)
- [material.data#opacity](./material-data-opacity.md)
- [material.data#shading](./material-data-shading.md)
