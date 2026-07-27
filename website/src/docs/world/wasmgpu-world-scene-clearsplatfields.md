# Scene.clearSplatFields

## Summary

`Scene.clearSplatFields()` detaches every splat field while leaving other scene families unchanged. Detached fields are not destroyed.

## Syntax

```ts
Scene.clearSplatFields(): Scene
scene.clearSplatFields();
```

## Returns

`Scene` - The same scene instance.

## Notes

Call `destroy()` on fields whose resources are no longer needed, or let `Scene.destroy()` destroy fields that remain attached.

## See Also

- [Scene.splatFields](./wasmgpu-world-scene-splatfields.md)
- [Scene.clear](./wasmgpu-world-scene-clear.md)
