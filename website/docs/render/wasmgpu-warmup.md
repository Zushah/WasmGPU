# WasmGPU.warmup

## Summary
WasmGPU.warmup prebuilds render resources for a specific scene and camera before the first visible frame.
Use it after assembling your initial scene when you want to reduce first-frame or first-interaction hitching from lazy pipeline, bind-group, or buffer setup.
Warmup covers render resources only; compute resources are not included.

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
`Promise<void>` - Resolves after synchronous render-resource preparation has run. It does not wait for general GPU queue completion.

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
- Warmup prepares the current canvas size, transforms, uniforms, visible draw lists, and render resources for meshes and scientific objects.
- Warmup also creates directional-shadow render resources and can prepare the transmission resource path when the scene contains transmissive `StandardMaterial` content.
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
- [createCamera.perspective](../world/createcamera-perspective.md)
- [effects.shadows](./effects-shadows.md)
