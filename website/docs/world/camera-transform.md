# Camera.transform

## Summary
Camera.transform exposes the camera's `Transform` object for position, rotation, and hierarchy operations. Most camera motion workflows should update this transform directly. View and view-projection matrices are derived from its world matrix.

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
- [Camera.position](./camera-position.md)
- [Camera.lookAt](./camera-lookat.md)
- [Camera.viewMatrix](./camera-viewmatrix.md)
