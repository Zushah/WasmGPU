# effects.shadows.isEnabled

## Summary
effects.shadows.isEnabled reports whether a directional light currently has shadow configuration in this engine.

## Syntax
```ts
ShadowSystem.isEnabled(light: DirectionalLight): boolean
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `light` | `DirectionalLight` | Yes | Light to query. |

## Returns
`boolean` - Whether the light is enabled for shadow mapping.

## Type Details
The result reflects whether this particular `ShadowSystem` stores configuration for the light. It does not inspect mesh cast/receive flags or whether the light is currently present in a scene.

## Example
```js
const shadows = wgpu.effects.shadows;
console.log(shadows.isEnabled(sun)); // false
shadows.enable(sun);
console.log(shadows.isEnabled(sun)); // true
```

## See Also
- [effects.shadows.enable](./effects-shadows-enable.md)
- [effects.shadows.disable](./effects-shadows-disable.md)
- [effects.shadows.get](./effects-shadows-get.md)
