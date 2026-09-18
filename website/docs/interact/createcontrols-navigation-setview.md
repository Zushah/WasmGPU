# createControls.navigation#setView

## Summary
createControls.navigation#setView snaps or animates the camera to a canonical inspection view (`front`, `top`, etc.).
You can override target, distance, up vector, and animation duration. The transition advances only when `update(dtSeconds)` is called.
Use it for view-cube interactions and deterministic camera presets.

## Syntax
```ts
WasmGPU.createControls.navigation().setView(view: InspectionView, options?: SetViewOptions): this
controls.setView(view, options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `view` | `InspectionView` | Yes | Preset view direction to apply relative to the active axis convention. |
| `options` | `SetViewOptions` | No | Optional target/distance/up overrides and transition behavior. |

## Returns
`this` - Returns the same controls instance.

## Type Details
```ts
type InspectionView = "front" | "back" | "left" | "right" | "top" | "bottom";

type SetViewOptions = {
    target?: [number, number, number];
    distance?: number;
    up?: [number, number, number];
    animate?: boolean; // default: true
    duration?: number; // seconds, default: 0.35 when animated
    orthographic?: boolean; // accepted but currently has no supported effect
};
```

Pass `animate: false` for an immediate pose change. The `orthographic` option currently has no supported effect. To change projection type, create the desired camera and pass it to `setCamera()`.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ fov: 55, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const controls = wgpu.createControls.navigation(camera, canvas, { mode: "orbit", target: [0, 0, 0] });

document.getElementById("view-top").addEventListener("click", () => {
    controls.setView("top", { animate: true, duration: 0.4, distance: 12, up: [0, 0, -1] });
});

wgpu.run((dt) => {
    controls.update(dt);
    wgpu.render(scene, camera);
});
```

## See Also
- [createControls.navigation#fitScene](./createcontrols-navigation-fitscene.md)
- [createControls.navigation#fitToBounds](./createcontrols-navigation-fittobounds.md)
- [createControls.navigation#cancelTransition](./createcontrols-navigation-canceltransition.md)
