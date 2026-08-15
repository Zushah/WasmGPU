# Material.markClean

## Summary
Material.markClean updates internal dirty/clean tracking flags that control upload or uniform refresh behavior.

## Syntax
```ts
Material.markClean(): void
material.markClean();
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
material.markClean();
console.log("updated");
```

## See Also
- [Material.destroy](./material-destroy.md)
- [Material.dirty](./material-dirty.md)
