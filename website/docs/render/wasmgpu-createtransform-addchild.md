# WasmGPU.createTransform().addChild

## Summary
WasmGPU.createTransform().addChild attaches a child transform to a parent transform.
Internally this is equivalent to calling `child.setParent(parent)` and updates hierarchy state in the global transform store.
Use this to build parent-child relationships for meshes, lights, and animation rigs.
Cycle validation is enforced by the `setParent` logic, so invalid self/ancestor parenting is rejected.

## Syntax
```ts
WasmGPU.createTransform().addChild(child: Transform): this
const parent = wgpu.createTransform();
const result = parent.addChild(child);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `child` | `Transform` | Yes | Transform that becomes a direct child of the current transform. |

## Returns
`this` - Returns the parent transform so additional transform operations can be chained.

## Type Details
```ts
type Transform = {
    parent: Transform | null;
    children: readonly Transform[];
    setParent(parent: Transform | null): Transform;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const root = wgpu.createTransform();
const arm = wgpu.createTransform().setPosition(1.0, 0.0, 0.0);
const hand = wgpu.createTransform().setPosition(0.5, 0.0, 0.0);

root.addChild(arm);
arm.addChild(hand);
console.log(root.children.length, hand.parent === arm);
```

## See Also
- [WasmGPU.createTransform().setParent](./wasmgpu-createtransform-setparent.md)
- [WasmGPU.createTransform().removeChild](./wasmgpu-createtransform-removechild.md)
- [WasmGPU.createTransform().removeFromParent](./wasmgpu-createtransform-removefromparent.md)
- [WasmGPU.createTransform().children](./wasmgpu-createtransform-children.md)
- [WasmGPU.createTransform().parent](./wasmgpu-createtransform-parent.md)
