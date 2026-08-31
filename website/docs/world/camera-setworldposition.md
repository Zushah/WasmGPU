# Camera.setWorldPosition

## Summary
Camera.setWorldPosition moves a camera to a requested world-space position. For a parented camera, it converts the position into the parent's local space before updating the transform.

## Syntax
```ts
Camera.setWorldPosition(x: number, y: number, z: number): this
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | `number` | Yes | World-space X coordinate. |
| `y` | `number` | Yes | World-space Y coordinate. |
| `z` | `number` | Yes | World-space Z coordinate. |

## Returns
`this` - The same camera instance for fluent chaining.

## Type Details
For an unparented camera, the values are assigned directly as its local position. For a parented camera, WasmGPU inverts the parent's affine world transform and stores the corresponding local position. If that transform is singular, non-finite, or produces non-finite coordinates, the camera remains unchanged.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const camera = wgpu.createCamera.perspective();

camera.setWorldPosition(4, 3, 6).lookAt([0, 0, 0]);
console.log(camera.position); // approximately [4, 3, 6]
```

## Notes
If a parent transform has a singular or non-finite world matrix, the camera is left unchanged. The method returns the camera for chaining.

## See Also
- [Camera.position](./camera-position.md)
- [Camera.lookAt](./camera-lookat.md)
- [Camera.transform](./camera-transform.md)
