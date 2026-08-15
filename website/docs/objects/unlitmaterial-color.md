# UnlitMaterial.color

## Summary
UnlitMaterial.color reads the current `color` value from this UnlitMaterial instance. Use it to inspect runtime state without mutating resources.

## Syntax
```ts
UnlitMaterial.color: Color
const value = material.color;
```

## Parameters
This API does not take parameters.

## Returns
`Color` - Current accessor value exposed by the runtime object.

## Type Details
### Color

```ts
type Color = [number, number, number];
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const material = wgpu.material.unlit({ color: [0.9, 0.6, 0.2], opacity: 1.0 });
const value = material.color;
console.log(value);
```

## See Also
- [UnlitMaterial.alphaCutoff](./unlitmaterial-alphacutoff.md)
- [UnlitMaterial.baseColorTexture](./unlitmaterial-basecolortexture.md)
- [UnlitMaterial.createBindGroupLayout](./unlitmaterial-createbindgrouplayout.md)
- [UnlitMaterial.getShaderCode](./unlitmaterial-getshadercode.md)
- [UnlitMaterial.getUniformBufferSize](./unlitmaterial-getuniformbuffersize.md)
- [UnlitMaterial.getUniformData](./unlitmaterial-getuniformdata.md)
- [UnlitMaterial.opacity](./unlitmaterial-opacity.md)
