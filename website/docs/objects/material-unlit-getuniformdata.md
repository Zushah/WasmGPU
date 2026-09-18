# material.unlit#getUniformData

## Summary
material.unlit#getUniformData rewrites and returns the same 16-float array on each call. It contains color, opacity, alpha cutoff, and the base-color texture transform; copy it if the values must remain stable across later calls.

## Syntax
```ts
UnlitMaterial.getUniformData(): Float32Array
const result = material.getUniformData();
```

## Returns
`Float32Array` - Reused 16-element material-data array.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const material = wgpu.material.unlit({ color: [0.9, 0.6, 0.2], opacity: 1.0 });
const data = material.getUniformData();
console.log(data.length); // 16
```

## See Also
- [material.unlit#createBindGroupLayout](./material-unlit-createbindgrouplayout.md)
- [material.unlit#getUniformBufferSize](./material-unlit-getuniformbuffersize.md)
