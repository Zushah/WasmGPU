# LatticeSpace.setDataBuffer

## Summary

`LatticeSpace.setDataBuffer()` replaces cell data with an external GPU storage buffer.

## Syntax

```ts
LatticeSpace.setDataBuffer(buffer: GPUBuffer, options?: { ownBuffer?: boolean }): void
```

## Notes

The buffer must hold at least `cellCount * componentCount * 4` bytes. It is borrowed unless `ownBuffer: true`; CPU and WebAssembly data references are cleared.

## See Also

- [LatticeSpace.dataBuffer](./wasmgpu-objects-latticespace-databuffer.md)
- [LatticeSpace.setData](./wasmgpu-objects-latticespace-setdata.md)
