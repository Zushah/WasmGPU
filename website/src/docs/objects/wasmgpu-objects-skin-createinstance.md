# Skin.createInstance

## Summary
Skin.createInstance creates a per-mesh skin binding, including an owned Wasm bind-matrix allocation and lazily created GPU bone resources. It throws when the parent skin is disposed.

## Syntax
```ts
Skin.createInstance(meshTransform: Transform): SkinInstance
const result = skin.createInstance(meshTransform);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `meshTransform` | `Transform` | Yes | Transform associated with the skinned mesh instance. |

## Returns
`SkinInstance` - Skin instance bound to a mesh transform, including per-instance GPU binding state.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const joint0 = wgpu.createTransform();
const skin = wgpu.animation.createSkin("skin", [joint0], null);
const meshTransform = wgpu.createTransform();
const result = skin.createInstance(meshTransform);
console.log(result);
result.dispose();
skin.dispose();
```

## See Also
- [Skin.dispose](./wasmgpu-objects-skin-dispose.md)
- [SkinInstance.dispose](./wasmgpu-objects-skininstance-dispose.md)
