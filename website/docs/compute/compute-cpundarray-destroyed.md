# compute.CPUndarray#destroyed

## Summary
compute.CPUndarray#destroyed reports whether the ndarray's owned WebAssembly allocations have been released.

## Syntax
```ts
CPUndarray.destroyed: boolean
```

## Returns
`boolean` - `false` until `destroy()` is called and `true` afterward.

## Example
```js
const a = wgpu.compute.CPUndarray.zeros("f32", { shape: [4] });
console.log(a.destroyed); // false
a.destroy();
console.log(a.destroyed); // true
```

## See Also
- [compute.CPUndarray#destroy](./compute-cpundarray-destroy.md)
- [compute.CPUndarray#basePtrBytes](./compute-cpundarray-baseptrbytes.md)
