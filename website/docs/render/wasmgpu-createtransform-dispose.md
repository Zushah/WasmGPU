# WasmGPU.createTransform().dispose

## Summary
WasmGPU.createTransform().dispose releases the transform's slot in the global transform store.
Before release, its children are detached to root-level so the hierarchy remains valid.
After disposal, most transform operations throw a use-after-dispose error.
Use this when you permanently remove objects and want to reclaim transform capacity.

## Syntax
```ts
WasmGPU.createTransform().dispose(): void
transform.dispose();
```

## Parameters
This API does not take parameters.

## Returns
`void` - This method does not return a value.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const t = wgpu.createTransform().setPosition(1, 2, 3);
console.log(t.disposed);

t.dispose();
console.log(t.disposed);
```

## See Also
- [WasmGPU.createTransform().disposed](./wasmgpu-createtransform-disposed.md)
- [WasmGPU.createTransform().removeFromParent](./wasmgpu-createtransform-removefromparent.md)
- [WasmGPU.createTransform().addChild](./wasmgpu-createtransform-addchild.md)
- [WasmGPU.createTransform().reset](./wasmgpu-createtransform-reset.md)
- [WasmGPU.createTransform().clone](./wasmgpu-createtransform-clone.md)
