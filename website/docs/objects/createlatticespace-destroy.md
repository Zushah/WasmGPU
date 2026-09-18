# createLatticeSpace#destroy

## Summary

`createLatticeSpace#destroy()` disposes the transform, listeners, retained data, WebAssembly references, uniforms, and GPU buffers owned by the space. Borrowed GPU buffers and producer-owned WebAssembly allocations survive, and the call does not remove the space from its scene.

## Syntax

```ts
LatticeSpace.destroy(): void
```

## Notes

Borrowed buffers and WebAssembly allocations are not destroyed. The method does not detach the object from a scene; remove it first or let `Scene.destroy()` handle attached spaces.

## See Also

- [createScene#remove](../world/createscene-remove.md)
- [createScene#destroy](../world/createscene-destroy.md)
