# Camera.writeViewMatrixToArray

## Summary
Camera.writeViewMatrixToArray writes the camera's current column-major world-to-view matrix into an existing numeric array without allocating a replacement matrix.

## Syntax
```ts
Camera.writeViewMatrixToArray(out: number[] | Float32Array, offset?: number): number[] | Float32Array
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `out` | `number[] \| Float32Array` | Yes | Destination with room for 16 values. |
| `offset` | `number` | No | First destination element; default `0`. |

## Returns
The same destination array.

## Type Details
The destination may be a JavaScript `number[]` or `Float32Array`. `offset` counts elements rather than bytes, and the destination needs valid indices through `offset + 15`. The written matrix is column-major and transforms world-space coordinates into view space.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const camera = wgpu.createCamera.perspective();
camera.setWorldPosition(0, 2, 5).lookAt([0, 0, 0]);

const matrices = new Float32Array(32);
const sameArray = camera.writeViewMatrixToArray(matrices, 16);
console.log(sameArray === matrices); // true
```

## See Also
- [Camera.viewMatrix](./camera-viewmatrix.md)
- [Camera.writeViewMatrixTo](./camera-writeviewmatrixto.md)
