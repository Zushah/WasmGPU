# ShadowSystem.revision

## Summary
ShadowSystem.revision is a monotonically increasing configuration revision used to detect changes that affect shadow rendering.

## Syntax
```ts
ShadowSystem.revision: number
```

## Parameters
This read-only property does not take parameters.

## Returns
`number` - Current shadow-system configuration revision.

## Type Details
The revision increments when a light is enabled or disabled, when configured lights are cleared during destruction, or when a system property changes. Assigning the current value to a property is a no-op. The counter is intended for equality-based cache invalidation, not as a timestamp or stable identifier.

## Example
```js
const shadows = wgpu.effects.shadows;
const before = shadows.revision;
shadows.mapSize = 2048;

if (shadows.revision !== before) {
  console.log("shadow configuration changed");
}
```

## Notes
The revision changes when lights are enabled or disabled and when system configuration changes. Do not interpret its numeric value beyond change detection.

## See Also
- [RenderEffects.shadows](./rendereffects-shadows.md)
- [ShadowSystem.enable](./shadowsystem-enable.md)
