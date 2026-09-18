# createLatticeSpace#setDataBuffer

## Summary

`createLatticeSpace#setDataBuffer()` replaces cell data with an external GPU storage buffer.
The buffer is borrowed unless `{ ownBuffer: true }` is supplied, and it must have storage usage and capacity for every packed cell record. The call clears CPU and WebAssembly data sources.

## Syntax

```ts
LatticeSpace.setDataBuffer(buffer: GPUBuffer, options?: { ownBuffer?: boolean }): void
```

## Notes

The buffer must hold at least `cellCount * componentCount * 4` bytes and must have been created with `GPUBufferUsage.STORAGE`. The setter checks the size but not the usage flags. It is borrowed unless `ownBuffer: true`; CPU and WebAssembly data references are cleared.

## See Also

- [createLatticeSpace#dataBuffer](./createlatticespace-databuffer.md)
- [createLatticeSpace#setData](./createlatticespace-setdata.md)
