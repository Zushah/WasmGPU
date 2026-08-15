# WasmGPU.createTransform

## Summary
WasmGPU.createTransform allocates a new transform node backed by the shared transform store.
Each transform provides local TRS state, hierarchy links, and fast world-matrix propagation.
Use this as the entry point for parenting, animation rigging, and custom object placement workflows.
The returned object is lightweight and intended to be used per scene node.

## Syntax
```ts
WasmGPU.createTransform(): Transform
const transform = wgpu.createTransform();
```

## Parameters
This API does not take parameters.

## Returns
`Transform` - New transform instance with identity local transform and no parent.

## Type Details
```ts
type Transform = {
    readonly index: number;
    parent: Transform | null;
    children: readonly Transform[];
    setPosition(x: number, y: number, z: number): Transform;
    setRotation(x: number, y: number, z: number, w: number): Transform;
    setScale(x: number, y: number, z: number): Transform;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const root = wgpu.createTransform();
const child = wgpu.createTransform().setPosition(0, 1, 3);
root.addChild(child);

console.log(root.index, child.worldPosition);
```

## See Also
- [WasmGPU.createTransform().index](./wasmgpu-createtransform-index.md)
- [WasmGPU.createTransform().setPosition](./wasmgpu-createtransform-setposition.md)
- [WasmGPU.createTransform().setParent](./wasmgpu-createtransform-setparent.md)
- [WasmGPU.createTransform().worldMatrix](./wasmgpu-createtransform-worldmatrix.md)
- [WasmGPU.animation.createSkin](../objects/wasmgpu-animation-createskin.md)
