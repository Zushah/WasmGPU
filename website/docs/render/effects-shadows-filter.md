# effects.shadows.filter

## Summary
effects.shadows.filter selects hard comparison sampling or percentage-closer filtering for received shadows. The default is `"pcf"`.

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

`"hard"` uses nearest comparison sampling. `"pcf"` uses linear percentage-closer filtering. Changing the filter increments `revision` and affects subsequent shadow sampling, but does not mark stored shadow-map contents dirty.

## Example
```js
const shadows = wgpu.effects.shadows;
shadows.filter = "hard";
console.log(shadows.filter); // hard
```

## Notes
Changing the filter does not require regenerating a manual-update shadow map.

## See Also
- [effects.shadows.depthBias](./effects-shadows-depthbias.md)
- [effects.shadows.enable](./effects-shadows-enable.md)
- [effects.shadows](./effects-shadows.md)
