# Camera.position

## Summary
Camera.position returns the camera world position derived from its transform hierarchy. Read this property when implementing custom controls, overlays, or diagnostics that depend on eye position. Write position via `camera.transform.setPosition(...)`.

## Syntax
```ts
Camera.position: number[]
const position = camera.position;
```

## Parameters
This property does not take parameters.

## Returns
`number[]` - Current camera world position in `[x, y, z]` form.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

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
- [Camera.up](./camera-up.md)
- [Camera.viewMatrix](./camera-viewmatrix.md)
- [Camera.viewProjectionMatrix](./camera-viewprojectionmatrix.md)
