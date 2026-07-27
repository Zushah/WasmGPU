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
- [Skin.jointIndicesPtr](./wasmgpu-objects-skin-jointindicesptr.md)
- [Skin.dispose](./wasmgpu-objects-skin-dispose.md)
