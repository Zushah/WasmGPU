# createOverlay.system#setView

## Summary
createOverlay.system#setView sets the active camera (required) and optional scene context used during layer updates. It invalidates camera-dependent overlay state immediately. Call this when switching cameras or scenes.

## Syntax
```ts
OverlaySystem.setView(camera: Camera, scene?: Scene | null): OverlaySystem
const result = overlay.setView(camera, scene);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `camera` | `Camera` | Yes | Active camera used for world-to-screen projection in overlays. |
| `scene` | `Scene \| null` | No | Optional scene context for layers that consume scene bounds/data. |

## Returns
`OverlaySystem` - The same overlay system instance after view reassignment.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ aspect: canvas.clientWidth / canvas.clientHeight });
const overlay = wgpu.createOverlay.system();
overlay.setView(camera, scene);
```

## See Also
- [createOverlay.system#update](./createoverlay-system-update.md)
- [createOverlay.system#bindControls](./createoverlay-system-bindcontrols.md)
- [createOverlay.system#invalidate](./createoverlay-system-invalidate.md)
