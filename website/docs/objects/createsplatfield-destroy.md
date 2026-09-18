# createSplatField#destroy

## Summary

`createSplatField#destroy()` disposes the transform, retained CPU/WebAssembly references, uniforms, and GPU buffers owned by the field. Borrowed GPU buffers and producer-owned WebAssembly allocations survive, and the call does not remove the field from its scene.

## Syntax

```ts
SplatField.destroy(): void
```

## Notes

Borrowed buffers and WebAssembly allocations are not destroyed. Buffers passed with `ownBuffers: true` are destroyed. The method does not detach the field from a scene; remove it first or let `Scene.destroy()` handle attached fields.

## See Also

- [createScene#remove](../world/createscene-remove.md)
- [createScene#destroy](../world/createscene-destroy.md)
