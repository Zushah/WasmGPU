# LatticeSpace.setMaskBuffer

## Summary

`LatticeSpace.setMaskBuffer()` replaces the optional activity mask with an external GPU buffer, or removes it with `null`.

## Syntax

```ts
LatticeSpace.setMaskBuffer(buffer: GPUBuffer | null, options?: { ownBuffer?: boolean }): void
```

## Notes

A non-null buffer must hold at least `cellCount * 4` bytes. It is borrowed unless `ownBuffer: true`.

## See Also

- [LatticeSpace.maskBuffer](./wasmgpu-objects-latticespace-maskbuffer.md)
- [LatticeSpace.setMask](./wasmgpu-objects-latticespace-setmask.md)
