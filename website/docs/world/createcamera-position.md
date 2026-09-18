# createCamera#position

## Summary
createCamera#position returns the camera world position derived from its transform hierarchy. Read this property when implementing custom controls, overlays, or diagnostics that depend on eye position. Use `camera.setWorldPosition(...)` to set world coordinates; `camera.transform.setPosition(...)` sets local coordinates and differs when the camera has a parent.

## Syntax
```ts
Camera.position: number[]
const position = camera.position;
```

## Parameters
This property does not take parameters.

## Returns
`number[]` - Current camera world position in `[x, y, z]` form.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const camera = wgpu.createCamera.perspective({ aspect: canvas.clientWidth / canvas.clientHeight });
camera.transform.setPosition(1.5, 2.0, 3.5);
const position = camera.position;
console.log(position);
```

## See Also
- [createCamera#up](./createcamera-up.md)
- [createCamera#viewMatrix](./createcamera-viewmatrix.md)
- [createCamera#viewProjectionMatrix](./createcamera-viewprojectionmatrix.md)
