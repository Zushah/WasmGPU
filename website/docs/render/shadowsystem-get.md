# ShadowSystem.get

## Summary
ShadowSystem.get returns a detached snapshot of one directional light's public shadow configuration.

## Syntax
```ts
ShadowSystem.get(light: DirectionalLight): DirectionalShadowConfiguration | null
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `light` | `DirectionalLight` | Yes | Directional light whose shadow configuration should be read. |

## Returns
The configured `bias`, `normalBias`, `distance`, `updateMode`, and optional fixed `volume`, or `null` when the light is not enabled. Mutating the returned object does not change runtime state.

## Type Details
```ts
type DirectionalShadowConfiguration = {
    readonly bias: number;
    readonly normalBias: number;
    readonly distance: number;
    readonly updateMode: "always" | "manual";
    readonly volume: Readonly<{
        center: [number, number, number];
        width: number;
        height?: number;
        depth?: number;
    }> | null;
};
```

The returned object is a detached public snapshot, including a copied volume center tuple. Read it again after reconfiguring the light.

## Example
```js
const shadows = wgpu.effects.shadows;
shadows.enable(sun, { distance: 40, updateMode: "manual" });

const configuration = shadows.get(sun);
console.log(configuration?.distance); // 40
```

## See Also
- [ShadowSystem.enable](./shadowsystem-enable.md)
- [ShadowSystem.isEnabled](./shadowsystem-isenabled.md)
- [ShadowSystem.needsUpdate](./shadowsystem-needsupdate.md)
