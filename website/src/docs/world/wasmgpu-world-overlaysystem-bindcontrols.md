# OverlaySystem.bindControls

## Summary
OverlaySystem.bindControls wires camera-change and interaction-state signals from navigation controls into overlay invalidation. Passing `null` detaches existing bindings. This keeps overlay layers synchronized during user navigation without manual update calls.

## Syntax
```ts
OverlaySystem.bindControls(controls: NavigationControls | null | undefined): OverlaySystem
const result = overlay.bindControls(controls);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `controls` | `NavigationControls \| null \| undefined` | Yes | Controls instance to subscribe to, or `null`/`undefined` to unbind. |

## Returns
`OverlaySystem` - The same overlay system instance after rebinding.

## Type Details
```ts
type NavigationControls = {
    onChange?: (listener: () => void) => (() => void);
    onInteractionState?: (listener: (active: boolean) => void) => (() => void);
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const camera = wgpu.createCamera.perspective({ aspect: canvas.clientWidth / canvas.clientHeight });
const controls = wgpu.createControls.fly(camera, canvas, { moveSpeed: 8 });
const overlay = wgpu.createOverlay.system({ camera });
overlay.bindControls(controls);
```

## See Also
- [OverlaySystem.setView](./wasmgpu-world-overlaysystem-setview.md)
- [OverlaySystem.setInteractionActive](./wasmgpu-world-overlaysystem-setinteractionactive.md)
- [OverlaySystem.update](./wasmgpu-world-overlaysystem-update.md)
- [WasmGPU.createControls.fly](../interact/wasmgpu-createcontrols-fly.md)
