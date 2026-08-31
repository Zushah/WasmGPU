# CustomMaterial.getUniformData

## Summary
CustomMaterial.getUniformData returns the current uniform data value derived from this CustomMaterial runtime state.

## Syntax
```ts
CustomMaterial.getUniformData(): Float32Array
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

const material = wgpu.material.custom({ fragmentShader: "@fragment fn fs_main() -> @location(0) vec4f { return vec4f(1.0, 0.8, 0.2, 1.0); }" });
const result = material.getUniformData();
console.log(result);
```

## See Also
- [CustomMaterial.createBindGroupLayout](./custommaterial-createbindgrouplayout.md)
- [CustomMaterial.getShaderCode](./custommaterial-getshadercode.md)
- [CustomMaterial.getUniformBufferSize](./custommaterial-getuniformbuffersize.md)
- [CustomMaterial.getBindGroupEntries](./custommaterial-getbindgroupentries.md)
