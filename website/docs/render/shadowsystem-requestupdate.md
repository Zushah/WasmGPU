# ShadowSystem.requestUpdate

## Summary
ShadowSystem.requestUpdate marks one or all enabled directional shadow maps dirty so they are regenerated on a later render.

## Syntax
```ts
ShadowSystem.requestUpdate(light?: DirectionalLight): void
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `light` | `DirectionalLight` | No | Enabled light to mark dirty. Omit it to mark every enabled light. |

## Returns
`void`

## Type Details
Passing an enabled light sets only that light's dirty flag. Passing an unknown or disabled light is a no-op. Omitting `light` marks every configured light dirty. The method does not render immediately or change `revision`.

## Example
```js
const shadows = wgpu.effects.shadows;
shadows.enable(sun, { updateMode: "manual" });

// Call after moving the light or changing scene content.
shadows.requestUpdate(sun);
console.log(shadows.needsUpdate(sun)); // true
```

## See Also
- [ShadowSystem.needsUpdate](./shadowsystem-needsupdate.md)
- [ShadowSystem.enable](./shadowsystem-enable.md)
