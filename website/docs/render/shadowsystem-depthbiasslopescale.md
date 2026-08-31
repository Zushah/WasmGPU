# ShadowSystem.depthBiasSlopeScale

## Summary
ShadowSystem.depthBiasSlopeScale configures slope-scaled depth bias for all directional shadow maps. The default is `1.5`.

## Syntax
```ts
ShadowSystem.depthBiasSlopeScale: number
wgpu.effects.shadows.depthBiasSlopeScale = 2.25;
```

## Parameters
This property does not take call parameters; assign a finite `f32`-representable number to set it.

## Returns
`number` - Current slope-scale depth bias. The default is `1.5`.

## Type Details
The value maps to WebGPU's `depthBiasSlopeScale` render-pipeline state. Changing it increments `revision`, rebuilds shared shadow resources on demand, and marks every enabled shadow dirty.

## Example
```js
const shadows = wgpu.effects.shadows;
shadows.depthBiasSlopeScale = 2.25;
console.log(shadows.depthBiasSlopeScale);
```

## Notes
The value must be finite and representable as f32. Changing it rebuilds shadow resources and marks enabled shadows dirty.

## See Also
- [ShadowSystem.depthBias](./shadowsystem-depthbias.md)
- [ShadowSystem.depthBiasClamp](./shadowsystem-depthbiasclamp.md)
