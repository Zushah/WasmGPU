# Scene.findSplatFieldByName

## Summary

`Scene.findSplatFieldByName()` returns the first attached splat field whose `name` exactly matches the requested string.

## Syntax

```ts
Scene.findSplatFieldByName(name: string): SplatField | undefined
```

## Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | Yes | Exact field name to find. |

## Returns

`SplatField | undefined` - The first match in insertion order, or `undefined`.

## See Also

- [Scene.findAllSplatFieldsByName](./wasmgpu-world-scene-findallsplatfieldsbyname.md)
- [Scene.splatFields](./wasmgpu-world-scene-splatfields.md)
