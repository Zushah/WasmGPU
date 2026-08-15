# WasmGPU.createTransform().traverse

## Summary
WasmGPU.createTransform().traverse visits the current transform and all descendants using depth-first pre-order traversal.
The callback runs on the current node first, then each subtree in child order.
Use this for hierarchy-wide updates, bulk tagging, and debug export.
Traversal is synchronous and executes entirely on the calling thread.

## Syntax
```ts
WasmGPU.createTransform().traverse(callback: (t: Transform) => void): void
transform.traverse((node) => {
    // visit node
});
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `callback` | `(t: Transform) => void` | Yes | Function invoked once per visited node in depth-first pre-order. |

## Returns
`void` - This method does not return a value.

## Type Details
```ts
type TraverseCallback = (t: Transform) => void;
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const root = wgpu.createTransform();
const a = wgpu.createTransform().setParent(root);
const b = wgpu.createTransform().setParent(root);
const c = wgpu.createTransform().setParent(a);

const visited = [];
root.traverse((node) => visited.push(node.index));
console.log(visited, b.parent === root, c.root === root);
```

## See Also
- [WasmGPU.createTransform().children](./wasmgpu-createtransform-children.md)
- [WasmGPU.createTransform().parent](./wasmgpu-createtransform-parent.md)
- [WasmGPU.createTransform().root](./wasmgpu-createtransform-root.md)
- [WasmGPU.createTransform().addChild](./wasmgpu-createtransform-addchild.md)
- [WasmGPU.createTransform().setParent](./wasmgpu-createtransform-setparent.md)
