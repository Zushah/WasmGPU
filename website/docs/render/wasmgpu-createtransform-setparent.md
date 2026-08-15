# WasmGPU.createTransform().setParent

## Summary
WasmGPU.createTransform().setParent reparents a transform under another transform, or detaches it when `null` is passed.
The method updates both the JavaScript hierarchy (`parent` and `children`) and the backing transform-store parent index.
It rejects invalid operations like self-parenting and ancestor cycles.
Use this when assembling scene hierarchies dynamically or attaching objects to moving reference frames.

## Syntax
```ts
WasmGPU.createTransform().setParent(parent: Transform | null): this
const result = child.setParent(parent);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `parent` | `Transform \| null` | Yes | New parent transform, or `null` to make the node a root transform. |

## Returns
`this` - Returns the child transform after reparenting.

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

const solarSystem = wgpu.createTransform();
const earth = wgpu.createTransform().setPosition(10, 0, 0);
const moon = wgpu.createTransform().setPosition(2, 0, 0);

earth.setParent(solarSystem);
moon.setParent(earth);
console.log(moon.parent === earth, moon.root === solarSystem);
```

## See Also
- [WasmGPU.createTransform().addChild](./wasmgpu-createtransform-addchild.md)
- [WasmGPU.createTransform().removeFromParent](./wasmgpu-createtransform-removefromparent.md)
- [WasmGPU.createTransform().parent](./wasmgpu-createtransform-parent.md)
- [WasmGPU.createTransform().children](./wasmgpu-createtransform-children.md)
- [WasmGPU.createTransform().root](./wasmgpu-createtransform-root.md)
