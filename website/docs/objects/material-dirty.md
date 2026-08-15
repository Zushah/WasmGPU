# Material.dirty

## Summary
Material.dirty reads the current `dirty` value from this Material instance. Use it to inspect runtime state without mutating resources.

## Syntax
```ts
Material.dirty: boolean
const value = material.dirty;
```

## Parameters
This API does not take parameters.

## Returns
`boolean` - Boolean result indicating whether the queried condition is satisfied.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const material = wgpu.material.unlit({ color: [1, 1, 1], opacity: 1.0 });
const value = material.dirty;
console.log(value);
```

## See Also
- [Material.destroy](./material-destroy.md)
- [Material.markClean](./material-markclean.md)
