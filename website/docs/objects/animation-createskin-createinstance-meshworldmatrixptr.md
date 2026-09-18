# animation.createSkin#createInstance#meshWorldMatrixPtr

## Summary
animation.createSkin#createInstance#meshWorldMatrixPtr returns the Wasm pointer to the associated mesh transform's current 16-value world matrix. The pointer is owned by the transform store, not by the skin instance. Access throws after the instance or its parent skin is disposed.

## Syntax
```ts
SkinInstance.meshWorldMatrixPtr: WasmPtr
```

## Returns
`WasmPtr` - Pointer to the mesh transform's world-matrix record. Its lifetime follows the transform and transform store; do not free it.

## See Also
- [animation.createSkin#createInstance#disposed](./animation-createskin-createinstance-disposed.md)
- [animation.createSkin#createInstance#dispose](./animation-createskin-createinstance-dispose.md)
