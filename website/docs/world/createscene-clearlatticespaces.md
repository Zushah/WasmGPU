# createScene#clearLatticeSpaces

## Summary

`createScene#clearLatticeSpaces()` detaches every lattice space while leaving other scene families unchanged. Detached spaces are not destroyed.

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

- [createScene#latticeSpaces](./createscene-latticespaces.md)
- [createScene#clear](./createscene-clear.md)
