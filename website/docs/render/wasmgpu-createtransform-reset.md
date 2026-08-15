# WasmGPU.createTransform().reset

## Summary
WasmGPU.createTransform().reset restores a transform to default local state and removes all hierarchy links.
Position resets to `[0, 0, 0]`, rotation resets to identity quaternion `[0, 0, 0, 1]`, and scale resets to `[1, 1, 1]`.
The transform is detached from its parent and its child list is cleared.
Use this to recycle transform objects safely between entities.

## Syntax
```ts
WasmGPU.createTransform().reset(): this
const result = transform.reset();
```

## Parameters
This API does not take parameters.

## Returns
`this` - Returns the reset transform.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const parent = wgpu.createTransform();
const t = wgpu.createTransform().setParent(parent);
t.setPosition(4, 2, -1).setRotationFromEuler(0.1, 0.2, 0.3).setScale(2, 1, 0.5);

t.reset();
console.log(t.parent === null, t.position, t.rotation, t.scale);
```

## See Also
- [WasmGPU.createTransform().setPosition](./wasmgpu-createtransform-setposition.md)
- [WasmGPU.createTransform().setRotation](./wasmgpu-createtransform-setrotation.md)
- [WasmGPU.createTransform().setScale](./wasmgpu-createtransform-setscale.md)
- [WasmGPU.createTransform().removeFromParent](./wasmgpu-createtransform-removefromparent.md)
- [WasmGPU.createTransform().copyFrom](./wasmgpu-createtransform-copyfrom.md)
