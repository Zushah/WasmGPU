# effects.shadows.maxViews

## Summary
effects.shadows.maxViews sets the maximum number of enabled directional lights that can receive shadow-map array layers. The default is `4`.

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

On each render, eligible enabled directional lights are considered in scene light order and the first `maxViews` receive array layers. Configurations beyond the limit remain enabled and retain their dirty state.

## Example
```js
const shadows = wgpu.effects.shadows;
shadows.maxViews = Math.min(8, wgpu.gpu.device.limits.maxTextureArrayLayers);
console.log(shadows.maxViews);
```

## Notes
The value must be a positive integer no greater than the device's `maxTextureArrayLayers` limit. Changing it rebuilds shadow resources and marks enabled shadows dirty.

## See Also
- [effects.shadows.mapSize](./effects-shadows-mapsize.md)
- [effects.shadows.enable](./effects-shadows-enable.md)
- [effects.shadows](./effects-shadows.md)
