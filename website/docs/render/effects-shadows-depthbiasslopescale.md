# effects.shadows.depthBiasSlopeScale

## Summary
effects.shadows.depthBiasSlopeScale configures slope-scaled depth bias for all directional shadow maps. The default is `1.5`.

## Syntax
```ts
ShadowSystem.depthBiasSlopeScale: number
wgpu.effects.shadows.depthBiasSlopeScale = 2.25;
```

## Returns
`number` - Current slope-scale depth bias. The default is `1.5`.

## Notes
The value must be finite and representable as f32. Changing it increments `revision`, affects subsequent shadow rendering, and marks every enabled shadow dirty. It does not resize or replace the shadow-map texture.

## See Also
- [effects.shadows.depthBias](./effects-shadows-depthbias.md)
- [effects.shadows.depthBiasClamp](./effects-shadows-depthbiasclamp.md)
