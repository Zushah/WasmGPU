# WasmGPU.createControls.fly

## Summary

Creates `FlyControls`, a free-flight camera controller with keyboard translation, pointer look, roll, wheel-adjusted movement speed, optional pointer lock, damping, and configurable axis conventions.

Call `update(dtSeconds)` every frame and call `dispose()` when finished so keyboard, pointer, wheel, pointer-lock, and document listeners are removed.

## Syntax

```ts
WasmGPU.createControls.fly(
    camera: Camera,
    domElement: HTMLCanvasElement,
    options?: FlyControlsDescriptor
): FlyControls
```

`FlyControlsDescriptor` aliases `NavigationControlsDescriptor`. Fly-specific options and their defaults are:

```ts
type FlyControlsYawMode = "global" | "local";

type FlyControlsKeyMap = {
    forward?: readonly string[];
    backward?: readonly string[];
    left?: readonly string[];
    right?: readonly string[];
    up?: readonly string[];
    down?: readonly string[];
    rollLeft?: readonly string[];
    rollRight?: readonly string[];
    fast?: readonly string[];
    slow?: readonly string[];
};
```

| Option/property | Default | Meaning |
| --- | --- | --- |
| `enableKeyboard`, `enablePointer`, `enableWheel` | `true` | Enable each input family. |
| `moveSpeed` | `10` | Base world-units-per-second translation speed. |
| `lookSpeed` | `0.002` | Pointer-look radians per movement unit. |
| `rollSpeed` | `1.5` | Keyboard roll radians per second. |
| `fastMultiplier`, `slowMultiplier` | `4`, `0.25` | Modifier-key speed multipliers. |
| `wheelSpeedFactor` | `1.1` | Multiplicative speed change per wheel step. |
| `minMoveSpeed`, `maxMoveSpeed` | `0.001`, `Infinity` | Speed bounds. |
| `invertY` | `false` | Invert pointer pitch. |
| `yawMode` | `"global"` | `"global"` uses the configured global up axis; `"local"` uses camera up. |
| `mouseButton` | `0` | Pointer-look button. |
| `pointerLock` | `false` | `true`/`"on-click"`, `"on-drag"`, or disabled. |
| `keyboardTarget` | `window` in fly mode | Event target, or `null` to disable attachment. |
| `preventDefaultKeys` | `false` | Prevent defaults for mapped non-editable targets. |

The default `keyMap` uses W/Up and S/Down for forward/backward, A/Left and D/Right for lateral motion, E/Q for up/down, Z/C for roll, Shift for fast, and Alt for slow. `FlyControlsKeyMap` can replace each action’s code list.

## Example

```js
const controls = wgpu.createControls.fly(camera, canvas, {
    moveSpeed: 8,
    pointerLock: "on-click",
    yawMode: "global"
});

wgpu.run((dt) => {
    controls.update(dt);
    wgpu.render(scene, camera);
});
```

## See Also

- [WasmGPU.createControls.navigation](./wasmgpu-createcontrols-navigation.md)
- [NavigationControls.mode](./wasmgpu-interact-navigationcontrols-mode.md)
- [NavigationControls.update](./wasmgpu-interact-navigationcontrols-update.md)
- [NavigationControls.dispose](./wasmgpu-interact-navigationcontrols-dispose.md)
