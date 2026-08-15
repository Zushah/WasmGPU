# Camera.viewMatrix

## Summary
Camera.viewMatrix computes and returns the camera view matrix by inverting the camera world matrix. Use it for custom shader uniforms, CPU-side projection math, or overlay alignment. The matrix is recomputed from current transform state when accessed.

## Syntax
```ts
Camera.viewMatrix: number[]
const view = camera.viewMatrix;
```

## Parameters
This property does not take parameters.

## Returns
`number[]` - 4x4 view matrix in column-major array form (length 16).

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const camera = wgpu.createCamera.perspective({ aspect: canvas.clientWidth / canvas.clientHeight });
camera.transform.setPosition(0, 2, 5);
camera.lookAt(0, 0, 0);

const view = camera.viewMatrix;
console.log(view.length, view);
```

## See Also
- [Camera.viewProjectionMatrix](./camera-viewprojectionmatrix.md)
- [PerspectiveCamera.getProjectionMatrix](./perspectivecamera-getprojectionmatrix.md)
- [OrthographicCamera.getProjectionMatrix](./orthographiccamera-getprojectionmatrix.md)
