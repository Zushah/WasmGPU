# animation.createSkin#jointIndicesPtr

## Summary
animation.createSkin#jointIndicesPtr returns the pointer to `jointCount` packed `u32` transform indices in Wasm memory. Access after `dispose()` throws.

## Syntax
```ts
Skin.jointIndicesPtr: WasmPtr
```

## Returns
`WasmPtr`

## See Also
- [animation.createSkin#invBindPtr](./animation-createskin-invbindptr.md)
- [animation.createSkin#dispose](./animation-createskin-dispose.md)
