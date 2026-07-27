# SplatField.destroy

## Summary

`SplatField.destroy()` disposes the transform, retained CPU/WebAssembly references, uniforms, and all object-owned GPU buffers.

## Syntax

```ts
SplatField.destroy(): void
```

## Notes

Borrowed buffers and WebAssembly allocations are not destroyed. Buffers passed with `ownBuffers: true` are destroyed. The method does not detach the field from a scene; remove it first or let `Scene.destroy()` handle attached fields.

## See Also

- [Scene.remove](../world/wasmgpu-world-scene-remove.md)
- [Scene.destroy](../world/wasmgpu-world-scene-destroy.md)
