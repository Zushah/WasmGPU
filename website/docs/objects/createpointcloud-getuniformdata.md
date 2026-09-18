# createPointCloud#getUniformData

## Summary
createPointCloud#getUniformData creates a 60-float snapshot of point-size, opacity, softness, normalized scale-transform, color-mode, and custom-stop values. Mutating the returned array does not change the cloud.

## Syntax
```ts
PointCloud.getUniformData(): Float32Array
const result = pointCloud.getUniformData();
```

## Returns
`Float32Array` - A newly allocated 60-element (`240`-byte) packed snapshot. Packing clamps base/minimum size and attenuation to zero or greater, forces maximum size to at least the minimum, and clamps opacity and softness to `[0, 1]`.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const pointCloud = wgpu.createPointCloud({ data: new Float32Array([0, 0, 0, 0.1, 1, 0, 0, 0.8]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const uniforms = pointCloud.getUniformData();
console.log(uniforms.length); // 60
```

## See Also
- [createPointCloud#basePointSize](./createpointcloud-basepointsize.md)
- [createPointCloud#dirtyUniforms](./createpointcloud-dirtyuniforms.md)
- [createPointCloud#getUniformBufferSize](./createpointcloud-getuniformbuffersize.md)
- [createPointCloud#opacity](./createpointcloud-opacity.md)
