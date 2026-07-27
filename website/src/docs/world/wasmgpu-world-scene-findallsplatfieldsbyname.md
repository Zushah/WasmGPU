# Scene.findAllSplatFieldsByName

## Summary

`Scene.findAllSplatFieldsByName()` returns every attached splat field whose `name` exactly matches the requested string.

## Syntax

```ts
Scene.findAllSplatFieldsByName(name: string): SplatField[]
```

## Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | Yes | Exact field name to find. |

## Returns

`SplatField[]` - Matching fields in insertion order; the array is empty when nothing matches.

## See Also

- [Scene.findSplatFieldByName](./wasmgpu-world-scene-findsplatfieldbyname.md)
- [Scene.splatFields](./wasmgpu-world-scene-splatfields.md)
