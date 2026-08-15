# UnlitMaterial.baseColorTexture

## Summary
UnlitMaterial.baseColorTexture reads the current `baseColorTexture` value from this UnlitMaterial instance. Use it to inspect runtime state without mutating resources.

## Syntax
```ts
UnlitMaterial.baseColorTexture: Texture2D | null
const value = material.baseColorTexture;
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

const material = wgpu.material.unlit({ color: [0.9, 0.6, 0.2], opacity: 1.0 });
const value = material.baseColorTexture;
console.log(value);
```

## See Also
- [UnlitMaterial.alphaCutoff](./unlitmaterial-alphacutoff.md)
- [UnlitMaterial.color](./unlitmaterial-color.md)
- [UnlitMaterial.createBindGroupLayout](./unlitmaterial-createbindgrouplayout.md)
- [UnlitMaterial.getShaderCode](./unlitmaterial-getshadercode.md)
- [UnlitMaterial.getUniformBufferSize](./unlitmaterial-getuniformbuffersize.md)
- [UnlitMaterial.getUniformData](./unlitmaterial-getuniformdata.md)
- [UnlitMaterial.opacity](./unlitmaterial-opacity.md)
