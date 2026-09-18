# createCamera#transform

## Summary
createCamera#transform exposes the camera's `Transform` object for position, rotation, and hierarchy operations. Most camera motion workflows should update this transform directly. The view matrix is derived as a rigid inverse from the transform's world rotation and position; world scale is intentionally not part of the camera view.

## Syntax
```ts
Camera.transform: Transform
const transform = camera.transform;
```

## Parameters
This property does not take parameters.

## Returns
`Transform` - Mutable transform object controlling camera world pose.

## Type Details
```ts
// See render/transform docs for full Transform API surface.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const camera = wgpu.createCamera.perspective({ aspect: canvas.clientWidth / canvas.clientHeight });
camera.transform.setPosition(2, 1.5, 4);
camera.transform.setRotationEuler(0, 0, 0);
```

## See Also
- [createCamera#position](./createcamera-position.md)
- [createCamera#lookAt](./createcamera-lookat.md)
- [createCamera#viewMatrix](./createcamera-viewmatrix.md)
