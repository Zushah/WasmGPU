# CustomMaterial.setUniform

## Summary
CustomMaterial.setUniform updates uniform state on this CustomMaterial and marks dependent GPU data for refresh.

## Syntax
```ts
CustomMaterial.setUniform(name: string, value: number | number[]): void
material.setUniform(name, value);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | Yes | Human-readable identifier used for labels, debugging, or lookup keys. |
| `value` | `number \| number[]` | Yes | Replacement scalar or packed vector/matrix data for the named uniform. |

## Returns
`void` - No return value. The call applies side effects to runtime state and/or GPU resources.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const material = wgpu.material.custom({ fragmentShader: "@fragment fn fs_main() -> @location(0) vec4f { return vec4f(1.0, 0.8, 0.2, 1.0); }" });
const name = "gain";
const value = 1.0;
material.setUniform(name, value);
console.log("updated");
```

## See Also
- [CustomMaterial.createBindGroupLayout](./wasmgpu-objects-custommaterial-createbindgrouplayout.md)
- [CustomMaterial.getShaderCode](./wasmgpu-objects-custommaterial-getshadercode.md)
- [CustomMaterial.getUniform](./wasmgpu-objects-custommaterial-getuniform.md)
- [CustomMaterial.getUniformBufferSize](./wasmgpu-objects-custommaterial-getuniformbuffersize.md)
- [CustomMaterial.getUniformData](./wasmgpu-objects-custommaterial-getuniformdata.md)
