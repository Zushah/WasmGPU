# createLatticeSpace#setMaskBuffer

## Summary

`createLatticeSpace#setMaskBuffer()` replaces the optional activity mask with an external GPU buffer, or removes it with `null`.
A non-null buffer is borrowed unless `{ ownBuffer: true }` is supplied and must have storage usage and at least one `u32` entry per cell.

## Syntax

```ts
LatticeSpace.setMaskBuffer(buffer: GPUBuffer | null, options?: { ownBuffer?: boolean }): void
```

## Notes

A non-null buffer must hold at least `cellCount * 4` bytes and must have been created with `GPUBufferUsage.STORAGE`. The setter checks the size but not the usage flags. It is borrowed unless `ownBuffer: true`; replacing or clearing an owned buffer destroys it.

## See Also

- [createLatticeSpace#maskBuffer](./createlatticespace-maskbuffer.md)
- [createLatticeSpace#setMask](./createlatticespace-setmask.md)
