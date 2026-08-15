# UnlitMaterial.getUniformData

## Summary
UnlitMaterial.getUniformData returns the current uniform data value derived from this UnlitMaterial runtime state.

## Syntax
```ts
UnlitMaterial.getUniformData(): Float32Array
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

const material = wgpu.material.unlit({ color: [0.9, 0.6, 0.2], opacity: 1.0 });
const result = material.getUniformData();
console.log(result);
```

## See Also
- [UnlitMaterial.alphaCutoff](./unlitmaterial-alphacutoff.md)
- [UnlitMaterial.baseColorTexture](./unlitmaterial-basecolortexture.md)
- [UnlitMaterial.color](./unlitmaterial-color.md)
- [UnlitMaterial.createBindGroupLayout](./unlitmaterial-createbindgrouplayout.md)
- [UnlitMaterial.getShaderCode](./unlitmaterial-getshadercode.md)
- [UnlitMaterial.getUniformBufferSize](./unlitmaterial-getuniformbuffersize.md)
- [UnlitMaterial.opacity](./unlitmaterial-opacity.md)
