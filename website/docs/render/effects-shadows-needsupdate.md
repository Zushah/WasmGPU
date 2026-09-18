# effects.shadows.needsUpdate

## Summary
effects.shadows.needsUpdate reports whether an enabled directional light's shadow map is marked dirty.

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
Unknown or disabled lights return `false`. New and reconfigured lights start dirty; map-size, view-count, and raster depth-bias changes mark all lights dirty. A light returns to `false` after its shadow-map layer is updated. Filter changes do not dirty the stored depth maps.

## Example
```js
const shadows = wgpu.effects.shadows;
shadows.enable(sun, { updateMode: "manual" });
console.log(shadows.needsUpdate(sun)); // true

// After a render updates the shadow map, request another manual refresh.
shadows.requestUpdate(sun);
```

## Notes
This is most useful with `updateMode: "manual"`. An `"always"` light is regenerated whenever rendered even when its dirty flag is `false`.

## See Also
- [effects.shadows.requestUpdate](./effects-shadows-requestupdate.md)
- [effects.shadows.enable](./effects-shadows-enable.md)
