# StandardMaterial.occlusionTexture

## Summary
StandardMaterial.occlusionTexture reads the current `occlusionTexture` value from this StandardMaterial instance. Use it to inspect runtime state without mutating resources.

## Syntax
```ts
StandardMaterial.occlusionTexture: Texture2D | null
const value = material.occlusionTexture;
```

## Parameters
This API does not take parameters.

## Returns
`Texture2D | null` - Current accessor value exposed by the runtime object.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const material = wgpu.material.standard({ color: [0.8, 0.8, 0.9], roughness: 0.5, metallic: 0.2 });
const value = material.occlusionTexture;
console.log(value);
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
- [StandardMaterial.getUniformData](./standardmaterial-getuniformdata.md)
- [StandardMaterial.metallic](./standardmaterial-metallic.md)
- [StandardMaterial.metallicRoughnessTexture](./standardmaterial-metallicroughnesstexture.md)
