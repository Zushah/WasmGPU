# ShadowSystem.mapSize

## Summary
ShadowSystem.mapSize controls the width and height, in pixels, of every directional shadow-map layer. The default is `1024`. Changing it rebuilds shadow resources and marks enabled shadows dirty.

## Syntax
```ts
ShadowSystem.mapSize: number
wgpu.effects.shadows.mapSize = 2048;
```

## Parameters
This property does not take call parameters; assign a positive integer to set it.

## Returns
`number` - Width and height of each square shadow-map layer in pixels. The default is `1024`.

## Type Details
The value cannot exceed the active device's `maxTextureDimension2D`. Changing it increments `revision`, invalidates shared shadow-map resources, and marks all enabled lights dirty. Memory and shadow-rendering cost grow with the square of this value.

## Example
```js
const shadows = wgpu.effects.shadows;
shadows.mapSize = Math.min(2048, wgpu.gpu.device.limits.maxTextureDimension2D);
console.log(`${shadows.mapSize} x ${shadows.mapSize}`);
```

## Notes
The value must be a positive integer no greater than the device's `maxTextureDimension2D` limit. Larger maps improve spatial detail while consuming more memory and rendering work.

## See Also
- [ShadowSystem.maxViews](./shadowsystem-maxviews.md)
- [ShadowSystem.filter](./shadowsystem-filter.md)
- [RenderEffects.shadows](./rendereffects-shadows.md)
