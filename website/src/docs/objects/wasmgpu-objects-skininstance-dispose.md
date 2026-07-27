# SkinInstance.dispose

## Summary
SkinInstance.dispose destroys the instance's GPU bone buffer, clears its bind group, and frees its 16-value Wasm bind-matrix allocation. The call is idempotent.

The parent `Skin` has a separate lifetime and must be disposed independently. After instance disposal, guarded members such as `bindMatrixPtr` and `jointCount` throw.

## Syntax
```ts
SkinInstance.dispose(): void
instance.dispose();
```

## Returns
`void`

## See Also
- [SkinInstance.disposed](./wasmgpu-objects-skininstance-disposed.md)
- [SkinInstance.bindMatrixPtr](./wasmgpu-objects-skininstance-bindmatrixptr.md)
- [Skin.dispose](./wasmgpu-objects-skin-dispose.md)
