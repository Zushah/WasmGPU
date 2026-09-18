# createControls.navigation#distance

## Summary
createControls.navigation#distance gets or sets camera-target distance in world units.
In orbit mode this is the spherical radius; in trackball mode the eye vector magnitude is rescaled.

## Syntax
```ts
WasmGPU.createControls.navigation().distance: number
controls.distance = distance;
const distance = controls.distance;
```

## Parameters
This accessor does not take call parameters.

## Returns
`number` - Current control distance value.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const camera = wgpu.createCamera.perspective({ fov: 55, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const controls = wgpu.createControls.navigation(camera, canvas, { minDistance: 0.5, maxDistance: 500 });

controls.distance = 25;
controls.update(1 / 60);
console.log(controls.distance);
```

## See Also
- [createControls.navigation#zoom](./createcontrols-navigation-zoom.md)
- [createControls.navigation#setTarget](./createcontrols-navigation-settarget.md)
