# UnlitMaterial.getUniformBufferSize

## Summary
UnlitMaterial.getUniformBufferSize returns the current uniform buffer size value derived from this UnlitMaterial runtime state.

## Syntax
```ts
UnlitMaterial.getUniformBufferSize(): number
const result = material.getUniformBufferSize();
```

## Parameters
This API does not take parameters.

## Returns
`number` - Numeric scalar result produced by this operation.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const material = wgpu.material.unlit({ color: [0.9, 0.6, 0.2], opacity: 1.0 });
const result = material.getUniformBufferSize();
console.log(result);
```

## See Also
- [UnlitMaterial.alphaCutoff](./unlitmaterial-alphacutoff.md)
- [UnlitMaterial.baseColorTexture](./unlitmaterial-basecolortexture.md)
- [UnlitMaterial.color](./unlitmaterial-color.md)
- [UnlitMaterial.createBindGroupLayout](./unlitmaterial-createbindgrouplayout.md)
- [UnlitMaterial.getShaderCode](./unlitmaterial-getshadercode.md)
- [UnlitMaterial.getUniformData](./unlitmaterial-getuniformdata.md)
- [UnlitMaterial.opacity](./unlitmaterial-opacity.md)
