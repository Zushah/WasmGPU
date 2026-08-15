# WasmGPU.createTransform().root

## Summary
WasmGPU.createTransform().root resolves the top-most ancestor of the current transform.
If the transform is already a root node, this property returns the same object.
This is useful for grouping logic, hierarchy-level operations, or checking whether two nodes belong to the same root tree.
The result is computed by walking parent pointers upward until no parent remains.

## Syntax
```ts
WasmGPU.createTransform().root: Transform
const root = transform.root;
```

## Parameters
This API does not take parameters.

## Returns
`Transform` - Highest ancestor transform in the current hierarchy chain.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const a = wgpu.createTransform();
const b = wgpu.createTransform();
const c = wgpu.createTransform();

a.addChild(b);
b.addChild(c);
console.log(c.root === a, b.root === a, a.root === a);
```

## See Also
- [WasmGPU.createTransform().parent](./wasmgpu-createtransform-parent.md)
- [WasmGPU.createTransform().children](./wasmgpu-createtransform-children.md)
- [WasmGPU.createTransform().setParent](./wasmgpu-createtransform-setparent.md)
- [WasmGPU.createTransform().traverse](./wasmgpu-createtransform-traverse.md)
- [WasmGPU.createTransform().addChild](./wasmgpu-createtransform-addchild.md)
