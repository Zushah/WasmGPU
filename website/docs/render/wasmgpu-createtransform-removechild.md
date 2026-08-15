# WasmGPU.createTransform().removeChild

## Summary
WasmGPU.createTransform().removeChild detaches a specific direct child from the current transform.
If the given transform is not currently parented to this node, the call is a no-op.
On success the child becomes a root-level transform with `parent === null`.
Use this for dynamic hierarchy edits without rebuilding entire transform trees.

## Syntax
```ts
WasmGPU.createTransform().removeChild(child: Transform): this
const result = parent.removeChild(child);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `child` | `Transform` | Yes | Child transform to detach from the current transform. |

## Returns
`this` - Returns the parent transform for chaining.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const parent = wgpu.createTransform();
const child = wgpu.createTransform();
parent.addChild(child);

parent.removeChild(child);
console.log(parent.children.length, child.parent === null);
```

## See Also
- [WasmGPU.createTransform().addChild](./wasmgpu-createtransform-addchild.md)
- [WasmGPU.createTransform().setParent](./wasmgpu-createtransform-setparent.md)
- [WasmGPU.createTransform().removeFromParent](./wasmgpu-createtransform-removefromparent.md)
- [WasmGPU.createTransform().children](./wasmgpu-createtransform-children.md)
- [WasmGPU.createTransform().parent](./wasmgpu-createtransform-parent.md)
