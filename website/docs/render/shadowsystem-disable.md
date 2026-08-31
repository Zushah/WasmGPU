# ShadowSystem.disable

## Summary
ShadowSystem.disable removes a directional light from shadow rendering.

## Syntax
```ts
ShadowSystem.disable(light: DirectionalLight): boolean
const removed = wgpu.effects.shadows.disable(sun);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `light` | `DirectionalLight` | Yes | Directional light to remove from shadow rendering. |

## Returns
`boolean` - `true` when the light was enabled and removed, otherwise `false`.

## Type Details
Removing an enabled light deletes its per-light shadow state and increments `revision`. Passing a light that is not enabled leaves the system unchanged and returns `false`; the light object itself is never destroyed.

## Example
```js
const shadows = wgpu.effects.shadows;
shadows.enable(sun);

console.log(shadows.disable(sun)); // true
console.log(shadows.disable(sun)); // false
```

## See Also
- [ShadowSystem.enable](./shadowsystem-enable.md)
- [ShadowSystem.isEnabled](./shadowsystem-isenabled.md)
