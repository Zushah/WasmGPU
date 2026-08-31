# ShadowSystem.filter

## Summary
ShadowSystem.filter selects hard comparison sampling or percentage-closer filtering for received shadows. The default is `"pcf"`.

## Syntax
```ts
ShadowSystem.filter: "hard" | "pcf"
wgpu.effects.shadows.filter = "hard";
```

## Parameters
This property does not take call parameters; assign `"hard"` or `"pcf"` to set it.

## Returns
`"hard" | "pcf"` - Current receiver filtering mode. The default is `"pcf"`.

## Type Details
```ts
type ShadowFilter = "hard" | "pcf";
```

`"hard"` performs one depth comparison per shadow lookup. `"pcf"` selects the renderer's percentage-closer-filtered receiver path. Changing the filter increments `revision` but does not mark stored shadow-map contents dirty.

## Example
```js
const shadows = wgpu.effects.shadows;
shadows.filter = "hard";
console.log(shadows.filter); // hard
```

## Notes
Changing the filter changes the receiver pipeline variant but does not require regenerating a manual-update shadow map.

## See Also
- [ShadowSystem.depthBias](./shadowsystem-depthbias.md)
- [ShadowSystem.enable](./shadowsystem-enable.md)
- [RenderEffects.shadows](./rendereffects-shadows.md)
