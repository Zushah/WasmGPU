# WasmGPU.createControls.navigation().fitToBounds

## Summary
WasmGPU.createControls.navigation().fitToBounds frames an explicit bounds source (not necessarily a full scene).
The method accepts either raw `Bounds3` data or any object implementing `getBounds()`.
It updates camera pose/projection and returns the normalized bounds used by the solver.

## Syntax
```ts
WasmGPU.createControls.navigation().fitToBounds(source: BoundsLike | Scene, options?: FitToBoundsOptions): Bounds3
const bounds = controls.fitToBounds(source, options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `source` | `BoundsLike \| Scene` | Yes | Bounds provider, explicit bounds object, or scene. |
| `options` | `FitToBoundsOptions` | No | Optional fit strategy, orientation, clipping, and animation controls. |

## Returns
`Bounds3` - Normalized bounds actually used for fitting.

## Type Details
```ts
type BoundsLike = Bounds3 | { getBounds(): Bounds3 };

type FitToBoundsOptions = {
    padding?: number;
    boundsMode?: "box" | "sphere";
    aspect?: number;
    minNear?: number;
    animate?: boolean;
    duration?: number;
    view?: "front" | "back" | "left" | "right" | "top" | "bottom";
    eyeDirection?: [number, number, number];
    up?: [number, number, number];
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.orthographic({ left: -1, right: 1, top: 1, bottom: -1, near: 0.01, far: 1000 });
const controls = wgpu.createControls.navigation(camera, canvas, { mode: "orbit", target: [0, 0, 0] });

const roi = {
    boxMin: [-3, -2, -1],
    boxMax: [4, 5, 2],
    sphereCenter: [0.5, 1.5, 0.5],
    sphereRadius: 5.0,
    empty: false,
    partial: false
};
controls.fitToBounds(roi, { padding: 1.15, animate: true, duration: 0.35, view: "right" });

wgpu.run((dt) => {
    controls.update(dt);
    wgpu.render(scene, camera);
});
```

## See Also
- [WasmGPU.createControls.navigation().fitScene](./wasmgpu-createcontrols-navigation-fitscene.md)
- [WasmGPU.createControls.navigation().viewBounds](./wasmgpu-createcontrols-navigation-viewbounds.md)
- [WasmGPU.createControls.navigation().setView](./wasmgpu-createcontrols-navigation-setview.md)
