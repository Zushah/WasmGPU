# ShadowSystem.depthBiasClamp

## Summary
ShadowSystem.depthBiasClamp limits the slope-scaled depth bias used for directional shadow-map rendering. The default is `0.0025`.

## Syntax
```ts
ShadowSystem.depthBiasClamp: number
wgpu.effects.shadows.depthBiasClamp = 0.004;
```

## Parameters
This property does not take call parameters; assign a finite `f32`-representable number to set it.

## Returns
`number` - Current depth-bias clamp. The default is `0.0025`.

## Type Details
The value maps to WebGPU's `depthBiasClamp` render-pipeline state. Changing it increments `revision`, rebuilds shared shadow resources on demand, and marks every enabled shadow dirty.

## Example
```js
const shadows = wgpu.effects.shadows;
shadows.depthBiasClamp = 0.004;
console.log(shadows.depthBiasClamp);
```

## Notes
The value must be finite and representable as f32. Changing it rebuilds shadow resources and marks enabled shadows dirty.

## See Also
- [ShadowSystem.depthBias](./shadowsystem-depthbias.md)
- [ShadowSystem.depthBiasSlopeScale](./shadowsystem-depthbiasslopescale.md)
