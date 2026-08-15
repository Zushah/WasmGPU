# WasmGPU.createTransform().children

## Summary
WasmGPU.createTransform().children exposes the current transform's direct child list.
The array reflects live hierarchy state, so it changes immediately after `addChild`, `setParent`, or `removeChild` calls.
Only direct children are included; descendants deeper in the tree are not flattened into this list.
Use this for traversal, editor inspection, and hierarchy debugging.

## Syntax
```ts
WasmGPU.createTransform().children: readonly Transform[]
const children = transform.children;
```

## Parameters
This API does not take parameters.

## Returns
`readonly Transform[]` - The transform's direct child nodes in insertion order.

## Type Details
```ts
type Transform = {
    parent: Transform | null;
    children: readonly Transform[];
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const parent = wgpu.createTransform();
const childA = wgpu.createTransform();
const childB = wgpu.createTransform();

parent.addChild(childA).addChild(childB);
console.log(parent.children.length);
console.log(parent.children[0] === childA, parent.children[1] === childB);
```

## See Also
- [WasmGPU.createTransform().addChild](./wasmgpu-createtransform-addchild.md)
- [WasmGPU.createTransform().removeChild](./wasmgpu-createtransform-removechild.md)
- [WasmGPU.createTransform().parent](./wasmgpu-createtransform-parent.md)
- [WasmGPU.createTransform().root](./wasmgpu-createtransform-root.md)
- [WasmGPU.createTransform().traverse](./wasmgpu-createtransform-traverse.md)
