# ShadowSystem.needsUpdate

## Summary
ShadowSystem.needsUpdate reports whether an enabled directional light's shadow map is marked dirty.

## Syntax
```ts
ShadowSystem.needsUpdate(light: DirectionalLight): boolean
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `light` | `DirectionalLight` | Yes | Directional light whose dirty state should be queried. |

## Returns
`boolean` - `true` when the enabled light's shadow map is dirty; otherwise `false`.

## Type Details
Unknown or disabled lights return `false`. New and reconfigured lights start dirty, global resource-setting changes mark all lights dirty, and the renderer clears a light's flag after successfully updating its shadow map.

## Example
```js
const shadows = wgpu.effects.shadows;
shadows.enable(sun, { updateMode: "manual" });
console.log(shadows.needsUpdate(sun)); // true

// After a render updates the shadow map, request another manual refresh.
shadows.requestUpdate(sun);
```

## Notes
This is most useful with `updateMode: "manual"`. Rendering clears the dirty flag after updating the map.

## See Also
- [ShadowSystem.requestUpdate](./shadowsystem-requestupdate.md)
- [ShadowSystem.enable](./shadowsystem-enable.md)
