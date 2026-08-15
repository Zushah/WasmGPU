# Skin.dispose

## Summary
Skin.dispose releases the owned joint-index and inverse-bind-matrix Wasm allocations. The call is idempotent.

After disposal, `jointIndicesPtr`, `invBindPtr`, and `createInstance` throw. Dispose existing `SkinInstance` objects separately to release their bind matrices and GPU buffers.

## Syntax
```ts
Skin.dispose(): void
skin.dispose();
```

## Parameters
This API does not take parameters.

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

const joint0 = wgpu.createTransform();
const skin = wgpu.animation.createSkin("skin", [joint0], null);
skin.dispose();
console.log(skin.disposed); // true
```

## See Also
- [Skin.createInstance](./skin-createinstance.md)
- [Skin.disposed](./skin-disposed.md)
- [Skin.jointIndicesPtr](./skin-jointindicesptr.md)
- [Skin.invBindPtr](./skin-invbindptr.md)
- [SkinInstance.dispose](./skininstance-dispose.md)
