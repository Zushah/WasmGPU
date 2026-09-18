# createTransform#index

## Summary
createTransform#index returns the transform's numeric slot index in the global transform store.
This numeric identity is stable for the lifetime of the transform.
Use it as a lightweight identifier in editor tooling, debug views, or lookup tables.
Do not assume indices are contiguous forever because disposed transforms can be recycled.

## Syntax
```ts
WasmGPU.createTransform().index: number
const id = transform.index;
```

## Parameters
This API does not take parameters.

## Returns
`number` - Store slot index assigned to this transform instance.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const a = wgpu.createTransform();
const b = wgpu.createTransform();
console.log(a.index, b.index, a.index !== b.index);
```

## See Also
- [WasmGPU.createTransform](./wasmgpu-createtransform.md)
- [createTransform#traverse](./createtransform-traverse.md)
- [createTransform#dispose](./createtransform-dispose.md)
- [createTransform#parent](./createtransform-parent.md)
- [createTransform#children](./createtransform-children.md)
