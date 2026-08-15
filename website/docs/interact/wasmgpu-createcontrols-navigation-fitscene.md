# WasmGPU.createControls.navigation().fitScene

## Summary
WasmGPU.createControls.navigation().fitScene computes a camera pose/projection that frames the provided scene bounds.
It applies the solved pose immediately or as an animated transition, depending on options.
The returned `Bounds3` is the resolved scene bounds used for the fit.

## Syntax
```ts
WasmGPU.createControls.navigation().fitScene(scene: Scene, options?: FitToBoundsOptions): Bounds3
const bounds = controls.fitScene(scene, options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `scene` | `Scene` | Yes | Scene whose aggregate bounds are used as fit target. |
| `options` | `FitToBoundsOptions` | No | Fit policy for padding, projection constraints, orientation, and animation. |

## Returns
`Bounds3` - Resolved bounds object used by the fit solver.

## Type Details
```ts
type FitToBoundsOptions = {
    padding?: number; // default: 1.1, clamped >= 1
    boundsMode?: "box" | "sphere"; // default: "box"
    aspect?: number; // defaults to viewport aspect
    minNear?: number;
    animate?: boolean;
    duration?: number;
    view?: "front" | "back" | "left" | "right" | "top" | "bottom";
    eyeDirection?: [number, number, number];
    up?: [number, number, number];
};

type Bounds3 = {
    boxMin: [number, number, number];
    boxMax: [number, number, number];
    sphereCenter: [number, number, number];
    sphereRadius: number;
    empty: boolean;
    partial: boolean;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ fov: 60, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 2000 });
const controls = wgpu.createControls.navigation(camera, canvas, { mode: "orbit", target: [0, 0, 0] });

const resolved = controls.fitScene(scene, {
    padding: 1.2,
    boundsMode: "sphere",
    animate: true,
    duration: 0.5,
    view: "front"
});
console.log(resolved.sphereRadius, resolved.partial);
```

## See Also
- [WasmGPU.createControls.navigation().fitToBounds](./wasmgpu-createcontrols-navigation-fittobounds.md)
- [WasmGPU.createControls.navigation().viewBounds](./wasmgpu-createcontrols-navigation-viewbounds.md)
- [WasmGPU.createControls.navigation().setView](./wasmgpu-createcontrols-navigation-setview.md)
