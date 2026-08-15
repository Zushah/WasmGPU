# Camera.type

## Summary
Camera.type reports the projection family used by the camera instance. This value is read-only and is either `"perspective"` or `"orthographic"`. Use it when writing camera-agnostic logic that branches on projection behavior.

## Syntax
```ts
Camera.type: "perspective" | "orthographic"
const type = camera.type;
```

## Parameters
This property does not take parameters.

## Returns
`"perspective" | "orthographic"` - Projection type of this camera.

## Type Details
```ts
type CameraType = "perspective" | "orthographic";
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const camera = wgpu.createCamera.orthographic();
if (camera.type === "orthographic") {
    camera.updateFromCanvas(canvas.clientWidth, canvas.clientHeight, 50);
}
```

## See Also
- [WasmGPU.createCamera.perspective](./wasmgpu-createcamera-perspective.md)
- [WasmGPU.createCamera.orthographic](./wasmgpu-createcamera-orthographic.md)
- [OrthographicCamera.updateFromCanvas](./orthographiccamera-updatefromcanvas.md)
