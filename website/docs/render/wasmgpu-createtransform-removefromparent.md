# WasmGPU.createTransform().removeFromParent

## Summary
WasmGPU.createTransform().removeFromParent detaches the current transform from its parent.
After detaching, the transform becomes a root node and keeps its local transform values unchanged.
If the transform is already root-level, the method returns immediately.
Use this when temporarily ungrouping objects or moving nodes between hierarchy branches.

## Syntax
```ts
WasmGPU.createTransform().removeFromParent(): this
const result = transform.removeFromParent();
```

## Parameters
This API does not take parameters.

## Returns
`this` - Returns the same transform after detaching.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const parent = wgpu.createTransform();
const child = wgpu.createTransform().setParent(parent);

child.removeFromParent();
console.log(child.parent === null, parent.children.length === 0);
```

## See Also
- [WasmGPU.createTransform().setParent](./wasmgpu-createtransform-setparent.md)
- [WasmGPU.createTransform().removeChild](./wasmgpu-createtransform-removechild.md)
- [WasmGPU.createTransform().parent](./wasmgpu-createtransform-parent.md)
- [WasmGPU.createTransform().root](./wasmgpu-createtransform-root.md)
- [WasmGPU.createTransform().addChild](./wasmgpu-createtransform-addchild.md)
