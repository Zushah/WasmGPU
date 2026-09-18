# animation.createSkin#dispose

## Summary
animation.createSkin#dispose releases the owned joint-index and inverse-bind-matrix Wasm allocations. The call is idempotent.

After disposal, `jointIndicesPtr`, `invBindPtr`, and `createInstance` throw. Dispose existing `SkinInstance` objects separately to release their bind matrices and GPU buffers.

## Syntax
```ts
Skin.dispose(): void
skin.dispose();
```

## Parameters
None.

## Returns
`void`

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
- [animation.createSkin#createInstance](./animation-createskin-createinstance.md)
- [animation.createSkin#disposed](./animation-createskin-disposed.md)
- [animation.createSkin#jointIndicesPtr](./animation-createskin-jointindicesptr.md)
- [animation.createSkin#invBindPtr](./animation-createskin-invbindptr.md)
- [animation.createSkin#createInstance#dispose](./animation-createskin-createinstance-dispose.md)
