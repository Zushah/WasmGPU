# WasmGPU.createTransform().worldPosition

## Summary
WasmGPU.createTransform().worldPosition returns the translation component extracted from the current world matrix.
This gives the transform location in world coordinates after hierarchy composition.
Use this for camera targeting, labels, overlays, and world-space measurements.
The value updates automatically after local or parent changes.

## Syntax
```ts
WasmGPU.createTransform().worldPosition: number[]
const worldPos = transform.worldPosition;
```

## Parameters
This API does not take parameters.

## Returns
`number[]` - World-space position as `[x, y, z]`.

## Type Details
```ts
type WorldPosition = [number, number, number];
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const base = wgpu.createTransform().setPosition(10, 0, 0);
const probe = wgpu.createTransform().setPosition(0, 2, 0).setParent(base);

console.log(probe.worldPosition);
```

## See Also
- [WasmGPU.createTransform().position](./wasmgpu-createtransform-position.md)
- [WasmGPU.createTransform().worldMatrix](./wasmgpu-createtransform-worldmatrix.md)
- [WasmGPU.createTransform().setParent](./wasmgpu-createtransform-setparent.md)
- [WasmGPU.createTransform().translate](./wasmgpu-createtransform-translate.md)
- [WasmGPU.createTransform().localMatrix](./wasmgpu-createtransform-localmatrix.md)
