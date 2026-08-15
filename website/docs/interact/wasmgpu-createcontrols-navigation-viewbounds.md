# WasmGPU.createControls.navigation().viewBounds

## Summary
WasmGPU.createControls.navigation().viewBounds combines explicit view orientation with a bounds fit operation.
It is equivalent to fitting bounds while forcing one inspection view (front/back/left/right/top/bottom).
Use this for deterministic camera presets that still scale to arbitrary model extents.

## Syntax
```ts
WasmGPU.createControls.navigation().viewBounds(view: InspectionView, source: BoundsLike | Scene, options?: FitToBoundsOptions): Bounds3
const bounds = controls.viewBounds(view, source, options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `view` | `InspectionView` | Yes | Requested inspection orientation. |
| `source` | `BoundsLike \| Scene` | Yes | Bounds source to frame. |
| `options` | `FitToBoundsOptions` | No | Optional fit tuning; `view` in options is ignored in favor of the explicit `view` argument. |

## Returns
`Bounds3` - Normalized bounds used to compute the resulting camera view.

## Type Details
```ts
type InspectionView = "front" | "back" | "left" | "right" | "top" | "bottom";
type BoundsLike = Bounds3 | { getBounds(): Bounds3 };
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ fov: 52, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1500 });
const controls = wgpu.createControls.navigation(camera, canvas, { mode: "orbit" });

const box = {
    boxMin: [-8, -1, -3],
    boxMax: [8, 7, 5],
    sphereCenter: [0, 3, 1],
    sphereRadius: 9,
    empty: false,
    partial: false
};
controls.viewBounds("top", box, { padding: 1.05, animate: true, duration: 0.3 });
```

## See Also
- [WasmGPU.createControls.navigation().setView](./wasmgpu-createcontrols-navigation-setview.md)
- [WasmGPU.createControls.navigation().fitToBounds](./wasmgpu-createcontrols-navigation-fittobounds.md)
- [WasmGPU.createControls.navigation().fitScene](./wasmgpu-createcontrols-navigation-fitscene.md)
