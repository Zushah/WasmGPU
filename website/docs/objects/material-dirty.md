# material#dirty

## Summary
material#dirty reports whether material uniform or binding state needs renderer refresh. Property setters mark relevant state dirty; `markClean()` clears the flag after synchronization. It does not by itself report asynchronous texture-upload completion.

## Syntax
```ts
Material.dirty: boolean
const value = material.dirty;
```

## Parameters
This API does not take parameters.

## Returns
`boolean` - Boolean result indicating whether the queried condition is satisfied.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const material = wgpu.material.unlit({ color: [1, 1, 1], opacity: 1.0 });
const value = material.dirty;
console.log(value);
```

## See Also
- [material#destroy](./material-destroy.md)
- [material#markClean](./material-markclean.md)
