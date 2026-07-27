# SkinInstance.disposed

## Summary
SkinInstance.disposed reports whether `dispose()` has released the instance's bind-matrix allocation and GPU bone buffer. Disposing the parent `Skin` invalidates guarded instance operations but does not change this property; dispose the instance separately.

## Syntax
```ts
SkinInstance.disposed: boolean
```

## Returns
`boolean`

## See Also
- [SkinInstance.dispose](./wasmgpu-objects-skininstance-dispose.md)
- [SkinInstance.bindMatrixPtr](./wasmgpu-objects-skininstance-bindmatrixptr.md)
