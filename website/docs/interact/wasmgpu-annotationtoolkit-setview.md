# WasmGPU.createAnnotation.toolkit().setView

## Summary
WasmGPU.createAnnotation.toolkit().setView updates the camera/scene context used for picking and overlay alignment.
Call this when camera or scene objects are swapped after initial attachment.

## Syntax
```ts
WasmGPU.createAnnotation.toolkit().setView(camera: Camera, scene?: Scene | null): this
toolkit.setView(camera, scene);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `camera` | `Camera` | Yes | Camera used for annotation pick queries and overlay view updates. |
| `scene` | `Scene \| null` | No | Scene to use; defaults to currently attached scene when omitted. |

## Returns
`this` - Returns the same toolkit.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const sceneA = wgpu.createScene();
const sceneB = wgpu.createScene();
const cameraA = wgpu.createCamera.perspective({ fov: 50, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const cameraB = wgpu.createCamera.perspective({ fov: 65, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.05, far: 1500 });
const toolkit = wgpu.createAnnotation.toolkit({ scene: sceneA, camera: cameraA, canvas });

toolkit.setView(cameraB, sceneB);
```

## See Also
- [WasmGPU.createAnnotation.toolkit().attach](./wasmgpu-annotationtoolkit-attach.md)
- [WasmGPU.createAnnotation.toolkit().pickHoverAt](./wasmgpu-annotationtoolkit-pickhoverat.md)
