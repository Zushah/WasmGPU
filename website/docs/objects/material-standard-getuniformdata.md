# material.standard#getUniformData

## Summary
material.standard#getUniformData rewrites and returns the same 204-float array on each call. It packs core PBR factors, texture transforms, and active extension parameters; copy the result if it must remain stable across later calls.

## Syntax
```ts
StandardMaterial.getUniformData(): Float32Array
const result = material.getUniformData();
```

## Returns
`Float32Array` - Reused 204-element material-data array.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const material = wgpu.material.standard({ color: [0.8, 0.8, 0.9], roughness: 0.5, metallic: 0.2 });
const data = material.getUniformData();
console.log(data.length); // 204
```

## See Also
- [material.standard#getUniformBufferSize](./material-standard-getuniformbuffersize.md)
- [material.standard#createBindGroupLayout](./material-standard-createbindgrouplayout.md)
