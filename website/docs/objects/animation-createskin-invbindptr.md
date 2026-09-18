# animation.createSkin#invBindPtr

## Summary
animation.createSkin#invBindPtr returns the pointer to `jointCount * 16` packed inverse-bind-matrix `f32` values in Wasm memory. Access after `dispose()` throws.

## Syntax
```ts
Skin.invBindPtr: WasmPtr
```

## Returns
`WasmPtr`

## See Also
- [animation.createSkin#jointIndicesPtr](./animation-createskin-jointindicesptr.md)
- [animation.createSkin#dispose](./animation-createskin-dispose.md)
