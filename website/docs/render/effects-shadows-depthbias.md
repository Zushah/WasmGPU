# effects.shadows.depthBias

## Summary
effects.shadows.depthBias configures the integer depth bias used while rendering all directional shadow maps. The default is `1`.

## Syntax
```ts
ShadowSystem.depthBias: number
wgpu.effects.shadows.depthBias = 2;
```

## Returns
`number` - Current constant depth-bias value. The default is `1`.

## Notes
Accepted values are integers from `-2147483648` through `2147483647`. Changing the value increments `revision`, affects subsequent shadow rendering, and marks every enabled shadow dirty. It does not resize or replace the shadow-map texture.

## See Also
- [effects.shadows.depthBiasSlopeScale](./effects-shadows-depthbiasslopescale.md)
- [effects.shadows.depthBiasClamp](./effects-shadows-depthbiasclamp.md)
- [effects.shadows.enable](./effects-shadows-enable.md)
