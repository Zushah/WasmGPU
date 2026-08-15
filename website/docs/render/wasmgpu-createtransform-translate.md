# WasmGPU.createTransform().translate

## Summary
WasmGPU.createTransform().translate applies a relative local-space offset to the current position.
It adds the provided delta to the existing position vector and marks the node dirty.
Use this for incremental motion in update loops, physics integration, or control systems.
The translation is applied in parent space, not automatically in world space.

## Syntax
```ts
WasmGPU.createTransform().translate(x: number, y: number, z: number): this
const result = transform.translate(dx, dy, dz);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | `number` | Yes | Delta applied to local X position. |
| `y` | `number` | Yes | Delta applied to local Y position. |
| `z` | `number` | Yes | Delta applied to local Z position. |

## Returns
`this` - Returns the same transform after applying the offset.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const particle = wgpu.createTransform().setPosition(0, 0, 0);
const velocity = [0.1, 0.0, -0.05];

for (let i = 0; i < 3; i++) {
    particle.translate(velocity[0], velocity[1], velocity[2]);
}
console.log(particle.position);
```

## See Also
- [WasmGPU.createTransform().setPosition](./wasmgpu-createtransform-setposition.md)
- [WasmGPU.createTransform().position](./wasmgpu-createtransform-position.md)
- [WasmGPU.createTransform().worldPosition](./wasmgpu-createtransform-worldposition.md)
- [WasmGPU.createTransform().localMatrix](./wasmgpu-createtransform-localmatrix.md)
- [WasmGPU.createTransform().setParent](./wasmgpu-createtransform-setparent.md)
