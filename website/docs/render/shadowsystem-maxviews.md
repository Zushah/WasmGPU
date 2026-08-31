# ShadowSystem.maxViews

## Summary
ShadowSystem.maxViews sets the maximum number of enabled directional lights that can receive shadow-map array layers. The default is `4`.

## Syntax
```ts
ShadowSystem.maxViews: number
wgpu.effects.shadows.maxViews = 2;
```

## Parameters
This property does not take call parameters; assign a positive integer to set it.

## Returns
`number` - Maximum number of directional shadow views. The default is `4`.

## Type Details
The value cannot exceed the active device's `maxTextureArrayLayers`. Changing it increments `revision`, invalidates shared shadow-map resources, and marks all enabled lights dirty. It limits renderable shadow views; it does not itself enable or disable lights.

## Example
```js
const shadows = wgpu.effects.shadows;
shadows.maxViews = Math.min(8, wgpu.gpu.device.limits.maxTextureArrayLayers);
console.log(shadows.maxViews);
```

## Notes
The value must be a positive integer no greater than the device's `maxTextureArrayLayers` limit. Changing it rebuilds shadow resources and marks enabled shadows dirty.

## See Also
- [ShadowSystem.mapSize](./shadowsystem-mapsize.md)
- [ShadowSystem.enable](./shadowsystem-enable.md)
- [RenderEffects.shadows](./rendereffects-shadows.md)
