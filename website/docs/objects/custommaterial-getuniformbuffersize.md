# CustomMaterial.getUniformBufferSize

## Summary
CustomMaterial.getUniformBufferSize returns the current uniform buffer size value derived from this CustomMaterial runtime state.

## Syntax
```ts
CustomMaterial.getUniformBufferSize(): number
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

const material = wgpu.material.custom({ fragmentShader: "@fragment fn fs_main() -> @location(0) vec4f { return vec4f(1.0, 0.8, 0.2, 1.0); }" });
const result = material.getUniformBufferSize();
console.log(result);
```

## See Also
- [CustomMaterial.createBindGroupLayout](./custommaterial-createbindgrouplayout.md)
- [CustomMaterial.getShaderCode](./custommaterial-getshadercode.md)
- [CustomMaterial.getUniform](./custommaterial-getuniform.md)
- [CustomMaterial.getUniformData](./custommaterial-getuniformdata.md)
- [CustomMaterial.setUniform](./custommaterial-setuniform.md)
