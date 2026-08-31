# PerspectiveCamera.autoAspect

## Summary
PerspectiveCamera.autoAspect controls whether rendering replaces the camera's aspect ratio with the renderer canvas aspect. The default is `true`.

## Syntax
```ts
PerspectiveCamera.autoAspect: boolean
camera.autoAspect = false;
```

## Parameters
This property does not take call parameters; assign a boolean value to set it.

## Returns
`boolean` - Whether rendering automatically synchronizes the camera's aspect ratio.

## Type Details
The property defaults to `true`. Setting it does not immediately change `aspect`; when enabled, the render path updates `aspect` from the active canvas dimensions before using the projection matrix.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const camera = wgpu.createCamera.perspective({ autoAspect: false });

camera.aspect = 1; // Preserve a square projection while rendering.
console.log(camera.autoAspect); // false
```

## Notes
Set this to `false` when the camera must retain an explicitly assigned aspect ratio. When enabled, the next render synchronizes `aspect` to the canvas.

## See Also
- [WasmGPU.createCamera.perspective](./wasmgpu-createcamera-perspective.md)
- [PerspectiveCamera.aspect](./perspectivecamera-aspect.md)
- [PerspectiveCamera.updateAspect](./perspectivecamera-updateaspect.md)
