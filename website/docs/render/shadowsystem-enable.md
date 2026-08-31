# ShadowSystem.enable

## Summary
ShadowSystem.enable enables shadow mapping for a `DirectionalLight` and stores its per-light bias, range, update mode, and optional fixed volume. Calling it again updates that light's configuration and marks its map dirty.

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
- [ShadowSystem.requestUpdate](./shadowsystem-requestupdate.md)
- [ShadowSystem.get](./shadowsystem-get.md)
- [Mesh.castShadow](../objects/mesh-castshadow.md)
