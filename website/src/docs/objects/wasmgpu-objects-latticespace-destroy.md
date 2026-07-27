# LatticeSpace.destroy

## Summary

`LatticeSpace.destroy()` disposes the transform, listeners, retained data, WebAssembly references, uniforms, and object-owned GPU buffers.

## Syntax

```ts
LatticeSpace.destroy(): void
```

## Notes

Borrowed buffers and WebAssembly allocations are not destroyed. The method does not detach the object from a scene; remove it first or let `Scene.destroy()` handle attached spaces.

## See Also

- [Scene.remove](../world/wasmgpu-world-scene-remove.md)
- [Scene.destroy](../world/wasmgpu-world-scene-destroy.md)
