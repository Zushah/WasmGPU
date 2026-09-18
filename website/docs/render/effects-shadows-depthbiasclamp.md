# effects.shadows.depthBiasClamp

## Summary
effects.shadows.depthBiasClamp limits the slope-scaled depth bias used for directional shadow-map rendering. The default is `0.0025`.

## Syntax
```ts
ShadowSystem.depthBiasClamp: number
wgpu.effects.shadows.depthBiasClamp = 0.004;
```

## Returns
`number` - Current depth-bias clamp. The default is `0.0025`.

## Notes
The value must be finite and representable as f32. Changing it increments `revision`, affects subsequent shadow rendering, and marks every enabled shadow dirty. It does not resize or replace the shadow-map texture.

## See Also
- [effects.shadows.depthBias](./effects-shadows-depthbias.md)
- [effects.shadows.depthBiasSlopeScale](./effects-shadows-depthbiasslopescale.md)
