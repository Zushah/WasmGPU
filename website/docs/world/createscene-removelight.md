# createScene#removeLight

## Summary
createScene#removeLight removes a light from the scene if present. Removing a non-member is a no-op, making this safe for idempotent cleanup. The method returns the same scene instance.

## Syntax
```ts
Scene.removeLight(light: Light): Scene
const result = scene.removeLight(light);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `light` | `Light` | Yes | Light instance to remove from the scene lighting list. |

## Returns
`Scene` - The same scene instance after removal attempt.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
const light = wgpu.createLight.point({ position: [0, 2, 0], range: 12 });
scene.addLight(light);
scene.removeLight(light);
```

## See Also
- [createScene#addLight](./createscene-addlight.md)
- [createScene#clearLights](./createscene-clearlights.md)
- [createScene#lights](./createscene-lights.md)
