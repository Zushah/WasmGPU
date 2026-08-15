# SkinInstance.bindMatrixPtr

## Summary
SkinInstance.bindMatrixPtr returns the pointer to the instance's 16-value `f32` bind matrix in Wasm memory. Access throws after the instance or its parent skin is disposed.

## Syntax
```ts
SkinInstance.bindMatrixPtr: WasmPtr
```

## Returns
`WasmPtr`

## See Also
- [SkinInstance.disposed](./skininstance-disposed.md)
- [SkinInstance.dispose](./skininstance-dispose.md)
