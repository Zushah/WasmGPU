# createTransform#parent

## Summary
createTransform#parent returns the immediate parent transform or `null` for root-level nodes.
This is updated automatically when hierarchy APIs reparent a node.
Use it to walk upward in the transform tree, detect root nodes, or validate graph structure.
The property is read-only; call `setParent` or `removeFromParent` to change parenting.

## Syntax
```ts
WasmGPU.createTransform().parent: Transform | null
const parent = transform.parent;
```

## Parameters
This API does not take parameters.

## Returns
`Transform | null` - The direct parent transform, or `null` if this node has no parent.

## Type Details
```ts
type Transform = {
    parent: Transform | null;
    setParent(parent: Transform | null): Transform;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const root = wgpu.createTransform();
const child = wgpu.createTransform();
child.setParent(root);

console.log(child.parent === root);
child.removeFromParent();
console.log(child.parent === null);
```

## See Also
- [createTransform#setParent](./createtransform-setparent.md)
- [createTransform#removeFromParent](./createtransform-removefromparent.md)
- [createTransform#children](./createtransform-children.md)
- [createTransform#root](./createtransform-root.md)
- [createTransform#addChild](./createtransform-addchild.md)
