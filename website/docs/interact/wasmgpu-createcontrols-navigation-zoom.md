# WasmGPU.createControls.navigation().zoom

## Summary
WasmGPU.createControls.navigation().zoom gets or sets the orthographic zoom scalar used by navigation controls.
For perspective cameras, zoom behavior is primarily represented by `distance`; this value is still maintained on the controls object.

## Syntax
```ts
WasmGPU.createControls.navigation().zoom: number
controls.zoom = zoom;
const zoom = controls.zoom;
```

## Parameters
This accessor does not take call parameters.

## Returns
`number` - Current zoom scalar clamped to `minZoom..maxZoom`.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const camera = wgpu.createCamera.orthographic({ left: -5, right: 5, top: 5, bottom: -5, near: 0.01, far: 1000 });
const controls = wgpu.createControls.navigation(camera, canvas, { minZoom: 0.2, maxZoom: 8 });

controls.zoom = 2.5;
controls.update(1 / 60);
```

## See Also
- [WasmGPU.createControls.navigation().distance](./wasmgpu-createcontrols-navigation-distance.md)
- [WasmGPU.createControls.navigation().setView](./wasmgpu-createcontrols-navigation-setview.md)
