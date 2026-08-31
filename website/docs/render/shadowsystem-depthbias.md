# ShadowSystem.depthBias

## Summary
ShadowSystem.depthBias configures the integer depth bias used while rendering all directional shadow maps. The default is `1`.

## Syntax
```ts
ShadowSystem.depthBias: number
wgpu.effects.shadows.depthBias = 2;
```

## Parameters
This property does not take call parameters; assign a signed 32-bit integer to set it.

## Returns
`number` - Current constant depth-bias value. The default is `1`.

## Type Details
Accepted values are integers from `-2147483648` through `2147483647`. Changing the value increments `revision`, rebuilds shared shadow resources on demand, and marks every enabled shadow dirty.

## Example
```js
const shadows = wgpu.effects.shadows;
shadows.depthBias = 2;
console.log(shadows.depthBias); // 2
```

## Notes
The value must be a signed 32-bit integer. Changing it rebuilds shadow resources and marks enabled shadows dirty.

## See Also
- [ShadowSystem.depthBiasSlopeScale](./shadowsystem-depthbiasslopescale.md)
- [ShadowSystem.depthBiasClamp](./shadowsystem-depthbiasclamp.md)
- [ShadowSystem.enable](./shadowsystem-enable.md)
