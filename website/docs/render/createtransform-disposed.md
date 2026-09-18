# createTransform#disposed

## Summary
createTransform#disposed reports whether a transform has been disposed.
A disposed transform no longer owns a valid slot in the transform store.
Most mutating or query operations on disposed transforms throw to prevent invalid memory access.
Use this property to guard optional cleanup paths in tooling or editor code.

## Syntax
```ts
WasmGPU.createTransform().disposed: boolean
const isDisposed = transform.disposed;
```

## Parameters
This API does not take parameters.

## Returns
`boolean` - `true` after `dispose()` has been called, otherwise `false`.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const t = wgpu.createTransform();
console.log(t.disposed);

t.dispose();
if (t.disposed) {
    console.log("transform released");
}
```

## See Also
- [createTransform#dispose](./createtransform-dispose.md)
- [createTransform#clone](./createtransform-clone.md)
- [createTransform#copyFrom](./createtransform-copyfrom.md)
- [createTransform#parent](./createtransform-parent.md)
- [createTransform#children](./createtransform-children.md)
