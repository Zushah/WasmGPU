# createTransform#reset

## Summary
createTransform#reset restores a transform to default local state and detaches it from its parent.
Position resets to `[0, 0, 0]`, rotation resets to identity quaternion `[0, 0, 0, 1]`, and scale resets to `[1, 1, 1]`.
Call `reset()` only on a leaf transform. Detach or reparent every child first, then use this method to recycle the transform between entities.

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
- [createTransform#setPosition](./createtransform-setposition.md)
- [createTransform#setRotation](./createtransform-setrotation.md)
- [createTransform#setScale](./createtransform-setscale.md)
- [createTransform#removeFromParent](./createtransform-removefromparent.md)
- [createTransform#copyFrom](./createtransform-copyfrom.md)
