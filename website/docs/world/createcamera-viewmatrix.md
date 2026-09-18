# createCamera#viewMatrix

## Summary
createCamera#viewMatrix returns the rigid world-to-view matrix from the camera's current world rotation and position. Use it for custom shader uniforms, CPU-side projection math, or overlay alignment. The returned 16-element array is reused and rewritten on each access, so copy it if you need a persistent snapshot.

## Syntax
```ts
Camera.viewMatrix: number[]
const view = camera.viewMatrix;
```

## Parameters
This property does not take parameters.

## Returns
`number[]` - 4x4 view matrix in column-major array form (length 16).

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
- [createCamera#viewProjectionMatrix](./createcamera-viewprojectionmatrix.md)
- [createCamera.perspective#getProjectionMatrix](./createcamera-perspective-getprojectionmatrix.md)
- [createCamera.orthographic#getProjectionMatrix](./createcamera-orthographic-getprojectionmatrix.md)
- [createCamera#writeViewMatrixToArray](./createcamera-writeviewmatrixtoarray.md)
- [createCamera#writeViewMatrixTo](./createcamera-writeviewmatrixto.md)
