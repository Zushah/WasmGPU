# Scene.splatFields

## Summary

`Scene.splatFields` returns every `SplatField` attached to the scene, in insertion order. The returned collection includes invisible fields.

## Syntax

```ts
Scene.splatFields: readonly SplatField[]
const fields = scene.splatFields;
```

## Returns

`readonly SplatField[]` - The scene's current splat fields. Treat the array as read-only and use `Scene.add`, `Scene.remove`, or `Scene.clearSplatFields` to change membership.

## See Also

- [Scene.visibleSplatFields](./scene-visiblesplatfields.md)
- [Scene.clearSplatFields](./scene-clearsplatfields.md)
- [WasmGPU.createSplatField](../objects/wasmgpu-createsplatfield.md)
