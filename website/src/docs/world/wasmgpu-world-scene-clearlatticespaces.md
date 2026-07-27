# Scene.clearLatticeSpaces

## Summary

`Scene.clearLatticeSpaces()` detaches every lattice space while leaving other scene families unchanged. Detached spaces are not destroyed.

## Syntax

```ts
Scene.clearLatticeSpaces(): Scene
scene.clearLatticeSpaces();
```

## Returns

`Scene` - The same scene instance.

## Notes

Call `destroy()` on spaces whose resources are no longer needed, or let `Scene.destroy()` destroy spaces that remain attached.

## See Also

- [Scene.latticeSpaces](./wasmgpu-world-scene-latticespaces.md)
- [Scene.clear](./wasmgpu-world-scene-clear.md)
