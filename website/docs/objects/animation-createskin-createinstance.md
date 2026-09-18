# animation.createSkin#createInstance

## Summary
animation.createSkin#createInstance creates a per-mesh skin binding that references the supplied mesh transform and lazily creates an owned GPU bone buffer and bind group when rendering needs them. It does not allocate a separate Wasm bind matrix; joint computation reads the transform's world-matrix pointer. The method throws when the parent skin is disposed.

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
- [animation.createSkin#dispose](./animation-createskin-dispose.md)
- [animation.createSkin#createInstance#dispose](./animation-createskin-createinstance-dispose.md)
