# WasmGPU.warmup

## Summary
WasmGPU.warmup prebuilds render resources for a specific scene and camera before the first visible frame.
Use it after assembling your initial scene when you want to reduce first-frame or first-interaction hitching from lazy pipeline, bind-group, or buffer setup.
The current implementation is render-only. Compute warmup is not implemented.

## Syntax
```ts
WasmGPU.warmup(options?: WasmGPUWarmupDescriptor): Promise<void>
await wgpu.warmup(options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `WasmGPUWarmupDescriptor` | No | Render warmup options, including the scene/camera pair to prebuild against. |

## Returns
`Promise<void>` - Resolves when the requested warmup work finishes.

## Type Details
```ts
type WasmGPUWarmupDescriptor = {
    scene?: Scene;
    camera?: Camera;
    render?: boolean;
    compute?: false;
};
```

#### WasmGPUWarmupDescriptor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `scene` | `Scene` | No | Scene used for render warmup. Required when `render` is enabled. |
| `camera` | `Camera` | No | Camera used for render warmup. Required when `render` is enabled. |
| `render` | `boolean` | No | Enables render warmup. Default `true`. If set to `false`, `warmup()` returns without preparing render resources. |
| `compute` | `false` | No | Reserved for future expansion. Compute warmup is not implemented and `compute: true` is rejected. |

## Notes
- When render warmup is enabled, both `scene` and `camera` are required.
- Warmup resizes internal render targets, updates transforms and uniforms, builds the current draw lists, and pre-creates the render-side resources needed by the visible mesh, point cloud, glyph field, and nodelink content in that scene.
- Warmup can also prepare the transmission resource path when the scene contains transmissive `StandardMaterial` content.
- Warmup does not apply previous-frame occlusion filtering. It prepares resources without using the render-only occlusion path.
- Warmup does not present a visible frame to the swapchain, and it does not advertise any compute-side preparation.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas, { antialias: true });

const scene = wgpu.createScene([0.04, 0.05, 0.08]);
const camera = wgpu.createCamera.perspective({ fov: 60, near: 0.1, far: 1000 });
camera.transform.setPosition(0, 0, 5);

scene.add(
    wgpu.createMesh(
        wgpu.geometry.box(1, 1, 1),
        wgpu.material.unlit({ color: [0.9, 0.4, 0.2] })
    )
);

await wgpu.warmup({ scene, camera });

wgpu.run(() => {
    wgpu.render(scene, camera);
});
```

## See Also
- [WasmGPU.create](./wasmgpu-create.md)
- [WasmGPU.render](./wasmgpu-render.md)
- [WasmGPU.run](./wasmgpu-run.md)
- [WasmGPU.cullingStats](./wasmgpu-cullingstats.md)
- [WasmGPU.createScene](../world/wasmgpu-createscene.md)
- [WasmGPU.createCamera.perspective](../world/wasmgpu-createcamera-perspective.md)
