# WasmGPU.createScene

## Summary
WasmGPU.createScene constructs a `Scene` container for world objects and lights. Use this as the root object you populate with meshes, point clouds, glyph fields, NodeLink objects, splat fields, and lattice spaces, then render with a camera. The optional background color controls the clear color used before drawing scene content.

## Syntax
```ts
WasmGPU.createScene(background?: Color): Scene
const scene = wgpu.createScene(background);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `background` | `Color` | No | Normalized RGB clear color applied when rendering this scene. |

## Returns
`Scene` - Scene instance with object/light collections and traversal/query helpers.

## Type Details
### Color

```ts
type Color = [number, number, number];
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene([0.04, 0.05, 0.08]);
const camera = wgpu.createCamera.perspective({
    fov: 50,
    aspect: canvas.clientWidth / canvas.clientHeight,
    near: 0.1,
    far: 500
});
camera.transform.setPosition(0, 1.5, 4);
camera.lookAt(0, 0, 0);

wgpu.render(scene, camera);
```

## See Also
- [WasmGPU.createCamera.perspective](./wasmgpu-createcamera-perspective.md)
- [WasmGPU.createCamera.orthographic](./wasmgpu-createcamera-orthographic.md)
- [Scene.add](./scene-add.md)
- [Scene.nodeLinks](./scene-nodelinks.md)
- [Scene splat-field APIs](./scene-splatfields.md)
- [Scene lattice-space APIs](./scene-latticespaces.md)
- [Scene.addLight](./scene-addlight.md)
- [Scene.getBounds](./scene-getbounds.md)
