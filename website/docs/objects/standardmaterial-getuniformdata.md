# StandardMaterial.getUniformData

## Summary
StandardMaterial.getUniformData returns the current uniform data value derived from this StandardMaterial runtime state.

## Syntax
```ts
StandardMaterial.getUniformData(): Float32Array
const result = material.getUniformData();
```

## Parameters
This API does not take parameters.

## Returns
`Float32Array` - Array-like result returned by this operation.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const material = wgpu.material.standard({ color: [0.8, 0.8, 0.9], roughness: 0.5, metallic: 0.2 });
const result = material.getUniformData();
console.log(result);
```

## See Also
- [StandardMaterial.alphaCutoff](./standardmaterial-alphacutoff.md)
- [StandardMaterial.baseColorTexture](./standardmaterial-basecolortexture.md)
- [StandardMaterial.color](./standardmaterial-color.md)
- [StandardMaterial.createBindGroupLayout](./standardmaterial-createbindgrouplayout.md)
- [StandardMaterial.emissive](./standardmaterial-emissive.md)
- [StandardMaterial.emissiveIntensity](./standardmaterial-emissiveintensity.md)
- [StandardMaterial.emissiveTexture](./standardmaterial-emissivetexture.md)
- [StandardMaterial.getShaderCode](./standardmaterial-getshadercode.md)
- [StandardMaterial.getUniformBufferSize](./standardmaterial-getuniformbuffersize.md)
- [StandardMaterial.metallic](./standardmaterial-metallic.md)
- [StandardMaterial.metallicRoughnessTexture](./standardmaterial-metallicroughnesstexture.md)
- [StandardMaterial.normalScale](./standardmaterial-normalscale.md)
