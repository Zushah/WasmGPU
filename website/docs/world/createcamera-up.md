# createCamera#up

## Summary
createCamera#up returns the camera up direction extracted from its world transform matrix. This is the orientation up axis currently driving view construction. Read it when you need camera-aligned billboard, HUD, or interaction behavior.

## Syntax
```ts
Camera.up: [number, number, number]
const up = camera.up;
```

## Parameters
This property does not take parameters.

## Returns
`[number, number, number]` - Current world-space up direction of the camera.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const camera = wgpu.createCamera.perspective({ aspect: canvas.clientWidth / canvas.clientHeight });
camera.lookAtWithUp([0, 0, 0], [0, 0, 1]);
const up = camera.up;
console.log(up);
```

## See Also
- [createCamera#lookAt](./createcamera-lookat.md)
- [createCamera#lookAtWithUp](./createcamera-lookatwithup.md)
- [createCamera#position](./createcamera-position.md)
