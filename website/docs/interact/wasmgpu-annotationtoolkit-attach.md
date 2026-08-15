# WasmGPU.createAnnotation.toolkit().attach

## Summary
WasmGPU.createAnnotation.toolkit().attach binds the toolkit to active scene/camera context and optional controls/overlay pointers.
It attaches marker rendering to the scene, wires overlay label integration, and optionally binds pointer events.
Use this when creating the toolkit detached or when switching to a different scene/view pair.

## Syntax
```ts
WasmGPU.createAnnotation.toolkit().attach(desc: AnnotationAttachDescriptor): this
toolkit.attach(desc);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `desc` | `AnnotationAttachDescriptor` | Yes | Scene/view attachment payload and optional control/overlay/pointer target overrides. |

## Returns
`this` - Returns the same toolkit instance.

## Type Details
```ts
type AnnotationAttachDescriptor = {
    scene: Scene;
    camera: Camera;
    controls?: NavigationControls | null;
    overlaySystem?: OverlaySystem | null;
    pointerTarget?: HTMLElement | null;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ fov: 55, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const controls = wgpu.createControls.orbit(camera, canvas, { target: [0, 0, 0] });
const toolkit = wgpu.createAnnotation.toolkit({ autoBindPointerEvents: false });

toolkit.attach({ scene, camera, controls, pointerTarget: canvas });
toolkit.setAutoBindPointerEvents(true);
```

## See Also
- [WasmGPU.createAnnotation.toolkit().setView](./wasmgpu-annotationtoolkit-setview.md)
- [WasmGPU.createAnnotation.toolkit().detach](./wasmgpu-annotationtoolkit-detach.md)
- [WasmGPU.createAnnotation.toolkit().bindPointerTarget](./wasmgpu-annotationtoolkit-bindpointertarget.md)
