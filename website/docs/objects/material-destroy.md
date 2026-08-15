# Material.destroy

## Summary
Material.destroy releases GPU resources and clears owned runtime state for this Material. Call it when the object is no longer needed.

## Syntax
```ts
Material.destroy(): void
material.destroy();
```

## Parameters
This API does not take parameters.

## Returns
`void` - No return value. The call applies side effects to runtime state and/or GPU resources.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const material = wgpu.material.unlit({ color: [1, 1, 1], opacity: 1.0 });
material.destroy();
console.log("updated");
```

## See Also
- [Material.dirty](./material-dirty.md)
- [Material.markClean](./material-markclean.md)
