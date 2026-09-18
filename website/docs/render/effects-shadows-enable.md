# effects.shadows.enable

## Summary
effects.shadows.enable enables shadow mapping for a `DirectionalLight` and stores its per-light bias, range, update mode, and optional fixed volume. Calling it again updates that light's configuration and marks its map dirty.

## Syntax
```ts
ShadowSystem.enable(light: DirectionalLight, descriptor?: DirectionalShadowDescriptor): void
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `light` | `DirectionalLight` | Yes | Directional light that should cast a shadow map. |
| `descriptor` | `DirectionalShadowDescriptor` | No | Per-light bias, range, update policy, and optional fixed projection volume. |

## Returns
`void`

## Type Details
```ts
type DirectionalShadowDescriptor = {
    bias?: number;          // default 0.0005
    normalBias?: number;    // default 0.02
    distance?: number;      // default 100
    updateMode?: "always" | "manual";
    volume?: { center: [number, number, number]; width: number; height?: number; depth?: number } | null;
};
```

Without a fixed `volume`, the renderer fits the shadow view from the active camera and `distance`. A fixed volume defaults `height` to `width` and `depth` to twice `width`. Only directional lights are accepted.

The default update mode is `"always"`, which regenerates the map on every render that uses the light. In `"manual"` mode, scene, camera, transform, or light changes do not request a refresh automatically; call `requestUpdate()` after such changes. Re-enabling an already configured light preserves any descriptor fields that are omitted, applies supplied fields, marks the map dirty, and increments `revision`. Pass `volume: null` to return to automatic camera fitting.

`bias` and `normalBias` must be finite and non-negative, `distance` and all volume dimensions must be finite and positive, and `volume.center` must contain three finite numbers.

## Example
```js
wgpu.effects.shadows.enable(sun, {
    bias: 0.0003,
    normalBias: 0.015,
    distance: 24,
    updateMode: "manual"
});
```

## See Also
- [effects.shadows.requestUpdate](./effects-shadows-requestupdate.md)
- [effects.shadows.get](./effects-shadows-get.md)
- [createMesh#castShadow](../objects/createmesh-castshadow.md)
