# Skin.invBindPtr

## Summary
Skin.invBindPtr returns the pointer to `jointCount * 16` packed inverse-bind-matrix `f32` values in Wasm memory. Access after `dispose()` throws.

## Syntax
```ts
Skin.invBindPtr: WasmPtr
```

## Returns
`WasmPtr`

## See Also
- [Skin.jointIndicesPtr](./skin-jointindicesptr.md)
- [Skin.dispose](./skin-dispose.md)
