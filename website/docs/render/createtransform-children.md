# createTransform#children

## Summary
createTransform#children exposes the current transform's direct child list.
The array reflects live hierarchy state, so it changes immediately after `addChild`, `setParent`, or `removeChild` calls.
Only direct children are included; descendants deeper in the tree are not flattened into this list.
Use this for traversal, editor inspection, and hierarchy debugging.
Treat the returned live array as read-only; mutating it directly bypasses hierarchy and transform-store updates.

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
- [createTransform#addChild](./createtransform-addchild.md)
- [createTransform#removeChild](./createtransform-removechild.md)
- [createTransform#parent](./createtransform-parent.md)
- [createTransform#root](./createtransform-root.md)
- [createTransform#traverse](./createtransform-traverse.md)
